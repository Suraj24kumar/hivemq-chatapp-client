import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import mqtt from 'mqtt';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import MessageList from '../components/chat/MessageList';
import MessageInput from '../components/chat/MessageInput';

export default function Chat() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user, accessToken, logout } = useAuth();
  const [groups, setGroups] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mqttClient, setMqttClient] = useState(null);
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

  return (
    <div className="h-screen flex bg-white overflow-hidden">
      <aside
        className={`w-full lg:w-72 flex-shrink-0 bg-gray-100 border-r border-gray-200 flex flex-col ${groupId ? 'hidden' : 'flex'} lg:flex`}
      >
        <div className="p-3 lg:p-4 border-b border-gray-200 flex items-center gap-3">
          <Avatar src={user?.profilePic} name={user?.username} className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-gray-900 font-medium truncate">{user?.username}</p>
            <p className="text-gray-500 text-sm truncate hidden sm:block">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="text-gray-500 hover:text-gray-900 text-sm px-2 py-1 rounded"
          >
            Logout
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <p className="text-xs font-medium text-gray-500 px-2 py-1">Conversations</p>
          {groups.length === 0 ? (
            <p className="text-gray-500 text-sm px-2 py-2">No conversations yet.</p>
          ) : (
            <ul className="space-y-0.5">
              {groups.map((g) => {
                const name = g.isSelf ? 'Saved' : g.isDirect && g.memberIds?.length === 2
                  ? (g.memberIds.find((m) => (m._id || m).toString() !== user?._id)?.username || 'Chat')
                  : g.name;
                return (
                  <li key={g._id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/chat/${g._id}`)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 ${
                        groupId === g._id ? 'bg-gray-300' : 'hover:bg-gray-200'
                      }`}
                    >
                      <Avatar src={g.profilePic} name={name} className="w-8 h-8 rounded-full flex-shrink-0" />
                      <span className="truncate text-gray-900">{name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
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
              <p className="text-gray-500 text-center">Select a conversation or create one from the sidebar.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
