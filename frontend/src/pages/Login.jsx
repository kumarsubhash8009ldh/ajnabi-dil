import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User, AlertCircle, Sparkles, Download, Smartphone, Globe, Shield, ArrowRight, KeyRound } from 'lucide-react';
import { apiRequest, setSession } from '../utils/api';
import ForgotPasswordModal from '../components/ForgotPasswordModal';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [logoTaps, setLogoTaps] = useState(0);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter your username/mobile and password');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccessNotice('');
    
    try {
      const response = await apiRequest('/api/auth/login', 'POST', { username: username.trim(), password });
      setSession(response.token, response.user);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setGuestLoading(true);
    setError('');
    try {
      const response = await apiRequest('/api/auth/guest-login', 'POST');
      setSession(response.token, response.user);
      navigate('/');
    } catch (err) {
      // Fallback: try demo login
      try {
        const demoRes = await apiRequest('/api/auth/login', 'POST', { username: 'angel', password: 'password123' });
        setSession(demoRes.token, demoRes.user);
        navigate('/');
      } catch (e) {
        setError('Instant guest login unavailable. Please create an account or log in.');
      }
    } finally {
      setGuestLoading(false);
    }
  };

  // Secret admin unlock by tapping logo 5 times
  const handleLogoClick = () => {
    const nextCount = logoTaps + 1;
    setLogoTaps(nextCount);
    if (nextCount >= 5) {
      setLogoTaps(0);
      navigate('/master-admin-control');
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-0 md:p-4">
      {/* Smartphone Outer Container for Desktop Chrome */}
      <div className="w-full md:w-[420px] h-screen md:h-[860px] md:max-h-[92vh] bg-gradient-to-b from-slate-950 via-slate-900 to-black flex flex-col shadow-2xl md:rounded-[40px] md:border-[8px] md:border-slate-800 overflow-hidden relative justify-between p-6 text-white">
        
        {/* Decorative Top Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-64 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header & Secret Admin Trigger */}
        <div className="flex justify-between items-center z-10 pt-2">
          <div className="flex items-center gap-1.5 text-xs text-pink-400 font-bold bg-pink-950/60 border border-pink-500/30 px-3 py-1 rounded-full">
            <Globe size={13} />
            <span>Web Chrome & App</span>
          </div>
          <a
            href="/download-apk"
            download="AjnabiDil_Latest.apk"
            className="flex items-center gap-1 text-[11px] text-amber-300 font-extrabold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/40 px-3 py-1 rounded-full transition-all"
          >
            <Download size={13} />
            <span>Get APK</span>
          </a>
        </div>

        {/* Brand & Logo */}
        <div className="text-center my-auto z-10 flex flex-col items-center">
          <div 
            onClick={handleLogoClick}
            className="relative cursor-pointer group active:scale-95 transition-transform"
            title="Ajnabi Dil"
          >
            <img 
              src="/logo.jpg" 
              alt="Ajnabi Dil Logo" 
              className="w-24 h-24 rounded-full object-cover shadow-2xl border-2 border-pink-400/80 ring-4 ring-pink-500/20 mx-auto"
            />
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-tr from-pink-500 to-rose-400 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md">
              LIVE
            </div>
          </div>

          <h1 className="text-2xl font-black tracking-tight mt-3 bg-gradient-to-r from-pink-200 via-rose-300 to-white bg-clip-text text-transparent">
            Ajnabi Dil 💖
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Dil Se Dil Ka Connection • Live Voice & Video
          </p>

          {successNotice && (
            <div className="w-full bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs px-3.5 py-2.5 rounded-2xl flex items-center gap-2 mt-3 text-left">
              <Sparkles size={16} className="shrink-0 text-amber-400" />
              <span className="flex-1 text-[11px]">{successNotice}</span>
            </div>
          )}

          {error && (
            <div className="w-full bg-red-950/60 border border-red-500/40 text-red-300 text-xs px-3.5 py-2.5 rounded-2xl flex items-center gap-2 mt-3 text-left">
              <AlertCircle size={16} className="shrink-0 text-red-400" />
              <span className="flex-1 text-[11px]">{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="w-full flex flex-col gap-3 mt-4">
            <div className="flex flex-col gap-1 text-left">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                Username or Mobile Number
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username or 10-digit Mobile"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700/80 focus:border-pink-500 rounded-2xl text-white placeholder-slate-500 text-xs font-medium outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1 text-left">
              <div className="flex justify-between items-center pl-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[10px] font-bold text-pink-400 hover:text-pink-300 hover:underline transition-colors"
                >
                  Forgot Password? (OTP)
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700/80 focus:border-pink-500 rounded-2xl text-white placeholder-slate-500 text-xs font-medium outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-1 bg-gradient-to-r from-pink-600 via-rose-500 to-pink-600 hover:from-pink-500 hover:to-rose-400 text-white rounded-2xl font-black text-xs shadow-lg shadow-pink-600/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight size={15} />
            </button>
          </form>

          {/* Quick Web Demo / One-Click Guest Login Button */}
          <div className="w-full mt-3">
            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={guestLoading}
              className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-pink-500/40 text-pink-300 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <Sparkles size={14} className="text-amber-400" />
              <span>{guestLoading ? 'Connecting...' : 'Instant Web Demo / 1-Click Guest'}</span>
            </button>
          </div>
        </div>

        {/* Forgot Password OTP Modal */}
        <ForgotPasswordModal
          isOpen={showForgotModal}
          onClose={() => setShowForgotModal(false)}
          onSuccess={() => {
            setSuccessNotice('Password reset successful! Please enter your new password to login.');
          }}
        />

        {/* Bottom Footer */}
        <div className="text-center z-10 pt-2 border-t border-white/5">
          <p className="text-xs text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-pink-400 font-black hover:underline ml-1">
              Create New Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
