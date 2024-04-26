import { useState, useRef } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../Avatar';

export default function ProfilePicModal({ open, onClose }) {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      setError('Please choose an image under 5MB');
      return;
    }
    setError('');
    setLoading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const { data } = await api.patch('/users/me/profile-pic', form);
      updateUser(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-gray-100 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-sm p-6 shadow-xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile picture</h3>
        <div className="flex justify-center mb-4">
          <Avatar src={user?.profilePic} name={user?.username} className="w-24 h-24 rounded-full" />
        </div>
        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="w-full py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 text-white font-medium disabled:opacity-50"
        >
          {loading ? 'Uploading...' : 'Upload new photo'}
        </button>
        <button type="button" onClick={onClose} className="w-full mt-2 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
          Close
        </button>
      </div>
    </div>
  );
}
