import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Phone, Video, MessageSquare, Search, PhoneIncoming, PhoneOutgoing, 
  PhoneMissed, Clock, CheckCheck, Sparkles, User, ChevronRight, RefreshCw, Flame, ArrowUpRight
} from 'lucide-react';
import MobileLayout from '../components/MobileLayout';
import { apiRequest, getStoredUser, initSocket } from '../utils/api';

export default function UnifiedInbox() {
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'messages', 'calls', 'missed'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    calls: [],
    conversations: [],
    missedCount: 0,
    totalUnreadMessages: 0
  });

  const navigate = useNavigate();
  const currentUser = getStoredUser();

  const fetchActivityData = async () => {
    try {
      const data = await apiRequest('/api/activity/summary');
      setSummary(data || { calls: [], conversations: [], missedCount: 0, totalUnreadMessages: 0 });
    } catch (err) {
      console.warn('Notice loading activity summary:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityData();
    const interval = setInterval(fetchActivityData, 5000);

    const socket = initSocket();
    if (socket) {
      socket.on('receive-direct-message', fetchActivityData);
      socket.on('call-ended', fetchActivityData);
      socket.on('incoming-call', fetchActivityData);
    }

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('receive-direct-message', fetchActivityData);
        socket.off('call-ended', fetchActivityData);
        socket.off('incoming-call', fetchActivityData);
      }
    };
  }, []);

  // Format timestamp helper
  const formatTime = (ts) => {
    if (!ts) return 'Just now';
    try {
      const date = new Date(ts);
      const now = new Date();
      const diffMinutes = Math.floor((now - date) / (1000 * 60));
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  // Format call duration helper
  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  // Prepare merged chronological feed for "all" tab
  const getMergedFeed = () => {
    const feed = [];

    // Messages
    (summary.conversations || []).forEach((c) => {
      feed.push({
        kind: 'message',
        id: 'msg_conv_' + c.otherUserId,
        userId: c.otherUserId,
        username: c.otherUsername,
        avatar: c.otherAvatar,
        preview: c.lastMessage,
        timestamp: c.lastTimestamp,
        unreadCount: c.unreadCount || 0,
        isOnline: c.isOnline
      });
    });

    // Calls
    (summary.calls || []).forEach((call) => {
      const isCaller = call.callerId === currentUser?.id;
      feed.push({
        kind: 'call',
        id: call.id,
        userId: isCaller ? call.receiverId : call.callerId,
        username: isCaller ? call.receiverName : call.callerName,
        avatar: isCaller ? call.receiverAvatar : call.callerAvatar,
        callType: call.type, // video or audio
        status: call.status, // completed, missed, declined
        duration: call.durationSeconds,
        timestamp: call.timestamp,
        isCaller: isCaller
      });
    });

    // Sort newest first
    return feed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  // Filter items by search query
  const matchesSearch = (username, text = '') => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (username && username.toLowerCase().includes(q)) || (text && text.toLowerCase().includes(q));
  };

  const handleCallBack = (userId, type = 'video') => {
    navigate('/calls', { state: { directCallUserId: userId, directCallType: type } });
  };

  return (
    <MobileLayout title="Activity & Inbox Box">
      <div className="flex flex-col flex-1 px-3 py-3 gap-3">

        {/* 1. TOP HERO ACTION BAR: OMELGE & QUICK CALL SHORTCUTS */}
        <div className="bg-gradient-to-r from-pink-900/40 via-purple-900/30 to-slate-900 border border-pink-500/30 rounded-3xl p-3.5 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-500 to-amber-500 flex items-center justify-center text-xl shadow-md">
              🎲
            </div>
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-1.5">
                <span>Omegle Random Match</span>
                <span className="text-[8px] bg-red-600 text-white font-extrabold px-1.5 py-0.5 rounded-full uppercase animate-pulse">
                  Live
                </span>
              </h3>
              <p className="text-[10px] text-pink-200/80 mt-0.5">
                Camera mask & beauty mode ke sath connect karein!
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/stranger')}
            className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-black px-3.5 py-2 rounded-2xl shadow-md flex items-center gap-1 active:scale-95 transition-all shrink-0"
          >
            <span>Start</span>
            <ArrowUpRight size={14} />
          </button>
        </div>

        {/* 2. SEARCH BAR */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search calls ya message by name..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors shadow-sm"
          />
        </div>

        {/* 3. SEGMENTED FILTER TABS */}
        <div className="flex bg-slate-900/90 p-1 rounded-2xl border border-slate-800 gap-1 text-[11px] font-bold">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 ${
              activeTab === 'all'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🌟 All</span>
          </button>

          <button
            onClick={() => setActiveTab('messages')}
            className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 relative ${
              activeTab === 'messages'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare size={12} />
            <span>Msgs</span>
            {summary.totalUnreadMessages > 0 && (
              <span className="bg-amber-400 text-slate-950 text-[8px] font-black px-1.5 py-0.2 rounded-full ml-0.5">
                {summary.totalUnreadMessages}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('calls')}
            className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 ${
              activeTab === 'calls'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Phone size={12} />
            <span>Calls</span>
          </button>

          <button
            onClick={() => setActiveTab('missed')}
            className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 ${
              activeTab === 'missed'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-red-400'
            }`}
          >
            <PhoneMissed size={12} />
            <span>Missed</span>
            {summary.missedCount > 0 && (
              <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full ml-0.5 animate-pulse">
                {summary.missedCount}
              </span>
            )}
          </button>
        </div>

        {/* 4. ACTIVITY LIST BOX */}
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto pb-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <RefreshCw size={24} className="animate-spin text-pink-500" />
              <span className="text-xs">Loading calls & messages...</span>
            </div>
          ) : (
            <>
              {/* === TAB 1: ALL MERGED FEED === */}
              {activeTab === 'all' && (
                (() => {
                  const feed = getMergedFeed().filter(item => matchesSearch(item.username, item.preview));
                  if (feed.length === 0) {
                    return (
                      <div className="text-center py-14 text-slate-500 text-xs">
                        No recent calls or messages found.
                      </div>
                    );
                  }
                  return feed.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (item.kind === 'message') navigate(`/chat/dm/${item.userId}`);
                      }}
                      className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800/90 rounded-2xl p-3 flex items-center justify-between transition-all cursor-pointer shadow-sm hover:border-pink-900/50"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <img
                            src={item.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + item.username}
                            alt={item.username}
                            className="w-12 h-12 rounded-2xl object-cover border border-slate-700 shadow"
                          />
                          {item.kind === 'message' && item.isOnline && (
                            <span className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900 absolute -bottom-0.5 -right-0.5"></span>
                          )}
                          {item.kind === 'call' && (
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] absolute -bottom-1 -right-1 border border-slate-900 shadow ${
                              item.status === 'missed'
                                ? 'bg-red-500 text-white'
                                : item.isCaller
                                ? 'bg-blue-500 text-white'
                                : 'bg-emerald-500 text-white'
                            }`}>
                              {item.status === 'missed' ? <PhoneMissed size={9} /> : item.callType === 'video' ? <Video size={9} /> : <Phone size={9} />}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-extrabold text-xs text-white truncate">{item.username}</h4>
                            <span className="text-[9px] text-slate-400 shrink-0 ml-1">{formatTime(item.timestamp)}</span>
                          </div>

                          {item.kind === 'message' ? (
                            <p className="text-[11px] text-slate-300 truncate mt-0.5">
                              {item.preview}
                            </p>
                          ) : (
                            <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span className={item.status === 'missed' ? 'text-red-400 font-bold' : 'text-slate-300'}>
                                {item.status === 'missed' ? 'Missed Call' : item.isCaller ? 'Outgoing Call' : 'Incoming Call'}
                              </span>
                              <span>•</span>
                              <span>{formatDuration(item.duration)}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Side Action */}
                      <div className="ml-3 shrink-0 flex items-center gap-1.5">
                        {item.kind === 'message' ? (
                          item.unreadCount > 0 ? (
                            <span className="bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow">
                              {item.unreadCount}
                            </span>
                          ) : (
                            <ChevronRight size={16} className="text-slate-500" />
                          )
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCallBack(item.userId, 'video');
                              }}
                              className="p-2 rounded-xl bg-pink-600/20 hover:bg-pink-600 text-pink-400 hover:text-white transition-all border border-pink-500/30"
                              title="Video Call"
                            >
                              <Video size={13} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCallBack(item.userId, 'audio');
                              }}
                              className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white transition-all border border-emerald-500/30"
                              title="Voice Call"
                            >
                              <Phone size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ));
                })()
              )}

              {/* === TAB 2: MESSAGES ONLY === */}
              {activeTab === 'messages' && (
                (() => {
                  const convos = (summary.conversations || []).filter(c => matchesSearch(c.otherUsername, c.lastMessage));
                  if (convos.length === 0) {
                    return (
                      <div className="text-center py-14 text-slate-500 text-xs">
                        No messages found. Start chatting with someone from Discover!
                      </div>
                    );
                  }
                  return convos.map((c) => (
                    <div
                      key={c.otherUserId}
                      onClick={() => navigate(`/chat/dm/${c.otherUserId}`)}
                      className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between transition-all cursor-pointer shadow-sm hover:border-pink-900/50"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <img
                            src={c.otherAvatar}
                            alt={c.otherUsername}
                            className="w-12 h-12 rounded-2xl object-cover border border-slate-700 shadow"
                          />
                          {c.isOnline && (
                            <span className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900 absolute -bottom-0.5 -right-0.5"></span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-extrabold text-xs text-white truncate">{c.otherUsername}</h4>
                            <span className="text-[9px] text-slate-400">{formatTime(c.lastTimestamp)}</span>
                          </div>
                          <p className="text-[11px] text-slate-300 truncate mt-0.5">
                            {c.lastMessage}
                          </p>
                        </div>
                      </div>

                      <div className="ml-3 shrink-0">
                        {c.unreadCount > 0 ? (
                          <span className="bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow">
                            {c.unreadCount} new
                          </span>
                        ) : (
                          <ChevronRight size={16} className="text-slate-500" />
                        )}
                      </div>
                    </div>
                  ));
                })()
              )}

              {/* === TAB 3: ALL CALLS LOG === */}
              {activeTab === 'calls' && (
                (() => {
                  const calls = (summary.calls || []).filter(call => {
                    const isCaller = call.callerId === currentUser?.id;
                    const peerName = isCaller ? call.receiverName : call.callerName;
                    return matchesSearch(peerName);
                  });

                  if (calls.length === 0) {
                    return (
                      <div className="text-center py-14 text-slate-500 text-xs">
                        No call history found yet.
                      </div>
                    );
                  }

                  return calls.map((call) => {
                    const isCaller = call.callerId === currentUser?.id;
                    const peerId = isCaller ? call.receiverId : call.callerId;
                    const peerName = isCaller ? call.receiverName : call.callerName;
                    const peerAvatar = isCaller ? call.receiverAvatar : call.callerAvatar;

                    return (
                      <div
                        key={call.id}
                        className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex items-center justify-between shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="relative shrink-0">
                            <img
                              src={peerAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + peerName}
                              alt={peerName}
                              className="w-11 h-11 rounded-2xl object-cover border border-slate-700"
                            />
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] absolute -bottom-1 -right-1 border border-slate-900 ${
                              call.status === 'missed'
                                ? 'bg-red-500 text-white'
                                : isCaller
                                ? 'bg-blue-500 text-white'
                                : 'bg-emerald-500 text-white'
                            }`}>
                              {call.status === 'missed' ? <PhoneMissed size={9} /> : call.type === 'video' ? <Video size={9} /> : <Phone size={9} />}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="font-extrabold text-xs text-white truncate">{peerName}</h4>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span className={call.status === 'missed' ? 'text-red-400 font-bold' : 'text-slate-300'}>
                                {call.status === 'missed' ? 'Missed Call' : isCaller ? 'Outgoing' : 'Incoming'}
                              </span>
                              <span>•</span>
                              <span>{formatDuration(call.durationSeconds)}</span>
                              <span>•</span>
                              <span>{formatTime(call.timestamp)}</span>
                            </p>
                          </div>
                        </div>

                        {/* Call Back Buttons */}
                        <div className="flex items-center gap-1.5 ml-2">
                          <button
                            onClick={() => handleCallBack(peerId, 'video')}
                            className="p-2 rounded-xl bg-pink-600/20 hover:bg-pink-600 text-pink-400 hover:text-white transition-all border border-pink-500/30"
                            title="Video Call"
                          >
                            <Video size={14} />
                          </button>
                          <button
                            onClick={() => handleCallBack(peerId, 'audio')}
                            className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white transition-all border border-emerald-500/30"
                            title="Voice Call"
                          >
                            <Phone size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()
              )}

              {/* === TAB 4: MISSED CALLS ONLY === */}
              {activeTab === 'missed' && (
                (() => {
                  const missedCalls = (summary.calls || []).filter(call => {
                    const isCaller = call.callerId === currentUser?.id;
                    const peerName = isCaller ? call.receiverName : call.callerName;
                    return !isCaller && call.status === 'missed' && matchesSearch(peerName);
                  });

                  if (missedCalls.length === 0) {
                    return (
                      <div className="text-center py-14 text-slate-500 text-xs">
                        Koi missed call nahi hai! 🎉
                      </div>
                    );
                  }

                  return missedCalls.map((call) => (
                    <div
                      key={call.id}
                      className="bg-red-950/20 border border-red-500/40 rounded-2xl p-3.5 flex items-center justify-between shadow-md"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <img
                            src={call.callerAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + call.callerName}
                            alt={call.callerName}
                            className="w-12 h-12 rounded-2xl object-cover border-2 border-red-500/80 shadow"
                          />
                          <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[9px] absolute -bottom-1 -right-1 border border-slate-900">
                            <PhoneMissed size={9} />
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="font-extrabold text-xs text-red-200 truncate">{call.callerName}</h4>
                          <p className="text-[10px] text-red-400 flex items-center gap-1 mt-0.5">
                            <span className="font-bold">Missed {call.type === 'video' ? 'Video Call' : 'Voice Call'}</span>
                            <span>•</span>
                            <span>{formatTime(call.timestamp)}</span>
                          </p>
                        </div>
                      </div>

                      {/* 1-Tap Call Back */}
                      <button
                        onClick={() => handleCallBack(call.callerId, call.type || 'video')}
                        className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all ml-2"
                      >
                        {call.type === 'video' ? <Video size={13} /> : <Phone size={13} />}
                        <span>Call Back</span>
                      </button>
                    </div>
                  ));
                })()
              )}
            </>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
