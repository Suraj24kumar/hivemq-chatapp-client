import { useState, useEffect } from 'react';
import api from '../../lib/api';
import Avatar from '../Avatar';

export default function NewChatModal({ open, onClose, onStartChat }) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      api.get(`/users/search?q=${encodeURIComponent(query)}`).then(({ data }) => {
        setSearchResults(Array.isArray(data) ? data : []);
      }).catch(() => setSearchResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleSelectUser = async (user) => {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/groups/direct', { otherUserId: user._id });
      onStartChat?.(data);
      setQuery('');
      setSearchResults([]);
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start chat');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-gray-100 rounded-2xl border border-gray-200 w-full max-w-md shadow-xl max-h-[85vh] sm:max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">New chat</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 p-1 text-xl leading-none">×</button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto min-h-0 flex-1">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Search by username or email</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-gray-200 border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
              placeholder="Type to search..."
              autoFocus
            />
          </div>
          {query.trim().length < 2 && (
            <p className="text-gray-500 text-sm">Search by username or email to start a chat.</p>
          )}
          {searchResults.length > 0 ? (
            <ul className="border border-gray-300 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
              {searchResults.map((u) => (
                <li key={u._id}>
                  <button
                    type="button"
                    onClick={() => handleSelectUser(u)}
                    disabled={loading}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-200 text-gray-800 disabled:opacity-50"
                  >
                    <Avatar src={u.profilePic} name={u.username} className="w-10 h-10 rounded-full flex-shrink-0" />
                    <div className="min-w-0">
                      <span className="font-medium block truncate">{u.username}</span>
                      <span className="text-gray-500 text-sm block truncate">{u.email}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : query.trim().length >= 2 && !loading && (
            <p className="text-gray-500 text-sm">No users found.</p>
          )}
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-200">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
