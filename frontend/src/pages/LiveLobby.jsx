import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, Users, Plus, ShieldCheck, X, Sparkles, Award } from 'lucide-react';
import { apiRequest, getStoredUser, setSession } from '../utils/api';
import MobileLayout from '../components/MobileLayout';

export default function LiveLobby() {
  const navigate = useNavigate();
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [streamTitle, setStreamTitle] = useState('');
  
  const [currentUser, setCurrentUser] = useState(getStoredUser());

  const fetchActiveStreams = async () => {
    try {
      const data = await apiRequest('/api/live/streams');
      setStreams(data);
    } catch (err) {
      setError(err.message || 'Failed to load live shows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkPartnerStatus = async () => {
      try {
        const latestProfile = await apiRequest('/api/users/profile');
        setCurrentUser(latestProfile);
        const token = localStorage.getItem('chitchat_token');
        setSession(token, latestProfile);
      } catch (err) {
        console.error('Failed to sync profile status:', err);
      }
    };

    checkPartnerStatus();
    fetchActiveStreams();

    // Poll streams every 5 seconds
    const interval = setInterval(fetchActiveStreams, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStartLiveSubmit = (e) => {
    e.preventDefault();
    if (!streamTitle.trim()) {
      alert('Please enter a title for your Live Show');
      return;
    }
    
    // Redirect to stream page as host
    navigate(`/live/stream/${currentUser.id}?title=${encodeURIComponent(streamTitle.trim())}&host=true`);
  };

  const handleJoinStream = (hostId) => {
    if (hostId === currentUser.id) {
      // Redirect to own stream as host
      navigate(`/live/stream/${currentUser.id}?host=true`);
    } else {
      navigate(`/live/stream/${hostId}`);
    }
  };

  return (
    <MobileLayout title="Live Shows">
      <div className="px-4 py-4 flex flex-col gap-4 flex-1 relative min-h-0 overflow-y-auto">
        
        {/* Banner introduction */}
        <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white p-4 rounded-3xl shadow-md">
          <div className="flex items-center gap-2">
            <Radio size={18} className="animate-pulse" />
            <h3 className="font-extrabold text-sm">Paid Live Streaming</h3>
          </div>
          <p className="text-[11px] text-pink-100 mt-1 leading-relaxed">
            Watch live streams, unlock exclusive private shows, and support verified hosts with virtual gifts.
          </p>
        </div>

        {/* Action Button: Go Live (Verified hosts OR Normal IDs with min. Rs. 500 / 500 Coins) */}
        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={() => {
              if (currentUser?.isPartner || (currentUser?.coins || 0) >= 500) {
                setShowSetup(true);
              } else {
                alert('⚠️ Normal IDs require a minimum wallet balance of Rs. 500 (500 Coins) to start a Live Show. Please recharge your wallet.');
                navigate('/wallet');
              }
            }}
            className="w-full py-3.5 bg-gradient-to-r from-red-600 via-pink-600 to-indigo-600 hover:opacity-95 text-white rounded-2xl font-bold text-xs shadow-lg shadow-pink-200 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Plus size={16} />
            <span>
              {currentUser?.isPartner 
                ? 'Go Live Now (Host Show)' 
                : (currentUser?.coins || 0) >= 500 
                ? `Go Live (Wallet: 🪙 ${currentUser?.coins} Coins)` 
                : 'Go Live (Min. Rs. 500 / 500 Coins in Wallet)'}
            </span>
          </button>

          {!currentUser?.isPartner && (currentUser?.coins || 0) < 500 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5 flex items-center justify-between text-amber-800 text-[10px]">
              <div className="flex items-center gap-1.5 font-bold">
                <Sparkles size={13} className="text-amber-600 shrink-0" />
                <span>Normal IDs can Go Live with min. Rs. 500 in wallet (Current: 🪙 {currentUser?.coins || 0})</span>
              </div>
              <button
                onClick={() => navigate('/wallet')}
                className="text-[9px] font-extrabold text-white bg-amber-600 hover:bg-amber-700 px-2.5 py-1 rounded-xl uppercase tracking-wider shrink-0 active:scale-95 transition-all shadow-sm"
              >
                Recharge
              </button>
            </div>
          )}
        </div>

        <h3 className="font-extrabold text-slate-800 text-xs pl-1 uppercase tracking-wider mt-1">
          Active Live Broadcasts
        </h3>

        {/* Stream lists */}
        {loading ? (
          <div className="flex-grow flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mb-2"></div>
            <span className="text-xs">Finding live shows...</span>
          </div>
        ) : error ? (
          <div className="text-center py-10 text-red-500 text-xs">{error}</div>
        ) : streams.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center py-20 text-center text-slate-400">
            <Radio size={36} className="text-slate-300 stroke-1 mb-2" />
            <span className="text-xs font-semibold">No active live shows right now</span>
            <p className="text-[10px] text-slate-400 mt-0.5">Please check back in a few minutes!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 mt-1">
            {streams.map((stream) => (
              <div 
                key={stream.id}
                onClick={() => handleJoinStream(stream.hostId)}
                className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col relative"
              >
                {/* Visual Cover (Mock) */}
                <div className="h-28 bg-slate-950 flex items-center justify-center relative">
                  <img 
                    src={stream.hostAvatar} 
                    alt={stream.hostName} 
                    className="w-16 h-16 rounded-full border border-white/20 object-cover opacity-80"
                  />
                  <div className="absolute top-2 left-2 bg-red-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 tracking-wider uppercase">
                    <span className="w-1 h-1 bg-white rounded-full animate-ping"></span>
                    <span>Live</span>
                  </div>

                  {/* Private badge indicator */}
                  {stream.isPrivate ? (
                    <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur text-yellow-400 text-[8px] font-extrabold px-1.5 py-0.5 rounded-md uppercase">
                      🔒 Private (🪙{stream.entryFee})
                    </div>
                  ) : (
                    <div className="absolute top-2 right-2 bg-slate-900/60 backdrop-blur text-green-400 text-[8px] font-extrabold px-1.5 py-0.5 rounded-md uppercase">
                      🌎 Public
                    </div>
                  )}

                  <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-[9px] font-bold bg-black/40 px-1.5 py-0.5 rounded">
                    <Users size={10} />
                    <span>{stream.viewers?.length || 0}</span>
                  </div>
                </div>

                {/* Host Title info */}
                <div className="p-3 flex flex-col gap-0.5">
                  <h4 className="font-extrabold text-slate-800 text-xs truncate">
                    {stream.title}
                  </h4>
                  <p className="text-[9px] text-slate-400 font-semibold uppercase">
                    @{stream.hostName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Go Live Setup modal overlay */}
        {showSetup && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl flex flex-col gap-4 relative animate-scale-up">
              
              <button 
                onClick={() => setShowSetup(false)} 
                className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Radio className="text-red-500" size={18} />
                <h3 className="font-extrabold text-slate-800 text-sm">Configure Live Broadcast</h3>
              </div>

              <form onSubmit={handleStartLiveSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase pl-0.5">
                    Live Show Title
                  </label>
                  <input
                    type="text"
                    value={streamTitle}
                    onChange={(e) => setStreamTitle(e.target.value)}
                    placeholder="e.g. Late Night Chats & Fun!"
                    maxLength={40}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSetup(false)}
                    className="flex-1 py-3 border border-slate-200 text-slate-500 rounded-2xl text-xs font-bold active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-bold active:scale-95 transition-all shadow-md"
                  >
                    Go Live Now
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </MobileLayout>
  );
}
