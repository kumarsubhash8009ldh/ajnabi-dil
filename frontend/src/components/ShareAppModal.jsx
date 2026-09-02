import React, { useState } from 'react';
import { Share2, Copy, Check, X, MessageCircle, Download, Smartphone, Sparkles, Send } from 'lucide-react';
import { getStoredUser } from '../utils/api';

export default function ShareAppModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);
  const user = getStoredUser();
  const referralCode = user?.referralCode || user?.username?.toUpperCase() || 'AJNABIDIL';

  if (!isOpen) return null;

  // Generate dynamic share URL based on current host/browser
  const getAppShareUrl = () => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      const pathname = window.location.pathname;
      return `${origin}${pathname}#/register?ref=${referralCode}`;
    }
    return `https://ajnabidil.app/#/register?ref=${referralCode}`;
  };

  const shareUrl = getAppShareUrl();
  const shareTitle = "💖 Ajnabi Dil - Real Voice & Video Dating App";
  const shareMessage = `💖 *Ajnabi Dil App - Free Voice & Video Dating!* 💖\n\nDirect real-time 1-on-1 audio/video calling, live streams, voice chat rooms and fun dating!\n\n🎁 Register with my referral code: *${referralCode}* to get FREE bonus coins!\n\n👉 *Join directly on Chrome/Browser & App here:* \n${shareUrl}`;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareMessage,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Share dismissed or failed:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleWhatsAppShare = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
    window.open(waUrl, '_blank');
  };

  const handleTelegramShare = () => {
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareMessage)}`;
    window.open(tgUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-950 to-black rounded-3xl border border-pink-500/30 p-5 text-white shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Top Glow */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition-colors z-10"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-center mb-5 relative z-10">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-400 flex items-center justify-center shadow-lg shadow-pink-500/30 ring-2 ring-pink-400/40">
            <Share2 size={28} className="text-white animate-bounce duration-1000" />
          </div>
          <h2 className="text-xl font-black bg-gradient-to-r from-pink-200 via-rose-300 to-white bg-clip-text text-transparent">
            Share Ajnabi Dil
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Invite friends to join on Web Chrome or Mobile App & earn bonus coins!
          </p>
        </div>

        {/* Referral Badge */}
        <div className="bg-pink-950/40 border border-pink-500/30 rounded-2xl p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-400" />
            <div>
              <p className="text-[10px] text-pink-300 font-semibold uppercase tracking-wider">Your Referral Code</p>
              <p className="text-base font-black text-amber-300 tracking-wider">{referralCode}</p>
            </div>
          </div>
          <button
            onClick={handleCopyLink}
            className="px-3 py-1.5 bg-pink-600/50 hover:bg-pink-600 text-xs font-bold rounded-xl border border-pink-400/30 flex items-center gap-1 transition-all"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Quick Share Buttons */}
        <div className="space-y-2.5 mb-5">
          {/* WhatsApp Direct */}
          <button
            onClick={handleWhatsAppShare}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 active:scale-98 transition-all"
          >
            <MessageCircle size={20} className="fill-current" />
            <span>Share on WhatsApp</span>
          </button>

          {/* Native Android/iOS Mobile Share */}
          {typeof navigator !== 'undefined' && navigator.share && (
            <button
              onClick={handleNativeShare}
              className="w-full py-3 px-4 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-pink-600/20 active:scale-98 transition-all"
            >
              <Share2 size={18} />
              <span>Share via Other Apps</span>
            </button>
          )}

          {/* Telegram / Social Share */}
          <button
            onClick={handleTelegramShare}
            className="w-full py-2.5 px-4 bg-sky-600/80 hover:bg-sky-500 font-semibold text-xs rounded-2xl flex items-center justify-center gap-2 border border-sky-400/30 transition-all"
          >
            <Send size={16} />
            <span>Share on Telegram / Messages</span>
          </button>
        </div>

        {/* Share Link Box */}
        <div className="bg-black/60 border border-slate-800 rounded-2xl p-2.5 flex items-center gap-2">
          <input 
            type="text"
            readOnly
            value={shareUrl}
            className="bg-transparent text-xs text-slate-300 w-full outline-none truncate px-1 select-all"
          />
          <button
            onClick={handleCopyLink}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-pink-300 rounded-xl transition-colors shrink-0"
            title="Copy URL"
          >
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
          </button>
        </div>

        {/* Web Chrome & APK Access Note */}
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-center gap-4 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Smartphone size={13} className="text-pink-400" /> Mobile APK
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <span className="text-amber-400">🌐</span> Chrome & Web
          </span>
        </div>
      </div>
    </div>
  );
}
