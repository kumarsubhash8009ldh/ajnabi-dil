import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MessageCircle, Lock, User, AlertCircle } from 'lucide-react';
import { apiRequest, setSession } from '../utils/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await apiRequest('/api/auth/login', 'POST', { username, password });
      setSession(response.token, response.user);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-0 md:p-4">
      <div className="w-full md:w-[410px] h-screen md:h-[840px] md:max-h-[90vh] bg-white flex flex-col shadow-2xl md:rounded-[40px] md:border-[10px] md:border-slate-800 overflow-hidden relative justify-center px-8">
        
        <div className="text-center mb-6">
          <img 
            src="/logo.jpg" 
            alt="Ajnabi Dil Logo" 
            className="mx-auto w-24 h-24 rounded-full object-cover mb-3 shadow-xl border-2 border-pink-400 ring-2 ring-pink-300/30"
          />
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Welcome to Ajnabi Dil</h2>
          <p className="text-xs text-slate-400 mt-1">Dil Se Dil Ka Connection • Live Calling & Chat</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center gap-2 mb-4 border border-red-100">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider pl-1">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <User size={18} />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary-500 transition-colors text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider pl-1">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Lock size={18} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary-500 transition-colors text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-semibold text-sm shadow-lg shadow-primary-200 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-8">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-600 font-semibold hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
