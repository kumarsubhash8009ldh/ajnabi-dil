import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  Download, 
  Smartphone, 
  Globe, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Star, 
  Users, 
  Radio, 
  PhoneCall, 
  MessageSquare, 
  Share2, 
  ArrowRight,
  Gift,
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';
import { getBaseUrl, apiRequest } from '../utils/api';

export default function DownloadPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const refCode = searchParams.get('ref') || searchParams.get('code') || '';
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [liveInfo, setLiveInfo] = useState(null);

  useEffect(() => {
    // Fetch live server & app info
    apiRequest('/api/app/info')
      .then((data) => setLiveInfo(data))
      .catch(() => {});
  }, []);

  const getApkUrl = () => {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/download-apk`;
  };

  const handleDownload = () => {
    setDownloading(true);
    const link = document.createElement('a');
    link.href = getApkUrl();
    link.download = 'AjnabiDil_Latest.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloading(false);
    }, 2000);
  };

  const handleLaunchWeb = () => {
    if (refCode) {
      navigate(`/register?ref=${encodeURIComponent(refCode)}`);
    } else {
      navigate('/login');
    }
  };

  const handleCopyRef = () => {
    if (refCode && navigator.clipboard) {
      navigator.clipboard.writeText(refCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/40 to-black text-white flex flex-col items-center justify-between p-4 selection:bg-pink-500 selection:text-white relative overflow-x-hidden">
      {/* Top Ambient Glow */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-tr from-pink-600/30 to-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-20 w-72 h-72 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md my-auto pt-6 pb-8 relative z-10">
        
        {/* App Logo & Branding */}
        <div className="text-center mb-6">
          <div className="relative inline-block mb-3">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-tr from-pink-600 via-rose-500 to-amber-400 p-1 shadow-2xl shadow-pink-500/40 animate-pulse">
              <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center overflow-hidden">
                <span className="text-4xl select-none">💖</span>
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-emerald-500 to-green-600 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border-2 border-slate-950 shadow-md">
              v2.5.0
            </div>
          </div>

          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-pink-200 via-rose-300 to-amber-200 bg-clip-text text-transparent">
            Ajnabi Dil
          </h1>
          <p className="text-sm font-semibold text-pink-400 tracking-wide mt-0.5">
            अजनबी दिल • Dil Se Dil Ka Connection
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Realtime 1-on-1 Voice, Video & Dating Platform
          </p>
        </div>

        {/* Badges Bar */}
        <div className="grid grid-cols-3 gap-2 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-2.5 mb-5 backdrop-blur-md text-center">
          <div className="flex flex-col items-center">
            <div className="flex items-center text-amber-400 text-xs font-bold gap-0.5">
              <Star size={13} className="fill-amber-400" /> 4.9 / 5
            </div>
            <span className="text-[10px] text-slate-400">User Rating</span>
          </div>
          <div className="flex flex-col items-center border-x border-slate-800">
            <div className="flex items-center text-pink-400 text-xs font-bold gap-0.5">
              <Users size={13} /> 50K+
            </div>
            <span className="text-[10px] text-slate-400">Active Users</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center text-emerald-400 text-xs font-bold gap-0.5">
              <ShieldCheck size={13} /> 100% Safe
            </div>
            <span className="text-[10px] text-slate-400">Verified APK</span>
          </div>
        </div>

        {/* Referral Bonus Notice if Ref code exists */}
        {refCode && (
          <div className="bg-gradient-to-r from-pink-950/70 via-rose-950/60 to-purple-950/70 border border-pink-500/40 rounded-2xl p-3.5 mb-5 backdrop-blur-md shadow-lg shadow-pink-950/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-400/30 flex items-center justify-center text-pink-300">
                  <Gift size={20} className="animate-bounce" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-pink-300 uppercase tracking-wider">
                    Friend Referral Applied!
                  </p>
                  <p className="text-sm font-black text-amber-300">
                    +50 Free Coins Bonus
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-black/40 border border-pink-500/30 px-2.5 py-1 rounded-xl">
                <span className="text-xs font-mono font-bold text-pink-200">{refCode}</span>
                <button onClick={handleCopyRef} className="text-pink-400 hover:text-white transition-colors">
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Action Buttons */}
        <div className="space-y-3 mb-6">
          {/* Direct Download Android APK */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full py-4 px-5 bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 hover:from-pink-500 hover:to-amber-400 text-white font-black text-base rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-pink-600/30 active:scale-[0.98] transition-all border border-pink-400/30 group"
          >
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Download size={20} className={downloading ? 'animate-bounce' : ''} />
            </div>
            <div className="text-left">
              <div className="leading-tight flex items-center gap-1.5">
                <span>Download Android APK</span>
                <span className="bg-amber-400/30 text-amber-200 text-[10px] px-1.5 py-0.2 rounded font-bold">FREE</span>
              </div>
              <div className="text-[11px] font-normal text-pink-100/80">
                {downloading ? 'Starting Download...' : 'Direct Fast Download (~740 KB)'}
              </div>
            </div>
          </button>

          {/* Instant Launch in Web Browser */}
          <button
            onClick={handleLaunchWeb}
            className="w-full py-3.5 px-5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-bold text-sm rounded-2xl flex items-center justify-center gap-2.5 border border-slate-700/80 shadow-lg active:scale-[0.98] transition-all"
          >
            <Globe size={18} className="text-cyan-400" />
            <span>Open Instant Web App (No Download)</span>
            <ArrowRight size={16} className="text-slate-400 ml-auto" />
          </button>
        </div>

        {/* 3-Step Simple Android Install Guide */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 mb-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <Smartphone size={16} className="text-pink-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              How to Install APK on Android
            </h3>
          </div>

          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 font-bold flex items-center justify-center shrink-0 text-[11px] border border-pink-500/30">
                1
              </span>
              <p>Click <strong className="text-pink-300">"Download Android APK"</strong> button above.</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 font-bold flex items-center justify-center shrink-0 text-[11px] border border-pink-500/30">
                2
              </span>
              <p>Open downloaded file. If Chrome prompts <em>"Install Unknown Apps"</em>, tap <strong>Settings &rarr; Allow</strong>.</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 font-bold flex items-center justify-center shrink-0 text-[11px] border border-pink-500/30">
                3
              </span>
              <p>Tap <strong>Install</strong>, open Ajnabi Dil, and enjoy live calls & dating!</p>
            </div>
          </div>
        </div>

        {/* Highlights Features Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-6">
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-pink-600/20 text-pink-400 flex items-center justify-center shrink-0">
              <PhoneCall size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">1-on-1 Calls</p>
              <p className="text-[10px] text-slate-400">Audio & HD Video</p>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center shrink-0">
              <Radio size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">Live Streams</p>
              <p className="text-[10px] text-slate-400">Gifts & Comments</p>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center shrink-0">
              <MessageSquare size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">Voice Rooms</p>
              <p className="text-[10px] text-slate-400">Group Audio Party</p>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center shrink-0">
              <Sparkles size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">Virtual Shop</p>
              <p className="text-[10px] text-slate-400">Badges & Gifts</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-2 text-[11px] text-slate-500">
          <p>© 2026 Ajnabi Dil. All rights reserved.</p>
          <div className="mt-1 flex items-center justify-center gap-3">
            <Link to="/login" className="hover:text-pink-400 transition-colors">Login</Link>
            <span>•</span>
            <Link to="/register" className="hover:text-pink-400 transition-colors">Register</Link>
            <span>•</span>
            <Link to="/help" className="hover:text-pink-400 transition-colors">Help & Support</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
