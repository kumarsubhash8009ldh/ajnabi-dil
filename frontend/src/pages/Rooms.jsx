import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ChevronRight, MessageCircle, Plus, X, Lock, Globe, Key } from 'lucide-react';
import { apiRequest } from '../utils/api';
import MobileLayout from '../components/MobileLayout';

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Create Room Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomDesc, setRoomDesc] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Join Private Room State
  const [privateRoomId, setPrivateRoomId] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

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

  const handleJoinRoom = (roomId) => {
    navigate(`/chat/room/${roomId}`);
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
        isPrivate: isPrivate
      });

      // Close modal & navigate to the newly created room
      setShowCreateModal(false);
      setRoomName('');
      setRoomDesc('');
      setIsPrivate(false);
      navigate(`/chat/room/${newRoom.id}`);
    } catch (err) {
      setCreateError(err.message || 'Failed to create room');
    } finally {
      setCreateLoading(false);
    }
  };

  // Join Private Room API Handler
  const handleJoinPrivateRoom = async (e) => {
    e.preventDefault();
    if (!privateRoomId.trim()) {
      setJoinError('Enter a valid Room ID');
      return;
    }

    setJoinLoading(true);
    setJoinError('');

    try {
      const room = await apiRequest(`/api/rooms/${privateRoomId.trim()}`);
      navigate(`/chat/room/${room.id}`);
    } catch (err) {
      setJoinError('Group not found. Check the Room ID and try again.');
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <MobileLayout title="Chat Rooms">
      <div className="px-4 py-4 flex flex-col gap-4 flex-1">
        
        {/* Header Alert card */}
        <div className="bg-slate-800 text-white p-4 rounded-3xl shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-slate-700 text-primary-400 rounded-xl flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm">Interest Groups</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Join discussions or create public/private groups.
              </p>
            </div>
          </div>
          
          {/* Create Room trigger */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold p-2.5 rounded-2xl flex items-center justify-center shrink-0 active:scale-95 transition-all shadow-md"
            title="Create Group"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Join Private Room input panel */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex flex-col gap-2">
          <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 pl-0.5">
            <Key size={14} className="text-primary-600" />
            <span>Join Private Group</span>
          </h4>
          <form onSubmit={handleJoinPrivateRoom} className="flex gap-2 items-start mt-1">
            <div className="flex-1">
              <input
                type="text"
                value={privateRoomId}
                onChange={(e) => setPrivateRoomId(e.target.value)}
                placeholder="Enter Group ID (e.g. room_abc123)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary-500 transition-colors"
              />
              {joinError && <p className="text-[9px] text-red-500 font-semibold pl-1.5 mt-1">{joinError}</p>}
            </div>
            <button
              type="submit"
              disabled={joinLoading || !privateRoomId.trim()}
              className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shrink-0 transition-all active:scale-95 disabled:scale-100 shadow-sm"
            >
              {joinLoading ? 'Joining...' : 'Join'}
            </button>
          </form>
        </div>

        {/* Room list label */}
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 mt-1">
          Active Public Groups
        </h4>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2"></div>
            <span className="text-xs">Loading rooms...</span>
          </div>
        ) : error ? (
          <div className="text-center py-10 text-red-500 text-xs">{error}</div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 px-8">
            <p className="text-slate-400 text-xs font-semibold">No public groups active</p>
            <button 
              onClick={() => setShowCreateModal(true)} 
              className="text-primary-600 font-bold text-xs mt-1.5 hover:underline"
            >
              Create the first group!
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => handleJoinRoom(room.id)}
                className="w-full bg-white border border-slate-200 rounded-3xl p-4 text-left shadow-sm hover:shadow-md transition-all flex items-center justify-between group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center shrink-0">
                    <MessageCircle size={22} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm group-hover:text-primary-600 transition-colors">
                      {room.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 pr-2">ID: <span className="font-bold select-all bg-slate-50 px-1 py-0.5 rounded">{room.id}</span></p>
                    <p className="text-xs text-slate-400 mt-1 truncate pr-2">
                      {room.description}
                    </p>
                  </div>
                </div>
                
                <div className="text-slate-400 group-hover:text-primary-600 transition-colors shrink-0">
                  <ChevronRight size={20} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CREATE ROOM MODAL DIALOG */}
      {showCreateModal && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-[350px] shadow-2xl overflow-hidden flex flex-col p-6 border border-slate-100">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-base text-slate-800">Create New Group</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            {createError && (
              <div className="bg-red-50 text-red-600 text-[10px] p-2.5 rounded-xl mb-3 border border-red-100 font-semibold">
                {createError}
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleCreateRoom} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">Group Name</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. Gamer Chats"
                  maxLength={25}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">Description</label>
                <input
                  type="text"
                  value={roomDesc}
                  onChange={(e) => setRoomDesc(e.target.value)}
                  placeholder="What is this group for?"
                  maxLength={50}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-primary-500"
                />
              </div>

              {/* Group visibility toggler (Public vs Private) */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">Visibility</label>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setIsPrivate(false)}
                    className={`flex-1 py-2 px-3 border rounded-2xl flex items-center justify-center gap-1 text-[10px] font-bold transition-all ${
                      !isPrivate
                        ? 'bg-primary-50 border-primary-500 text-primary-700'
                        : 'bg-white border-slate-200 text-slate-500'
                    }`}
                  >
                    <Globe size={12} />
                    <span>Public</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPrivate(true)}
                    className={`flex-1 py-2 px-3 border rounded-2xl flex items-center justify-center gap-1 text-[10px] font-bold transition-all ${
                      isPrivate
                        ? 'bg-slate-900 border-slate-950 text-white shadow-md'
                        : 'bg-white border-slate-200 text-slate-500'
                    }`}
                  >
                    <Lock size={12} />
                    <span>Private</span>
                  </button>
                </div>
                <p className="text-[8px] text-slate-400 mt-1 pl-0.5">
                  {isPrivate 
                    ? "Private groups won't appear in the rooms list. People must enter the ID to join." 
                    : "Public groups are open for all users to discover and chat."}
                </p>
              </div>

              <button
                type="submit"
                disabled={createLoading || !roomName.trim()}
                className="w-full mt-2 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-primary-200 active:scale-98 disabled:opacity-50 transition-all"
              >
                {createLoading ? 'Creating...' : 'Create Group'}
              </button>
            </form>
          </div>
        </div>
      )}
    </MobileLayout>
  );
}
