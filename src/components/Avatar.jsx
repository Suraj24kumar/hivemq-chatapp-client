export default function Avatar({ src, name, className = 'w-10 h-10 rounded-full' }) {
  const initials = name
    ? name
        .split(/\s+/)
        .map((s) => s[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';
  if (src) {
    return <img src={src} alt={name || 'Avatar'} className={`object-cover ${className}`} />;
  }
  return (
    <div
      className={`flex items-center justify-center bg-gray-400 text-white text-sm font-medium ${className}`}
    >
      {initials}
    </div>
  );
}
