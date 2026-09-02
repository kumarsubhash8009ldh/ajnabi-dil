import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, Sparkles, Wifi, WifiOff, Plus, Heart, X, 
  Play, Loader2, Camera, Phone, Video, Award, Radio, Check, 
  Volume2, ShieldCheck, UserCheck, Flame, Zap
} from 'lucide-react';
import { apiRequest, getSocket, getStoredUser, initSocket, setSession } from '../utils/api';
import MobileLayout from '../components/MobileLayout';
import BeautyCameraModal from '../components/BeautyCameraModal';
import CallScreen from '../components/CallScreen';

export default function Feed() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [userCoins, setUserCoins] = useState(100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Calling Directory Filter: 'all', 'partners', 'video', 'audio'
  const [callingFilter, setCallingFilter] = useState('all');

  // Calling States
  const [callState, setCallState] = useState({
    status: 'idle', // 'idle', 'calling', 'ringing', 'active'
    type: 'audio', // 'audio', 'video'
    otherUser: null,
    isCaller: false
  });
  
  // Stories state
  const [stories, setStories] = useState([]);
  const [selectedStory, setSelectedStory] = useState(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  
  // Upload story state
  const [uploadingStory, setUploadingStory] = useState(false);
  const [showBeautyCam, setShowBeautyCam] = useState(false);
  const storyFileInputRef = useRef(null);

  const navigate = useNavigate();
  const progressIntervalRef = useRef(null);

  const fetchFeedData = async () => {
    try {
      const profile = getStoredUser();
      setCurrentUser(profile);
      if (profile) {
        setUserCoins(profile.coins !== undefined ? profile.coins : 100);
      }
      
      // Fetch users
      const usersData = await apiRequest('/api/users');
      setUsers(usersData);

      // Fetch stories
      const storiesData = await apiRequest('/api/stories');
      setStories(storiesData);
    } catch (err) {
      setError(err.message || 'Failed to load feed data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedData();
  }, []);

  // Setup Real-time Calling Socket listeners on Feed
  useEffect(() => {
    let isMounted = true;
    const socket = initSocket();

    if (socket) {
      socket.on('incoming-call', (data) => {
        if (!isMounted) return;
        setCallState({
          status: 'ringing',
          type: data.type,
          otherUser: {
            id: data.callerId,
            username: data.callerName,
            avatar: data.callerAvatar
          },
          isCaller: false
        });
      });

      socket.on('call-accepted', () => {
        if (!isMounted) return;
        setCallState((prev) => ({
          ...prev,
          status: 'active'
        }));
      });

      socket.on('call-rejected', () => {
        if (!isMounted) return;
        setCallState({
          status: 'idle',
          type: 'audio',
          otherUser: null,
          isCaller: false
        });
        alert('Call was declined');
      });

      socket.on('call-ended', () => {
        if (!isMounted) return;
        setCallState({
          status: 'idle',
          type: 'audio',
          otherUser: null,
          isCaller: false
        });
      });

      socket.on('call-failed', (data) => {
        if (!isMounted) return;
        setCallState({
          status: 'idle',
          type: 'audio',
          otherUser: null,
          isCaller: false
        });
        alert(`Call failed: ${data.reason || 'User busy'}`);
      });
    }

    return () => {
      isMounted = false;
      if (socket) {
        socket.off('incoming-call');
        socket.off('call-accepted');
        socket.off('call-rejected');
        socket.off('call-ended');
        socket.off('call-failed');
      }
    };
  }, []);

  // Periodic coin deduction for caller during active call
  useEffect(() => {
    let interval = null;
    const rate = callState.type === 'video' 
      ? (callState.otherUser?.videoCallRate || 20) 
      : (callState.otherUser?.voiceCallRate || 10);
    
    if (callState.status === 'active' && callState.isCaller && callState.otherUser) {
      interval = setInterval(async () => {
        try {
          const response = await apiRequest('/api/wallet/deduct', 'POST', { 
            coins: rate, 
            receiverId: callState.otherUser.id 
          });
          
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
            setCallState({
              status: 'idle',
              type: 'audio',
              otherUser: null,
              isCaller: false
            });
            alert('Call disconnected: Insufficient coins. Please recharge!');
          }
        } catch (err) {
          console.error('Failed to deduct coins during call:', err);
          handleHangupCall();
        }
      }, 10000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState.status, callState.isCaller, callState.otherUser, callState.type]);

  // Handle auto-playing story progress
  useEffect(() => {
    if (selectedStory) {
      setStoryProgress(0);
      progressIntervalRef.current = setInterval(() => {
        setStoryProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressIntervalRef.current);
            handleCloseStory();
            return 100;
          }
          return prev + 2; // Ticks every 100ms, total 5 seconds
        });
      }, 100);
    }

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [selectedStory]);

  // --- CALLING HANDLERS ---
  const handleStartDirectCall = (targetUser, type) => {
    const rate = type === 'video' ? (targetUser.videoCallRate || 20) : (targetUser.voiceCallRate || 10);
    if (userCoins < rate) {
      const confirmRecharge = window.confirm(`⚠️ Insufficient coins (Minimum ${rate} Coins required to start a ${type === 'video' ? 'Video' : 'Voice'} call). Would you like to recharge now?`);
      if (confirmRecharge) {
        navigate('/shop');
      }
      return;
    }

    const socket = getSocket();
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
    }
  };

  const handleAcceptCall = () => {
    const socket = getSocket();
    if (socket && callState.otherUser) {
      socket.emit('accept-call', {
        callerId: callState.otherUser.id
      });
      setCallState((prev) => ({
        ...prev,
        status: 'active'
      }));
    }
  };

  const handleRejectCall = () => {
    const socket = getSocket();
    if (socket && callState.otherUser) {
      socket.emit('reject-call', {
        callerId: callState.otherUser.id
      });
      setCallState({
        status: 'idle',
        type: 'audio',
        otherUser: null,
        isCaller: false
      });
    }
  };

  const handleHangupCall = () => {
    const socket = getSocket();
    if (socket && callState.otherUser) {
      socket.emit('end-call', {
        otherUserId: callState.otherUser.id
      });
    }
    setCallState({
      status: 'idle',
      type: 'audio',
      otherUser: null,
      isCaller: false
    });
  };

  const handleStartChat = (userId) => {
    navigate(`/chat/dm/${userId}`);
  };

  const getSharedInterestsCount = (otherUserInterests) => {
    if (!currentUser || !currentUser.interests || !otherUserInterests) return 0;
    return otherUserInterests.filter(i => currentUser.interests.includes(i)).length;
  };

  const handlePostStoryClick = () => {
    storyFileInputRef.current.click();
  };

  const handleStoryFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const captionInput = window.prompt("Write a short caption for your story:");
    
    setUploadingStory(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result;
        const newStory = await apiRequest('/api/stories', 'POST', {
          mediaData: base64Data,
          mediaName: file.name,
          caption: captionInput || ''
        });
        
        setStories(prev => [...prev, newStory]);
        alert('Story uploaded successfully! Other users can view it now.');
      } catch (err) {
        alert(err.message || 'Failed to upload story');
      } finally {
        setUploadingStory(false);
        e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBeautyCamCapture = async (dataUrl, captionText) => {
    setUploadingStory(true);
    try {
      const newStory = await apiRequest('/api/stories', 'POST', {
        mediaData: dataUrl,
        mediaName: `beauty_snap_${Date.now()}.jpg`,
        caption: captionText || ''
      });
      setStories(prev => [...prev, newStory]);
      alert('✨ Beauty Story published successfully!');
    } catch (err) {
      alert(err.message || 'Failed to post story');
    } finally {
      setUploadingStory(false);
    }
  };

  const handleOpenStory = (story) => {
    setSelectedStory(story);
  };

  const handleCloseStory = () => {
    setSelectedStory(null);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
  };

  const resolveStoryImage = (url) => {
    if (url.startsWith('http')) return url;
    return `http://localhost:5000${url}`;
  };

  // Filter online users
  const onlineUsers = users.filter(u => u.isOnline);
  const filteredCallingUsers = users.filter(u => {
    if (callingFilter === 'partners') return u.isPartner;
    if (callingFilter === 'video') return u.isOnline;
    if (callingFilter === 'audio') return u.isOnline;
    return true; // 'all' shows active users
  });

  return (
    <MobileLayout title="Discover">
      <div className="px-4 py-4 flex flex-col gap-4 flex-1 relative min-h-0 overflow-y-auto">
        
        {/* Luxury Ajnabi Dil Hero Banner */}
        <div className="bg-gradient-to-r from-slate-900/95 via-purple-950/90 to-slate-900/95 backdrop-blur-md rounded-3xl p-4 border border-pink-500/30 shadow-2xl flex items-center justify-between relative overflow-hidden">
          <div className="flex items-center gap-3.5 z-10">
            <img 
              src="/logo.jpg" 
              alt="Ajnabi Dil Theme" 
              className="w-14 h-14 rounded-full object-cover border-2 border-pink-400/80 shadow-lg shadow-pink-500/30 ring-2 ring-pink-500/20 shrink-0"
            />
            <div>
              <span className="text-[9px] uppercase tracking-widest font-extrabold text-pink-400">Official Theme</span>
              <h2 className="text-lg font-black tracking-wide bg-gradient-to-r from-pink-200 via-rose-100 to-white bg-clip-text text-transparent">
                Ajnabi Dil
              </h2>
              <p className="text-[10px] text-pink-200/80 font-medium">
                Dil Se Dil Ka Connection • Live Video, Audio & Dating
              </p>
            </div>
          </div>

          <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-pink-500/10 blur-2xl pointer-events-none"></div>
        </div>

        {/* Hidden File Input for Stories */}
        <input 
          type="file" 
          accept="image/*" 
          ref={storyFileInputRef} 
          onChange={handleStoryFileChange} 
          className="hidden" 
        />

        {/* Stories Horizontal Tray Slider */}
        <div className="flex flex-col gap-1.5 mt-0.5">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase pl-1 tracking-wider">
            Stories & Status
          </span>
          
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            {/* Instagram Style Beauty Camera Trigger */}
            <div className="flex flex-col items-center gap-1 cursor-pointer shrink-0" onClick={() => setShowBeautyCam(true)}>
              <div className="w-14 h-14 bg-gradient-to-tr from-pink-500 via-rose-500 to-yellow-400 rounded-full flex items-center justify-center relative shadow-md active:scale-95 transition-transform p-[2px]">
                <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center">
                  <Camera className="w-5 h-5 text-pink-400" />
                </div>
              </div>
              <span className="text-[9px] font-extrabold text-pink-500 flex items-center gap-0.5">
                <Sparkles size={9} />
                <span>Beauty Cam</span>
              </span>
            </div>

            {/* Create Story Button (Upload) */}
            <div className="flex flex-col items-center gap-1 cursor-pointer shrink-0" onClick={handlePostStoryClick}>
              <div className="w-14 h-14 bg-slate-100 hover:bg-slate-200 border-2 border-dashed border-slate-300 rounded-full flex items-center justify-center relative shadow-inner">
                {uploadingStory ? (
                  <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                ) : (
                  <Plus className="w-5 h-5 text-slate-500" />
                )}
              </div>
              <span className="text-[9px] font-extrabold text-slate-500">My Story</span>
            </div>

            {/* List Stories */}
            {stories.map((story) => (
              <div 
                key={story.id} 
                className="flex flex-col items-center gap-1 cursor-pointer shrink-0"
                onClick={() => handleOpenStory(story)}
              >
                <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-pink-500 via-purple-500 to-yellow-500 shadow flex items-center justify-center">
                  <img 
                    src={story.avatar} 
                    alt={story.username} 
                    className="w-full h-full rounded-full border-2 border-white object-cover"
                  />
                </div>
                <span className="text-[9px] font-bold text-slate-600 max-w-[55px] truncate">
                  @{story.username}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 🟢 DEDICATED DIRECT CALLING COLUMN / HUB (VOICE & VIDEO DIRECT CALLS) */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-4 shadow-xl border border-indigo-900/50 flex flex-col gap-3.5 mt-1">
          
          {/* Header */}
          <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-green-500 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-green-500/30">
                <Phone size={16} />
              </div>
              <div>
                <h3 className="font-extrabold text-xs flex items-center gap-1.5">
                  <span>Live Calling Directory</span>
                  <span className="flex items-center gap-1 text-[8px] bg-green-500/20 text-green-400 border border-green-500/40 px-1.5 py-0.2 rounded-full font-mono uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping"></span>
                    <span>{onlineUsers.length} Online</span>
                  </span>
                </h3>
                <p className="text-[9px] text-slate-300">Direct 1-Click Audio & HD Video Calling</p>
              </div>
            </div>

            {/* Quick Rates Info Badge */}
            <div className="text-right">
              <span className="text-[8px] bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 px-2 py-0.5 rounded-full font-extrabold uppercase block">
                📞 1c/s | 📹 20c/10s
              </span>
            </div>
          </div>

          {/* Current User Online Status Card */}
          {currentUser && (
            <div className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <img 
                    src={currentUser.avatar} 
                    alt="My Avatar" 
                    className="w-9 h-9 rounded-xl object-cover border border-green-400"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full animate-pulse"></span>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-white">@{currentUser.username}</span>
                    <span className="text-[8px] bg-primary-500/80 text-white font-extrabold px-1.5 py-0.2 rounded">YOU</span>
                  </div>
                  <span className="text-[9px] text-green-300 font-medium block">
                    🟢 Online for Voice & Video Calls
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-extrabold text-yellow-300">🪙 {userCoins} Coins</span>
              </div>
            </div>
          )}

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
            <button
              onClick={() => setCallingFilter('all')}
              className={`px-3 py-1 rounded-xl text-[10px] font-extrabold transition-all shrink-0 ${
                callingFilter === 'all' 
                  ? 'bg-primary-600 text-white shadow-sm' 
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              🔥 All Calling ({users.length})
            </button>
            <button
              onClick={() => setCallingFilter('partners')}
              className={`px-3 py-1 rounded-xl text-[10px] font-extrabold transition-all shrink-0 flex items-center gap-1 ${
                callingFilter === 'partners' 
                  ? 'bg-pink-600 text-white shadow-sm' 
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              <Award size={11} />
              <span>👑 Partner Hosts ({users.filter(u => u.isPartner).length})</span>
            </button>
            <button
              onClick={() => setCallingFilter('video')}
              className={`px-3 py-1 rounded-xl text-[10px] font-extrabold transition-all shrink-0 flex items-center gap-1 ${
                callingFilter === 'video' 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              <Video size={11} />
              <span>📹 Video Call Ready</span>
            </button>
            <button
              onClick={() => setCallingFilter('audio')}
              className={`px-3 py-1 rounded-xl text-[10px] font-extrabold transition-all shrink-0 flex items-center gap-1 ${
                callingFilter === 'audio' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              <Phone size={11} />
              <span>📞 Voice Call Ready</span>
            </button>
          </div>

          {/* Online Calling Cards Column / Grid */}
          <div className="flex flex-col gap-2.5 max-h-[360px] overflow-y-auto pr-1">
            {filteredCallingUsers.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No calling partners found in this filter
              </div>
            ) : (
              filteredCallingUsers.map((user) => (
                <div 
                  key={user.id} 
                  className="bg-white/10 hover:bg-white/[0.14] border border-white/10 rounded-2xl p-3 flex flex-col gap-2.5 transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    
                    {/* User Avatar + Profile details */}
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <img 
                          src={user.avatar} 
                          alt={user.username} 
                          className="w-12 h-12 rounded-2xl object-cover border-2 border-white/20 shadow-md"
                        />
                        <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 flex items-center justify-center ${
                          user.isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-400'
                        }`}></span>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-xs text-white">@{user.username}</h4>
                          {user.isPartner && (
                            <span className="text-[8px] bg-gradient-to-r from-pink-500 to-rose-500 text-white px-1.5 py-0.2 rounded-full font-extrabold flex items-center gap-0.5">
                              <Award size={9} />
                              <span>Host</span>
                            </span>
                          )}
                        </div>

                        <span className="text-[9px] text-green-300 font-semibold flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                          <span>{user.isOnline ? 'Available for Calls' : 'Recently Active'}</span>
                        </span>

                        <div className="flex items-center gap-2 text-[8px] text-slate-300 font-mono mt-0.5">
                          <span className="text-emerald-300 font-bold">📞 {user.voiceCallRate ? (user.voiceCallRate / 10) : 1}c/s</span>
                          <span>•</span>
                          <span className="text-pink-300 font-bold">📹 {user.videoCallRate || 20}c/10s</span>
                        </div>
                      </div>
                    </div>

                    {/* Direct Action Calling Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      
                      {/* 📞 Audio Call Direct Button */}
                      <button
                        onClick={() => handleStartDirectCall(user, 'audio')}
                        className="px-2.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-[10px] font-extrabold flex items-center gap-1 shadow-md shadow-emerald-900/50 transition-all"
                        title="Start Voice Audio Call (1 coin/sec)"
                      >
                        <Phone size={12} />
                        <span>Voice</span>
                      </button>

                      {/* 📹 Video Call Direct Button */}
                      <button
                        onClick={() => handleStartDirectCall(user, 'video')}
                        className="px-2.5 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 active:scale-95 text-white rounded-xl text-[10px] font-extrabold flex items-center gap-1 shadow-md shadow-pink-900/50 transition-all"
                        title="Start HD Video Call (20 coins/10s)"
                      >
                        <Video size={12} />
                        <span>Video</span>
                      </button>

                      {/* 💬 Chat DM Button */}
                      <button
                        onClick={() => handleStartChat(user.id)}
                        className="p-2 bg-white/10 hover:bg-white/20 active:scale-95 text-slate-200 rounded-xl transition-all"
                        title="Send Direct Message"
                      >
                        <MessageSquare size={14} />
                      </button>
                    </div>

                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Banner Card */}
        <div className="bg-gradient-to-r from-primary-500 to-indigo-600 text-white p-4 rounded-3xl shadow-md mt-1">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-yellow-300 animate-pulse" />
            <h3 className="font-bold text-sm">Find Your Match</h3>
          </div>
          <p className="text-[11px] text-primary-100 mt-1">
            Browse active users, see their interests, and start a conversation.
          </p>
        </div>

        {/* Match Feed List */}
        {loading ? (
          <div className="flex-grow flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2"></div>
            <span className="text-xs">Finding people...</span>
          </div>
        ) : error ? (
          <div className="text-center py-10 text-red-500 text-xs">{error}</div>
        ) : users.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center py-20 text-center">
            <span className="text-slate-400 text-sm font-semibold">No other users found</span>
            <p className="text-slate-400 text-xs mt-1 px-8">Share this app with friends to start matching!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {users.map((user) => {
              const sharedCount = getSharedInterestsCount(user.interests);
              return (
                <div key={user.id} className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col gap-3">
                  
                  {/* Top card metadata */}
                  <div className="flex gap-3 items-start">
                    <div className="relative">
                      <img 
                        src={user.avatar} 
                        alt={user.username} 
                        className="w-14 h-14 bg-slate-100 rounded-2xl object-cover border border-slate-100"
                      />
                      <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center ${
                        user.isOnline ? 'bg-green-500 animate-pulse-online' : 'bg-slate-300'
                      }`}></span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-slate-800 text-base truncate">{user.username}</h4>
                        {user.isOnline ? (
                          <span className="flex items-center text-[10px] text-green-500 font-semibold bg-green-50 px-1.5 py-0.5 rounded-md">
                            <Wifi size={10} className="mr-0.5" /> Online
                          </span>
                        ) : (
                          <span className="flex items-center text-[10px] text-slate-400 font-medium bg-slate-50 px-1.5 py-0.5 rounded-md">
                            <WifiOff size={10} className="mr-0.5" /> Offline
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 min-h-[2rem]">
                        {user.bio || "No bio added yet."}
                      </p>
                    </div>
                  </div>

                  {/* Shared interests notification */}
                  {sharedCount > 0 && (
                    <div className="bg-primary-50 text-primary-700 text-[10px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 self-start">
                      <Sparkles size={12} className="text-primary-500" />
                      <span>{sharedCount} Shared Interests!</span>
                    </div>
                  )}

                  {/* Interests tags list */}
                  {user.interests && user.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {user.interests.map((interest, index) => {
                        const isShared = currentUser?.interests?.includes(interest);
                        return (
                          <span 
                            key={index} 
                            className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                              isShared 
                                ? 'bg-primary-100 text-primary-700 border border-primary-200' 
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {interest}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Calling & Messaging Action Bar */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => handleStartDirectCall(user, 'audio')}
                      className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <Phone size={13} />
                      <span>Voice Call</span>
                    </button>

                    <button
                      onClick={() => handleStartDirectCall(user, 'video')}
                      className="flex-1 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <Video size={13} />
                      <span>Video Call</span>
                    </button>

                    <button
                      onClick={() => handleStartChat(user.id)}
                      className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-semibold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <MessageSquare size={13} />
                      <span>Chat</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Story Modal Player Overlay */}
        {selectedStory && (
          <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-0">
            <div className="w-full max-w-[420px] h-screen bg-slate-900 relative flex flex-col justify-between">
              
              {/* Progress Bar Header */}
              <div className="absolute top-3 left-0 right-0 z-20 px-3 flex flex-col gap-3">
                <div className="w-full bg-white/20 h-[3px] rounded-full overflow-hidden">
                  <div 
                    className="bg-white h-full transition-all duration-100 ease-linear"
                    style={{ width: `${storyProgress}%` }}
                  ></div>
                </div>

                <div className="flex justify-between items-center text-white">
                  <div className="flex items-center gap-2">
                    <img 
                      src={selectedStory.avatar} 
                      alt="Story Creator" 
                      className="w-8 h-8 rounded-full object-cover border border-white/25"
                    />
                    <span className="text-xs font-bold">@{selectedStory.username}</span>
                  </div>
                  
                  <button 
                    onClick={handleCloseStory} 
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Story image body */}
              <div className="flex-1 flex items-center justify-center">
                <img 
                  src={resolveStoryImage(selectedStory.mediaUrl)} 
                  alt="Story content" 
                  className="w-full max-h-[80vh] object-contain"
                />
              </div>

              {/* Story footer caption */}
              {selectedStory.caption && (
                <div className="bg-slate-950/80 backdrop-blur px-6 py-5 text-center text-white border-t border-white/5">
                  <p className="text-xs font-semibold leading-relaxed">{selectedStory.caption}</p>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Instagram Style Beauty Camera Modal */}
        <BeautyCameraModal 
          isOpen={showBeautyCam} 
          onClose={() => setShowBeautyCam(false)} 
          onCapture={handleBeautyCamCapture} 
        />

        {/* Direct CallScreen Overlay for Real-time Calls */}
        {callState.status !== 'idle' && (
          <CallScreen 
            callState={callState}
            coins={userCoins}
            onAccept={handleAcceptCall}
            onReject={handleRejectCall}
            onHangup={handleHangupCall}
          />
        )}

      </div>
    </MobileLayout>
  );
}
