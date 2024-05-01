import { useEffect, useRef, useState } from 'react';
import Avatar from '../Avatar';

const EDIT_DELETE_WINDOW_MS = 10 * 60 * 1000;

function attachmentLabel(att) {
  if (att.filename && att.filename.trim()) return att.filename.trim();
  if (att.type === 'video') return 'Download (video)';
  if (att.url) {
    try {
      const path = new URL(att.url).pathname;
      const name = path.split('/').filter(Boolean).pop();
      if (name) return decodeURIComponent(name);
    } catch {}
  }
  return 'Download (file)';
}

function getDownloadFilename(att) {
  const label = attachmentLabel(att);
  if (label && !/^Download\s*\(/.test(label)) return label;
  try {
    const path = new URL(att.url).pathname;
    const name = path.split('/').filter(Boolean).pop();
    if (name) return decodeURIComponent(name);
  } catch {}
  return 'download';
}

async function downloadAttachment(att) {
  const filename = getDownloadFilename(att);
  try {
    const res = await fetch(att.url, { mode: 'cors' });
    if (!res.ok) throw new Error(res.statusText);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    window.open(att.url, '_blank', 'noopener,noreferrer');
  }
}

function canEditOrDelete(msg, currentUserId) {
  const isOwn = msg.senderId?._id === currentUserId || msg.senderId === currentUserId;
  if (!isOwn) return false;
  const age = Date.now() - new Date(msg.createdAt).getTime();
  return age <= EDIT_DELETE_WINDOW_MS;
}

export default function MessageList({ messages, currentUserId, onEditMessage, onDeleteMessage }) {
  const bottomRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState('');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const startEditing = (msg) => {
    setEditingId(msg._id);
    setEditDraft(msg.content || '');
  };

  const saveEdit = () => {
    if (editingId && onEditMessage) {
      onEditMessage(editingId, editDraft.trim());
      setEditingId(null);
      setEditDraft('');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft('');
  };

  const handleDelete = (msg) => {
    if (!onDeleteMessage) return;
    if (window.confirm('Delete this message?')) {
      onDeleteMessage(msg._id);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
      {messages.map((msg) => {
        const isOwn = msg.senderId?._id === currentUserId || msg.senderId === currentUserId;
        const sender = msg.senderId?.username || 'Unknown';
        const senderPic = msg.senderId?.profilePic;
        const showActions = canEditOrDelete(msg, currentUserId) && onEditMessage && onDeleteMessage;
        const isEditing = editingId === msg._id;
        return (
          <div
            key={msg._id}
            className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
          >
            <Avatar
              src={senderPic}
              name={sender}
              className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5"
            />
            <div className={`max-w-[85%] sm:max-w-[75%] min-w-0 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
              <span className={`text-xs text-gray-500 mb-0.5 ${isOwn ? 'text-right' : ''}`}>
                {sender}
              </span>
              <div
                className={`rounded-2xl px-4 py-2 ${
                  isOwn
                    ? 'bg-black text-white rounded-br-md'
                    : 'bg-gray-200 text-gray-900 rounded-bl-md'
                }`}
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      className="w-full min-h-[60px] px-2 py-1.5 rounded bg-white/80 border border-gray-300 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-400 resize-y"
                      placeholder="Message..."
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="text-xs px-2 py-1 rounded bg-gray-300/80 hover:bg-gray-400/80 text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="text-xs px-2 py-1 rounded bg-gray-400/80 hover:bg-gray-500/80 font-medium text-gray-900"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {msg.content && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
                    {msg.attachments?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.attachments.map((att, i) => (
                          <div key={i}>
                            {att.type === 'image' || (att.url && /\.(jpg|jpeg|png|gif|webp)/i.test(att.url)) ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  downloadAttachment(att);
                                }}
                                className="block text-left w-full"
                              >
                                <img src={att.url} alt="" className="max-w-full max-h-48 rounded-lg cursor-pointer" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  downloadAttachment(att);
                                }}
                                className={`text-sm break-all cursor-pointer bg-transparent border-0 p-0 font-inherit text-left hover:underline ${
                                  isOwn ? 'text-white hover:text-gray-200' : 'text-gray-700'
                                }`}
                              >
                                {attachmentLabel(att)}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                {showActions && !isEditing && (
                  <span className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => startEditing(msg)}
                      className="text-xs text-gray-500 hover:text-gray-700 px-1"
                      title="Edit"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(msg)}
                      className="text-xs text-gray-500 hover:text-red-500 px-1"
                      title="Delete"
                    >
                      Delete
                    </button>
                  </span>
                )}
                <span className={`text-xs text-gray-500 ${showActions && !isEditing ? (isOwn ? 'mr-2' : 'ml-2') : ''}`}>
                  {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
