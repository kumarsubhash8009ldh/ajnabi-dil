import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, PhoneOff, Video, MessageSquare, X, ArrowRight, Bell } from 'lucide-react';
import { getSocket, initSocket } from '../utils/api';
import PolicyWarningModal from './PolicyWarningModal';

// Web Audio API Ringtone & Chime Sound Synthesizer
class SoundEffects {
  static ctx = null;
  static ringtoneInterval = null;

  static init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  static playMessageChime() {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const now = this.ctx.currentTime;
      // Tone 1: 587Hz (D5)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Tone 2: 880Hz (A5)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.35, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);
    } catch (e) {
      console.warn('Audio chime notice:', e);
    }
  }

  static startCallRingtone() {
    this.stopCallRingtone();
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const playBurst = () => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [0, 0.2, 0.4].forEach((offset) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(offset % 0.4 === 0 ? 520 : 660, now + offset);
          gain.gain.setValueAtTime(0.28, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.16);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.18);
        });
      };

      playBurst();
      this.ringtoneInterval = setInterval(playBurst, 2200);
    } catch (e) {
      console.warn('Call ringtone notice:', e);
    }
  }

  static stopCallRingtone() {
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }
}

export default function GlobalNotificationToast() {
  const [activeCall, setActiveCall] = useState(null);
  const [messageToast, setMessageToast] = useState(null);
  const [policyWarning, setPolicyWarning] = useState(null);
  const navigate = useNavigate();
  const toastTimeoutRef = useRef(null);

  useEffect(() => {
    const socket = initSocket();
    if (!socket) return;

    // Incoming Call Listener
    const handleIncomingCall = (data) => {
      console.log('Global incoming call alert:', data);
      setActiveCall(data);
      SoundEffects.startCallRingtone();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 400]);
      }
    };

    // Call Accepted or Ended elsewhere
    const handleCallEnded = () => {
      setActiveCall(null);
      SoundEffects.stopCallRingtone();
    };

    // New Direct Message Listener
    const handleNewMessage = (msgData) => {
      console.log('Global message notification:', msgData);
      SoundEffects.playMessageChime();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }

      setMessageToast(msgData);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setMessageToast(null);
      }, 6500);
    };

    // Policy Violation Warning & Account Suspension Listeners
    const handlePolicyWarning = (data) => {
      console.log('Global policy violation alert:', data);
      setPolicyWarning(data);
    };

    const handleAccountSuspended = (data) => {
      console.log('Global account suspension alert:', data);
      setPolicyWarning({
        warningNumber: 3,
        isSuspended: true,
        reason: data.reason || 'Account suspended for community guidelines violations.'
      });
    };

    socket.on('incoming-call', handleIncomingCall);
    socket.on('call-ended', handleCallEnded);
    socket.on('call-rejected', handleCallEnded);
    socket.on('new-message-notification', handleNewMessage);
    socket.on('policy-violation-warning', handlePolicyWarning);
    socket.on('account-suspended', handleAccountSuspended);

    return () => {
      socket.off('incoming-call', handleIncomingCall);
      socket.off('call-ended', handleCallEnded);
      socket.off('call-rejected', handleCallEnded);
      socket.off('new-message-notification', handleNewMessage);
      socket.off('policy-violation-warning', handlePolicyWarning);
      socket.off('account-suspended', handleAccountSuspended);
      SoundEffects.stopCallRingtone();
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const handleAcceptCall = () => {
    SoundEffects.stopCallRingtone();
    const callData = activeCall;
    setActiveCall(null);
    navigate('/calls', { state: { autoAcceptCall: callData } });
  };

  const handleDeclineCall = () => {
    SoundEffects.stopCallRingtone();
    const socket = getSocket();
    if (socket && activeCall) {
      socket.emit('reject-call', { callerId: activeCall.callerId, type: activeCall.type });
    }
    setActiveCall(null);
  };

  const handleOpenChat = (userId) => {
    setMessageToast(null);
    navigate(`/chat/dm/${userId}`);
  };

  return (
    <>
      {/* 1. INCOMING CALL FLOATING CARD MODAL */}
      {activeCall && (
        <div className="fixed top-3 left-1/2 transform -translate-x-1/2 w-[92%] max-w-[390px] z-50 animate-bounce-short">
          <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-neutral-900 border-2 border-emerald-500/80 rounded-3xl p-4 shadow-[0_12px_35px_rgba(16,185,129,0.45)] text-white flex flex-col gap-3 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Incoming {activeCall.type === 'video' ? 'Video Call' : 'Audio Call'}...</span>
              </span>
              <button
                onClick={handleDeclineCall}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="relative">
                <img
                  src={activeCall.callerAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=caller'}
                  alt={activeCall.callerName}
                  className="w-13 h-13 rounded-2xl object-cover border-2 border-emerald-400 shadow-md"
                />
                <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-1 rounded-full shadow">
                  {activeCall.type === 'video' ? <Video size={10} /> : <Phone size={10} />}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-base truncate text-white">{activeCall.callerName}</h3>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <span>Aapko call kar rahe hain...</span>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-1">
              <button
                onClick={handleDeclineCall}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-red-600/90 hover:bg-red-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md"
              >
                <PhoneOff size={16} />
                <span>Decline</span>
              </button>

              <button
                onClick={handleAcceptCall}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-lg shadow-emerald-950"
              >
                <Phone size={16} />
                <span>Accept</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MESSAGE FLOATING TOAST ALERT */}
      {messageToast && !activeCall && (
        <div className="fixed top-3 left-1/2 transform -translate-x-1/2 w-[92%] max-w-[390px] z-50 animate-slide-down">
          <div
            onClick={() => handleOpenChat(messageToast.senderId)}
            className="bg-slate-900/95 border border-pink-500/50 hover:border-pink-400 rounded-2xl p-3.5 shadow-[0_10px_25px_rgba(236,72,153,0.3)] text-white flex items-center gap-3 backdrop-blur-xl cursor-pointer transition-all active:scale-98"
          >
            <div className="relative shrink-0">
              <img
                src={messageToast.senderAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=sender'}
                alt={messageToast.senderName}
                className="w-11 h-11 rounded-xl object-cover border border-pink-400/60 shadow"
              />
              <span className="absolute -bottom-1 -right-1 bg-pink-500 text-white p-0.5 rounded-full">
                <MessageSquare size={10} />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-xs text-pink-300 truncate">{messageToast.senderName}</h4>
                <span className="text-[9px] text-slate-400">Just now</span>
              </div>
              <p className="text-xs text-slate-200 truncate mt-0.5">
                {messageToast.content || (messageToast.mediaType === 'image' ? '📷 Photo' : 'New message')}
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-1">
              <span className="text-[10px] font-bold text-pink-400 bg-pink-950/80 border border-pink-800 px-2 py-1 rounded-xl flex items-center gap-1">
                <span>Reply</span>
                <ArrowRight size={10} />
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMessageToast(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-full"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. POLICY WARNING & SUSPENSION MODAL */}
      <PolicyWarningModal
        warningData={policyWarning}
        onClose={() => setPolicyWarning(null)}
      />
    </>
  );
}
