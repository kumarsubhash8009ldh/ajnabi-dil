import React, { useState, useEffect } from 'react';
import { Phone, Lock, KeyRound, AlertCircle, CheckCircle2, ArrowRight, X, Sparkles, RefreshCw } from 'lucide-react';
import { apiRequest } from '../utils/api';

export default function ForgotPasswordModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1: Enter Mobile, 2: Enter OTP & New Password, 3: Success
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [receivedOtpHint, setReceivedOtpHint] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  if (!isOpen) return null;

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanPhone = mobile.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit registered mobile number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await apiRequest('/api/auth/send-otp', 'POST', {
        mobile: cleanPhone,
        action: 'forgot-password'
      });

      if (res.otp) {
        setReceivedOtpHint(res.otp);
      }
      setResendTimer(60);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Mobile number not found or server error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp) {
      setError('Please enter the 6-digit OTP code');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setError('Password must be at least 4 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cleanPhone = mobile.replace(/\D/g, '');
      await apiRequest('/api/auth/reset-password-otp', 'POST', {
        mobile: cleanPhone,
        otp: otp.trim(),
        newPassword
      });

      setStep(3);
    } catch (err) {
      setError(err.message || 'Failed to reset password. Check OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    onClose();
    if (onSuccess) onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-950 to-black rounded-3xl border border-pink-500/40 p-5 text-white shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Top Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-pink-600/25 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition-colors z-10"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-center mb-4 relative z-10">
          <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-400 flex items-center justify-center shadow-lg shadow-pink-500/30">
            <KeyRound size={24} className="text-white" />
          </div>
          <h2 className="text-lg font-black bg-gradient-to-r from-pink-200 via-rose-300 to-white bg-clip-text text-transparent">
            {step === 3 ? 'Password Changed!' : 'Reset Password (OTP)'}
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {step === 1 && 'Enter your registered 10-digit mobile number to get OTP'}
            {step === 2 && `Enter the OTP sent to +91 ${mobile.slice(-10)} and set new password`}
            {step === 3 && 'Your password has been reset successfully!'}
          </p>
        </div>

        {error && (
          <div className="w-full bg-red-950/70 border border-red-500/50 text-red-300 text-xs px-3 py-2 rounded-2xl flex items-center gap-2 mb-3 text-left">
            <AlertCircle size={15} className="shrink-0 text-red-400" />
            <span className="flex-1 text-[11px]">{error}</span>
          </div>
        )}

        {/* OTP Demo / Live Hint Banner */}
        {receivedOtpHint && step === 2 && (
          <div className="w-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs px-3 py-2 rounded-2xl flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" />
              <span className="text-[11px]">OTP Code: <strong className="text-white font-mono text-sm tracking-wider">{receivedOtpHint}</strong></span>
            </div>
            <button
              type="button"
              onClick={() => setOtp(receivedOtpHint)}
              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold rounded-lg text-white"
            >
              Auto-Fill
            </button>
          </div>
        )}

        {/* Step 1: Phone Input */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-3">
            <div className="flex flex-col gap-1 text-left">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                Registered Mobile Number
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Phone size={15} />
                </span>
                <input
                  type="tel"
                  required
                  autoFocus
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="10-digit number (e.g. 9876543210)"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900/90 border border-slate-700/80 focus:border-pink-500 rounded-2xl text-white placeholder-slate-500 text-xs font-mono outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-pink-600 via-rose-500 to-pink-600 hover:from-pink-500 hover:to-rose-400 text-white rounded-2xl font-black text-xs shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
            >
              <span>{loading ? 'Sending OTP...' : 'Send OTP Code'}</span>
              <ArrowRight size={15} />
            </button>
          </form>
        )}

        {/* Step 2: OTP & New Password Input */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-2.5">
            <div className="flex flex-col gap-1 text-left">
              <div className="flex justify-between items-center pl-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  6-Digit OTP Code
                </label>
                {resendTimer > 0 ? (
                  <span className="text-[10px] text-pink-400">Resend in {resendTimer}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-[10px] text-pink-400 font-bold hover:underline flex items-center gap-1"
                  >
                    <RefreshCw size={10} /> Resend OTP
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <KeyRound size={15} />
                </span>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-700/80 focus:border-pink-500 rounded-2xl text-white placeholder-slate-500 text-xs font-mono tracking-widest outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1 text-left">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                New Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock size={15} />
                </span>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-700/80 focus:border-pink-500 rounded-2xl text-white placeholder-slate-500 text-xs outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1 text-left">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                Confirm New Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock size={15} />
                </span>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-700/80 focus:border-pink-500 rounded-2xl text-white placeholder-slate-500 text-xs outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold text-xs transition-all"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-gradient-to-r from-pink-600 via-rose-500 to-pink-600 hover:from-pink-500 hover:to-rose-400 text-white rounded-2xl font-black text-xs shadow-lg shadow-pink-600/30 flex items-center justify-center gap-1.5 active:scale-98 transition-all disabled:opacity-50"
              >
                <span>{loading ? 'Updating...' : 'Set New Password'}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Success State */}
        {step === 3 && (
          <div className="text-center py-2 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Password Reset Successful!</h3>
              <p className="text-xs text-slate-300 mt-1">
                Aapka naya password successfully update ho gaya hai. Ab aap apne naye password ke sath login kar sakte hain.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDone}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 text-white rounded-2xl font-black text-xs shadow-lg shadow-emerald-600/30 active:scale-98 transition-all"
            >
              Sign In Now ➔
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
