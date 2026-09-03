import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, ChevronRight, MessageCircle, Plus, X, Lock, Globe, Key, 
  Share2, Check, Coins, ShieldCheck, ArrowRight, AlertCircle 
} from 'lucide-react';
import { apiRequest, getStoredUser } from '../utils/api';
import MobileLayout from '../components/MobileLayout';

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const currentUser = getStoredUser();

  // Create Room Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomDesc, setRoomDesc] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [entryCode, setEntryCode] = useState('');
  const [entryFee, setEntryFee] = useState(0);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Join by ID State
  const [privateRoomId, setPrivateRoomId] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Unlock Modal State (For Code + Coin entry)
  const [unlockModalRoom, setUnlockModalRoom] = useState(null);
  const [unlockCodeInput, setUnlockCodeInput] = useState('');
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [copiedRoomId, setCopiedRoomId] = useState(null);

  const fetchRooms = async () => {
    try {
      const data = await apiRequest('/api/rooms');
      setRooms(data);
    } catch (err) {
      setError(err.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleRoomClick = (room) => {
    // If public or creator or already unlocked
    const isUnlocked = !room.isPrivate || 
      room.creatorId === currentUser?.id || 
      (room.unlockedUsers && room.unlockedUsers.includes(currentUser?.id));

    if (isUnlocked) {
      navigate(`/chat/room/${room.id}`);
    } else {
      setUnlockModalRoom(room);
      setUnlockCodeInput('');
      setUnlockError('');
    }
  };

  // Create Room API Handler
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!roomName.trim()) {
      setCreateError('Group name is required');
      return;
    }

    setCreateLoading(true);
    setCreateError('');

    try {
      const newRoom = await apiRequest('/api/rooms', 'POST', {
        name: roomName,
        description: roomDesc,
        isPrivate: isPrivate,
        entryCode: isPrivate && entryCode ? entryCode.trim() : null,
        entryFee: isPrivate ? Number(entryFee) || 0 : 0
      });

      setShowCreateModal(false);
      setRoomName('');
      setRoomDesc('');
      setIsPrivate(false);
      setEntryCode('');
      setEntryFee(0);
      navigate(`/chat/room/${newRoom.id}`);
    } catch (err) {
      setCreateError(err.message || 'Failed to create room');
    } finally {
      setCreateLoading(false);
    }
  };

  // Unlock Private Room Handler (Code + Coins)
  const handleUnlockRoom = async (e) => {
    e.preventDefault();
    if (!unlockModalRoom) return;

    setUnlockLoading(true);
    setUnlockError('');

    try {
      const res = await apiRequest(`/api/rooms/${unlockModalRoom.id}/unlock`, 'POST', {
        code: unlockCodeInput.trim()
      });

      if (res.success) {
        setUnlockModalRoom(null);
        navigate(`/chat/room/${unlockModalRoom.id}`);
      } else {
        setUnlockError(res.message || 'Failed to unlock room');
      }
    } catch (err) {
      if (err.message && err.message.includes('INSUFFICIENT_COINS')) {
        setUnlockError('Insufficient coins in wallet! Please recharge coins below.');
      } else {
        setUnlockError(err.message || 'Galat Room Code ya Insufficient Coins!');
      }
    } finally {
      setUnlockLoading(false);
    }
  };

  // Share Room Code & Link Helper
  const handleShareRoomCode = (e, room) => {
    e.stopPropagation();
    const shareText = `🔒 Ajnabi Dil - Private Room Invite!\n\nRoom Name: ${room.name}\nRoom ID: ${room.id}\nSecret Code: ${room.entryCode || 'Direct Entry'}\nEntry Fee: ${room.entryFee || 0} Coins\n\nJoin Link: ${window.location.origin}/#/chat/room/${room.id}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setCopiedRoomId(room.id);
      setTimeout(() => setCopiedRoomId(null), 3000);
    } else {
      alert(shareText);
    }
  };

  // Join Private Room by ID input
  const handleJoinPrivateById = async (e) => {
    e.preventDefault();
    if (!privateRoomId.trim()) {
      setJoinError('Enter a valid Room ID');
      return;
    }

    setJoinLoading(true);
    setJoinError('');

    try {
      const room = await apiRequest(`/api/rooms/${privateRoomId.trim()}`);
      handleRoomClick(room);
    } catch (err) {
      setJoinError('Room not found. Check the ID and try again.');
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <MobileLayout title="Chat Rooms">
      <div className="px-3 py-3 flex flex-col gap-3 flex-1">
        
        {/* Header Hero Card */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-neutral-900 border border-pink-900/30 text-white p-3.5 rounded-3xl shadow-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 bg-pink-500/20 text-pink-400 rounded-2xl flex items-center justify-center shrink-0 border border-pink-500/30 shadow">
              <Users size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Groups & Private Rooms</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Join discussions or create private rooms with secret code & coins.
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-black px-3 py-2 rounded-2xl flex items-center gap-1 shrink-0 active:scale-95 transition-all shadow-md"
          >
            <Plus size={14} />
            <span>Create</span>
          </button>
        </div>

        {/* Join by ID Input */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 shadow-sm flex flex-col gap-2">
          <h4 className="font-black text-white text-xs flex items-center gap-1.5 pl-0.5">
            <Key size={13} className="text-amber-400" />
            <span>Join with Room ID</span>
          </h4>
          <form onSubmit={handleJoinPrivateById} className="flex gap-2 items-start mt-0.5">
            <div className="flex-1">
              <input
                type="text"
                value={privateRoomId}
                onChange={(e) => setPrivateRoomId(e.target.value)}
                placeholder="Enter Room ID (e.g. room_1234)"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
              {joinError && <p className="text-[9px] text-red-400 font-bold pl-1 mt-1">{joinError}</p>}
            </div>
            <button
              type="submit"
              disabled={joinLoading || !privateRoomId.trim()}
              className="bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white text-xs font-black px-4 py-2 rounded-xl shrink-0 transition-all active:scale-95 shadow"
            >
              {joinLoading ? 'Joining...' : 'Enter'}
            </button>
          </form>
        </div>

        {/* Room List Label */}
        <div className="flex items-center justify-between pl-1">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Available Rooms
          </h4>
          <span className="text-[10px] text-pink-400 font-semibold">{rooms.length} Active</span>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mb-2"></div>
            <span className="text-xs">Loading rooms...</span>
          </div>
        ) : error ? (
          <div className="text-center py-10 text-red-400 text-xs">{error}</div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/60 rounded-3xl border border-slate-800 p-6 text-slate-400">
            <p className="text-xs font-semibold">No active public rooms yet.</p>
            <button 
              onClick={() => setShowCreateModal(true)} 
              className="text-pink-400 font-bold text-xs mt-1.5 hover:underline"
            >
              Create the first room!
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {rooms.map((room) => {
              const isCreator = room.creatorId === currentUser?.id;
              const hasCode = Boolean(room.entryCode);
              const fee = Number(room.entryFee) || 0;

              return (
                <div
                  key={room.id}
                  onClick={() => handleRoomClick(room)}
                  className="w-full bg-slate-900/80 hover:bg-slate-900 border border-slate-800 rounded-2xl p-3 text-left shadow-sm hover:border-pink-500/40 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                      room.isPrivate
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-pink-500/10 text-pink-400 border-pink-500/30'
                    }`}>
                      {room.isPrivate ? <Lock size={20} /> : <MessageCircle size={20} />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-white text-xs truncate">
                          {room.name}
                        </h4>
                        {room.isPrivate ? (
                          <span className="text-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-black shrink-0">
                            🔒 Private
                          </span>
                        ) : (
                          <span className="text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.2 rounded font-black shrink-0">
                            Public
                          </span>
                        )}
                        {fee > 0 && (
                          <span className="text-[8px] bg-yellow-400/20 text-yellow-300 font-bold px-1.5 py-0.2 rounded shrink-0">
                            🪙 {fee}c
                          </span>
                        )}
                      </div>

                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {room.description || `ID: ${room.id}`}
                      </p>

                      {room.isPrivate && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-slate-500">
                            ID: <span className="text-slate-300 font-mono font-bold">{room.id}</span>
                          </span>
                          {hasCode && (
                            <span className="text-[9px] text-amber-400/80 font-mono">
                              PIN: {isCreator ? room.entryCode : '••••'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    {room.isPrivate && (
                      <button
                        onClick={(e) => handleShareRoomCode(e, room)}
                        className={`p-1.5 rounded-xl border transition-all text-xs font-bold flex items-center gap-1 ${
                          copiedRoomId === room.id
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-slate-800 text-pink-300 border-slate-700 hover:border-pink-500'
                        }`}
                        title="Share Room Code & Link"
                      >
                        {copiedRoomId === room.id ? <Check size={12} /> : <Share2 size={12} />}
                        <span className="text-[9px]">{copiedRoomId === room.id ? 'Copied' : 'Share'}</span>
                      </button>
                    )}
                    <ChevronRight size={16} className="text-slate-500" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 1. CREATE ROOM MODAL (Supports Code & Coin Entry Fee) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl w-full max-w-[370px] shadow-2xl overflow-hidden flex flex-col p-5 border border-pink-500/30 text-white animate-scale-up">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-extrabold text-base text-white">Create New Chat Room</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="bg-red-500/20 text-red-300 text-[10px] p-2.5 rounded-xl mb-3 border border-red-500/40 font-bold">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateRoom} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-0.5">Room Name</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. VIP Dost Club"
                  maxLength={30}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-0.5">Description</label>
                <input
                  type="text"
                  value={roomDesc}
                  onChange={(e) => setRoomDesc(e.target.value)}
                  placeholder="What is this room about?"
                  maxLength={60}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              {/* Public vs Private */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-0.5">Visibility</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPrivate(false)}
                    className={`flex-1 py-2 px-3 border rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all ${
                      !isPrivate
                        ? 'bg-pink-600 border-pink-400 text-white shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Globe size={13} />
                    <span>Public Room</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPrivate(true)}
                    className={`flex-1 py-2 px-3 border rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all ${
                      isPrivate
                        ? 'bg-amber-600 border-amber-400 text-white shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Lock size={13} />
                    <span>Private Room</span>
                  </button>
                </div>
              </div>

              {/* Private Settings: Secret Code & Coin Entry Fee */}
              {isPrivate && (
                <div className="bg-slate-950/90 border border-amber-500/30 rounded-2xl p-3 flex flex-col gap-2.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                    <Key size={11} />
                    <span>Private Room Security & Entry</span>
                  </span>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400">Secret Room Access PIN / Code</label>
                    <input
                      type="text"
                      value={entryCode}
                      onChange={(e) => setEntryCode(e.target.value)}
                      placeholder="e.g. 7860 or VIP99 (Optional)"
                      maxLength={15}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-[8px] text-slate-400">Yeh code aap dosto ke sath share karenge.</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400">Coin Entry Fee (0 = Free with Code)</label>
                    <div className="flex gap-1.5">
                      {[0, 20, 50, 100, 200].map((feeVal) => (
                        <button
                          key={feeVal}
                          type="button"
                          onClick={() => setEntryFee(feeVal)}
                          className={`flex-1 py-1 rounded-lg text-[10px] font-bold border ${
                            entryFee === feeVal
                              ? 'bg-yellow-400 text-slate-950 border-yellow-300'
                              : 'bg-slate-900 text-slate-300 border-slate-700'
                          }`}
                        >
                          {feeVal === 0 ? 'Free' : `🪙 ${feeVal}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={createLoading || !roomName.trim()}
                className="w-full mt-1 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-pink-950 active:scale-98 transition-all"
              >
                {createLoading ? 'Creating...' : 'Create Group'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. UNLOCK PRIVATE ROOM MODAL (Code + Coin Check + Recharge Link) */}
      {unlockModalRoom && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl w-full max-w-[360px] shadow-2xl p-5 border border-amber-500/40 text-white flex flex-col gap-3.5 animate-scale-up">
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Lock size={20} />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">{unlockModalRoom.name}</h3>
                  <span className="text-[9px] text-amber-400 font-bold">Private Room Lock</span>
                </div>
              </div>
              <button
                onClick={() => setUnlockModalRoom(null)}
                className="text-slate-400 hover:text-white p-1 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            {unlockError && (
              <div className="bg-red-500/20 text-red-300 text-[10px] p-2.5 rounded-xl border border-red-500/40 font-bold flex flex-col gap-1">
                <span>{unlockError}</span>
                {unlockError.includes('Insufficient') && (
                  <button
                    onClick={() => {
                      setUnlockModalRoom(null);
                      navigate('/shop');
                    }}
                    className="mt-1 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black py-1 px-2.5 rounded-lg text-center"
                  >
                    🪙 Recharge Coins Now
                  </button>
                )}
              </div>
            )}

            {/* Room Fee & Balance Details */}
            <div className="bg-slate-950/90 rounded-2xl p-3 border border-slate-800 flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">🪙 Entry Fee:</span>
                <span className="font-extrabold text-yellow-400">
                  {unlockModalRoom.entryFee > 0 ? `${unlockModalRoom.entryFee} Coins` : 'Free with PIN'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                <span className="text-slate-400 font-semibold">Your Wallet Balance:</span>
                <span className="font-bold text-white">{currentUser?.coins || 0} Coins</span>
              </div>
            </div>

            <form onSubmit={handleUnlockRoom} className="flex flex-col gap-3">
              {unlockModalRoom.entryCode && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Secret Room Code / PIN
                  </label>
                  <input
                    type="text"
                    value={unlockCodeInput}
                    onChange={(e) => setUnlockCodeInput(e.target.value)}
                    placeholder="Enter Secret Code"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-amber-300 font-mono tracking-widest text-center focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-[8px] text-slate-400">Room creator se Secret Code lein.</span>
                </div>
              )}

              <button
                type="submit"
                disabled={unlockLoading || (unlockModalRoom.entryCode && !unlockCodeInput.trim())}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 via-pink-600 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-pink-950 active:scale-98 transition-all disabled:opacity-50"
              >
                {unlockLoading ? 'Verifying & Unlocking...' : 'Unlock & Enter Room 🚀'}
              </button>
            </form>

          </div>
        </div>
      )}
    </MobileLayout>
  );
}
