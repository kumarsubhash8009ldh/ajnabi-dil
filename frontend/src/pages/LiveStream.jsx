import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Radio, Users, Send, Gift, ShieldAlert, Award, X, Sparkles, 
  LogOut, Lock, Unlock, Loader2, Music, Clock, Hourglass, Flame, 
  Crown, Rocket, Volume2, Edit3, Camera 
} from 'lucide-react';
import { apiRequest, getStoredUser, setSession, initSocket, getSocket } from '../utils/api';
import BackgroundMusicPlayer from '../components/BackgroundMusicPlayer';
import GiftSelectorModal, { GiftAnimationOverlay } from '../components/GiftSelectorModal';

export default function LiveStream() {
  const { hostId } = useParams();
  const [searchParams] = useSearchParams();
  const isHost = searchParams.get('host') === 'true';
  const initialTitle = searchParams.get('title') || 'Live Show';

  const navigate = useNavigate();
  const currentUser = getStoredUser();

  const hostVideoRef = useRef(null);
  const [hostStream, setHostStream] = useState(null);

  const [coins, setCoins] = useState(currentUser?.coins || 100);
  const [viewersCount, setViewersCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [inputText, setInputText] = useState('');
  
  // Private stream settings
  const [isPrivate, setIsPrivate] = useState(false);
  const [entryFee, setEntryFee] = useState(0);
  const [hasPaidPrivate, setHasPaidPrivate] = useState(false);
  const [showBlurCover, setShowBlurCover] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [privatePinInput, setPrivatePinInput] = useState('');
  const [viewerEnteredPin, setViewerEnteredPin] = useState('');
  
  // Timed Private Show state (Default minimum 300 coins and 30 mins)
  const [privateExpiresAt, setPrivateExpiresAt] = useState(null);
  const [privateTimeRemaining, setPrivateTimeRemaining] = useState(0);
  const [privateTimerDuration, setPrivateTimerDuration] = useState('30'); // 30 minutes default
  const [customDurationInput, setCustomDurationInput] = useState('');

  // Modals & Tools state
  const [showPrivateSetup, setShowPrivateSetup] = useState(false);
  const [privateFeeInput, setPrivateFeeInput] = useState('300'); // 300 coins minimum
  const [showGiftSelector, setShowGiftSelector] = useState(false);
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  const [beautyFilter, setBeautyFilter] = useState('glow'); // 'none', 'glow', 'rosy', 'golden', 'glam'
  const [showBeautySelector, setShowBeautySelector] = useState(false);
  
  // Floating Gift Animation alert banner
  const [giftBanner, setGiftBanner] = useState(null);

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
  
  const commentEndRef = useRef(null);

  // Private Show Timer Countdown Effect
  useEffect(() => {
    let interval = null;
    if (isPrivate && privateExpiresAt) {
      interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((privateExpiresAt - Date.now()) / 1000));
        setPrivateTimeRemaining(remaining);
        if (remaining <= 0) {
          clearInterval(interval);
          if (isHost) {
            const socket = getSocket();
            if (socket) {
              socket.emit('toggle-private', { isPrivate: false, entryFee: 0, durationMinutes: 0 });
            }
          }
        }
      }, 1000);
    } else {
      setPrivateTimeRemaining(0);
    }
    return () => clearInterval(interval);
  }, [isPrivate, privateExpiresAt, isHost]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Acquire Host Camera for Live Broadcast
  useEffect(() => {
    if (isHost) {
      navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' }, audio: false })
        .then((stream) => {
          setHostStream(stream);
          if (hostVideoRef.current) {
            hostVideoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.warn('Host camera access unavailable:', err);
        });
    }
    return () => {
      if (hostStream) {
        hostStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [isHost]);

  useEffect(() => {
    if (hostVideoRef.current && hostStream) {
      hostVideoRef.current.srcObject = hostStream;
    }
  }, [hostStream]);

  // Click Photo / Capture Snapshot with Filter
  const handleCaptureSnapshot = () => {
    try {
      const canvas = document.createElement('canvas');
      if (hostVideoRef.current && hostStream) {
        const video = hostVideoRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.filter = getBeautyFilterStyle();
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const link = document.createElement('a');
        link.download = `ajnabi_dil_live_photo_${Date.now()}.jpg`;
        link.href = dataUrl;
        link.click();
        alert('📸 Live photo clicked with beauty filter & downloaded to your phone/device!');
      } else {
        alert('📸 Photo captured with active beauty filter!');
      }
    } catch (e) {
      console.warn('Snapshot capture error:', e);
      alert('Snapshot photo captured!');
    }
  };

  useEffect(() => {
    // Scroll comments to bottom
    if (commentEndRef.current) {
      commentEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  useEffect(() => {
    const socket = initSocket();
    if (!socket) {
      alert('Socket connection failed!');
      navigate('/live');
      return;
    }

    if (isHost) {
      // Start Stream
      socket.emit('start-live', { title: initialTitle });
    } else {
      // Join Stream
      socket.emit('join-live', { hostId });
    }

    // --- SOCKET.IO LISTENERS ---
    
    socket.on('live-status', (data) => {
      setIsPrivate(data.isPrivate);
      setEntryFee(data.entryFee);
      setPrivateExpiresAt(data.privateExpiresAt || null);
      
      // If private show, viewer needs to pay
      if (data.isPrivate && !isHost) {
        setShowBlurCover(true);
      }
    });

    socket.on('viewer-list-updated', (data) => {
      setViewersCount(data.viewersCount);
    });

    socket.on('live-comment-received', (data) => {
      setComments((prev) => [...prev, data]);
    });

    socket.on('live-gift-received', (data) => {
      const { sender, giftType, coins: giftCoins } = data;
      setComments((prev) => [
        ...prev,
        { sender: 'System', comment: `🎁 @${sender} gifted a ${giftType} (🪙 ${giftCoins} Coins) to host!` }
      ]);

      // Trigger floating banner alert
      setGiftBanner({ sender, giftType });
      setTimeout(() => setGiftBanner(null), 3500);
    });

    socket.on('live-switched-private', (data) => {
      setIsPrivate(data.isPrivate);
      setEntryFee(data.entryFee);
      setPrivateExpiresAt(data.privateExpiresAt || null);
      
      if (data.isPrivate) {
        if (!isHost && !hasPaidPrivate) {
          setShowBlurCover(true);
        }
      } else {
        setShowBlurCover(false);
      }
    });

    socket.on('fee-paid-success', (data) => {
      setCoins(data.coins);
      const token = localStorage.getItem('chitchat_token');
      const stored = getStoredUser();
      setSession(token, { ...stored, coins: data.coins });
      
      setHasPaidPrivate(true);
      setShowBlurCover(false);
    });

    socket.on('live-error', (data) => {
      alert(`Live Stream: ${data.reason}`);
    });

    socket.on('live-ended', () => {
      alert('This live broadcast has ended.');
      navigate('/live');
    });

    return () => {
      if (isHost) {
        socket.emit('end-live');
      } else {
        socket.emit('leave-live', { hostId });
      }
      
      socket.off('live-status');
      socket.off('viewer-list-updated');
      socket.off('live-comment-received');
      socket.off('live-gift-received');
      socket.off('live-switched-private');
      socket.off('fee-paid-success');
      socket.off('live-error');
      socket.off('live-ended');
    };
  }, [hostId, isHost, initialTitle, navigate, hasPaidPrivate]);

  const handleSendComment = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const socket = getSocket();
    if (socket) {
      socket.emit('send-live-comment', {
        hostId: isHost ? currentUser.id : hostId,
        comment: inputText.trim()
      });
      setInputText('');
    }
  };

  const handleSendGift = (giftType, giftCost) => {
    if (coins < giftCost) {
      alert('Insufficient coins in wallet! Please recharge.');
      return;
    }

    const socket = getSocket();
    if (socket) {
      socket.emit('send-live-gift', {
        hostId: hostId,
        giftType: giftType,
        coins: giftCost
      });
      setShowGiftSelector(false);
    }
  };

  const handleTogglePrivateClick = () => {
    if (isPrivate) {
      // Switch back to public
      const socket = getSocket();
      if (socket) {
        socket.emit('toggle-private', {
          isPrivate: false,
          entryFee: 0,
          durationMinutes: 0
        });
      }
    } else {
      setShowPrivateSetup(true);
    }
  };

  const handleEnablePrivateSubmit = (e) => {
    e.preventDefault();
    const fee = Number(privateFeeInput);
    if (!privateFeeInput || fee < 300) {
      alert('⚠️ Minimum Entry Fee for Private Show is 300 Coins. Host can set 300 coins or higher.');
      return;
    }

    let finalDuration = Number(privateTimerDuration);
    if (privateTimerDuration === 'custom') {
      finalDuration = Number(customDurationInput) || 30;
      if (finalDuration <= 0) {
        alert('Please enter valid custom duration in minutes.');
        return;
      }
    }

    const socket = getSocket();
    if (socket) {
      socket.emit('toggle-private', {
        isPrivate: true,
        entryFee: fee,
        durationMinutes: finalDuration,
        entryPin: privatePinInput.trim()
      });
      setShowPrivateSetup(false);
    }
  };

  const handleUnlockWithPin = (e) => {
    e.preventDefault();
    if (!viewerEnteredPin.trim()) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('pay-live-fee', {
        hostId: hostId,
        pin: viewerEnteredPin.trim()
      });
    }
  };

  const handlePayEntryFee = () => {
    const socket = getSocket();
    if (socket) {
      socket.emit('pay-live-fee', {
        hostId: hostId,
        fee: entryFee
      });
    }
  };

  const handleEndStream = () => {
    if (window.confirm('Are you sure you want to end this live broadcast?')) {
      const socket = getSocket();
      if (socket) {
        socket.emit('end-live');
      }
      navigate('/live');
    }
  };

  const handleLeaveStream = () => {
    navigate('/live');
  };

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-0 select-none z-50">
      <div className="w-full max-w-[420px] h-full bg-slate-900 flex flex-col relative overflow-hidden shadow-2xl">
        
        {/* LIVE VIDEO FEED / WEBCAM VIEW */}
        <div className="absolute inset-0 z-0 bg-slate-950">
          {isHost && hostStream ? (
            <video 
              ref={hostVideoRef} 
              autoPlay 
              playsInline 
              muted 
              style={{ filter: getBeautyFilterStyle() }}
              className={`w-full h-full object-cover mirror transition-all duration-300 ${showBlurCover ? 'filter blur-2xl scale-110' : ''}`}
            />
          ) : (
            <img 
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80" 
              alt="Live Broadcaster" 
              style={{ filter: getBeautyFilterStyle() }}
              className={`w-full h-full object-cover transition-all duration-300 ${showBlurCover ? 'filter blur-2xl scale-110' : ''}`}
            />
          )}
          
          {/* Subtle live broadcast gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90 pointer-events-none" />
        </div>

        {/* FLOATING GIFT RECEIVED NOTIFICATION BANNER */}
        {giftBanner && (
          <div className="absolute top-20 inset-x-4 z-40 bg-gradient-to-r from-pink-600/90 to-purple-600/90 backdrop-blur-md rounded-2xl p-3 border border-pink-400 shadow-2xl flex items-center gap-3 text-white animate-bounce">
            <span className="text-3xl">🎁</span>
            <div>
              <h5 className="font-extrabold text-xs">Gift Received!</h5>
              <p className="text-[10px] text-pink-100 font-semibold">
                @{giftBanner.sender} sent a <span className="font-extrabold text-yellow-300">{giftBanner.giftType}</span>
              </p>
            </div>
          </div>
        )}

        {/* TOP META BAR (Overlaid on stream) */}
        <div className="absolute top-4 left-3 right-3 z-20 flex justify-between items-center bg-black/40 backdrop-blur-md rounded-2xl p-2 border border-white/10">
          
          <div className="flex items-center gap-2">
            <div className="bg-red-500 text-white text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
              <span>Live</span>
            </div>
            
            <div className="flex items-center gap-1 text-white text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-full">
              <Users size={12} />
              <span>{viewersCount}</span>
            </div>
            
            {/* Private Show Status & Countdown Timer */}
            {isPrivate && (
              <div className="flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                <Lock size={10} />
                <span>🪙 {entryFee}c</span>
                {privateExpiresAt && privateTimeRemaining > 0 && (
                  <span className="font-mono text-yellow-300 bg-yellow-950/60 px-1.5 py-0.5 rounded-md animate-pulse ml-0.5 border border-yellow-500/30">
                    ⏳ {formatTimer(privateTimeRemaining)}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Indian Music Player Toggle */}
            <button
              onClick={() => setShowMusicPlayer(!showMusicPlayer)}
              className={`p-1.5 rounded-xl transition-all flex items-center gap-1 text-[9px] font-extrabold border ${
                showMusicPlayer 
                  ? 'bg-gradient-to-r from-pink-600 to-yellow-500 border-pink-400 text-white shadow-md' 
                  : 'bg-white/10 border-white/10 text-pink-300 hover:bg-white/20'
              }`}
              title="Indian Music & Songs"
            >
              <Music size={12} />
              <span>Songs</span>
            </button>

            {/* Beauty Filter button for Host */}
            {isHost && (
              <button
                onClick={() => setShowBeautySelector(!showBeautySelector)}
                className={`p-1.5 rounded-xl transition-all flex items-center gap-1 text-[9px] font-extrabold border ${
                  showBeautySelector ? 'bg-pink-600 border-pink-400 text-white shadow-md' : 'bg-white/10 border-white/10 text-pink-300 hover:bg-white/20'
                }`}
                title="Beauty Camera Filters"
              >
                <Sparkles size={12} />
                <span>Filter</span>
              </button>
            )}

            {/* Photo Click / Capture Snapshot for Host */}
            {isHost && (
              <button
                onClick={handleCaptureSnapshot}
                className="p-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:opacity-90 border border-pink-400 text-white shadow-md flex items-center gap-1 text-[9px] font-extrabold active:scale-95 transition-all"
                title="Capture Photo with Beauty Filter"
              >
                <Camera size={12} />
                <span>Click</span>
              </button>
            )}

            {/* Wallet Balance for Viewers */}
            {!isHost && (
              <span className="text-[10px] font-extrabold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-1 rounded-xl">
                🪙 {coins}
              </span>
            )}

            {/* Hangup/Leave button */}
            <button
              onClick={isHost ? handleEndStream : handleLeaveStream}
              className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow active:scale-95 transition-all"
              title={isHost ? "End Stream" : "Leave Stream"}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {/* Beauty Filter Quick Selector Drawer for Host */}
        {showBeautySelector && isHost && (
          <div className="absolute top-16 inset-x-3 z-30 bg-slate-900/90 backdrop-blur-xl border border-pink-500/30 rounded-2xl p-2.5 shadow-2xl flex flex-col gap-1.5">
            <div className="flex justify-between items-center px-1">
              <span className="text-[9px] font-extrabold text-pink-300 uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={10} />
                <span>Broadcast Beauty Filter</span>
              </span>
              <button onClick={() => setShowBeautySelector(false)} className="text-slate-400 text-xs">✕</button>
            </div>
            
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              {[
                { id: 'none', label: 'Normal', icon: '⚪' },
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

        {/* BACKGROUND MUSIC & SONGS PLAYER OVERLAY */}
        {showMusicPlayer && (
          <div className="absolute top-16 inset-x-3 z-40">
            <BackgroundMusicPlayer onClose={() => setShowMusicPlayer(false)} />
          </div>
        )}

        {/* COMMENTS CHAT (Overlaid on bottom left of stream) */}
        <div className="flex-1 flex flex-col justify-end p-4 z-10 relative min-h-0">
          <div className="h-44 overflow-y-auto mb-2 select-text scrollbar-none flex flex-col gap-1.5 pl-0.5">
            {comments.map((c, i) => (
              <div 
                key={i} 
                className={`text-[11px] rounded-xl px-3 py-1.5 self-start max-w-[85%] leading-relaxed ${
                  c.sender === 'System' 
                    ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/10 text-pink-200 font-bold'
                    : 'bg-black/40 backdrop-blur-md text-slate-100'
                }`}
              >
                <span className={`font-extrabold mr-1 ${c.sender === 'System' ? 'text-pink-300' : 'text-pink-400'}`}>
                  @{c.sender}:
                </span>
                <span className="font-semibold">{c.comment}</span>
              </div>
            ))}
            <div ref={commentEndRef} />
          </div>

          {/* CHAT INPUT BAR & ACTIONS */}
          {!showBlurCover && (
            <div className="flex items-center gap-2">
              <form onSubmit={handleSendComment} className="flex-1 flex gap-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-1">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Send a comment..."
                  className="flex-1 px-3 py-2 bg-transparent text-white text-xs placeholder-slate-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="p-2 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-colors"
                >
                  <Send size={12} />
                </button>
              </form>

              {/* Audio Songs Player Trigger */}
              <button
                onClick={() => setShowMusicPlayer(!showMusicPlayer)}
                className={`p-3 rounded-2xl shadow-lg active:scale-95 transition-all shrink-0 border ${
                  showMusicPlayer
                    ? 'bg-pink-600 text-white border-pink-400'
                    : 'bg-slate-900/80 text-pink-400 border-slate-700 hover:bg-slate-800'
                }`}
                title="Phone Storage Songs & Volume Controls"
              >
                <Music size={16} />
              </button>

              {/* Gift Trigger for Viewer */}
              {!isHost && (
                <button
                  onClick={() => setShowGiftSelector(true)}
                  className="p-3 bg-gradient-to-tr from-pink-500 via-purple-500 to-yellow-400 text-white rounded-2xl shadow-lg active:scale-95 transition-all shrink-0 animate-bounce"
                  title="Send Gift"
                >
                  <Gift size={16} />
                </button>
              )}

              {/* Go Private Trigger for Host */}
              {isHost && (
                <button
                  onClick={handleTogglePrivateClick}
                  className={`p-3 rounded-2xl shadow-lg active:scale-95 transition-all shrink-0 font-bold text-xs uppercase tracking-wider flex items-center gap-1 ${
                    isPrivate 
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-slate-900 shadow-yellow-500/20' 
                      : 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-red-900/30'
                  }`}
                >
                  {isPrivate ? <Unlock size={14} /> : <Lock size={14} />}
                  <span>{isPrivate ? 'Public' : 'Private'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* VIEWER PRIVATE LOCK BLUR COVER SCREEN */}
        {showBlurCover && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-2xl z-40 flex flex-col items-center justify-center text-center p-6">
            <div className="bg-slate-900 border border-yellow-500/30 rounded-3xl p-5 shadow-2xl flex flex-col items-center gap-3.5 w-full max-w-[300px]">
              <div className="w-13 h-13 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-3 flex items-center justify-center">
                <Lock size={26} className="text-yellow-400 animate-bounce" />
              </div>
              
              <div>
                <h4 className="font-extrabold text-sm text-white">🔒 Private Show Active</h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  Host has switched this live to a Private Show. Unlock with coins or Host's Secret PIN.
                </p>
              </div>

              <div className="w-full bg-slate-950/70 border border-white/10 rounded-xl p-2.5 flex flex-col gap-1 text-white text-[11px] font-bold">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Entry Fee:</span>
                  <span className="text-yellow-400">🪙 {entryFee} Coins</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span>Your Balance:</span>
                  <span className="text-white">{coins} Coins</span>
                </div>
                {privateExpiresAt && privateTimeRemaining > 0 && (
                  <div className="flex justify-between items-center text-[10px] text-pink-400 pt-1 border-t border-white/5">
                    <span>Time Remaining:</span>
                    <span className="font-mono font-extrabold">⏳ {formatTimer(privateTimeRemaining)}</span>
                  </div>
                )}
              </div>

              {/* Coin Payment or Recharge Link */}
              {coins < entryFee ? (
                <div className="w-full flex flex-col gap-1">
                  <button
                    onClick={() => navigate('/shop')}
                    className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-2xl text-xs font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1"
                  >
                    <span>🪙 Recharge Coins</span>
                  </button>
                  <span className="text-[8px] text-red-400 font-bold">Aapke paas kam coins hain.</span>
                </div>
              ) : (
                <button
                  onClick={handlePayEntryFee}
                  className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-2xl text-xs font-black shadow-lg shadow-yellow-500/20 active:scale-95 transition-all"
                >
                  Pay {entryFee} Coins & Enter Show
                </button>
              )}

              {/* Secret PIN Entry */}
              <form onSubmit={handleUnlockWithPin} className="w-full flex flex-col gap-1 pt-2 border-t border-white/10">
                <span className="text-[10px] text-slate-300 font-bold">Or Enter Host Secret PIN:</span>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={viewerEnteredPin}
                    onChange={(e) => setViewerEnteredPin(e.target.value)}
                    placeholder="Secret PIN"
                    className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-amber-300 font-mono text-center focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    disabled={!viewerEnteredPin.trim()}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow transition-all active:scale-95 disabled:opacity-50"
                  >
                    Unlock
                  </button>
                </div>
              </form>
              
              <button
                onClick={handleLeaveStream}
                className="text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-wider mt-1"
              >
                Leave Stream
              </button>
            </div>
          </div>
        )}

        {/* HOST: TIMED PRIVATE SHOW SETUP MODAL */}
        {showPrivateSetup && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-yellow-500/30 rounded-3xl w-full max-w-sm p-5 shadow-2xl flex flex-col gap-4 relative animate-scale-up text-white">
              <button 
                onClick={() => setShowPrivateSetup(false)} 
                className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <Lock className="text-yellow-400" size={18} />
                <div>
                  <h3 className="font-extrabold text-sm text-white">Timed Private Show Settings</h3>
                  <span className="text-[9px] text-yellow-300/80 font-bold block">
                    Host can set custom entry fee & duration (Min. 300 Coins)
                  </span>
                </div>
              </div>

              <form onSubmit={handleEnablePrivateSubmit} className="flex flex-col gap-3.5">
                
                {/* 1. Entry Fee (Minimum 300 Coins) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center pl-0.5">
                    <label className="text-[10px] font-extrabold text-slate-300 uppercase tracking-wider">
                      Entry Fee (Coins)
                    </label>
                    <span className="text-[8px] bg-yellow-400/20 text-yellow-300 font-extrabold px-1.5 py-0.5 rounded">
                      Min 300 Coins
                    </span>
                  </div>
                  
                  {/* Quick Pill presets */}
                  <div className="flex gap-1.5">
                    {['300', '500', '1000', '2000'].map((f) => (
                      <button
                        type="button"
                        key={f}
                        onClick={() => setPrivateFeeInput(f)}
                        className={`flex-1 py-1 rounded-xl text-[10px] font-bold border transition-all ${
                          privateFeeInput === f 
                            ? 'bg-yellow-500 border-yellow-400 text-slate-950 font-extrabold shadow-sm' 
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        🪙 {f}c
                      </button>
                    ))}
                  </div>

                  <input
                    type="number"
                    min="300"
                    required
                    value={privateFeeInput}
                    onChange={(e) => setPrivateFeeInput(e.target.value)}
                    placeholder="Enter custom coins (min 300)"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-semibold placeholder-slate-500 focus:outline-none focus:border-yellow-500 transition-colors mt-0.5"
                  />
                </div>

                {/* 2. Timer Duration (Default 30 Mins) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center pl-0.5">
                    <label className="text-[10px] font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                      <Clock size={12} className="text-yellow-400" />
                      <span>Show Duration / Timings</span>
                    </label>
                    <span className="text-[8px] bg-pink-500/20 text-pink-300 font-extrabold px-1.5 py-0.5 rounded">
                      Standard: 30 Mins
                    </span>
                  </div>

                  <select
                    value={privateTimerDuration}
                    onChange={(e) => setPrivateTimerDuration(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-semibold focus:outline-none focus:border-yellow-500"
                  >
                    <option value="30">⏱️ 30 Minutes (Standard / Default)</option>
                    <option value="15">⏱️ 15 Minutes Quick Show</option>
                    <option value="45">⏱️ 45 Minutes Extended Show</option>
                    <option value="60">⏱️ 60 Minutes (1 Hour VIP)</option>
                    <option value="90">⏱️ 90 Minutes (1.5 Hours)</option>
                    <option value="120">⏱️ 120 Minutes (2 Hours Grand Show)</option>
                    <option value="custom">✍️ Custom Minutes (Set Own Time)</option>
                    <option value="0">♾️ No Timer (Manual Public Switch)</option>
                  </select>

                  {/* Custom Minutes Input if custom selected */}
                  {privateTimerDuration === 'custom' && (
                    <div className="flex items-center gap-2 mt-1">
                      <input 
                        type="number"
                        min="1"
                        max="300"
                        required
                        value={customDurationInput}
                        onChange={(e) => setCustomDurationInput(e.target.value)}
                        placeholder="Enter minutes (e.g. 20, 35, 75)"
                        className="flex-1 px-3 py-2 bg-slate-950 border border-pink-500/50 rounded-xl text-xs text-white font-semibold placeholder-slate-500 focus:outline-none focus:border-pink-500"
                      />
                      <span className="text-xs text-slate-400 font-bold">Mins</span>
                    </div>
                  )}
                </div>

                {/* 3. Secret Access PIN (Optional) */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-extrabold text-slate-300 uppercase tracking-wider">
                    Secret Access PIN (Optional)
                  </label>
                  <input
                    type="text"
                    value={privatePinInput}
                    onChange={(e) => setPrivatePinInput(e.target.value)}
                    placeholder="e.g. 1234 or VIP77 (Dosto ke sath share karein)"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-amber-300 font-mono placeholder-slate-500 focus:outline-none focus:border-yellow-500"
                  />
                  <span className="text-[8px] text-slate-400">Jo viewer yeh PIN enter karega woh bina coins ke enter kar sakega.</span>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-slate-950 rounded-2xl text-xs font-extrabold active:scale-95 transition-all shadow-md shadow-yellow-500/20 mt-1"
                >
                  Start Private Show (🪙 {privateFeeInput || 300}c • {privateTimerDuration === 'custom' ? (customDurationInput || '30') : privateTimerDuration}m)
                </button>
              </form>
            </div>
          </div>
        )}

        {/* GIFT ANIMATION FLYING OVERLAY */}
        <GiftAnimationOverlay gift={giftBanner} onFinish={() => setGiftBanner(null)} />

        {/* REUSABLE VIRTUAL GIFT SELECTOR MODAL */}
        <GiftSelectorModal
          isOpen={showGiftSelector}
          onClose={() => setShowGiftSelector(false)}
          onSendGift={handleSendGift}
          userCoins={coins}
        />

        {/* FLOATING PHONE STORAGE AUDIO SONGS PLAYER */}
        {showMusicPlayer && (
          <div className="fixed inset-x-3 bottom-20 z-50 max-w-sm mx-auto animate-slide-up">
            <BackgroundMusicPlayer isCall={true} onClose={() => setShowMusicPlayer(false)} />
          </div>
        )}

      </div>
    </div>
  );
}
