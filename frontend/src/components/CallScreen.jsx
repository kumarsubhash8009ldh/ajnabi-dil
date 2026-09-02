import React, { useEffect, useState, useRef } from 'react';
import { Phone, PhoneOff, Video, Mic, Volume2, Sparkles, Music, X } from 'lucide-react';
import BackgroundMusicPlayer from './BackgroundMusicPlayer';

export default function CallScreen({ callState, onHangup, onAccept, onReject, coins }) {
  const { status, type, otherUser } = callState;
  const [callTime, setCallTime] = useState(0);
  const [localStream, setLocalStream] = useState(null);
  const [beautyFilter, setBeautyFilter] = useState('glow'); // 'none', 'glow', 'rosy', 'golden', 'glam'
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  const videoRef = useRef(null);

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

  // Timer for active call
  useEffect(() => {
    let interval = null;
    if (status === 'active') {
      interval = setInterval(() => {
        setCallTime((prev) => prev + 1);
      }, 1000);
    } else {
      setCallTime(0);
    }
    return () => clearInterval(interval);
  }, [status]);

  // Request camera for video calls
  useEffect(() => {
    if (status === 'active' && type === 'video') {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then((stream) => {
          setLocalStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.warn('Camera access denied or unavailable:', err);
        });
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
    };
  }, [status, type]);

  // Format timer text
  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (status === 'idle') return null;

  return (
    <div className="absolute inset-0 bg-slate-950 z-50 flex flex-col justify-between p-6 text-white text-center">
      
      {/* 1. OUTGOING CALLING STATE */}
      {status === 'calling' && (
        <>
          <div className="mt-16 flex flex-col items-center">
            <div className="relative flex items-center justify-center">
              {/* Pulsating circles */}
              <div className="absolute w-32 h-32 bg-primary-500/20 rounded-full animate-ping"></div>
              <div className="absolute w-24 h-24 bg-primary-500/30 rounded-full animate-pulse"></div>
              <img 
                src={otherUser?.avatar} 
                alt="Avatar" 
                className="w-20 h-20 bg-slate-800 rounded-3xl object-cover relative border border-slate-700"
              />
            </div>
            <h3 className="font-extrabold text-xl mt-6">{otherUser?.username}</h3>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5 justify-center">
              {type === 'video' ? <Video size={14} /> : <Phone size={14} />}
              <span>Ringing...</span>
            </p>
          </div>

          <div className="mb-12 flex justify-center">
            <button
              onClick={onHangup}
              className="w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-900/40 active:scale-95 transition-transform"
            >
              <PhoneOff size={28} />
            </button>
          </div>
        </>
      )}

      {/* 2. INCOMING CALLING STATE */}
      {status === 'incoming' && (
        <>
          <div className="mt-16 flex flex-col items-center">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-32 h-32 bg-green-500/20 rounded-full animate-ping"></div>
              <div className="absolute w-24 h-24 bg-green-500/30 rounded-full animate-pulse"></div>
              <img 
                src={otherUser?.avatar} 
                alt="Avatar" 
                className="w-20 h-20 bg-slate-800 rounded-3xl object-cover relative border border-slate-700"
              />
            </div>
            <h3 className="font-extrabold text-xl mt-6">{otherUser?.username}</h3>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5 justify-center">
              {type === 'video' ? <Video size={14} /> : <Phone size={14} />}
              <span>Incoming {type} call...</span>
            </p>
            {otherUser?.callRate !== undefined && (
              <span className="text-[10px] bg-primary-950 text-primary-300 font-bold px-3 py-1 rounded-full border border-primary-800 mt-3">
                🪙 Earning: {type === 'video' ? `${otherUser.callRate * 2}c / 10s` : `${otherUser.callRate}c / min`}
              </span>
            )}
          </div>

          <div className="mb-12 flex justify-center gap-10 items-center">
            {/* Reject Button */}
            <button
              onClick={onReject}
              className="w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-900/40 active:scale-95 transition-transform"
            >
              <PhoneOff size={28} />
            </button>

            {/* Accept Button */}
            <button
              onClick={onAccept}
              className="w-16 h-16 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-green-900/40 active:scale-95 transition-transform"
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
          <div className="mt-4 flex flex-col items-center gap-1 shrink-0">
            <h3 className="font-bold text-lg">{otherUser?.username}</h3>
            <span className="text-xs font-mono font-bold text-green-400 bg-green-950/80 border border-green-800/80 px-3 py-1 rounded-full">
              {formatTime(callTime)}
            </span>
            {coins !== undefined && (
              <span className="text-[10px] text-yellow-400 font-bold mt-1">
                🪙 Wallet: {coins} Coins
              </span>
            )}
          </div>

          {/* Video or Audio Visual Center Area */}
          <div className="flex-1 flex flex-col items-center justify-center my-2 relative max-h-[300px] w-full">
            {type === 'video' ? (
              <div className="relative w-full h-full max-w-[280px] bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
                {/* Local Camera Video Stream Preview with Filter */}
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  style={{ filter: getBeautyFilterStyle() }}
                  className="w-full h-full object-cover mirror transition-all duration-300"
                />
                
                {/* Fallback avatar overlay if camera disabled */}
                {!localStream && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 gap-2">
                    <img 
                      src={otherUser?.avatar} 
                      alt="Avatar" 
                      className="w-20 h-20 bg-slate-800 rounded-3xl object-cover border border-slate-700"
                    />
                    <span className="text-[10px] text-slate-400">Connecting video stream...</span>
                  </div>
                )}
                
                {/* Live Connected Badge */}
                <span className="absolute top-3 left-3 bg-red-600 text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                  <span>Video Call</span>
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-36 h-36 bg-primary-500/10 rounded-full animate-ping"></div>
                  <div className="absolute w-28 h-28 bg-primary-500/20 rounded-full animate-pulse"></div>
                  <img 
                    src={otherUser?.avatar} 
                    alt="Avatar" 
                    className="w-24 h-24 bg-slate-800 rounded-3xl object-cover relative border border-slate-700 shadow-xl"
                  />
                </div>
                <span className="text-xs text-slate-400 mt-4 font-semibold flex items-center gap-1.5">
                  <Mic size={14} className="text-green-400 animate-pulse" />
                  <span>Audio Connected</span>
                </span>
              </div>
            )}
          </div>

          {/* Beauty Filter Selector Controls (For Video Calls) */}
          {type === 'video' && (
            <div className="bg-slate-900/60 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-800/80 flex flex-col gap-1.5 mx-1 shrink-0">
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

          {/* Active Call Controls */}
          <div className="mb-4 flex flex-col items-center gap-3">
            <div className="flex items-center justify-center gap-4">
              <button 
                onClick={() => setShowMusicPlayer(!showMusicPlayer)}
                className={`w-11 h-11 rounded-full flex items-center justify-center border active:scale-95 transition-all shadow-md ${
                  showMusicPlayer 
                    ? 'bg-pink-600 border-pink-500 text-white animate-pulse' 
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-pink-400'
                }`}
                title="Play Background Indian Songs"
              >
                <Music size={18} />
              </button>

              <button className="w-11 h-11 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center border border-slate-700 active:scale-95 transition-transform text-slate-300">
                <Mic size={18} />
              </button>
              
              <button
                onClick={onHangup}
                className="w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                <PhoneOff size={24} />
              </button>
              
              <button className="w-11 h-11 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center border border-slate-700 active:scale-95 transition-transform text-slate-300">
                <Volume2 size={18} />
              </button>
            </div>
            
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">End Session</span>
          </div>

          {/* Background Music & Songs Player Overlay */}
          {showMusicPlayer && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <BackgroundMusicPlayer isCall={true} onClose={() => setShowMusicPlayer(false)} />
            </div>
          )}
        </>
      )}

    </div>
  );
}
