import { useState, useRef, useEffect } from 'react';
import api from '../../lib/api';

const IMAGE_MAX = 5 * 1024 * 1024;
const VIDEO_MAX = 20 * 1024 * 1024;
const OTHER_MAX = 50 * 1024 * 1024;

function getType(file) {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return 'other';
}

function getMaxSize(type) {
  if (type === 'image') return IMAGE_MAX;
  if (type === 'video') return VIDEO_MAX;
  return OTHER_MAX;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MessageInput({ onSend }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const previewUrlsRef = useRef([]);
  const sendingRef = useRef(false);
  previewUrlsRef.current = previewUrls;

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const typeLabels = { image: '5MB', video: '20MB', other: '50MB' };

  const processFileList = (files) => {
    const next = [];
    const urls = [];
    let firstError = null;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const type = getType(file);
      const max = getMaxSize(type);
      if (file.size > max) {
        if (!firstError) firstError = `${file.name}: max ${typeLabels[type]}`;
        continue;
      }
      next.push(file);
      if (type === 'image') urls.push(URL.createObjectURL(file));
    }
    if (next.length) {
      setUploadError('');
      setSelectedFiles((prev) => [...prev, ...next]);
      setPreviewUrls((prev) => [...prev, ...urls]);
    } else if (firstError) {
      setUploadError(firstError);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadError('');
    processFileList(files);
    e.target.value = '';
  };

  const handleFolderSelect = (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadError('');
    processFileList(files);
    e.target.value = '';
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => {
      const next = [...prev];
      const revoke = next.splice(index, 1)[0];
      if (revoke) URL.revokeObjectURL(revoke);
      return next;
    });
  };

  const handleUpload = async (file) => {
    const type = getType(file);
    const max = getMaxSize(type);
    if (file.size > max) return null;
    setUploadError('');
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    const { data } = await api.post('/upload', form, {
      headers: { 'Content-Type': undefined },
    });
    return {
      url: data.url,
      type: data.type,
      publicId: data.publicId,
      filename: data.filename || file.name || undefined,
    };
  };

  const handleSend = async () => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    try {
      const content = text.trim();
      let attachments = [];
      if (selectedFiles.length) {
        try {
          attachments = await Promise.all(selectedFiles.map(handleUpload));
          attachments = attachments.filter(Boolean);
        } catch (err) {
          setUploadError(err.response?.data?.message || 'Upload failed');
          return;
        } finally {
          sendingRef.current = false;
          setSending(false);
        }
        setSelectedFiles([]);
        setPreviewUrls((prev) => {
          prev.forEach((url) => URL.revokeObjectURL(url));
          return [];
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (folderInputRef.current) folderInputRef.current.value = '';
      }
      if (!content && attachments.length === 0) {
        sendingRef.current = false;
        setSending(false);
        return;
      }
      await onSend(content, attachments);
      setText('');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const canSend = text.trim() || selectedFiles.length;

  return (
    <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-100/80 flex-shrink-0">
      {uploadError && (
        <p className="text-red-600 text-sm mb-2 flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center text-red-600 text-xs flex-shrink-0">!</span>
          {uploadError}
        </p>
      )}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedFiles.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="relative group flex items-center gap-2 rounded-lg bg-gray-200/80 border border-gray-300 overflow-hidden"
            >
              {getType(file) === 'image' && previewUrls[i] ? (
                <div className="w-12 h-12 flex-shrink-0 bg-gray-300">
                  <img
                    src={previewUrls[i]}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 flex-shrink-0 bg-gray-300 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div className="py-1.5 pr-8 pl-1 min-w-0">
                <p className="text-gray-800 text-sm font-medium truncate max-w-[140px]" title={file.name}>
                  {file.name}
                </p>
                <p className="text-gray-500 text-xs">{formatSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-gray-400 hover:bg-red-500/80 text-gray-700 hover:text-white flex items-center justify-center transition-colors"
                aria-label="Remove file"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 items-end min-w-0">
        <input
          type="file"
          ref={fileInputRef}
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <input
          type="file"
          ref={folderInputRef}
          className="hidden"
          webkitdirectory=""
          multiple
          onChange={handleFolderSelect}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          title="Attach files"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => folderInputRef.current?.click()}
          className="p-2.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          title="Attach folder"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2-2z" />
          </svg>
        </button>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (!sendingRef.current) handleSend();
            }
          }}
          placeholder={selectedFiles.length ? `Send ${selectedFiles.length} file(s)...` : 'Type a message...'}
          className="flex-1 min-w-0 px-4 py-2.5 rounded-lg bg-gray-200 border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
        />
        <button
          onClick={handleSend}
          disabled={sending || !canSend}
          className="px-4 py-2.5 rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:pointer-events-none font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
