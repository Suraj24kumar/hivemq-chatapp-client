import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import mqtt from 'mqtt';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import GroupList from '../components/chat/GroupList';
import MessageList from '../components/chat/MessageList';
import MessageInput from '../components/chat/MessageInput';
import ThemeToggle from '../components/ThemeToggle';
import NewGroupModal from '../components/chat/NewGroupModal';
import NewChatModal from '../components/chat/NewChatModal';

export default function Chat() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user, accessToken, logout } = useAuth();
  const [groups, setGroups] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mqttClient, setMqttClient] = useState(null);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const mqttRef = useRef(null);
  const currentGroupIdRef = useRef(groupId);

  useEffect(() => {
    currentGroupIdRef.current = groupId;
  }, [groupId]);

  const loadGroups = useCallback(async () => {
    try {
      const { data } = await api.get('/groups');
      setGroups(data);
    } catch {
      setGroups([]);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (!accessToken) return;
    let mounted = true;
    api
      .get('/mqtt-config')
      .then(({ data }) => {
        if (!mounted || !data?.url || !data?.username || !data?.password) return;
        const client = mqtt.connect(data.url, {
          username: data.username,
          password: data.password,
          protocol: 'wss',
          reconnectPeriod: 5000,
        });
        mqttRef.current = client;
        client.on('connect', () => {
          const topics = data.topics || [];
          topics.forEach((topic) => client.subscribe(topic, { qos: 1 }));
        });
        client.on('message', (topic, payload) => {
          try {
            const msg = JSON.parse(payload.toString());
            const msgGroupId = (msg.groupId && typeof msg.groupId === 'object' ? msg.groupId._id || msg.groupId : msg.groupId) || topic.replace('chat/group/', '');
            if (currentGroupIdRef.current !== msgGroupId) return;
            if (msg.action === 'deleted' && msg.messageId != null) {
              setMessages((prev) => prev.filter((m) => m._id !== msg.messageId));
              return;
            }
            setMessages((prev) => {
              const i = prev.findIndex((m) => m._id === msg._id);
              if (i >= 0) {
                const next = [...prev];
                next[i] = msg;
                return next;
              }
              return [...prev, msg];
            });
          } catch {}
        });
        client.on('error', (err) => console.error('[MQTT]', err.message || err));
        setMqttClient(client);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
      if (mqttRef.current) {
        mqttRef.current.end();
        mqttRef.current = null;
      }
      setMqttClient(null);
    };
  }, [accessToken]);

  useEffect(() => {
    if (!groupId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setMessages([]);
    api
      .get(`/messages/${groupId}`)
      .then(({ data }) => {
        if (!cancelled) setMessages(data.messages || []);
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      });
    return () => { cancelled = true; };
  }, [groupId]);

  const currentGroup = groups.find((g) => g._id === groupId);

  const currentGroupDisplay = (() => {
    if (!currentGroup) return { name: 'Chat', pic: null };
    if (currentGroup.isSelf) return { name: 'Saved', pic: currentGroup.profilePic };
    const cur = user?._id != null ? String(user._id) : '';
    if (currentGroup.isDirect && currentGroup.memberIds?.length === 2 && cur) {
      const other = currentGroup.memberIds.find((m) => (m._id || m).toString() !== cur);
      if (other) return { name: other.username || 'Unknown', pic: other.profilePic };
    }
    return { name: currentGroup.name, pic: currentGroup.profilePic };
  })();

  const handleSend = async (content, attachments) => {
    if (!groupId) return;
    try {
      const { data } = await api.post('/messages', { groupId, content, attachments });
      setMessages((prev) => [...prev, data]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditMessage = async (messageId, newContent) => {
    try {
      const { data } = await api.patch(`/messages/${messageId}`, { content: newContent });
      setMessages((prev) => prev.map((m) => (m._id === data._id ? data : m)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await api.delete(`/messages/${messageId}`);
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNewGroup = () => setNewGroupOpen(true);
  const handleGroupCreated = (group) => {
    setGroups((prev) => [group, ...prev]);
    setNewGroupOpen(false);
    navigate(`/chat/${group._id}`);
    if (mqttRef.current?.connected) {
      mqttRef.current.subscribe(`chat/group/${group._id}`);
    }
  };
  const handleNewChatStart = (group) => {
    setGroups((prev) => [group, ...prev]);
    setNewChatOpen(false);
    navigate(`/chat/${group._id}`);
    if (mqttRef.current?.connected) {
      mqttRef.current.subscribe(`chat/group/${group._id}`);
    }
  };
  const handleOpenSaved = async () => {
    try {
      const { data } = await api.get('/groups/self');
      setGroups((prev) => {
        if (prev.some((g) => g._id === data._id)) return prev;
        return [data, ...prev];
      });
      navigate(`/chat/${data._id}`);
      if (mqttRef.current?.connected) {
        mqttRef.current.subscribe(`chat/group/${data._id}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="h-screen flex bg-white dark:bg-black overflow-hidden">
      <aside
        className={`w-full lg:w-72 flex-shrink-0 bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col ${groupId ? 'hidden' : 'flex'} lg:flex`}
      >
        <div className="p-3 lg:p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <Avatar src={user?.profilePic} name={user?.username} className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-gray-900 dark:text-white font-medium truncate">{user?.username}</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm truncate hidden sm:block">{user?.email}</p>
          </div>
          <ThemeToggle className="flex-shrink-0" />
          <button
            onClick={logout}
            className="text-gray-500 hover:text-gray-900 text-sm px-2 py-1 rounded"
          >
            Logout
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-2 flex flex-row gap-2">
            <button
              type="button"
              onClick={handleOpenSaved}
              title="Saved"
              className="flex-1 min-h-[44px] py-2 px-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-medium border border-gray-300 flex items-center justify-center gap-1.5"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span className="truncate">Saved</span>
            </button>
            <button
              type="button"
              onClick={() => setNewChatOpen(true)}
              title="New chat"
              className="flex-1 min-h-[44px] py-2 px-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-medium border border-gray-300 flex items-center justify-center gap-1.5"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="truncate">Chat</span>
            </button>
            <button
              type="button"
              onClick={handleNewGroup}
              title="New group"
              className="flex-1 min-h-[44px] py-2 px-2 rounded-lg bg-black text-white hover:bg-gray-800 text-xs font-medium flex items-center justify-center gap-1.5"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="truncate">Group</span>
            </button>
          </div>
          <GroupList
            groups={groups}
            currentId={groupId}
            currentUserId={user?._id}
            onSelect={(id) => navigate(`/chat/${id}`)}
          />
        </div>
      </aside>
      <main className={`flex-1 flex flex-col min-w-0 min-h-0 ${!groupId ? 'hidden lg:flex' : 'flex'}`}>
        {groupId ? (
          <>
            <header className="h-14 px-3 sm:px-4 border-b border-gray-200 flex items-center gap-2 sm:gap-3 bg-gray-100/80 flex-shrink-0">
              <button
                type="button"
                onClick={() => navigate('/chat')}
                className="lg:hidden flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center -ml-1 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                aria-label="Back to conversations"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <Avatar
                src={currentGroupDisplay.pic}
                name={currentGroupDisplay.name}
                className="w-9 h-9 rounded-full flex-shrink-0"
              />
              <span className="text-gray-900 font-medium truncate flex-1">{currentGroupDisplay.name}</span>
            </header>
            <MessageList
              messages={messages}
              currentUserId={user?._id}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
            />
            <MessageInput onSend={handleSend} />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : (
              <>
                <p className="text-gray-500 text-center">Select a conversation or start a new one.</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => setNewChatOpen(true)}
                    className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium border border-gray-300"
                  >
                    New chat
                  </button>
                  <button
                    type="button"
                    onClick={handleNewGroup}
                    className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 text-sm font-medium"
                  >
                    New group
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>
      <NewGroupModal
        open={newGroupOpen}
        onClose={() => setNewGroupOpen(false)}
        onCreated={handleGroupCreated}
      />
      <NewChatModal
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onStartChat={handleNewChatStart}
      />
    </div>
  );
}
