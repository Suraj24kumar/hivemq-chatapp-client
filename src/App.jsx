import { Routes, Route, Navigate } from 'react-router-dom';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<div className="p-4">Welcome</div>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
