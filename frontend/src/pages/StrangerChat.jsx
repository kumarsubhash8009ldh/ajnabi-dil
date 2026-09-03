import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Video, VideoOff, Mic, MicOff, RefreshCw, X, Sparkles, 
  Send, MessageSquare, Shield, Users, Radio, ChevronDown, ChevronUp, Flame, PhoneOff,
  Music, Gift
} from 'lucide-react';
import MobileLayout from '../components/MobileLayout';
import CameraMaskOverlay, { MASK_STYLES } from '../components/CameraMaskOverlay';
import BeautyControls, { getBeautyFilterCss, BEAUTY_PRESETS } from '../components/BeautyControls';
import BackgroundMusicPlayer from '../components/BackgroundMusicPlayer';
import GiftSelectorModal, { GiftAnimationOverlay } from '../components/GiftSelectorModal';
import { getSocket, initSocket, getStoredUser } from '../utils/api';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

// Simulated Friendly Strangers for Solo Testing / Instant Demo
const SIMULATED_STRANGERS = [
  {
    id: 'sim_1',
    username: 'Ananya_Verma',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
    bio: 'Hi! Love music and making new friends 💖',
    maskActive: true,
    maskStyle: 'cat',
    introMsg: 'Namaste! Kaise ho aap? Nice mask! 😊'
  },
  {
    id: 'sim_2',
    username: 'Kabir_Rathore',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
    bio: 'Tech enthusiast & gamer ⚡',
    maskActive: true,
    maskStyle: 'cyberpunk',
    introMsg: 'Hey there! Nice to meet you stranger! 🔥'
  },
  {
    id: 'sim_3',
    username: 'Zara_Princess',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80',
    bio: 'Life is beautiful ✨',
    maskActive: true,
    maskStyle: 'venetian',
    introMsg: 'Hello! Masquerade vibes look great on you! 🎭'
  }
];

