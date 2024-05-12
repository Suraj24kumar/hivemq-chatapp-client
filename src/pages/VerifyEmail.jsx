import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

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
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4 relative">
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
          <ThemeToggle />
        </div>
        <div className="bg-gray-100 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8 text-center">
          <p className="text-gray-600 dark:text-gray-300 mb-4">No email found. Please register first.</p>
          <Link to="/register" className="text-gray-900 dark:text-gray-300 hover:underline font-medium">
            Go to Register
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4 relative">
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="bg-gray-100 dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white text-center mb-2">Verify your email</h1>
          <p className="text-gray-500 dark:text-gray-400 text-center text-sm mb-6">
            We sent a 6-digit code to <span className="text-gray-600 dark:text-gray-300">{email}</span>
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-2.5 rounded-lg bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent dark:focus:ring-offset-gray-900 text-center text-xl tracking-widest"
                placeholder="000000"
                maxLength={6}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>
          <p className="mt-6 text-center text-gray-500 dark:text-gray-400 text-sm">
            <Link to="/login" className="text-gray-900 dark:text-gray-300 hover:underline font-medium">
              Back to Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
