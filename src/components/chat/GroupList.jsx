import Avatar from '../Avatar';

function displayForGroup(g, currentUserId) {
  if (g.isSelf) {
    return { name: 'Saved', pic: g.profilePic };
  }
  const currentStr = currentUserId != null ? String(currentUserId) : '';
  if (g.isDirect && g.memberIds?.length === 2 && currentStr) {
    const other = g.memberIds.find((m) => (m._id || m).toString() !== currentStr);
    if (other) {
      return { name: other.username || 'Unknown', pic: other.profilePic };
    }
  }
  return { name: g.name, pic: g.profilePic };
}

export default function GroupList({ groups, currentId, currentUserId, onSelect }) {
  if (groups.length === 0) {
    return (
      <div className="px-2 pt-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider px-3 pb-2">Chats</p>
        <div className="p-4 text-center text-gray-500 text-sm">
          No conversations yet. Create one above.
        </div>
      </div>
    );
  }
  return (
    <div className="px-2 pt-2">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider px-3 pb-2">Chats</p>
      <ul className="space-y-0.5 p-2">
      {groups.map((g) => {
        const { name, pic } = displayForGroup(g, currentUserId);
        return (
          <li key={g._id}>
            <button
              onClick={() => onSelect(g._id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                currentId === g._id ? 'bg-gray-300 text-gray-900' : 'text-gray-600 hover:bg-gray-200/80'
              }`}
            >
              <Avatar src={pic} name={name} className="w-10 h-10 rounded-full flex-shrink-0" />
              <span className="truncate font-medium">{name}</span>
            </button>
          </li>
        );
      })}
      </ul>
    </div>
  );
}
