import { useState, useEffect } from 'react';
import api from '../../lib/api';
import Avatar from '../Avatar';

export default function NewGroupModal({ open, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      api.get(`/users/search?q=${encodeURIComponent(query)}`).then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setSearchResults(list.filter((u) => !selected.some((s) => s._id === u._id)));
      }).catch(() => setSearchResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [query, selected]);

  const addUser = (user) => {
    if (!selected.some((s) => s._id === user._id)) {
      setSelected((prev) => [...prev, user]);
      setQuery('');
      setSearchResults([]);
    }
  };

  const removeUser = (id) => {
    setSelected((prev) => prev.filter((s) => s._id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name?.trim()) return;
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/groups', {
        name: name.trim(),
        memberIds: selected.map((s) => s._id),
      });
      onCreated(data);
      setName('');
      setSelected([]);
      setQuery('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create group');
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
          <h2 className="text-lg font-semibold text-gray-900">New group</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 p-1">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto min-h-0 flex-1">
          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Group name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-gray-200 border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
              placeholder="My group"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Add members</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-gray-200 border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 mb-2"
              placeholder="Search by username or email"
            />
            {searchResults.length > 0 && (
              <ul className="border border-gray-300 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                {searchResults.map((u) => (
                  <li key={u._id}>
                    <button
                      type="button"
                      onClick={() => addUser(u)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-200 text-gray-800"
                    >
                      <Avatar src={u.profilePic} name={u.username} className="w-8 h-8 rounded-full" />
                      <span>{u.username}</span>
                      <span className="text-gray-500 text-sm">{u.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selected.map((u) => (
                  <span
                    key={u._id}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-300 text-gray-800 text-sm"
                  >
                    {u.username}
                    <button type="button" onClick={() => removeUser(u._id)} className="text-gray-600 hover:text-gray-900">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-200">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name?.trim()}
              className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 font-medium disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
