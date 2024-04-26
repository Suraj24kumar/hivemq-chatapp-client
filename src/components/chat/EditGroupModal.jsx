import { useState, useEffect } from 'react';
import api from '../../lib/api';
import Avatar from '../Avatar';

export default function EditGroupModal({ open, onClose, group, currentUserId, onUpdated, onLeft }) {
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [error, setError] = useState('');

  const creatorId = group?.createdBy?._id?.toString() || group?.createdBy?.toString?.() || '';
  const isCreator = currentUserId && creatorId === currentUserId;
  const members = group?.memberIds || [];
  const currentUserIdStr = currentUserId?.toString?.() || '';

  useEffect(() => {
    if (open && group) {
      setName(group.name || '');
      setError('');
    }
  }, [open, group?.name]);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      api.get(`/users/search?q=${encodeURIComponent(query)}`).then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setSearchResults(
          list.filter((u) => !members.some((m) => (m._id || m).toString() === (u._id || u)?.toString?.()))
        );
      }).catch(() => setSearchResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [query, group?._id]);

  const addUser = (user) => {
    const currentIds = members.map((m) => (m._id || m).toString());
    if (currentIds.includes((user._id || user).toString())) return;
    saveMembers([...currentIds, (user._id || user).toString()]);
    setQuery('');
    setSearchResults([]);
  };

  const removeMember = (memberId) => {
    const idStr = (memberId?._id || memberId).toString();
    if (idStr === creatorId || idStr === currentUserIdStr) return;
    const newMemberIds = members
      .filter((m) => (m._id || m).toString() !== idStr)
      .map((m) => (m._id || m).toString());
    saveMembers(newMemberIds);
  };

  const saveMembers = async (memberIds) => {
    if (!group?._id) return;
    setError('');
    setLoading(true);
    try {
      const { data } = await api.patch(`/groups/${group._id}`, { memberIds });
      onUpdated(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update members');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!group?._id || !name.trim()) return;
    setError('');
    setLoading(true);
    try {
      const { data } = await api.patch(`/groups/${group._id}`, { name: name.trim() });
      onUpdated(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update group');
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!group?._id || !window.confirm('Leave this group?')) return;
    setError('');
    setLeaveLoading(true);
    try {
      await api.post(`/groups/${group._id}/leave`);
      onLeft();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to leave group');
    } finally {
      setLeaveLoading(false);
    }
  };

  if (!open || !group) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-gray-100 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md shadow-xl max-h-[85vh] sm:max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{isCreator ? 'Edit group' : 'Group info'}</h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1 text-xl leading-none">×</button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto min-h-0 flex-1">
          {error && <p className="text-red-400 text-sm">{error}</p>}

          {isCreator && (
            <form onSubmit={handleSaveName} className="space-y-2">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Group name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
                  placeholder="Group name"
                  maxLength={100}
                />
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="px-4 py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 font-medium disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </form>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Members</label>
            <ul className="space-y-2">
              {members.map((m) => {
                const id = (m._id || m).toString();
                const isMemberCreator = id === creatorId;
                const isSelf = id === currentUserIdStr;
                const canRemove = isCreator && !isMemberCreator && !isSelf;
                return (
                  <li
                    key={id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-200/80 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600"
                  >
                    <Avatar
                      src={m.profilePic}
                      name={m.username}
                      className="w-8 h-8 rounded-full flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-800 dark:text-gray-200 truncate block">{m.username}</span>
                      {isMemberCreator && (
                        <span className="text-xs text-gray-600 dark:text-gray-400">Creator</span>
                      )}
                    </div>
                    {canRemove && (
                      <button
                        type="button"
                        onClick={() => removeMember(m._id || m)}
                        disabled={loading}
                        className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {isCreator && (
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Add members</label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 mb-2"
                placeholder="Search by username or email"
              />
              {searchResults.length > 0 && (
                <ul className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden max-h-32 overflow-y-auto">
                  {searchResults.map((u) => (
                    <li key={u._id}>
                      <button
                        type="button"
                        onClick={() => addUser(u)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                      >
                        <Avatar src={u.profilePic} name={u.username} className="w-8 h-8 rounded-full" />
                        <span>{u.username}</span>
                        <span className="text-gray-500 text-sm">{u.email}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleLeave}
              disabled={leaveLoading}
              className="w-full py-2 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 font-medium disabled:opacity-50"
            >
              {leaveLoading ? 'Leaving...' : 'Leave group'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
