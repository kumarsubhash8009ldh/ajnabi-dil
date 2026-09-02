import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Wifi, WifiOff, ChevronRight } from 'lucide-react';
import { apiRequest } from '../utils/api';
import MobileLayout from '../components/MobileLayout';

export default function DirectMessages() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const users = await apiRequest('/api/users');
        setChats(users);
      } catch (err) {
        setError(err.message || 'Failed to load chats');
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, []);

  const handleOpenChat = (userId) => {
    navigate(`/chat/dm/${userId}`);
  };

  return (
    <MobileLayout title="Direct Messages">
      <div className="px-4 py-4 flex flex-col gap-4 flex-1">
        <div className="bg-white border border-slate-200 rounded-3xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center">
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-800">Your Contacts</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Click on any user below to start a private real-time chat.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2"></div>
            <span className="text-xs">Loading contacts...</span>
          </div>
        ) : error ? (
          <div className="text-center py-10 text-red-500 text-xs">{error}</div>
        ) : chats.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center text-slate-400">
            <span className="text-sm font-semibold">No contacts available</span>
            <p className="text-xs mt-1">There are no other registered users yet.</p>
          </div>
        ) : (
          <div className="flex flex-col bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            {chats.map((user, index) => (
              <button
                key={user.id}
                onClick={() => handleOpenChat(user.id)}
                className={`w-full p-4 text-left flex items-center justify-between hover:bg-slate-50 transition-colors ${
                  index !== chats.length - 1 ? 'border-b border-slate-100' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img 
                      src={user.avatar} 
                      alt={user.username} 
                      className="w-11 h-11 bg-slate-100 rounded-xl object-cover border border-slate-100"
                    />
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                      user.isOnline ? 'bg-green-500 animate-pulse-online' : 'bg-slate-300'
                    }`}></span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm truncate">{user.username}</h4>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5 pr-2">
                      {user.bio || "Active in Chitchat"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-slate-400">
                  {user.isOnline ? (
                    <span className="text-[9px] text-green-500 font-semibold uppercase tracking-wider mr-1">Online</span>
                  ) : null}
                  <ChevronRight size={16} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
