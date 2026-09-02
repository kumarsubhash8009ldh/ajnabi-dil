import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MessageCircle, Lock, User, AlertCircle, ArrowLeft, Gift, Phone, Sparkles, Check, Send, Award, DollarSign } from 'lucide-react';
import { apiRequest, setSession } from '../utils/api';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [welcomeModal, setWelcomeModal] = useState(null); // { user, welcomeMessage }
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username || !password || !confirmPassword || !mobile) {
      setError('Please fill in all fields including Mobile Number');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (mobile.replace(/[^0-9]/g, '').length < 10) {
      setError('Please enter a valid 10-digit Mobile / WhatsApp Number');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await apiRequest('/api/auth/register', 'POST', { 
        username, 
        password, 
        mobile: mobile.trim(), 
        referralCode: referralCode.trim() 
      });

      setSession(response.token, response.user);
      
      // Open Welcome Income Notification Modal
      setWelcomeModal({
        user: response.user,
        welcomeMessage: response.welcomeMessage || 'Welcome to Ajnabi Dil!'
      });
    } catch (err) {
      setError(err.message || 'Registration failed. Try a different username.');
    } finally {
      setLoading(false);
    }
  };

  const handleForwardToWhatsApp = () => {
    const cleanPhone = (mobile || '').replace(/[^0-9]/g, '');
    const incomeDetailsText = `🎉 *Welcome to Ajnabi Dil Earning Partner Program!* \n\nHello @${username},\nAapka account successfully register ho gaya hai!\n\n💰 *Aapki Income & Earning Rates:* \n• 📞 *Voice Calls:* 1 Coin/sec (Earn 70% Share)\n• 📹 *Video Calls:* 20 Coins/10s (Earn 70% Share)\n• 🔒 *Live Private Shows:* Min 300 Coins (70% Host Share)\n• 🎁 *Virtual Live Gifts:* 70% Direct Host Commission\n• 💸 *Minimum Withdrawal:* Rs. 500 (500 Coins) via instant UPI/Bank transfer\n\nApni profile par jakar *Host KYC Verification* complete karein aur earning start karein!\nApp Link: http://localhost:3000`;
    
    const url = `https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${encodeURIComponent(incomeDetailsText)}`;
    window.open(url, '_blank');
  };

  const handleProceedToApp = () => {
    navigate('/profile');
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-0 md:p-4">
      <div className="w-full md:w-[410px] h-screen md:h-[840px] md:max-h-[90vh] bg-white flex flex-col shadow-2xl md:rounded-[40px] md:border-[10px] md:border-slate-800 overflow-hidden relative justify-center px-8">
        
        <Link to="/login" className="absolute top-8 left-8 text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm font-semibold">
          <ArrowLeft size={18} />
          <span>Back</span>
        </Link>

        <div className="text-center mb-3">
          <img 
            src="/logo.jpg" 
            alt="Ajnabi Dil Logo" 
            className="mx-auto w-16 h-16 rounded-full object-cover mb-2 shadow-lg border-2 border-pink-400 ring-2 ring-pink-300/30"
          />
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Create Account</h2>
          <p className="text-xs text-slate-400 mt-0.5">Register & start earning on Ajnabi Dil</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 mb-3 border border-red-100">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <User size={16} />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose username"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary-500 transition-colors text-xs font-medium"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Mobile / WhatsApp Number</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Phone size={16} />
              </span>
              <input
                type="tel"
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="e.g. 9876543210 (For income details)"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary-500 transition-colors text-xs font-medium font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock size={16} />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create password"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary-500 transition-colors text-xs font-medium"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Confirm Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock size={16} />
              </span>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary-500 transition-colors text-xs font-medium"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Referral Code (Optional)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Gift size={16} />
              </span>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder="Invite code for +50 free coins"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary-500 transition-colors text-xs font-semibold uppercase"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-primary-200 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Register & View Income Details'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 font-bold hover:underline">
            Log in here
          </Link>
        </p>

        {/* 🎉 WELCOME INCOME & EARNING DETAILS MODAL */}
        {welcomeModal && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-5 shadow-2xl w-full max-w-sm flex flex-col gap-3.5 border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
              
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-yellow-400 via-pink-500 to-primary-600 flex items-center justify-center text-white mx-auto shadow-md mb-2">
                  <Sparkles size={24} />
                </div>
                <h3 className="font-extrabold text-base text-slate-800">Welcome @{welcomeModal.user.username}!</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Your Account & Income Potential Guide</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col gap-2">
                <span className="text-[9px] uppercase font-extrabold tracking-wider text-emerald-600">
                  💰 Host Earning Rates (70% Revenue Share):
                </span>
                
                <div className="flex justify-between items-center text-xs border-b border-slate-200/60 pb-1.5 text-slate-700 font-semibold">
                  <span>📞 Voice Calling Rate:</span>
                  <span className="font-extrabold text-emerald-600">1 Coin/sec (70% Share)</span>
                </div>

                <div className="flex justify-between items-center text-xs border-b border-slate-200/60 pb-1.5 text-slate-700 font-semibold">
                  <span>📹 Video Calling Rate:</span>
                  <span className="font-extrabold text-purple-600">20 Coins/10s (70% Share)</span>
                </div>

                <div className="flex justify-between items-center text-xs border-b border-slate-200/60 pb-1.5 text-slate-700 font-semibold">
                  <span>🔒 Live Private Shows:</span>
                  <span className="font-extrabold text-yellow-600">Min 300 Coins</span>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-700 font-semibold">
                  <span>💸 Bank/UPI Withdrawal:</span>
                  <span className="font-extrabold text-primary-600">Min Rs. 500 (500c)</span>
                </div>
              </div>

              {/* Direct Forward to WhatsApp Button */}
              <button
                onClick={handleForwardToWhatsApp}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-extrabold text-xs shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Send size={15} />
                <span>Forward Income Details to My WhatsApp</span>
              </button>

              {/* Continue to Profile / App Button */}
              <button
                onClick={handleProceedToApp}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs active:scale-95 transition-all"
              >
                Continue to Profile & Complete KYC ➔
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

