import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmail() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const email = state?.email || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Email missing. Please register again.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-email', { email, otp });
      login(data.user, { accessToken: data.accessToken, refreshToken: data.refreshToken });
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="bg-gray-100 rounded-2xl border border-gray-200 p-4 sm:p-6 lg:p-8 text-center">
          <p className="text-gray-600 mb-4">No email found. Please register first.</p>
          <Link to="/register" className="text-gray-900 hover:underline font-medium">
            Go to Register
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-100 rounded-2xl shadow-xl border border-gray-200 p-4 sm:p-6 lg:p-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 text-center mb-2">Verify your email</h1>
          <p className="text-gray-500 text-center text-sm mb-6">
            We sent a 6-digit code to <span className="text-gray-700">{email}</span>
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-600 text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-2.5 rounded-lg bg-gray-200 border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-center text-xl tracking-widest"
                placeholder="000000"
                maxLength={6}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-black text-white hover:bg-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>
          <p className="mt-6 text-center text-gray-500 text-sm">
            <Link to="/login" className="text-gray-900 hover:underline font-medium">
              Back to Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