export default function StrangerChat() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();

  // Local media stream state
  const [localStream, setLocalStream] = useState(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [facingMode, setFacingMode] = useState('user'); // 'user' or 'environment'

  // Connection & Queue State
  const [status, setStatus] = useState('searching'); // 'searching', 'connected', 'disconnected'
  const [stranger, setStranger] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [isInitiator, setIsInitiator] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);

  // AR Mask States (Supporting Dual Users!)
  const [myMaskActive, setMyMaskActive] = useState(true);
  const [myMaskStyle, setMyMaskStyle] = useState('venetian');
  const [strangerMaskActive, setStrangerMaskActive] = useState(true);
  const [strangerMaskStyle, setStrangerMaskStyle] = useState('cyberpunk');
  const [activePanel, setActivePanel] = useState(null); // 'mask', 'beauty', 'chat', null

  // Beauty Mode States
  const [beautyActive, setBeautyActive] = useState(true);
  const [beautyPreset, setBeautyPreset] = useState('glow');
  const [beautySettings, setBeautySettings] = useState({
    smooth: 45,
    brightness: 114,
    contrast: 105,
    saturate: 116
  });

  // In-call text messages
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');

  // Gift & Music Player States
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  const [activeFloatingGift, setActiveFloatingGift] = useState(null);
  const [userCoins, setUserCoins] = useState(currentUser?.coins || 100);

  const handleSendStrangerGift = (giftType, coins) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('stranger-gift', { giftType, coins });
      if (isSimulated) {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            { id: 'sim_reply_' + Date.now(), sender: 'stranger', text: `Aww thank you so much for the ${giftType}! You are so sweet 🥰` }
          ]);
        }, 1200);
      }
    }
  };

  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  // 1. Initialize Camera and Microphone
  useEffect(() => {
    let currentStream = null;

    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true
        });
        currentStream = stream;
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn('Camera/Mic permission notice:', err);
      }
    };

    startMedia();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [facingMode]);

  // Update local video track enabled states
  useEffect(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = cameraEnabled);
      localStream.getAudioTracks().forEach(t => t.enabled = micEnabled);
    }
  }, [cameraEnabled, micEnabled, localStream]);

  // 2. Setup Sockets and Stranger Queue
  useEffect(() => {
    const socket = initSocket();
    if (!socket) return;

    // Join stranger queue
    joinStrangerPool();

    // Event: Waiting in pool
    socket.on('stranger-waiting', () => {
      setStatus('searching');
      setStranger(null);
      // If alone after 4.5s, trigger friendly simulator for instant testing
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        connectSimulatedStranger();
      }, 4500);
    });

    // Event: Matched with real stranger!
    socket.on('stranger-matched', async (data) => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      console.log('Omegle stranger matched:', data);
      setIsSimulated(false);
      setStranger(data.peer);
      setSessionId(data.sessionId);
      setIsInitiator(data.isInitiator);
      setStatus('connected');
      setMessages([
        { id: 'sys_1', system: true, text: `Connected with @${data.peer.username}! Say Hi 👋` }
      ]);

      // Broadcast my mask state to stranger
      socket.emit('stranger-mask-update', {
        maskActive: myMaskActive,
        maskStyle: myMaskStyle
      });

      // Setup WebRTC PeerConnection
      await initWebRTC(data.isInitiator, socket);
    });

    // Event: WebRTC signaling from stranger
    socket.on('stranger-signal', async (data) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;

      try {
        if (data.signal.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.signal.sdp));
          if (data.signal.sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('stranger-signal', { signal: { sdp: answer } });
          }
        } else if (data.signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
        }
      } catch (err) {
        console.warn('WebRTC signal processing error:', err);
      }
    });

    // Event: In-call message from stranger
    socket.on('stranger-message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    // Event: Stranger updated their Camera AR Mask!
    socket.on('stranger-mask-update', (data) => {
      setStrangerMaskActive(Boolean(data.maskActive));
      if (data.maskStyle) setStrangerMaskStyle(data.maskStyle);
    });

    // Event: Stranger disconnected or skipped
    socket.on('stranger-disconnected', () => {
      handleStrangerLeft();
    });

    socket.on('stranger-skipped', () => {
      joinStrangerPool();
    });

    // Event: Gift received or sent in stranger chat
    socket.on('call-gift-received', (data) => {
      setActiveFloatingGift({
        senderName: data.senderName,
        giftType: data.giftType,
        coins: data.coins
      });
      setMessages((prev) => [
        ...prev,
        { id: 'gift_' + Date.now(), system: true, text: `🎁 @${data.senderName} sent a ${data.giftType} (🪙 ${data.coins} Coins)!` }
      ]);
    });

    socket.on('call-gift-sent', (data) => {
      if (data.newCoinsBalance !== undefined) {
        setUserCoins(data.newCoinsBalance);
      }
      setActiveFloatingGift({
        senderName: 'You',
        giftType: data.giftType,
        coins: data.coins
      });
      setMessages((prev) => [
        ...prev,
        { id: 'gift_' + Date.now(), system: true, text: `🎁 You sent a ${data.giftType} (🪙 ${data.coins} Coins)!` }
      ]);
    });

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      socket.emit('stranger-leave');
      socket.off('stranger-waiting');
      socket.off('stranger-matched');
      socket.off('stranger-signal');
      socket.off('stranger-message');
      socket.off('stranger-mask-update');
      socket.off('stranger-disconnected');
      socket.off('stranger-skipped');
      socket.off('call-gift-received');
      socket.off('call-gift-sent');
      closePeerConnection();
    };
  }, []);

  // WebRTC initialization
  const initWebRTC = async (isCaller, socket) => {
    closePeerConnection();

    try {
      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnectionRef.current = pc;

      // Add local tracks to peer connection
      if (localStream) {
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });
      }

      // Receive remote tracks
      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Send ICE candidates to stranger
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('stranger-signal', { signal: { candidate: event.candidate } });
        }
      };

      // If initiator, create and send WebRTC offer
      if (isCaller) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('stranger-signal', { signal: { sdp: offer } });
      }
    } catch (e) {
      console.warn('WebRTC init error:', e);
    }
  };

  const closePeerConnection = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  const joinStrangerPool = () => {
    closePeerConnection();
    setStatus('searching');
    setStranger(null);
    setMessages([]);
    const socket = getSocket();
    if (socket) {
      socket.emit('stranger-join-queue');
    }
    // Set fallback timeout for solo test
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      connectSimulatedStranger();
    }, 4500);
  };

  // Solo Test Fallback Simulator
  const connectSimulatedStranger = () => {
    if (status === 'connected') return;
    const randomSim = SIMULATED_STRANGERS[Math.floor(Math.random() * SIMULATED_STRANGERS.length)];
    setIsSimulated(true);
    setStranger(randomSim);
    setStatus('connected');
    setStrangerMaskActive(randomSim.maskActive);
    setStrangerMaskStyle(randomSim.maskStyle);
    setMessages([
      { id: 'sys_sim', system: true, text: `Matched with @${randomSim.username} (Interactive Companion)` },
      { id: 'msg_sim_1', senderName: randomSim.username, text: randomSim.introMsg, timestamp: new Date().toISOString() }
    ]);
  };

  const handleStrangerLeft = () => {
    closePeerConnection();
    setStatus('disconnected');
    setMessages(prev => [...prev, { id: 'sys_dc', system: true, text: 'Stranger has disconnected or skipped.' }]);
  };

  // Next / Skip Stranger
  const handleNextStranger = () => {
    const socket = getSocket();
    if (socket) {
      socket.emit('stranger-skip');
    }
    joinStrangerPool();
  };

  // Send In-call Text Message
  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!inputMessage.trim()) return;

    const text = inputMessage.trim();
    setInputMessage('');

    if (isSimulated) {
      // Add local message
      const myMsg = {
        id: 'msg_' + Date.now(),
        senderName: currentUser?.username || 'You',
        text,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, myMsg]);

      // Trigger automatic friendly reply after 1s
      setTimeout(() => {
        const replies = [
          "Wah! Aapka mask style bahut cool lag raha hai! 🎭✨",
          "Sach me? Mujhe bhi Omegle style video chat bahut pasand hai! 😄",
          "Next button se hum naye strangers se bhi mil sakte hain! 🚀",
          "Camera quality aur beauty mode bohot clear hai! 🌟"
        ];
        const replyText = replies[Math.floor(Math.random() * replies.length)];
        setMessages(prev => [
          ...prev, 
          { id: 'sim_rep_' + Date.now(), senderName: stranger?.username || 'Stranger', text: replyText, timestamp: new Date().toISOString() }
        ]);
      }, 1200);
    } else {
      const socket = getSocket();
      if (socket) {
        socket.emit('stranger-message', { text });
      }
    }
  };

  // Broadcast mask updates to stranger
  const handleToggleMyMask = () => {
    const nextVal = !myMaskActive;
    setMyMaskActive(nextVal);
    const socket = getSocket();
    if (socket && !isSimulated) {
      socket.emit('stranger-mask-update', { maskActive: nextVal, maskStyle: myMaskStyle });
    }
  };

  const handleSelectMyMaskStyle = (styleId) => {
    setMyMaskStyle(styleId);
    const socket = getSocket();
    if (socket && !isSimulated) {
      socket.emit('stranger-mask-update', { maskActive: myMaskActive, maskStyle: styleId });
    }
  };

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <MobileLayout title="Omegle Stranger Video">
      <div className="flex flex-col flex-1 h-full bg-slate-950 text-white relative overflow-hidden">

        {/* 1. TOP STATUS BAR */}
        <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2 border-b border-pink-900/30 flex items-center justify-between z-30 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-xs font-black bg-gradient-to-r from-pink-300 to-amber-300 bg-clip-text text-transparent">
              {status === 'searching' ? 'Looking for Stranger...' : `@${stranger?.username || 'Stranger'}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Next / Skip Button */}
            <button
              onClick={handleNextStranger}
              className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-md active:scale-95 transition-all"
              title="Skip to Next Stranger"
            >
              <RefreshCw size={12} className={status === 'searching' ? 'animate-spin' : ''} />
              <span>Next (अगला)</span>
            </button>

            {/* Leave Button */}
            <button
              onClick={() => navigate('/')}
              className="p-1.5 text-slate-400 hover:text-red-400 rounded-full hover:bg-white/10"
              title="Leave Stranger Video"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 2. DUAL VIDEO STAGE */}
        <div className="flex-1 flex flex-col p-2 gap-2 relative min-h-0">
          
          {/* TOP / MAIN VIEW: STRANGER'S VIDEO */}
          <div className="flex-1 relative bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center min-h-[220px]">
            {status === 'connected' ? (
              <>
                {isSimulated ? (
                  // Simulated Stranger Video / Avatar Loop
                  <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950">
                    <img
                      src={stranger.avatar}
                      alt={stranger.username}
                      className="w-full h-full object-cover filter brightness-95"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30"></div>
                  </div>
                ) : (
                  // Real WebRTC Remote Stream
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                )}

                {/* STRANGER'S AR CAMERA MASK (Dual Mask Rendering!) */}
                <CameraMaskOverlay
                  isActive={strangerMaskActive}
                  maskStyle={strangerMaskStyle}
                  label="Stranger"
                />

                {/* Stranger Info Badge */}
                <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  <span className="text-[10px] font-bold text-slate-200">@{stranger.username}</span>
                  {strangerMaskActive && (
                    <span className="text-[9px] text-amber-300 font-extrabold flex items-center gap-0.5">
                      <span>🎭</span>
                      <span>Mask On</span>
                    </span>
                  )}
                </div>
              </>
            ) : (
              // Searching Animation
              <div className="flex flex-col items-center justify-center p-6 text-center gap-3">
                <div className="relative flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-pink-500/20 animate-ping absolute"></div>
                  <div className="w-18 h-18 rounded-full bg-gradient-to-r from-pink-500 to-amber-500 flex items-center justify-center text-3xl shadow-lg relative">
                    🎲
                  </div>
                </div>
                <h3 className="font-extrabold text-sm text-white mt-2">Connecting to a Stranger...</h3>
                <p className="text-[11px] text-slate-400 max-w-[220px]">
                  Omegle mode active. Turn on your Mask or Beauty filter while waiting!
                </p>
                <div className="flex gap-2 mt-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] bg-slate-800 text-slate-300 font-semibold border border-slate-700 flex items-center gap-1">
                    <span>🎭</span> 8 Masks
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] bg-slate-800 text-slate-300 font-semibold border border-slate-700 flex items-center gap-1">
                    <span>✨</span> Beauty Mode
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM / YOUR VIDEO (Picture-in-Picture or Split) */}
          <div className="h-44 relative bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-xl flex items-center justify-center shrink-0">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{ filter: getBeautyFilterCss(beautyActive, beautyPreset, beautySettings) }}
              className="w-full h-full object-cover mirror transition-all duration-300"
            />

            {!cameraEnabled && (
              <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-2">
                <VideoOff size={24} />
                <span className="text-xs">Camera is Off</span>
              </div>
            )}

            {/* YOUR AR CAMERA MASK */}
            <CameraMaskOverlay
              isActive={myMaskActive}
              maskStyle={myMaskStyle}
              label="You"
            />

            {/* Floating Badges on Your Camera */}
            <div className="absolute bottom-2.5 left-2.5 z-20 flex items-center gap-1.5">
              <span className="bg-black/60 backdrop-blur-sm text-[9px] font-bold px-2 py-0.5 rounded-full border border-white/10 text-white">
                You ({currentUser?.username || 'Guest'})
              </span>
              {beautyActive && (
                <span className="bg-pink-500/80 backdrop-blur-sm text-[8px] font-black px-2 py-0.5 rounded-full text-white flex items-center gap-0.5">
                  <Sparkles size={8} />
                  <span>Beauty</span>
                </span>
              )}
            </div>

            {/* Camera Quick Action Toggles */}
            <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
              <button
                onClick={() => setCameraEnabled(!cameraEnabled)}
                className={`p-1.5 rounded-full backdrop-blur-md transition-all ${
                  cameraEnabled ? 'bg-black/60 text-white hover:bg-black/80' : 'bg-red-600 text-white'
                }`}
                title={cameraEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
              >
                {cameraEnabled ? <Video size={13} /> : <VideoOff size={13} />}
              </button>

              <button
                onClick={() => setMicEnabled(!micEnabled)}
                className={`p-1.5 rounded-full backdrop-blur-md transition-all ${
                  micEnabled ? 'bg-black/60 text-white hover:bg-black/80' : 'bg-red-600 text-white'
                }`}
                title={micEnabled ? 'Mute Mic' : 'Unmute Mic'}
              >
                {micEnabled ? <Mic size={13} /> : <MicOff size={13} />}
              </button>

              <button
                onClick={() => setFacingMode(facingMode === 'user' ? 'environment' : 'user')}
                className="p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-md"
                title="Flip Camera"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* 3. FLOATING / COLLAPSIBLE CONTROLS & CHAT DRAWER */}
        <div className="bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 px-3 py-2 flex flex-col gap-2 shrink-0 z-30">
          
          {/* Tab buttons to toggle Panels */}
          <div className="flex items-center justify-between gap-1">
            <button
              onClick={() => setActivePanel(activePanel === 'mask' ? null : 'mask')}
              className={`flex-1 py-1.5 px-1.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all border ${
                activePanel === 'mask' || myMaskActive
                  ? 'bg-gradient-to-r from-amber-500/20 to-pink-500/20 border-amber-400 text-amber-300 shadow-sm'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300'
              }`}
            >
              <span>🎭</span>
              <span>Mask</span>
            </button>

            <button
              onClick={() => setActivePanel(activePanel === 'beauty' ? null : 'beauty')}
              className={`flex-1 py-1.5 px-1.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all border ${
                activePanel === 'beauty' || beautyActive
                  ? 'bg-gradient-to-r from-pink-500/20 to-rose-500/20 border-pink-400 text-pink-300 shadow-sm'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300'
              }`}
            >
              <Sparkles size={11} className={beautyActive ? 'text-pink-400 animate-spin' : ''} />
              <span>Beauty</span>
            </button>

            <button
              onClick={() => setShowGiftModal(true)}
              className="py-1.5 px-2 rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1 transition-all border bg-gradient-to-tr from-pink-600 to-amber-500 text-white border-pink-400 shadow-sm active:scale-95"
              title="Send Virtual Gift with Coins"
            >
              <Gift size={11} />
              <span>Gift</span>
            </button>

            <button
              onClick={() => setShowMusicPlayer(!showMusicPlayer)}
              className={`py-1.5 px-2 rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1 transition-all border ${
                showMusicPlayer
                  ? 'bg-pink-600 border-pink-400 text-white'
                  : 'bg-slate-800/80 border-slate-700 text-pink-300'
              }`}
              title="Play Phone Songs"
            >
              <Music size={11} />
              <span>Songs</span>
            </button>

            <button
              onClick={() => setActivePanel(activePanel === 'chat' ? null : 'chat')}
              className={`flex-1 py-1.5 px-1.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all border ${
                activePanel === 'chat'
                  ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300'
              }`}
            >
              <MessageSquare size={11} />
              <span>Chat {messages.length > 0 && `(${messages.length})`}</span>
            </button>
          </div>

          {/* PANEL 1: MASK SELECTOR */}
          {activePanel === 'mask' && (
            <div className="animate-fade-in">
              <CameraMaskOverlay
                isActive={myMaskActive}
                maskStyle={myMaskStyle}
                onToggle={handleToggleMyMask}
                onSelectStyle={handleSelectMyMaskStyle}
                interactive={true}
                isDualMode={strangerMaskActive}
              />
            </div>
          )}

          {/* PANEL 2: BEAUTY SELECTOR */}
          {activePanel === 'beauty' && (
            <div className="animate-fade-in">
              <BeautyControls
                isActive={beautyActive}
                preset={beautyPreset}
                onToggle={() => setBeautyActive(!beautyActive)}
                onSelectPreset={(p) => setBeautyPreset(p)}
                customSettings={beautySettings}
                onChangeCustomSettings={(s) => setBeautySettings(s)}
              />
            </div>
          )}

          {/* PANEL 3: LIVE TEXT CHAT (Omegle style) */}
          {activePanel === 'chat' && (
            <div className="flex flex-col gap-2 max-h-56 bg-slate-950/80 rounded-2xl p-2.5 border border-slate-800 animate-fade-in">
              {/* Message List */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 text-xs pr-1 max-h-36 scrollbar-thin">
                {messages.length === 0 ? (
                  <div className="text-center py-4 text-slate-500 text-[11px]">
                    No messages yet. Send a message to stranger below!
                  </div>
                ) : (
                  messages.map((m, idx) => (
                    <div
                      key={m.id || idx}
                      className={`flex flex-col ${
                        m.system
                          ? 'items-center my-1'
                          : m.senderName === (currentUser?.username || 'You')
                          ? 'items-end'
                          : 'items-start'
                      }`}
                    >
                      {m.system ? (
                        <span className="text-[10px] bg-slate-800/80 text-slate-400 px-2.5 py-0.5 rounded-full border border-slate-700">
                          {m.text}
                        </span>
                      ) : (
                        <div
                          className={`max-w-[80%] rounded-2xl px-3 py-1.5 shadow ${
                            m.senderName === (currentUser?.username || 'You')
                              ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-br-none'
                              : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                          }`}
                        >
                          <span className="text-[9px] font-bold opacity-75 block">
                            {m.senderName === (currentUser?.username || 'You') ? 'You' : `@${m.senderName}`}
                          </span>
                          <span className="text-[11px]">{m.text}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Box */}
              <form onSubmit={handleSendMessage} className="flex gap-1.5 pt-1 border-t border-slate-800">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Stranger ko message likhein..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim()}
                  className="bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white p-2 rounded-xl transition-all shadow"
                >
                  <Send size={13} />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Virtual Gift Flying Animation Overlay */}
        <GiftAnimationOverlay gift={activeFloatingGift} onFinish={() => setActiveFloatingGift(null)} />

        {/* Virtual Gift Selector Modal */}
        <GiftSelectorModal
          isOpen={showGiftModal}
          onClose={() => setShowGiftModal(false)}
          onSendGift={handleSendStrangerGift}
          userCoins={userCoins}
        />

        {/* Phone Storage Audio Songs Player Modal */}
        {showMusicPlayer && (
          <div className="fixed inset-x-3 bottom-20 z-50 max-w-sm mx-auto animate-slide-up">
            <BackgroundMusicPlayer isCall={true} onClose={() => setShowMusicPlayer(false)} />
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
