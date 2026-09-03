import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { apiRequest, getSocket, getStoredUser, setSession, initSocket } from '../utils/api';

const CallContext = createContext(null);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};

// Web Audio API Dual-Tone Multi-Frequency (DTMF) Ringtone Generator
class RingtonePlayer {
  constructor() {
    this.audioCtx = null;
    this.timer = null;
    this.isPlaying = false;
  }

  playRing() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.audioCtx = new AudioContext();

      const beep = () => {
        if (!this.isPlaying || !this.audioCtx) return;
        try {
          const osc1 = this.audioCtx.createOscillator();
          const osc2 = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(440, this.audioCtx.currentTime);
          osc2.frequency.setValueAtTime(480, this.audioCtx.currentTime);

          gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 1.8);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc1.start();
          osc2.start();
          osc1.stop(this.audioCtx.currentTime + 1.8);
          osc2.stop(this.audioCtx.currentTime + 1.8);
        } catch (e) {}
      };

      beep();
      this.timer = setInterval(beep, 3500);
    } catch (e) {}
  }

  stopRing() {
    this.isPlaying = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch (e) {}
      this.audioCtx = null;
    }
  }
}

const ringtone = new RingtonePlayer();

export function CallProvider({ children }) {
  const [callState, setCallState] = useState({
    status: 'idle', // 'idle' | 'calling' | 'incoming' | 'active'
    type: 'audio', // 'audio' | 'video'
    otherUser: null,
    isCaller: false
  });

  const [callTime, setCallTime] = useState(0);
  const [userCoins, setUserCoins] = useState(100);
  const callTimerRef = useRef(null);
  const callStartTimeRef = useRef(null);
  const totalDeductedCoinsRef = useRef(0);
  const callTimeRef = useRef(0);

  // Sync initial coin balance from stored user profile
  useEffect(() => {
    const user = getStoredUser();
    if (user && user.coins !== undefined) {
      setUserCoins(Number(user.coins));
    }
  }, []);

  // Call duration counter
  useEffect(() => {
    if (callState.status === 'active') {
      callStartTimeRef.current = Date.now();
      totalDeductedCoinsRef.current = 0;
      callTimeRef.current = 0;
      callTimerRef.current = setInterval(() => {
        setCallTime((prev) => {
          const next = prev + 1;
          callTimeRef.current = next;
          return next;
        });
      }, 1000);
    } else {
      setCallTime(0);
      callTimeRef.current = 0;
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [callState.status]);

  // Ringtone playback during calling or incoming
  useEffect(() => {
    if (callState.status === 'incoming' || callState.status === 'calling') {
      ringtone.playRing();
    } else {
      ringtone.stopRing();
    }
    return () => ringtone.stopRing();
  }, [callState.status]);

  // Global socket listener for calling events
  useEffect(() => {
    const socket = initSocket();
    if (!socket) return;

    // 1. Incoming call from another user
    const handleIncomingCall = (data) => {
      console.log('Incoming call received:', data);
      setCallState({
        status: 'incoming',
        type: data.type || 'video',
        otherUser: {
          id: data.callerId,
          username: data.callerName,
          avatar: data.callerAvatar,
          voiceCallRate: Number(data.callerVoiceRate) || 5,
          videoCallRate: Number(data.callerVideoRate) || 8
        },
        isCaller: false
      });
    };

    // 2. Call accepted by receiver
    const handleCallAccepted = (data) => {
      console.log('Call accepted by peer:', data);
      setCallState((prev) => ({
        ...prev,
        status: 'active'
      }));
    };

    // 3. Receiver confirms call is started
    const handleCallStarted = (data) => {
      console.log('Call started for receiver:', data);
      setCallState((prev) => ({
        ...prev,
        status: 'active'
      }));
    };

    // 4. Call declined / rejected
    const handleCallRejected = (data) => {
      alert(data?.reason || 'Call was declined by user.');
      setCallState({
        status: 'idle',
        type: 'audio',
        otherUser: null,
        isCaller: false
      });
    };

    // 5. Call ended by either peer
    const handleCallEnded = (data) => {
      finalizeCallBilling();
      if (data?.reason === 'insufficient_coins') {
        alert('Call disconnected: Insufficient coins in wallet.');
      }
      setCallState({
        status: 'idle',
        type: 'audio',
        otherUser: null,
        isCaller: false
      });
    };

    // 6. Call failed (e.g. user is offline)
    const handleCallFailed = (data) => {
      alert(`Call failed: ${data?.reason || 'User busy or unavailable'}`);
      setCallState({
        status: 'idle',
        type: 'audio',
        otherUser: null,
        isCaller: false
      });
    };

    socket.on('incoming-call', handleIncomingCall);
    socket.on('call-accepted', handleCallAccepted);
    socket.on('call-started', handleCallStarted);
    socket.on('call-rejected', handleCallRejected);
    socket.on('call-ended', handleCallEnded);
    socket.on('call-failed', handleCallFailed);

    return () => {
      socket.off('incoming-call', handleIncomingCall);
      socket.off('call-accepted', handleCallAccepted);
      socket.off('call-started', handleCallStarted);
      socket.off('call-rejected', handleCallRejected);
      socket.off('call-ended', handleCallEnded);
      socket.off('call-failed', handleCallFailed);
    };
  }, []);

  // Finalize call charges based on exact duration rules
  const finalizeCallBilling = async (durationSecOverride) => {
    if (!callState.isCaller || !callState.otherUser || !callStartTimeRef.current) return;
    const durationSec = durationSecOverride !== undefined 
      ? durationSecOverride 
      : Math.max(callTimeRef.current, Math.floor((Date.now() - callStartTimeRef.current) / 1000));
    callStartTimeRef.current = null;

    let requiredCoins = 0;
    if (callState.type === 'audio') {
      // Audio Call Rules:
      // Under 20s: 0 coins (free / trial)
      // 20s to 30s: 3 coins exactly
      // > 30s: 5 coins per minute (Rs. 5 / min)
      if (durationSec >= 20 && durationSec <= 30) {
        requiredCoins = 3;
      } else if (durationSec > 30) {
        const minutes = Math.ceil(durationSec / 60);
        requiredCoins = minutes * 5;
      } else {
        requiredCoins = 0;
      }
    } else {
      // Video Call Rules: Rs. 8 / min (8 coins per minute)
      const minutes = Math.max(1, Math.ceil(durationSec / 60));
      requiredCoins = minutes * 8;
    }

    const remainingCoins = requiredCoins - totalDeductedCoinsRef.current;
    if (remainingCoins > 0) {
      try {
        const response = await apiRequest('/api/wallet/deduct', 'POST', {
          coins: remainingCoins,
          receiverId: callState.otherUser.id
        });
        totalDeductedCoinsRef.current += remainingCoins;
        setUserCoins(response.coins);
        const token = localStorage.getItem('chitchat_token');
        const storedUser = getStoredUser();
        setSession(token, { ...storedUser, coins: response.coins });
      } catch (err) {
        console.warn('Call finalize billing deduction note:', err);
      }
    }
  };

  // Periodic coin deduction for the caller (60-second intervals)
  useEffect(() => {
    let interval = null;
    const rate = callState.type === 'video' ? 8 : 5;

    if (callState.status === 'active' && callState.isCaller && callState.otherUser) {
      interval = setInterval(async () => {
        try {
          const response = await apiRequest('/api/wallet/deduct', 'POST', {
            coins: rate,
            receiverId: callState.otherUser.id
          });

          totalDeductedCoinsRef.current += rate;
          setUserCoins(response.coins);
          const token = localStorage.getItem('chitchat_token');
          const storedUser = getStoredUser();
          setSession(token, { ...storedUser, coins: response.coins });

          if (response.coins < rate) {
            clearInterval(interval);
            const socket = getSocket();
            if (socket) {
              socket.emit('insufficient-coins-end', { otherUserId: callState.otherUser.id });
            }
            endCall();
            alert('Call disconnected: Insufficient coins. Please recharge your wallet!');
          }
        } catch (err) {
          console.error('Failed to deduct coins during call:', err);
          endCall();
        }
      }, 60000); // 1-minute interval
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState.status, callState.isCaller, callState.otherUser, callState.type]);

  // Initiate call
  const startCall = (targetUser, type = 'audio') => {
    const minRequired = type === 'audio' ? 3 : 8;
    const user = getStoredUser();
    const currentBalance = user?.coins !== undefined ? user.coins : userCoins;

    if (currentBalance < minRequired) {
      const confirmRecharge = window.confirm(
        `⚠️ Insufficient coins (Minimum ${minRequired} Coins required for ${type === 'video' ? 'Video Call (Rs.8/min)' : 'Voice Call (Rs.5/min, 20-30s @ 3 coins)'}). Would you like to recharge?`
      );
      if (confirmRecharge && typeof window !== 'undefined') {
        window.location.hash = '#/wallet';
      }
      return false;
    }

    const socket = getSocket() || initSocket();
    if (socket) {
      socket.emit('initiate-call', {
        receiverId: targetUser.id,
        type: type
      });

      setCallState({
        status: 'calling',
        type: type,
        otherUser: targetUser,
        isCaller: true
      });
      return true;
    }
    return false;
  };

  // Accept incoming call
  const acceptCall = () => {
    const socket = getSocket();
    if (socket && callState.otherUser) {
      socket.emit('accept-call', {
        callerId: callState.otherUser.id,
        type: callState.type
      });
      setCallState((prev) => ({
        ...prev,
        status: 'active'
      }));
    }
  };

  // Reject incoming call
  const rejectCall = () => {
    const socket = getSocket();
    if (socket && callState.otherUser) {
      socket.emit('reject-call', {
        callerId: callState.otherUser.id,
        type: callState.type
      });
    }
    setCallState({
      status: 'idle',
      type: 'audio',
      otherUser: null,
      isCaller: false
    });
  };

  // End active or outgoing call
  const endCall = () => {
    finalizeCallBilling(callTimeRef.current);
    const socket = getSocket();
    if (socket && callState.otherUser) {
      socket.emit('end-call', {
        otherUserId: callState.otherUser.id,
        duration: callTimeRef.current,
        type: callState.type
      });
    }
    setCallState({
      status: 'idle',
      type: 'audio',
      otherUser: null,
      isCaller: false
    });
  };

  return (
    <CallContext.Provider
      value={{
        callState,
        callTime,
        userCoins,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        setUserCoins
      }}
    >
      {children}
    </CallContext.Provider>
  );
}
