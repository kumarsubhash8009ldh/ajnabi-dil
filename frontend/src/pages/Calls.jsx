import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Phone, Video, MessageSquare, Award, Sparkles, Wifi, 
  Settings, Check, Search, Radio, Sliders, ShieldCheck, Flame
} from 'lucide-react';
import { apiRequest, getSocket, getStoredUser, initSocket, setSession } from '../utils/api';
import MobileLayout from '../components/MobileLayout';
import CallScreen from '../components/CallScreen';

export default function Calls() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [userCoins, setUserCoins] = useState(100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'partners', 'video', 'audio'
  const [searchQuery, setSearchQuery] = useState('');
  const [isReceivingCalls, setIsReceivingCalls] = useState(true);

  // Calling States
  const [callState, setCallState] = useState({
    status: 'idle', // 'idle', 'calling', 'ringing', 'active'
    type: 'audio', // 'audio', 'video'
    otherUser: null,
    isCaller: false
  });

  const navigate = useNavigate();

  const fetchCallsData = async () => {
    try {
      const profile = getStoredUser();
      setCurrentUser(profile);
      if (profile) {
        setUserCoins(profile.coins !== undefined ? profile.coins : 100);
      }
      
      const usersData = await apiRequest('/api/users');
      setUsers(usersData);
    } catch (err) {
      setError(err.message || 'Failed to load calling users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCallsData();
    const interval = setInterval(fetchCallsData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Setup Real-time Calling Socket listeners on Calls page
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

  const handleStartDirectCall = (targetUser, type) => {
    const rate = type === 'video' ? (targetUser.videoCallRate || 20) : (targetUser.voiceCallRate || 10);
    if (userCoins < rate) {
      const confirmRecharge = window.confirm(`⚠️ Insufficient coins (Minimum ${rate} Coins required for ${type} call). Would you like to recharge now?`);
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

  // Filter Online and Calling Users
  const onlineUsers = users.filter(u => u.isOnline);
  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchQuery || u.username.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filter === 'partners') return u.isPartner;
    if (filter === 'video') return u.isOnline;
    if (filter === 'audio') return u.isOnline;
    return true; // 'all'
  });

  return (
    <MobileLayout title="Voice & Video Calls">
      <div className="px-4 py-4 flex flex-col gap-4 flex-1 relative min-h-0 overflow-y-auto">
        
        {/* Banner Header */}
        <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white rounded-3xl p-4 shadow-xl border border-indigo-500/20 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-400 to-green-600 flex items-center justify-center text-white shadow-md shadow-green-500/30">
                <Phone size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm flex items-center gap-1.5">
                  <span>Direct Calling Hub</span>
                  <span className="flex items-center gap-1 text-[8px] bg-green-500/20 text-green-400 border border-green-500/40 px-2 py-0.5 rounded-full font-mono uppercase font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping"></span>
                    <span>{onlineUsers.length} Online</span>
                  </span>
                </h3>
                <p className="text-[10px] text-purple-200">1-Click Voice & Video Call with Verified Hosts</p>
              </div>
            </div>

            <button
              onClick={() => navigate('/profile')}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all"
              title="Set Custom Calling Rates in Profile"
            >
              <Sliders size={12} />
              <span>Set Rates</span>
            </button>
          </div>

          {/* Current User Online Status & Custom Rates Info */}
          {currentUser && (
            <div className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <img 
                    src={currentUser.avatar} 
                    alt="My Avatar" 
                    className="w-10 h-10 rounded-xl object-cover border-2 border-emerald-400"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-slate-900 rounded-full animate-pulse"></span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">@{currentUser.username}</span>
                    <span className="text-[8px] bg-emerald-500 text-white font-extrabold px-1.5 py-0.2 rounded">YOU</span>
                    {currentUser.isPartner && (
                      <span className="text-[8px] bg-pink-500 text-white font-extrabold px-1.5 py-0.2 rounded-full">
                        70% Share
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-green-300 font-semibold block mt-0.5">
                    🟢 Ready to Receive Calls (Rates: 📞 {currentUser.voiceCallRate ? (currentUser.voiceCallRate/10) : 1}c/s | 📹 {currentUser.videoCallRate || 20}c/10s)
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-extrabold text-yellow-300">🪙 {userCoins}</span>
                <span className="text-[8px] text-slate-300 block">Coins</span>
              </div>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search active profiles to call..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary-500 transition-colors shadow-sm"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition-all shrink-0 ${
              filter === 'all' 
                ? 'bg-primary-600 text-white shadow-md shadow-primary-200' 
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            🔥 All Calling Profiles ({users.length})
          </button>
          <button
            onClick={() => setFilter('partners')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition-all shrink-0 flex items-center gap-1 ${
              filter === 'partners' 
                ? 'bg-pink-600 text-white shadow-md shadow-pink-200' 
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Award size={12} />
            <span>👑 Partner Hosts ({users.filter(u => u.isPartner).length})</span>
          </button>
          <button
            onClick={() => setFilter('video')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition-all shrink-0 flex items-center gap-1 ${
              filter === 'video' 
                ? 'bg-purple-600 text-white shadow-md shadow-purple-200' 
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Video size={12} />
            <span>📹 Video Call Ready</span>
          </button>
          <button
            onClick={() => setFilter('audio')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition-all shrink-0 flex items-center gap-1 ${
              filter === 'audio' 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' 
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Phone size={12} />
            <span>📞 Voice Call Ready</span>
          </button>
        </div>

        {/* Calling User Cards Grid */}
        {loading ? (
          <div className="flex-grow flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2"></div>
            <span className="text-xs">Finding available calling profiles...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-400 text-xs">
            No active calling profiles match your search filter.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredUsers.map((user) => {
              const voiceRate = user.voiceCallRate ? (user.voiceCallRate / 10) : 1;
              const videoRate = user.videoCallRate || 20;

              return (
                <div 
                  key={user.id} 
                  className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    
                    {/* User Avatar + Status */}
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img 
                          src={user.avatar} 
                          alt={user.username} 
                          className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-sm"
                        />
                        <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center ${
                          user.isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-300'
                        }`}></span>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-sm text-slate-800">@{user.username}</h4>
                          {user.isPartner && (
                            <span className="text-[8px] bg-gradient-to-r from-pink-500 to-rose-500 text-white px-2 py-0.5 rounded-full font-extrabold flex items-center gap-0.5">
                              <Award size={9} />
                              <span>Host</span>
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] text-green-600 font-semibold flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          <span>{user.isOnline ? 'Available for Audio & Video' : 'Recently Active'}</span>
                        </span>

                        {/* Custom Calling Rate Tags */}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-lg">
                            📞 {voiceRate} coin/sec
                          </span>
                          <span className="text-[9px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-lg">
                            📹 {videoRate}c/10s
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Chat Shortcut */}
                    <button
                      onClick={() => navigate(`/chat/dm/${user.id}`)}
                      className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-all active:scale-95"
                      title="Direct Chat Message"
                    >
                      <MessageSquare size={16} />
                    </button>
                  </div>

                  {/* Dual Action Calling Buttons */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    
                    {/* Voice Call Button */}
                    <button
                      onClick={() => handleStartDirectCall(user, 'audio')}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-200 transition-all"
                    >
                      <Phone size={14} />
                      <span>Voice Call ({voiceRate}c/s)</span>
                    </button>

                    {/* Video Call Button */}
                    <button
                      onClick={() => handleStartDirectCall(user, 'video')}
                      className="flex-1 py-2.5 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:opacity-95 active:scale-95 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-pink-200 transition-all"
                    >
                      <Video size={14} />
                      <span>Video Call ({videoRate}c)</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

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
