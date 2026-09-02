import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Lock, User, AlertCircle, ArrowLeft, Gift, Phone, Sparkles, Send, Download, Globe, Check, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react';
import { apiRequest, setSession } from '../utils/api';

export default function Register() {
  const [step, setStep] = useState(1); // 1: Fill Details, 2: Verify OTP
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpHint, setOtpHint] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [welcomeModal, setWelcomeModal] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-detect referral code from query params (works for both standard and hash routing)
  useEffect(() => {
    let refCode = '';
    // Check search params from URL
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('ref')) {
      refCode = searchParams.get('ref');
    } else if (window.location.hash.includes('?')) {
      const hashQuery = window.location.hash.split('?')[1];
      const hashParams = new URLSearchParams(hashQuery);
      if (hashParams.get('ref')) {
        refCode = hashParams.get('ref');
      }
    }
    if (refCode) {
      setReferralCode(refCode.toUpperCase());
    }
  }, [location]);

  // Resend Timer Countdown
  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  // Step 1: Send OTP to Mobile Number (with 1-Phone constraint check)
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!username || !password || !confirmPassword || !mobile) {
      setError('Please fill in all fields including Mobile Number');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const cleanPhone = mobile.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit Mobile / WhatsApp Number');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await apiRequest('/api/auth/send-otp', 'POST', {
        mobile: cleanPhone,
        action: 'register'
      });

      if (response.otp) {
        setOtpHint(response.otp);
      }
      setResendTimer(60);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Registration check failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Final Registration & Account Activation with OTP
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (!otp || otp.trim().length < 4) {
      setError('Please enter the 6-digit OTP code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cleanPhone = mobile.replace(/\D/g, '');
      const response = await apiRequest('/api/auth/register', 'POST', { 
        username: username.trim(), 
        password, 
        mobile: cleanPhone, 
        otp: otp.trim(),
        referralCode: referralCode.trim() 
      });

      setSession(response.token, response.user);
      
      setWelcomeModal({
        user: response.user,
        welcomeMessage: response.welcomeMessage || 'Welcome to Ajnabi Dil!'
      });
    } catch (err) {
      setError(err.message || 'OTP verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleForwardToWhatsApp = () => {
    const cleanPhone = (mobile || '').replace(/[^0-9]/g, '');
    const incomeDetailsText = `🎉 *Welcome to Ajnabi Dil Earning Partner Program!* \n\nHello @${username},\nAapka account successfully register ho gaya hai!\n\n💰 *Aapki Income & Earning Rates:* \n• 📞 *Voice Calls:* 1 Coin/sec (Earn 70% Share)\n• 📹 *Video Calls:* 20 Coins/10s (Earn 70% Share)\n• 🔒 *Live Private Shows:* Min 300 Coins (70% Host Share)\n• 🎁 *Virtual Live Gifts:* 70% Direct Host Commission\n• 💸 *Minimum Withdrawal:* Rs. 500 (500 Coins) via instant UPI/Bank transfer\n\nApni profile par jakar *Host KYC Verification* complete karein aur earning start karein!\nApp Link: ${window.location.origin}`;
    
    const url = `https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${encodeURIComponent(incomeDetailsText)}`;
    window.open(url, '_blank');
  };

  const handleProceedToApp = () => {
    navigate('/profile');
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-0 md:p-4">
      {/* Smartphone Outer Container */}
      <div className="w-full md:w-[420px] h-screen md:h-[860px] md:max-h-[92vh] bg-gradient-to-b from-slate-950 via-slate-900 to-black flex flex-col shadow-2xl md:rounded-[40px] md:border-[8px] md:border-slate-800 overflow-hidden relative justify-between p-6 text-white">
        
        {/* Top Header */}
        <div className="flex justify-between items-center z-10 pt-2">
          {step === 1 ? (
            <Link to="/login" className="text-slate-400 hover:text-white flex items-center gap-1 text-xs font-bold bg-white/5 px-3 py-1 rounded-full">
              <ArrowLeft size={14} />
              <span>Login</span>
            </Link>
          ) : (
            <button
              onClick={() => { setStep(1); setError(''); }}
              className="text-slate-400 hover:text-white flex items-center gap-1 text-xs font-bold bg-white/5 px-3 py-1 rounded-full"
            >
              <ArrowLeft size={14} />
              <span>Change Number</span>
            </button>
          )}

          <a
            href="/download-apk"
            download="AjnabiDil_Latest.apk"
            className="flex items-center gap-1 text-[11px] text-amber-300 font-extrabold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/40 px-3 py-1 rounded-full transition-all"
          >
            <Download size={13} />
            <span>Get APK</span>
          </a>
        </div>

        {/* Brand & Heading */}
        <div className="my-auto z-10 flex flex-col items-center">
          <img 
            src="/logo.jpg" 
            alt="Ajnabi Dil Logo" 
            className="w-16 h-16 rounded-full object-cover shadow-xl border-2 border-pink-400/80 ring-2 ring-pink-500/20 mx-auto mb-1.5"
          />
          <h2 className="text-xl font-black tracking-tight bg-gradient-to-r from-pink-200 via-rose-300 to-white bg-clip-text text-transparent">
            {step === 1 ? 'Create Account' : 'Verify Mobile Number'}
          </h2>
          <p className="text-[11px] text-slate-400">
            {step === 1 ? '1 Phone Number = 1 Account • Dil Se Dil Ka Connection' : `Enter 6-digit OTP code sent to +91 ${mobile.slice(-10)}`}
          </p>

          {error && (
            <div className="w-full bg-red-950/70 border border-red-500/50 text-red-300 text-xs px-3 py-2 rounded-2xl flex items-center gap-2 mt-2.5 text-left">
              <AlertCircle size={15} className="shrink-0 text-red-400" />
              <span className="flex-1 text-[11px]">{error}</span>
            </div>
          )}

          {/* OTP Demo/Test Hint Banner */}
          {otpHint && step === 2 && (
            <div className="w-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs px-3 py-2 rounded-2xl flex items-center justify-between mt-2.5">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400" />
                <span className="text-[11px]">OTP Code: <strong className="text-white font-mono text-sm tracking-wider">{otpHint}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setOtp(otpHint)}
                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold rounded-lg text-white"
              >
                Auto-Fill
              </button>
            </div>
          )}

          {/* Step 1: Input Registration Details */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="w-full flex flex-col gap-2 mt-3">
              <div className="flex flex-col gap-0.5 text-left">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1">Username</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <User size={15} />
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose username"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700/80 focus:border-pink-500 rounded-xl text-white placeholder-slate-500 text-xs font-medium outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-0.5 text-left">
                <div className="flex justify-between items-center pl-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    Mobile / WhatsApp (1 ID per Phone)
                  </label>
                  <span className="text-[9px] text-pink-400 font-bold flex items-center gap-0.5">
                    <ShieldCheck size={11} /> 1 ID Only
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Phone size={15} />
                  </span>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="10-digit number (e.g. 9876543210)"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700/80 focus:border-pink-500 rounded-xl text-white placeholder-slate-500 text-xs font-mono outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-0.5 text-left">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1">Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
                      <Lock size={14} />
                    </span>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full pl-8 pr-2 py-2 bg-slate-900/80 border border-slate-700/80 focus:border-pink-500 rounded-xl text-white placeholder-slate-500 text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 text-left">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1">Confirm</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
                      <Lock size={14} />
                    </span>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat"
                      className="w-full pl-8 pr-2 py-2 bg-slate-900/80 border border-slate-700/80 focus:border-pink-500 rounded-xl text-white placeholder-slate-500 text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-0.5 text-left">
                <label className="text-[9px] font-bold text-amber-400 uppercase tracking-wider pl-1 flex items-center gap-1">
                  <Gift size={11} />
                  <span>Referral Code (Optional)</span>
                </label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="Invite code for +50 free coins"
                  className="w-full px-3 py-2 bg-slate-900/80 border border-amber-500/40 focus:border-amber-400 rounded-xl text-amber-300 placeholder-slate-500 text-xs font-bold uppercase outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 mt-2 bg-gradient-to-r from-pink-600 via-rose-500 to-pink-600 hover:from-pink-500 hover:to-rose-400 text-white rounded-2xl font-black text-xs shadow-lg shadow-pink-600/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Checking & Sending OTP...' : 'Verify Mobile Number & Send OTP ➔'}</span>
              </button>
            </form>
          )}

          {/* Step 2: OTP Verification & Final Account Activation */}
          {step === 2 && (
            <form onSubmit={handleVerifyAndRegister} className="w-full flex flex-col gap-3 mt-4">
              <div className="flex flex-col gap-1 text-left">
                <div className="flex justify-between items-center pl-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Enter 6-Digit OTP Code
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
                    <KeyRound size={16} />
                  </span>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    autoFocus
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-slate-700/80 focus:border-pink-500 rounded-2xl text-white placeholder-slate-500 text-sm font-mono tracking-widest outline-none text-center"
                  />
                </div>
              </div>

              <div className="bg-pink-950/40 border border-pink-500/20 rounded-2xl p-3 text-[11px] text-slate-300 text-left">
                <p className="font-semibold text-pink-300">📱 Mobile: +91 {mobile.slice(-10)}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">OTP verify hote hi aapka account activate ho jayega aur aapko 100 Free Welcome Coins milenge!</p>
              </div>

              <div className="flex gap-2 mt-1">
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
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 text-white rounded-2xl font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
                >
                  <Check size={16} />
                  <span>{loading ? 'Activating Account...' : 'Activate Account & Finish'}</span>
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="text-center z-10 pt-2 border-t border-white/5">
          <p className="text-xs text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-pink-400 font-black hover:underline ml-1">
              Log In
            </Link>
          </p>
        </div>

        {/* Welcome Income Modal */}
        {welcomeModal && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl p-5 shadow-2xl w-full max-w-sm flex flex-col gap-3.5 border border-pink-500/30 text-white">
              
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-yellow-400 via-pink-500 to-rose-600 flex items-center justify-center text-white mx-auto shadow-md mb-2">
                  <Sparkles size={24} />
                </div>
                <h3 className="font-extrabold text-base text-white">Welcome @{welcomeModal.user.username}!</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Your Account & Income Potential Guide</p>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-2 text-xs">
                <span className="text-[9px] uppercase font-extrabold tracking-wider text-emerald-400">
                  💰 Host Earning Rates (70% Revenue Share):
                </span>
                
                <div className="flex justify-between items-center border-b border-slate-800 pb-1.5 text-slate-300">
                  <span>📞 Voice Calling:</span>
                  <span className="font-extrabold text-emerald-400">1 Coin/sec (70% Share)</span>
                </div>

                <div className="flex justify-between items-center border-b border-slate-800 pb-1.5 text-slate-300">
                  <span>📹 Video Calling:</span>
                  <span className="font-extrabold text-pink-400">20 Coins/10s (70% Share)</span>
                </div>

                <div className="flex justify-between items-center border-b border-slate-800 pb-1.5 text-slate-300">
                  <span>🔒 Live Private Shows:</span>
                  <span className="font-extrabold text-amber-400">Min 300 Coins</span>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span>💸 Bank/UPI Withdrawal:</span>
                  <span className="font-extrabold text-emerald-400">Min Rs. 500</span>
                </div>
              </div>

              {/* Direct Forward to WhatsApp Button */}
              <button
                onClick={handleForwardToWhatsApp}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-extrabold text-xs shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Send size={14} />
                <span>Forward Income Details to My WhatsApp</span>
              </button>

              {/* Continue to Profile */}
              <button
                onClick={handleProceedToApp}
                className="w-full py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-bold text-xs active:scale-95 transition-all"
              >
                Continue to App & Profile ➔
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

