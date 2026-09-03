import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Send, MessageSquare, Image, Music, Film, Copy, Trash2, 
  Check, Palette, Camera, Trash, X, Crown, Users, UserMinus, UserPlus, 
  Volume2, Play, Pause, Upload, Sliders, Sparkles, Search, ShieldAlert, Phone 
} from 'lucide-react';
import { apiRequest, getSocket, getStoredUser, initSocket } from '../utils/api';
import ChatInputBar from '../components/ChatInputBar';
import VoiceNoteBubble from '../components/VoiceNoteBubble';

// 16 Decent Aesthetic Themes for Rooms
export const ROOM_THEMES = [
  {
    id: 'midnight_slate',
    name: 'Midnight Slate',
    icon: '🌑',
    bgColor: 'bg-slate-950',
    headerBg: 'bg-slate-900/90 text-white border-slate-800',
    bubbleColor: 'bg-slate-800 text-slate-100 border border-slate-700/50',
    ownBubble: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white',
    fontColor: 'text-slate-100',
    accentColor: '#3b82f6',
    border: 'border-slate-800'
  },
  {
    id: 'royal_gold',
    name: 'Royal Gold',
    icon: '👑',
    bgColor: 'bg-gradient-to-b from-stone-950 via-zinc-900 to-black',
    headerBg: 'bg-black/90 text-amber-300 border-amber-500/30',
    bubbleColor: 'bg-stone-900/90 text-amber-100 border border-amber-500/30',
    ownBubble: 'bg-gradient-to-r from-amber-600 to-yellow-500 text-slate-950 font-bold',
    fontColor: 'text-amber-200',
    accentColor: '#f59e0b',
    border: 'border-amber-500/40'
  },
  {
    id: 'cyber_neon',
    name: 'Cyber Neon',
    icon: '⚡',
    bgColor: 'bg-black',
    headerBg: 'bg-slate-950/90 text-cyan-400 border-cyan-500/40',
    bubbleColor: 'bg-slate-900/90 text-cyan-300 border border-cyan-500/40',
    ownBubble: 'bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white',
    fontColor: 'text-cyan-300',
    accentColor: '#06b6d4',
    border: 'border-cyan-500/50'
  },
  {
    id: 'rose_romance',
    name: 'Rose Romance',
    icon: '🌹',
    bgColor: 'bg-gradient-to-b from-rose-950 via-pink-950 to-slate-950',
    headerBg: 'bg-rose-950/90 text-pink-200 border-rose-500/30',
    bubbleColor: 'bg-rose-900/40 text-rose-100 border border-rose-500/30',
    ownBubble: 'bg-gradient-to-r from-pink-600 to-rose-600 text-white',
    fontColor: 'text-rose-200',
    accentColor: '#ec4899',
    border: 'border-rose-500/40'
  },
  {
    id: 'emerald_forest',
    name: 'Emerald Forest',
    icon: '🌲',
    bgColor: 'bg-gradient-to-b from-emerald-950 via-teal-950 to-slate-950',
    headerBg: 'bg-emerald-950/90 text-emerald-200 border-emerald-500/30',
    bubbleColor: 'bg-emerald-900/40 text-emerald-100 border border-emerald-500/30',
    ownBubble: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white',
    fontColor: 'text-emerald-200',
    accentColor: '#10b981',
    border: 'border-emerald-500/40'
  },
  {
    id: 'ocean_sunset',
    name: 'Ocean Sunset',
    icon: '🌅',
    bgColor: 'bg-gradient-to-b from-indigo-950 via-blue-950 to-slate-950',
    headerBg: 'bg-indigo-950/90 text-orange-200 border-orange-500/30',
    bubbleColor: 'bg-blue-900/40 text-orange-100 border border-orange-500/30',
    ownBubble: 'bg-gradient-to-r from-orange-500 to-pink-600 text-white',
    fontColor: 'text-orange-200',
    accentColor: '#f97316',
    border: 'border-orange-500/40'
  },
  {
    id: 'cosmic_galaxy',
    name: 'Cosmic Galaxy',
    icon: '🌌',
    bgColor: 'bg-gradient-to-b from-purple-950 via-indigo-950 to-black',
    headerBg: 'bg-purple-950/90 text-purple-200 border-purple-500/30',
    bubbleColor: 'bg-purple-900/40 text-purple-100 border border-purple-500/30',
    ownBubble: 'bg-gradient-to-r from-violet-600 to-purple-600 text-white',
    fontColor: 'text-purple-200',
    accentColor: '#8b5cf6',
    border: 'border-purple-500/40'
  },
  {
    id: 'lavender_mist',
    name: 'Lavender Mist',
    icon: '🪻',
    bgColor: 'bg-gradient-to-b from-slate-900 via-purple-950 to-slate-900',
    headerBg: 'bg-slate-900/90 text-purple-200 border-purple-400/20',
    bubbleColor: 'bg-slate-800 text-purple-100 border border-purple-400/20',
    ownBubble: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
    fontColor: 'text-purple-200',
    accentColor: '#a855f7',
    border: 'border-purple-400/30'
  },
  {
    id: 'crimson_ruby',
    name: 'Crimson Ruby',
    icon: '💎',
    bgColor: 'bg-gradient-to-b from-red-950 via-rose-950 to-black',
    headerBg: 'bg-red-950/90 text-rose-200 border-red-500/30',
    bubbleColor: 'bg-red-900/40 text-red-100 border border-red-500/30',
    ownBubble: 'bg-gradient-to-r from-red-600 to-rose-600 text-white',
    fontColor: 'text-red-200',
    accentColor: '#ef4444',
    border: 'border-red-500/40'
  },
  {
    id: 'mint_breeze',
    name: 'Mint Breeze',
    icon: '🍃',
    bgColor: 'bg-gradient-to-b from-teal-950 via-slate-900 to-black',
    headerBg: 'bg-teal-950/90 text-teal-200 border-teal-500/30',
    bubbleColor: 'bg-teal-900/40 text-teal-100 border border-teal-500/30',
    ownBubble: 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white',
    fontColor: 'text-teal-200',
    accentColor: '#14b8a6',
    border: 'border-teal-500/40'
  },
  {
    id: 'golden_amber',
    name: 'Golden Amber',
    icon: '🍯',
    bgColor: 'bg-gradient-to-b from-amber-950 via-orange-950 to-black',
    headerBg: 'bg-amber-950/90 text-amber-200 border-amber-500/30',
    bubbleColor: 'bg-amber-900/40 text-amber-100 border border-amber-500/30',
    ownBubble: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white',
    fontColor: 'text-amber-200',
    accentColor: '#f59e0b',
    border: 'border-amber-500/40'
  },
  {
    id: 'pure_minimal',
    name: 'Pure Minimal',
    icon: '🤍',
    bgColor: 'bg-slate-100',
    headerBg: 'bg-white text-slate-800 border-slate-200 shadow-sm',
    bubbleColor: 'bg-white text-slate-800 border border-slate-200',
    ownBubble: 'bg-slate-900 text-white',
    fontColor: 'text-slate-800',
    accentColor: '#0f172a',
    border: 'border-slate-300'
  },
  {
    id: 'sakura_blossom',
    name: 'Sakura Blossom',
    icon: '🌸',
    bgColor: 'bg-gradient-to-b from-pink-950 via-rose-950 to-slate-900',
    headerBg: 'bg-pink-950/90 text-pink-200 border-pink-400/30',
    bubbleColor: 'bg-pink-900/40 text-pink-100 border border-pink-400/30',
    ownBubble: 'bg-gradient-to-r from-pink-500 to-rose-400 text-white',
    fontColor: 'text-pink-200',
    accentColor: '#f43f5e',
    border: 'border-pink-400/40'
  },
  {
    id: 'titanium_matrix',
    name: 'Titanium Matrix',
    icon: '🟩',
    bgColor: 'bg-zinc-950',
    headerBg: 'bg-zinc-900/90 text-emerald-400 border-emerald-500/30',
    bubbleColor: 'bg-zinc-900 text-emerald-300 border border-emerald-500/30',
    ownBubble: 'bg-gradient-to-r from-emerald-600 to-green-500 text-black font-bold',
    fontColor: 'text-emerald-300',
    accentColor: '#22c55e',
    border: 'border-emerald-500/40'
  },
  {
    id: 'deep_abyss',
    name: 'Deep Abyss',
    icon: '🌊',
    bgColor: 'bg-gradient-to-b from-cyan-950 via-blue-950 to-black',
    headerBg: 'bg-cyan-950/90 text-cyan-200 border-cyan-500/30',
    bubbleColor: 'bg-cyan-900/40 text-cyan-100 border border-cyan-500/30',
    ownBubble: 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white',
    fontColor: 'text-cyan-200',
    accentColor: '#0891b2',
    border: 'border-cyan-500/40'
  },
  {
    id: 'autumn_velvet',
    name: 'Autumn Velvet',
    icon: '🍂',
    bgColor: 'bg-gradient-to-b from-amber-950 via-stone-900 to-black',
    headerBg: 'bg-stone-900/90 text-orange-200 border-orange-600/30',
    bubbleColor: 'bg-stone-900 text-orange-100 border border-orange-600/30',
    ownBubble: 'bg-gradient-to-r from-orange-600 to-amber-700 text-white',
    fontColor: 'text-orange-200',
    accentColor: '#ea580c',
    border: 'border-orange-600/40'
  }
];

