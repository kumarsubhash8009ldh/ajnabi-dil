import React, { useEffect, useState, useRef } from 'react';
import { 
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Volume2, VolumeX, 
  Sparkles, Music, Gift, RefreshCw, AlertCircle
} from 'lucide-react';
import BackgroundMusicPlayer from './BackgroundMusicPlayer';
import CameraMaskOverlay, { MASK_STYLES } from './CameraMaskOverlay';
import GiftSelectorModal, { GiftAnimationOverlay } from './GiftSelectorModal';
import { getSocket } from '../utils/api';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

export default function CallScreen({ callState, onHangup, onAccept, onReject, coins, callTime = 0 }) {
  const { status, type, otherUser, isCaller } = callState;
  
  // Media streams & WebRTC
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connecting' | 'connected' | 'failed'

  // Visuals & Filters
  const [beautyFilter, setBeautyFilter] = useState('glow');
  const [maskActive, setMaskActive] = useState(false);
  const [maskStyle, setMaskStyle] = useState('venetian');
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [activeFloatingGift, setActiveFloatingGift] = useState(null);
  const [currentCoins, setCurrentCoins] = useState(coins || 100);

  // HTML5 Media element refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const peerConnectionRef = useRef(null);

  const getBeautyFilterStyle = () => {
    switch (beautyFilter) {
      case 'glow':
        return 'brightness(1.14) contrast(1.06) saturate(1.15) blur(0.35px)';
      case 'rosy':
        return 'brightness(1.15) contrast(1.08) saturate(1.3) hue-rotate(-8deg) blur(0.35px)';
      case 'golden':
        return 'brightness(1.1) contrast(1.12) saturate(1.35) sepia(0.2) hue-rotate(5deg) blur(0.3px)';
      case 'glam':
        return 'brightness(1.2) contrast(1.15) saturate(1.22) blur(0.45px)';
      default:
        return 'none';
    }
  };

  // 1. WebRTC Setup when Call becomes Active
  useEffect(() => {
    if (status !== 'active') return;

    let isCancelled = false;
    const socket = getSocket();

    const startWebRTC = async () => {
      try {
        setConnectionStatus('connecting');

        const audioConstraints = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        };

        // Request user media
        let stream = null;
        if (type === 'video') {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
              audio: audioConstraints
            });
          } catch (e) {
            console.warn('Camera error, falling back to audio only:', e);
            stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: audioConstraints });
          }
        } else {
          stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: audioConstraints });
        }

        if (isCancelled) {
          if (stream) stream.getTracks().forEach(t => t.stop());
          return;
        }

        setLocalStream(stream);

        // Attach local preview
        if (localVideoRef.current && type === 'video') {
          localVideoRef.current.srcObject = stream;
        }

        // Initialize PeerConnection
        const pc = new RTCPeerConnection(RTC_CONFIG);
        peerConnectionRef.current = pc;

        // Add local tracks to peer connection
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });

        // Remote track received
        pc.ontrack = (event) => {
          console.log('[WebRTC] Received remote stream track:', event.track.kind);
          let remote = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
          setRemoteStream(remote);
          setConnectionStatus('connected');

          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remote;
          }
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remote;
            remoteAudioRef.current.volume = 1.0;
            remoteAudioRef.current.play().catch(e => console.warn('Audio auto-play gesture:', e));
          }
        };

        // ICE candidate generated -> send via socket
        pc.onicecandidate = (event) => {
          if (event.candidate && socket && otherUser?.id) {
            socket.emit('call-signal', {
              targetUserId: otherUser.id,
              signal: { candidate: event.candidate }
            });
          }
        };

        pc.onconnectionstatechange = () => {
          console.log('[WebRTC] Connection state:', pc.connectionState);
          if (pc.connectionState === 'connected') {
            setConnectionStatus('connected');
          } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            setConnectionStatus('failed');
          }
        };

        // If caller, initiate SDP Offer
        if (isCaller) {
          console.log('[WebRTC] Creating caller SDP offer...');
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: type === 'video'
          });
          await pc.setLocalDescription(offer);

          if (socket && otherUser?.id) {
            socket.emit('call-signal', {
              targetUserId: otherUser.id,
              signal: { sdp: offer }
            });
          }
        }

      } catch (err) {
        console.error('[WebRTC] Media / Connection error:', err);
        setConnectionStatus('failed');
      }
    };

    startWebRTC();

    // Candidate queue to prevent dropped ICE candidates before setRemoteDescription
    const iceQueue = [];

    // Listen for peer WebRTC signals
    const handleCallSignal = async (data) => {
      const pc = peerConnectionRef.current;
      if (!pc || !data || !data.signal) return;

      try {
        if (data.signal.sdp) {
          const sdp = data.signal.sdp;
          console.log('[WebRTC] Received SDP signal:', sdp.type);
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));

          // Flush queued candidates
          while (iceQueue.length > 0) {
            const cand = iceQueue.shift();
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {
              console.warn('[WebRTC] Error flushing candidate:', e);
            }
          }

          if (sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            if (socket && otherUser?.id) {
              socket.emit('call-signal', {
                targetUserId: otherUser.id,
                signal: { sdp: answer }
              });
            }
          }
        } else if (data.signal.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
          } else {
            iceQueue.push(data.signal.candidate);
          }
        }
      } catch (e) {
        console.warn('[WebRTC] Signal handling error:', e);
      }
    };

    if (socket) {
      socket.on('call-signal', handleCallSignal);
    }

    return () => {
      isCancelled = true;
      if (socket) {
        socket.off('call-signal', handleCallSignal);
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
      setLocalStream(null);
      setRemoteStream(null);
    };
  }, [status, type, isCaller, otherUser?.id]);

  // Handle local video ref assignment when stream changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Handle remote video & audio assignment
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Microphone toggle
  const toggleMic = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextState = !micMuted;
        audioTracks.forEach(t => { t.enabled = !nextState; });
        setMicMuted(nextState);
      }
    }
  };

  // Camera toggle (video calls)
  const toggleCamera = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        const nextState = !cameraOff;
        videoTracks.forEach(t => { t.enabled = !nextState; });
        setCameraOff(nextState);
      }
    }
  };

  // Flip Camera (Front / Back)
  const flipCamera = async () => {
    if (type !== 'video' || !localStream) return;
    try {
      const newMode = facingMode === 'user' ? 'environment' : 'user';
      setFacingMode(newMode);

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newMode },
        audio: true
      });

      // Replace video track in RTCPeerConnection
      const newVideoTrack = newStream.getVideoTracks()[0];
      const pc = peerConnectionRef.current;
      if (pc && newVideoTrack) {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(newVideoTrack);
        }
      }

      // Stop old video track
      localStream.getVideoTracks().forEach(t => t.stop());
      setLocalStream(newStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }
    } catch (e) {
      console.warn('Camera flip error:', e);
    }
  };

  // Speaker toggle
  const toggleSpeaker = () => {
    const nextState = !speakerMuted;
    setSpeakerMuted(nextState);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = nextState;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = nextState;
    }
  };

  // Socket listeners for virtual call gifts
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onGiftRecv = (data) => {
      setActiveFloatingGift({
        senderName: data.senderName,
        giftType: data.giftType,
        coins: data.coins
      });
    };

    const onGiftSent = (data) => {
      if (data.newCoinsBalance !== undefined) {
        setCurrentCoins(data.newCoinsBalance);
      }
      setActiveFloatingGift({
        senderName: 'You',
        giftType: data.giftType,
        coins: data.coins
      });
    };

    socket.on('call-gift-received', onGiftRecv);
    socket.on('call-gift-sent', onGiftSent);

    return () => {
      socket.off('call-gift-received', onGiftRecv);
      socket.off('call-gift-sent', onGiftSent);
    };
  }, []);

  const handleSendCallGift = (giftType, giftCoins) => {
    const socket = getSocket();
    if (socket && otherUser?.id) {
      socket.emit('send-call-gift', {
        receiverId: otherUser.id,
        giftType: giftType,
        coins: giftCoins
      });
    }
  };

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (status === 'idle') return null;

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col justify-between p-6 text-white text-center select-none">
      
      {/* Hidden HTML5 Audio Element for Remote Audio Streaming */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* 1. OUTGOING CALLING STATE */}
      {status === 'calling' && (
        <>
          <div className="mt-16 flex flex-col items-center">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-36 h-36 bg-pink-500/20 rounded-full animate-ping"></div>
              <div className="absolute w-28 h-28 bg-pink-500/30 rounded-full animate-pulse"></div>
              <img 
                src={otherUser?.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=user'} 
                alt="Avatar" 
                className="w-24 h-24 bg-slate-800 rounded-3xl object-cover relative border-2 border-pink-400 shadow-2xl"
              />
            </div>
            <h3 className="font-extrabold text-2xl mt-6">{otherUser?.username || 'User'}</h3>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5 justify-center">
              {type === 'video' ? <Video size={14} className="text-pink-400" /> : <Phone size={14} className="text-emerald-400" />}
              <span className="font-bold text-pink-300">Ringing...</span>
            </p>
            <span className="text-[10px] bg-pink-950/80 text-pink-300 font-bold px-3.5 py-1 rounded-full border border-pink-700/60 mt-4">
              🪙 Rate: {type === 'video' ? '8 Coins / min' : '5 Coins / min'}
            </span>
          </div>

          <div className="mb-12 flex justify-center">
            <button
              onClick={onHangup}
              className="w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-900/60 active:scale-95 transition-transform"
              title="Cancel Call"
            >
              <PhoneOff size={28} />
            </button>
          </div>
        </>
      )}

      {/* 2. INCOMING CALLING STATE */}
      {(status === 'incoming' || status === 'ringing') && (
        <>
          <div className="mt-16 flex flex-col items-center">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-36 h-36 bg-green-500/20 rounded-full animate-ping"></div>
              <div className="absolute w-28 h-28 bg-green-500/30 rounded-full animate-pulse"></div>
              <img 
                src={otherUser?.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=caller'} 
                alt="Avatar" 
                className="w-24 h-24 bg-slate-800 rounded-3xl object-cover relative border-2 border-green-400 shadow-2xl"
              />
            </div>
            <h3 className="font-extrabold text-2xl mt-6">{otherUser?.username || 'Caller'}</h3>
            <p className="text-xs text-green-300 mt-2 flex items-center gap-1.5 justify-center font-bold">
              {type === 'video' ? <Video size={16} className="text-pink-400" /> : <Phone size={16} className="text-green-400" />}
              <span>Incoming {type === 'video' ? 'Video' : 'Voice'} Call...</span>
            </p>
            <span className="text-[10px] bg-green-950 text-green-300 font-bold px-3.5 py-1 rounded-full border border-green-700/60 mt-4">
              🪙 Rate: {type === 'video' ? '8c / min' : '5c / min'}
            </span>
          </div>

          <div className="mb-12 flex justify-center gap-12 items-center">
            {/* Reject Button */}
            <button
              onClick={onReject}
              className="w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-900/50 active:scale-95 transition-transform"
              title="Decline Call"
            >
              <PhoneOff size={28} />
            </button>

            {/* Accept Button */}
            <button
              onClick={onAccept}
              className="w-16 h-16 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-green-900/50 active:scale-95 transition-transform animate-bounce"
              title="Accept Call"
            >
              <Phone size={28} />
            </button>
          </div>
        </>
      )}

      {/* 3. ACTIVE CONNECTED CALL STATE */}
      {status === 'active' && (
        <>
          {/* Header Info */}
          <div className="mt-2 flex flex-col items-center gap-1 shrink-0 z-20">
            <h3 className="font-extrabold text-lg flex items-center gap-2">
              <span>{otherUser?.username || 'User'}</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold uppercase">
                {connectionStatus === 'connected' ? 'Connected' : 'Connecting...'}
              </span>
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-3 py-0.5 rounded-full">
                {formatTime(callTime)}
              </span>
              {coins !== undefined && (
                <span className="text-[10px] text-yellow-400 font-black bg-yellow-950/60 border border-yellow-800/60 px-2.5 py-0.5 rounded-full">
                  🪙 {coins} Coins
                </span>
              )}
            </div>
          </div>

          {/* Video or Audio Stage */}
          <div className="flex-1 flex flex-col items-center justify-center my-2 relative w-full overflow-hidden rounded-3xl">
            {type === 'video' ? (
              <div className="relative w-full h-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
                
                {/* 1. Main Stage: Remote User Video Stream */}
                {remoteStream ? (
                  <video 
                    ref={remoteVideoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3">
                    <img 
                      src={otherUser?.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=user'} 
                      alt="Avatar" 
                      className="w-24 h-24 bg-slate-800 rounded-3xl object-cover border border-slate-700"
                    />
                    <span className="text-xs text-slate-400 animate-pulse">Connecting video stream...</span>
                  </div>
                )}

                {/* 2. Floating Picture-in-Picture: Local Camera Preview */}
                <div className="absolute top-3 right-3 w-28 h-36 bg-slate-950 rounded-2xl overflow-hidden border-2 border-pink-500 shadow-xl z-20">
                  {cameraOff ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 text-[10px]">
                      <VideoOff size={16} />
                      <span>Camera Off</span>
                    </div>
                  ) : (
                    <video 
                      ref={localVideoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      style={{ filter: getBeautyFilterStyle() }}
                      className="w-full h-full object-cover mirror"
                    />
                  )}
                  {/* PiP AR Mask */}
                  <CameraMaskOverlay
                    isActive={maskActive}
                    maskStyle={maskStyle}
                    label="You"
                  />
                </div>

                {/* Live Badge */}
                <span className="absolute top-3 left-3 bg-red-600 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow z-20">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                  <span>HD Video Call</span>
                </span>
              </div>
            ) : (
              /* Voice Call Screen */
              <div className="flex flex-col items-center justify-center my-auto">
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-44 h-44 bg-emerald-500/10 rounded-full animate-ping"></div>
                  <div className="absolute w-36 h-36 bg-emerald-500/20 rounded-full animate-pulse"></div>
                  <img 
                    src={otherUser?.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=user'} 
                    alt="Avatar" 
                    className="w-28 h-28 bg-slate-800 rounded-3xl object-cover relative border-2 border-emerald-400 shadow-2xl"
                  />
                </div>
                <span className="text-xs text-slate-300 mt-6 font-bold flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-4 py-1.5 rounded-full">
                  <Mic size={14} className="text-emerald-400 animate-pulse" />
                  <span>Voice Connected • High Definition</span>
                </span>
              </div>
            )}
          </div>

          {/* Beauty Filter Selector Controls (For Video Calls) */}
          {type === 'video' && (
            <div className="bg-slate-900/60 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-800/80 flex flex-col gap-1.5 mx-1 shrink-0 z-20">
              <span className="text-[8px] uppercase tracking-wider text-pink-300 font-extrabold text-left pl-1 flex items-center gap-1">
                <Sparkles size={10} />
                <span>Beauty Camera Filter</span>
              </span>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                {[
                  { id: 'none', label: 'Off', icon: '⚪' },
                  { id: 'glow', label: 'Radiant', icon: '🌸' },
                  { id: 'rosy', label: 'Rosy Pink', icon: '💖' },
                  { id: 'golden', label: 'Golden Hour', icon: '🌅' },
                  { id: 'glam', label: 'Glam Luxe', icon: '💎' },
                ].map((bf) => (
                  <button
                    key={bf.id}
                    onClick={() => setBeautyFilter(bf.id)}
                    className={`flex-1 py-1 px-2 rounded-xl text-[9px] font-bold flex items-center justify-center gap-1 transition-all shrink-0 border ${
                      beautyFilter === bf.id
                        ? 'bg-gradient-to-r from-pink-600 to-rose-600 border-pink-400 text-white shadow-sm'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{bf.icon}</span>
                    <span>{bf.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AR Mask Selector Controls (For Video Calls) */}
          {type === 'video' && (
            <div className="bg-slate-900/60 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-800/80 flex flex-col gap-1.5 mx-1 shrink-0 z-20">
              <div className="flex justify-between items-center px-1">
                <span className="text-[8px] uppercase tracking-wider text-amber-300 font-extrabold text-left flex items-center gap-1">
                  <span>🎭</span>
                  <span>Face AR Mask</span>
                </span>
                <button
                  onClick={() => setMaskActive(!maskActive)}
                  className={`text-[9px] font-black px-2 py-0.5 rounded-full transition-all border ${
                    maskActive ? 'bg-amber-500 text-slate-950 border-amber-300' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {maskActive ? 'MASK ON' : 'MASK OFF'}
                </button>
              </div>
              {maskActive && (
                <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                  {MASK_STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setMaskStyle(style.id)}
                      className={`flex-1 py-1 px-2 rounded-xl text-[9px] font-bold flex items-center justify-center gap-1 transition-all shrink-0 border ${
                        maskStyle === style.id
                          ? 'bg-gradient-to-r from-amber-500 to-pink-500 border-amber-300 text-white shadow-sm'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>{style.icon}</span>
                      <span>{style.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Active Call Controls */}
          <div className="mb-2 flex flex-col items-center gap-2 z-20">
            <div className="flex items-center justify-center gap-3">
              
              {/* Virtual Gift Button */}
              <button 
                onClick={() => setShowGiftModal(true)}
                className="w-11 h-11 rounded-full bg-gradient-to-tr from-pink-600 via-rose-600 to-amber-500 text-white flex items-center justify-center border border-pink-400/50 active:scale-95 transition-all shadow-lg animate-bounce"
                title="Send Virtual Gift with Coins"
              >
                <Gift size={18} />
              </button>

              {/* Music Player */}
              <button 
                onClick={() => setShowMusicPlayer(!showMusicPlayer)}
                className={`w-11 h-11 rounded-full flex items-center justify-center border active:scale-95 transition-all shadow-md ${
                  showMusicPlayer 
                    ? 'bg-pink-600 border-pink-500 text-white animate-pulse' 
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-pink-400'
                }`}
                title="Play Background Songs"
              >
                <Music size={18} />
              </button>

              {/* Mute Mic Button */}
              <button 
                onClick={toggleMic}
                className={`w-11 h-11 rounded-full flex items-center justify-center border active:scale-95 transition-transform ${
                  micMuted 
                    ? 'bg-red-600/80 border-red-500 text-white' 
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                }`}
                title={micMuted ? 'Unmute Mic' : 'Mute Mic'}
              >
                {micMuted ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              {/* Camera On/Off (Video Calls) */}
              {type === 'video' && (
                <button 
                  onClick={toggleCamera}
                  className={`w-11 h-11 rounded-full flex items-center justify-center border active:scale-95 transition-transform ${
                    cameraOff 
                      ? 'bg-red-600/80 border-red-500 text-white' 
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  }`}
                  title={cameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
                >
                  {cameraOff ? <VideoOff size={18} /> : <Video size={18} />}
                </button>
              )}

              {/* Flip Camera (Video Calls) */}
              {type === 'video' && (
                <button 
                  onClick={flipCamera}
                  className="w-11 h-11 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center border border-slate-700 active:scale-95 transition-transform text-slate-200"
                  title="Flip Camera (Front / Back)"
                >
                  <RefreshCw size={18} />
                </button>
              )}

              {/* Speaker Mute/Unmute */}
              <button 
                onClick={toggleSpeaker}
                className={`w-11 h-11 rounded-full flex items-center justify-center border active:scale-95 transition-transform ${
                  speakerMuted 
                    ? 'bg-red-600/80 border-red-500 text-white' 
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                }`}
                title={speakerMuted ? 'Unmute Speaker' : 'Mute Speaker'}
              >
                {speakerMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              {/* End Call Button */}
              <button
                onClick={onHangup}
                className="w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-900/60 active:scale-95 transition-transform"
                title="End Call"
              >
                <PhoneOff size={24} />
              </button>
            </div>
            
            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">End Session</span>
          </div>

          {/* Background Music & Songs Player Overlay */}
          {showMusicPlayer && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <BackgroundMusicPlayer isCall={true} onClose={() => setShowMusicPlayer(false)} />
            </div>
          )}

          {/* Virtual Gift Flying Animation Overlay */}
          <GiftAnimationOverlay gift={activeFloatingGift} onFinish={() => setActiveFloatingGift(null)} />

          {/* Virtual Gift Selector Modal */}
          <GiftSelectorModal
            isOpen={showGiftModal}
            onClose={() => setShowGiftModal(false)}
            onSendGift={handleSendCallGift}
            userCoins={currentCoins}
          />
        </>
      )}

    </div>
  );
}