export default function RoomChat() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Multimedia Upload Ref States
  const [uploading, setUploading] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Styling & Customization States
  const [selectedThemeId, setSelectedThemeId] = useState('midnight_slate');
  const [bgImage, setBgImage] = useState('');
  const [fontFamily, setFontFamily] = useState('font-sans');
  const [fontColor, setFontColor] = useState('text-slate-100');
  const [fontWeight, setFontWeight] = useState('font-normal');
  const [fontItalic, setFontItalic] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminTab, setAdminTab] = useState('themes'); // 'themes' | 'music' | 'members' | 'add'
  const themeFileInputRef = useRef(null);

  // Room Music & Audio Controls
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [currentSongTitle, setCurrentSongTitle] = useState('Indian Lo-Fi Chill');
  const [musicVolume, setMusicVolume] = useState(70);
  const roomAudioRef = useRef(null);
  const roomPhoneFileInputRef = useRef(null);

  // Room Members & Search
  const [roomMembers, setRoomMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [searchUserQuery, setSearchUserQuery] = useState('');

  const currentTheme = ROOM_THEMES.find(t => t.id === selectedThemeId) || ROOM_THEMES[0];

  // Check if current user is Room Admin / Creator
  const isRoomAdmin = Boolean(
    currentUser && room && (
      room.createdBy === currentUser.id ||
      room.creatorId === currentUser.id ||
      room.hostId === currentUser.id ||
      currentUser.username === 'admin'
    )
  );

  // Load styling on mount
  useEffect(() => {
    const savedThemeId = localStorage.getItem(`room_theme_id_${roomId}`);
    if (savedThemeId) {
      setSelectedThemeId(savedThemeId);
    }
  }, [roomId]);

  const applyRoomTheme = (themeId, broadcast = false) => {
    setSelectedThemeId(themeId);
    localStorage.setItem(`room_theme_id_${roomId}`, themeId);
    if (broadcast) {
      const socket = getSocket();
      if (socket) {
        socket.emit('update-room-theme', { roomId, theme: themeId });
      }
    }
  };

  useEffect(() => {
    const user = getStoredUser();
    setCurrentUser(user);

    let isMounted = true;
    const socket = initSocket();

    if (socket) {
      socket.emit('join-room', roomId);
      
      socket.on('receive-room-message', (message) => {
        if (!isMounted) return;
        if (message.roomId === roomId) {
          setMessages((prev) => [...prev, message]);
        }
      });

      socket.on('message-deleted', (data) => {
        if (!isMounted) return;
        if (data.roomId === roomId) {
          setMessages((prev) => prev.map(m => 
            m.id === data.messageId
              ? { ...m, deleted: true, content: '🚫 This message was deleted', fileUrl: undefined, mediaType: undefined }
              : m
          ));
        }
      });

      // Synchronize Room Theme when Admin updates it
      socket.on('room-theme-updated', (data) => {
        if (!isMounted) return;
        if (data.roomId === roomId && data.theme) {
          setSelectedThemeId(data.theme);
          localStorage.setItem(`room_theme_id_${roomId}`, data.theme);
        }
      });

      // Synchronize Room Background Music
      socket.on('room-music-state', (data) => {
        if (!isMounted) return;
        if (data.roomId === roomId) {
          if (data.action === 'play') {
            setIsPlayingMusic(true);
            if (data.songTitle) setCurrentSongTitle(data.songTitle);
          } else if (data.action === 'pause') {
            setIsPlayingMusic(false);
          }
          if (data.volume !== undefined) {
            setMusicVolume(data.volume);
            if (roomAudioRef.current) {
              roomAudioRef.current.volume = data.volume / 100;
            }
          }
        }
      });

      // Handle Being Kicked Out by Admin
      socket.on('kicked-from-room', (data) => {
        if (data.roomId === roomId) {
          alert('⚠️ Aapko Room Admin ne is group se kick out / remove kar diya hai.');
          navigate('/rooms');
        }
      });

      // When another member is kicked
      socket.on('room-member-kicked', (data) => {
        if (!isMounted) return;
        if (data.roomId === roomId) {
          setRoomMembers(prev => prev.filter(m => m.id !== data.targetUserId));
        }
      });

      // Room invitation notification
      socket.on('room-invitation', (data) => {
        if (!isMounted) return;
        console.log('Room invitation received:', data);
      });
    }

    const setupChat = async () => {
      try {
        const [roomsData, usersData] = await Promise.all([
          apiRequest('/api/rooms'),
          apiRequest('/api/users').catch(() => [])
        ]);

        let currentRoom = roomsData.find(r => r.id === roomId);
        if (!currentRoom) {
          currentRoom = await apiRequest(`/api/rooms/${roomId}`);
        }
        if (isMounted) {
          setRoom(currentRoom);
          setAllUsers(usersData);
          setRoomMembers(usersData.filter(u => u.isOnline).slice(0, 10));
        }

        const history = await apiRequest(`/api/chat/history/room/${roomId}`);
        if (isMounted) {
          setMessages(history);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to initialize room chat', err);
        if (isMounted) {
          navigate('/rooms');
        }
      }
    };

    setupChat();

    return () => {
      isMounted = false;
      if (socket) {
        socket.off('receive-room-message');
        socket.off('message-deleted');
        socket.off('room-theme-updated');
        socket.off('room-music-state');
        socket.off('kicked-from-room');
        socket.off('room-member-kicked');
      }
      if (roomAudioRef.current) {
        roomAudioRef.current.pause();
      }
    };
  }, [roomId, navigate]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result;
        const response = await apiRequest('/api/upload', 'POST', {
          base64Data,
          filename: file.name
        });

        const socket = getSocket();
        if (socket) {
          socket.emit('send-room-message', {
            roomId: roomId,
            content: '',
            mediaType: type,
            fileUrl: response.url
          });
        }
      } catch (err) {
        console.error('Failed to upload file:', err);
        alert('File upload failed. Please try again.');
      } finally {
        setUploading(false);
        e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = (text) => {
    const socket = getSocket();
    if (socket && text.trim()) {
      socket.emit('send-room-message', {
        roomId: roomId,
        content: text.trim(),
        mediaType: 'text'
      });
    }
  };

  const handleSendVoiceNote = async (base64Audio, duration) => {
    try {
      const response = await apiRequest('/api/upload', 'POST', {
        base64Data: base64Audio,
        filename: `voicenote_${Date.now()}.webm`
      });

      const socket = getSocket();
      if (socket) {
        socket.emit('send-room-message', {
          roomId: roomId,
          content: `🎤 Voice note (${duration}s)`,
          mediaType: 'audio',
          fileUrl: response.url
        });
      }
    } catch (err) {
      console.error('Failed to send voice note:', err);
      alert('Voice note bhejne me samasya aayi. Dobara koshish karein.');
    }
  };

  const handleDeleteMessage = (messageId) => {
    if (window.confirm('Delete this message for everyone?')) {
      const socket = getSocket();
      if (socket) {
        socket.emit('delete-message', { roomId: roomId, messageId });
      }
    }
  };

  const handleCopyText = (msgId, text) => {
    if (!text) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 2000);
    }
  };

  // Admin Kick Member Handler
  const handleKickMember = (member) => {
    if (!window.confirm(`Kya aap @${member.username} ko is room se kick out karna chahte hain?`)) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('kick-room-member', { roomId, targetUserId: member.id });
      setRoomMembers(prev => prev.filter(m => m.id !== member.id));
      alert(`@${member.username} ko room se kick out kar diya gaya hai.`);
    }
  };

  // Admin Invite Member Handler
  const handleInviteMember = (user) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('invite-room-member', { 
        roomId, 
        roomName: room?.name || 'Chat Room', 
        targetUserId: user.id 
      });
      alert(`@${user.username} ko room me invite bhej diya gaya hai!`);
    }
  };

  // Admin Song Controls
  const handlePlayPhoneMusic = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (roomAudioRef.current) {
      roomAudioRef.current.src = url;
      roomAudioRef.current.volume = musicVolume / 100;
      roomAudioRef.current.play().then(() => {
        setIsPlayingMusic(true);
        setCurrentSongTitle(`📁 ${file.name}`);
        const socket = getSocket();
        if (socket) {
          socket.emit('room-music-control', { 
            roomId, 
            action: 'play', 
            songTitle: file.name,
            volume: musicVolume 
          });
        }
      }).catch(err => console.warn('Audio play error:', err));
    }
  };

  const toggleRoomMusic = () => {
    if (isPlayingMusic) {
      if (roomAudioRef.current) roomAudioRef.current.pause();
      setIsPlayingMusic(false);
      const socket = getSocket();
      if (socket) {
        socket.emit('room-music-control', { roomId, action: 'pause' });
      }
    } else {
      if (roomAudioRef.current) {
        if (!roomAudioRef.current.src) {
          roomAudioRef.current.src = 'https://actions.google.com/sounds/v1/ambiences/humming_in_a_room.ogg';
        }
        roomAudioRef.current.volume = musicVolume / 100;
        roomAudioRef.current.play().then(() => {
          setIsPlayingMusic(true);
          const socket = getSocket();
          if (socket) {
            socket.emit('room-music-control', { roomId, action: 'play', songTitle: currentSongTitle, volume: musicVolume });
          }
        }).catch(err => console.warn('Audio play error:', err));
      }
    }
  };

  const handleVolumeChange = (newVol) => {
    setMusicVolume(newVol);
    if (roomAudioRef.current) {
      roomAudioRef.current.volume = newVol / 100;
    }
    const socket = getSocket();
    if (socket) {
      socket.emit('room-music-control', { roomId, action: isPlayingMusic ? 'play' : 'pause', volume: newVol });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex justify-center items-center">
      <div className="w-full max-w-md h-full bg-white flex flex-col relative shadow-2xl overflow-hidden">
        
        {/* Hidden Audio Player for Room Music */}
        <audio ref={roomAudioRef} loop />

        {/* Room Header */}
        <header className={`px-3 py-3 border-b flex items-center justify-between shadow-sm transition-all z-10 ${currentTheme.headerBg}`}>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button 
              onClick={() => navigate('/rooms')} 
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors shrink-0"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm shrink-0 border border-white/20">
              {room ? room.name.charAt(0).toUpperCase() : 'R'}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-xs truncate flex items-center gap-1.5">
                <span>{room ? room.name : 'Loading Room...'}</span>
                {isRoomAdmin && (
                  <span className="text-[8px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black">
                    ADMIN
                  </span>
                )}
              </h2>
              <p className="text-[9px] opacity-80 truncate mt-0.5">
                {isPlayingMusic ? `🎵 ${currentSongTitle}` : (room ? room.description : 'Please wait...')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            {/* Music indicator & quick toggle */}
            {isPlayingMusic && (
              <button
                onClick={toggleRoomMusic}
                className="p-1.5 bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 rounded-xl text-[9px] font-bold flex items-center gap-1 animate-pulse"
                title="Pause Room Music"
              >
                <Music size={11} />
                <span>Playing</span>
              </button>
            )}

            {/* Room Invite / Share Code */}
            {room?.isPrivate && (
              <button
                onClick={() => {
                  const text = `🔒 Ajnabi Dil - Join Private Room!\nRoom Name: ${room.name}\nRoom ID: ${room.id}\nSecret Code: ${room.entryCode || 'Direct Entry'}\nEntry Fee: ${room.entryFee || 0} Coins\nLink: ${window.location.origin}/#/chat/room/${room.id}`;
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(text);
                    alert('Private Room Code & Link copied to clipboard! Share it with your friends.');
                  } else {
                    alert(text);
                  }
                }}
                className="p-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-[10px] font-black transition-all shadow active:scale-95 flex items-center gap-1"
                title="Share Room Code & Invite"
              >
                <span>🔑</span>
                <span>Code</span>
              </button>
            )}

            {/* ADMIN CONTROLS BUTTON (For Creator / Admin) */}
            {isRoomAdmin && (
              <button
                onClick={() => {
                  setAdminTab('themes');
                  setShowAdminModal(true);
                }}
                className="p-1.5 bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-400 hover:to-pink-500 text-white rounded-xl text-[10px] font-black transition-all shadow active:scale-95 flex items-center gap-1"
                title="Room Admin Controls (Themes, Songs, Members)"
              >
                <Crown size={12} className="text-yellow-200" />
                <span>Admin</span>
              </button>
            )}

            {/* THEMES BUTTON (For All) */}
            <button
              onClick={() => setShowThemeModal(true)}
              className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-extrabold transition-all border border-white/20 active:scale-95 flex items-center gap-1"
              title="Change Room Theme & Styling"
            >
              <Palette size={12} />
              <span>Theme</span>
            </button>
          </div>
        </header>

        {/* Messages Body */}
        <div 
          className={`flex-1 overflow-y-auto p-4 flex flex-col gap-3 transition-all ${bgImage ? '' : currentTheme.bgColor}`}
          style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
        >
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500 mb-2"></div>
              <span className="text-xs">Loading messages...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400">
              <MessageSquare size={36} className="text-slate-300 mb-2" />
              <span className="text-xs font-semibold">No messages yet</span>
              <p className="text-[10px] text-slate-400 mt-1 px-10">Be the first to say something in this group!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwnMessage = msg.senderId === currentUser?.id;
              const fileUrl = msg.fileUrl 
                ? (msg.fileUrl.startsWith('http') ? msg.fileUrl : `http://localhost:5000${msg.fileUrl}`)
                : '';
              
              return (
                <div 
                  key={msg.id} 
                  className={`flex flex-col max-w-[75%] ${isOwnMessage ? 'self-end items-end' : 'self-start items-start'}`}
                >
                  {!isOwnMessage && (
                    <span className="text-[10px] font-semibold text-slate-400 mb-1 ml-1 flex items-center gap-1">
                      <span>{msg.senderName}</span>
                      {room && (room.createdBy === msg.senderId || room.creatorId === msg.senderId) && (
                        <span className="text-[8px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1 rounded font-bold">
                          ADMIN
                        </span>
                      )}
                    </span>
                  )}

                  {/* Message Bubble */}
                  <div className={`px-3.5 py-2.5 rounded-2xl text-xs shadow-sm flex flex-col gap-1.5 ${
                    msg.deleted
                      ? 'bg-slate-800/60 border border-slate-700 text-slate-400 italic rounded-2xl'
                      : isOwnMessage 
                      ? `${currentTheme.ownBubble} rounded-tr-none shadow-md` 
                      : `${currentTheme.bubbleColor} rounded-tl-none`
                  }`}>
                    {msg.deleted ? (
                      <span className="flex items-center gap-1 font-semibold">
                        <span>{msg.content}</span>
                      </span>
                    ) : (
                      <>
                        {msg.mediaType === 'image' && (
                          <img 
                            src={fileUrl} 
                            alt="Shared photo" 
                            className="max-w-[180px] rounded-xl object-cover cursor-pointer max-h-[140px] border border-black/10 hover:opacity-95"
                            onClick={() => window.open(fileUrl, '_blank')}
                          />
                        )}
                        {msg.mediaType === 'audio' && (
                          <VoiceNoteBubble 
                            audioUrl={fileUrl || msg.fileUrl} 
                            isOwnMessage={isOwnMessage} 
                          />
                        )}
                        {msg.mediaType === 'video' && (
                          <video src={fileUrl} controls className="max-w-[180px] rounded-xl max-h-[140px]" />
                        )}
                        
                        {msg.content && (
                          <span 
                            className="break-all whitespace-pre-wrap"
                            style={{ 
                              fontStyle: fontItalic ? 'italic' : 'normal',
                              fontWeight: fontWeight === 'font-bold' ? 'bold' : 'normal'
                            }}
                          >
                            {msg.content}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* Actions underneath the bubble */}
                  <div className="flex items-center gap-2 mt-1 px-1 text-[8px] text-slate-400 font-bold select-none">
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {!msg.deleted && msg.content && (
                      <button 
                        onClick={() => handleCopyText(msg.id, msg.content)} 
                        className="hover:text-pink-400 transition-colors"
                      >
                        {copiedMsgId === msg.id ? 'Copied!' : 'Copy'}
                      </button>
                    )}
                    {isOwnMessage && !msg.deleted && (
                      <button 
                        onClick={() => handleDeleteMessage(msg.id)} 
                        className="hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Hidden File Inputs */}
        <input 
          type="file" 
          ref={imageInputRef} 
          accept="image/*" 
          style={{ display: 'none' }} 
          onChange={(e) => handleFileUpload(e, 'image')} 
        />
        <input 
          type="file" 
          ref={audioInputRef} 
          accept="audio/*" 
          style={{ display: 'none' }} 
          onChange={(e) => handleFileUpload(e, 'audio')} 
        />
        <input 
          type="file" 
          ref={videoInputRef} 
          accept="video/*" 
          style={{ display: 'none' }} 
          onChange={(e) => handleFileUpload(e, 'video')} 
        />
        <input 
          type="file" 
          ref={themeFileInputRef} 
          accept="image/*" 
          style={{ display: 'none' }} 
          onChange={(e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onloadend = () => {
              setBgImage(reader.result);
              e.target.value = '';
            };
            reader.readAsDataURL(file);
          }} 
        />
        <input 
          type="file" 
          ref={roomPhoneFileInputRef} 
          accept="audio/*" 
          style={{ display: 'none' }} 
          onChange={handlePlayPhoneMusic} 
        />

        {/* Uploading progress notification */}
        {uploading && (
          <div className="bg-pink-600 text-white text-[10px] font-bold px-3 py-1 text-center animate-pulse">
            Uploading attachment... Please wait
          </div>
        )}

        {/* Chat Input Bar */}
        <ChatInputBar 
          onSendMessage={handleSendMessage}
          onSendVoiceNote={handleSendVoiceNote}
          onSelectMedia={(type) => {
            if (type === 'image') imageInputRef.current?.click();
            if (type === 'audio') audioInputRef.current?.click();
            if (type === 'video') videoInputRef.current?.click();
          }}
          placeholder={`Message ${room ? room.name : 'group'}...`}
        />

        {/* ============================================================ */}
        {/* ROOM ADMIN CONTROLS MODAL (Themes, Songs, Members, Kickout) */}
        {/* ============================================================ */}
        {showAdminModal && isRoomAdmin && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl w-full max-w-sm max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
              
              {/* Header */}
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-gradient-to-r from-amber-600/20 via-pink-600/20 to-purple-600/20">
                <div className="flex items-center gap-2">
                  <Crown className="text-amber-400" size={18} />
                  <div>
                    <h3 className="font-extrabold text-sm text-white">Room Admin Center</h3>
                    <p className="text-[10px] text-slate-400">Full control over themes, songs & members</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAdminModal(false)}
                  className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex bg-slate-950 p-1 border-b border-slate-800 text-[11px] font-bold">
                <button
                  onClick={() => setAdminTab('themes')}
                  className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1 ${
                    adminTab === 'themes' ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Palette size={12} />
                  <span>Themes</span>
                </button>
                <button
                  onClick={() => setAdminTab('music')}
                  className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1 ${
                    adminTab === 'music' ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Music size={12} />
                  <span>Songs</span>
                </button>
                <button
                  onClick={() => setAdminTab('members')}
                  className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1 ${
                    adminTab === 'members' ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users size={12} />
                  <span>Members</span>
                </button>
                <button
                  onClick={() => setAdminTab('add')}
                  className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1 ${
                    adminTab === 'add' ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserPlus size={12} />
                  <span>Invite</span>
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4">
                
                {/* TAB 1: 16 DECENT THEMES */}
                {adminTab === 'themes' && (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-pink-400">
                        16 Decent Room Themes (Broadcasts to all members)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {ROOM_THEMES.map((theme) => {
                        const isSelected = selectedThemeId === theme.id;
                        return (
                          <button
                            key={theme.id}
                            onClick={() => applyRoomTheme(theme.id, true)}
                            className={`p-2.5 rounded-2xl border flex flex-col gap-1.5 text-left transition-all relative ${
                              isSelected 
                                ? 'bg-slate-800 border-pink-500 ring-2 ring-pink-500/50 shadow-lg' 
                                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-base">{theme.icon}</span>
                              {isSelected && (
                                <span className="w-4 h-4 rounded-full bg-pink-500 text-white flex items-center justify-center text-[10px]">
                                  ✓
                                </span>
                              )}
                            </div>
                            <div className="font-bold text-xs text-white truncate">{theme.name}</div>
                            <div className="flex items-center gap-1 text-[9px] text-slate-400">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.accentColor }}></span>
                              <span>Live Accent</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB 2: SONGS & SOUND CONTROL */}
                {adminTab === 'music' && (
                  <div className="flex flex-col gap-3.5">
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Music className="text-pink-400" size={16} />
                          <div>
                            <h4 className="font-bold text-xs text-white">Room Audio Player</h4>
                            <p className="text-[9px] text-slate-400 truncate max-w-[180px]">
                              {currentSongTitle}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={toggleRoomMusic}
                          className={`p-2.5 rounded-2xl font-bold text-xs flex items-center gap-1 shadow active:scale-95 transition-all ${
                            isPlayingMusic ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          {isPlayingMusic ? <Pause size={14} /> : <Play size={14} />}
                          <span>{isPlayingMusic ? 'Pause' : 'Play'}</span>
                        </button>
                      </div>

                      {/* Sound Volume Slider */}
                      <div className="mt-2 flex flex-col gap-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400">
                          <span className="flex items-center gap-1">
                            <Volume2 size={12} className="text-pink-400" />
                            <span>Room Sound Volume</span>
                          </span>
                          <span>{musicVolume}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={musicVolume}
                          onChange={(e) => handleVolumeChange(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
                        />
                      </div>
                    </div>

                    {/* Play Phone Music Button */}
                    <div className="bg-gradient-to-r from-pink-950/50 to-purple-950/50 border border-pink-500/30 rounded-2xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
                          <Upload size={16} />
                        </div>
                        <div>
                          <h5 className="font-bold text-xs text-pink-200">Play Music from Phone</h5>
                          <p className="text-[9px] text-slate-400">Apne phone ka koi bhi MP3 / Song play karein</p>
                        </div>
                      </div>
                      <button
                        onClick={() => roomPhoneFileInputRef.current?.click()}
                        className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold text-[10px] px-3 py-2 rounded-xl shadow active:scale-95 transition-all shrink-0"
                      >
                        📁 Choose File
                      </button>
                    </div>

                    {/* Preset Songs Selection */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Quick Preset Music
                      </span>
                      {[
                        { title: 'Indian Lo-Fi Chill', url: 'https://actions.google.com/sounds/v1/ambiences/humming_in_a_room.ogg' },
                        { title: 'Sitar Melody Night', url: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg' },
                        { title: 'Punjabi Dhol Beats', url: 'https://actions.google.com/sounds/v1/sports/large_crowd_cheer.ogg' },
                        { title: 'Romantic Flute Calm', url: 'https://actions.google.com/sounds/v1/weather/light_rain.ogg' }
                      ].map((track) => (
                        <div 
                          key={track.title}
                          className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between hover:border-slate-700 transition-all"
                        >
                          <span className="text-xs font-medium text-slate-200">{track.title}</span>
                          <button
                            onClick={() => {
                              setCurrentSongTitle(track.title);
                              if (roomAudioRef.current) {
                                roomAudioRef.current.src = track.url;
                                roomAudioRef.current.volume = musicVolume / 100;
                                roomAudioRef.current.play().then(() => setIsPlayingMusic(true));
                              }
                              const socket = getSocket();
                              if (socket) {
                                socket.emit('room-music-control', { roomId, action: 'play', songTitle: track.title, volume: musicVolume });
                              }
                            }}
                            className="text-[9px] font-extrabold px-2.5 py-1 bg-slate-800 hover:bg-pink-600 text-white rounded-lg transition-all"
                          >
                            Play This
                          </button>
                        </div>
                      ))}
                    </div>

                  </div>
                )}

                {/* TAB 3: MEMBERS & KICK OUT */}
                {adminTab === 'members' && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      Active Members ({roomMembers.length})
                    </span>

                    {roomMembers.map((member) => {
                      const isSelf = member.id === currentUser?.id;
                      const isCreator = room && (room.createdBy === member.id || room.creatorId === member.id);
                      return (
                        <div 
                          key={member.id}
                          className="p-2.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <img 
                              src={member.avatar || 'https://via.placeholder.com/40'} 
                              alt={member.username} 
                              className="w-8 h-8 rounded-xl object-cover border border-slate-700" 
                            />
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1">
                                <span>{member.username}</span>
                                {isCreator && <span className="text-[8px] bg-amber-400 text-slate-950 px-1 rounded font-black">ADMIN</span>}
                                {isSelf && <span className="text-[8px] bg-pink-500/30 text-pink-300 px-1 rounded font-bold">YOU</span>}
                              </div>
                              <span className="text-[9px] text-slate-500">Member</span>
                            </div>
                          </div>

                          {!isSelf && !isCreator && (
                            <button
                              onClick={() => handleKickMember(member)}
                              className="p-1.5 bg-red-600/20 hover:bg-red-600 border border-red-500/40 text-red-300 hover:text-white rounded-xl text-[10px] font-extrabold flex items-center gap-1 transition-all shadow-sm"
                              title="Kick Out Member"
                            >
                              <UserMinus size={12} />
                              <span>Kick Out</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* TAB 4: INVITE / ADD MEMBER */}
                {adminTab === 'add' && (
                  <div className="flex flex-col gap-2.5">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={searchUserQuery}
                        onChange={(e) => setSearchUserQuery(e.target.value)}
                        placeholder="Search user by username..."
                        className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-pink-500"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto">
                      {allUsers
                        .filter(u => !searchUserQuery || u.username.toLowerCase().includes(searchUserQuery.toLowerCase()))
                        .filter(u => u.id !== currentUser?.id)
                        .map((u) => (
                          <div 
                            key={u.id}
                            className="p-2 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <img src={u.avatar} alt={u.username} className="w-7 h-7 rounded-lg object-cover" />
                              <span className="text-xs font-bold text-white">{u.username}</span>
                            </div>
                            <button
                              onClick={() => handleInviteMember(u)}
                              className="px-2.5 py-1 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-lg text-[10px] font-bold shadow hover:opacity-90 active:scale-95 transition-all flex items-center gap-1"
                            >
                              <UserPlus size={11} />
                              <span>Add</span>
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Close Button */}
              <div className="p-3 border-t border-slate-800 bg-slate-950">
                <button
                  onClick={() => setShowAdminModal(false)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Close Admin Controls
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* NORMAL USER THEME SELECTION MODAL */}
        {/* ============================================================ */}
        {showThemeModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto relative animate-scale-up text-slate-800">
              
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Palette className="text-pink-600" size={18} />
                  <h3 className="font-extrabold text-slate-800 text-sm">Room Themes & Styling</h3>
                </div>
                <button 
                  onClick={() => setShowThemeModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 16 Themes Gallery */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Select Room Theme (16 Decent Presets)
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
                  {ROOM_THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => applyRoomTheme(t.id, isRoomAdmin)}
                      className={`p-2 rounded-2xl border text-left flex items-center gap-2 transition-all ${
                        selectedThemeId === t.id 
                          ? 'border-pink-500 bg-pink-50/50 shadow-sm' 
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-lg">{t.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-800 truncate">{t.name}</div>
                        <span className="text-[9px] text-slate-400">Decent Theme</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Photo Wallpaper */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Custom Photo Wallpaper
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => themeFileInputRef.current?.click()}
                    className="flex-1 py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Camera size={14} className="text-pink-600" />
                    <span>{bgImage ? 'Change Wallpaper' : 'Upload Wallpaper'}</span>
                  </button>
                  {bgImage && (
                    <button
                      type="button"
                      onClick={() => setBgImage('')}
                      className="py-2.5 px-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-2xl text-xs font-bold text-red-600 flex items-center justify-center gap-1 transition-all"
                    >
                      <Trash size={14} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Apply & Close */}
              <button
                type="button"
                onClick={() => setShowThemeModal(false)}
                className="w-full py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:opacity-95 text-white rounded-2xl text-xs font-bold active:scale-95 transition-all shadow-md mt-1"
              >
                Done
              </button>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
