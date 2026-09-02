import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, MessageSquare, Image, Music, Film, Copy, Trash2, Check, Palette, Camera, Trash, X } from 'lucide-react';
import { apiRequest, getSocket, getStoredUser, initSocket } from '../utils/api';

export default function RoomChat() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Multimedia Upload Ref States
  const [uploading, setUploading] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Styling & Customization States (Loaded from LocalStorage specific to this roomId)
  const [bgColor, setBgColor] = useState('bg-slate-50');
  const [bgImage, setBgImage] = useState('');
  const [fontFamily, setFontFamily] = useState('font-sans');
  const [fontColor, setFontColor] = useState('text-slate-800');
  const [fontWeight, setFontWeight] = useState('font-normal');
  const [fontItalic, setFontItalic] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const themeFileInputRef = useRef(null);

  // Load styling on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem(`room_theme_${roomId}`);
    if (savedTheme) {
      try {
        const theme = JSON.parse(savedTheme);
        if (theme.bgColor) setBgColor(theme.bgColor);
        if (theme.bgImage) setBgImage(theme.bgImage);
        if (theme.fontFamily) setFontFamily(theme.fontFamily);
        if (theme.fontColor) setFontColor(theme.fontColor);
        if (theme.fontWeight) setFontWeight(theme.fontWeight);
        if (theme.fontItalic !== undefined) setFontItalic(theme.fontItalic);
      } catch (e) {
        console.error('Failed to parse saved room theme:', e);
      }
    }
  }, [roomId]);

  // Save styling helper
  const saveThemeSettings = (updatedFields) => {
    const currentTheme = {
      bgColor,
      bgImage,
      fontFamily,
      fontColor,
      fontWeight,
      fontItalic
    };
    const newTheme = { ...currentTheme, ...updatedFields };
    
    // Save to states
    if (updatedFields.bgColor !== undefined) setBgColor(updatedFields.bgColor);
    if (updatedFields.bgImage !== undefined) setBgImage(updatedFields.bgImage);
    if (updatedFields.fontFamily !== undefined) setFontFamily(updatedFields.fontFamily);
    if (updatedFields.fontColor !== undefined) setFontColor(updatedFields.fontColor);
    if (updatedFields.fontWeight !== undefined) setFontWeight(updatedFields.fontWeight);
    if (updatedFields.fontItalic !== undefined) setFontItalic(updatedFields.fontItalic);

    // Persist
    localStorage.setItem(`room_theme_${roomId}`, JSON.stringify(newTheme));
  };

  const handleBgImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      saveThemeSettings({ bgImage: reader.result });
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const getFontFamilyStyle = (font) => {
    switch (font) {
      case 'font-sans': return 'ui-sans-serif, system-ui, sans-serif';
      case 'font-serif': return 'ui-serif, Georgia, Cambria, serif';
      case 'font-mono': return 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      case 'font-cursive': return 'cursive, Comic Sans MS, sans-serif';
      default: return 'ui-sans-serif, system-ui, sans-serif';
    }
  };

  const getFontColorHex = (colorClass) => {
    switch (colorClass) {
      case 'text-slate-800': return '#1e293b';
      case 'text-blue-900': return '#1e3a8a';
      case 'text-emerald-900': return '#064e3b';
      case 'text-pink-900': return '#831843';
      case 'text-rose-900': return '#881337';
      case 'text-yellow-600': return '#854d0e';
      default: return '#1e293b';
    }
  };

  const getFontWeightStyle = (weight) => {
    switch (weight) {
      case 'font-normal': return '400';
      case 'font-medium': return '500';
      case 'font-semibold': return '600';
      case 'font-bold': return '700';
      default: return '400';
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

      // Listen for room message deleted
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
    }

    const setupChat = async () => {
      try {
        // Fetch rooms to find metadata of current room
        const roomsData = await apiRequest('/api/rooms');
        // Check if room is private or public by trying direct fetch if not in rooms list
        let currentRoom = roomsData.find(r => r.id === roomId);
        if (!currentRoom) {
          currentRoom = await apiRequest(`/api/rooms/${roomId}`);
        }
        if (isMounted) {
          setRoom(currentRoom);
        }

        // Fetch messages history
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
        e.target.value = ''; // Reset input
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCopyText = (msgId, text) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleDeleteMessage = (msgId) => {
    if (window.confirm('Delete this message for everyone in this group?')) {
      const socket = getSocket();
      if (socket) {
        socket.emit('delete-message', {
          messageId: msgId,
          targetId: roomId,
          isDM: false
        });
      }
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const socket = getSocket();
    if (socket) {
      socket.emit('send-room-message', {
        roomId: roomId,
        content: inputText
      });
      setInputText('');
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-0 md:p-4">
      <div className="w-full md:w-[410px] h-screen md:h-[840px] md:max-h-[90vh] bg-white flex flex-col shadow-2xl md:rounded-[40px] md:border-[10px] md:border-slate-800 overflow-hidden relative">
        
        {/* Smartphone top status bar (Notch) */}
        <div className="hidden md:flex justify-between items-center bg-slate-800 text-white text-[11px] px-6 py-1 z-50">
          <span>9:41</span>
          <div className="w-20 h-4 bg-black rounded-full absolute left-1/2 transform -translate-x-1/2 top-1"></div>
          <div className="flex items-center gap-1">
            <span>5G</span>
            <div className="w-4 h-2 border border-white rounded-sm p-[1px]">
              <div className="w-full h-full bg-white"></div>
            </div>
          </div>
        </div>

        {/* Chat Header */}
        <header className="bg-primary-600 text-white px-3 py-3 flex items-center border-b border-primary-700 shadow-sm z-30">
          <button 
            onClick={() => navigate('/rooms')}
            className="p-1 hover:bg-primary-700 rounded-full transition-colors mr-2 text-white"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-sm truncate">{room ? room.name : 'Loading Room...'}</h2>
            <p className="text-[9px] text-primary-100 truncate mt-0.5">
              {room ? room.description : 'Please wait...'}
            </p>
          </div>

          <button
            onClick={() => setShowThemeModal(true)}
            className="p-2 hover:bg-primary-700 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all border border-white/25 active:scale-95 ml-2 flex items-center gap-1 shrink-0"
          >
            <Palette size={12} />
            <span>Theme</span>
          </button>
        </header>

        {/* Messages Body */}
        <div 
          className={`flex-1 overflow-y-auto p-4 flex flex-col gap-3 transition-all ${bgImage ? '' : bgColor}`}
          style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
        >
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mb-2"></div>
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
                  {/* Sender Name */}
                  {!isOwnMessage && (
                    <span className="text-[10px] font-semibold text-slate-500 mb-1 ml-1">
                      {msg.senderName}
                    </span>
                  )}
                  {/* Message Bubble */}
                  <div className={`px-3.5 py-2.5 rounded-2xl text-xs shadow-sm flex flex-col gap-1.5 ${
                    msg.deleted
                      ? 'bg-slate-100 border border-slate-200 text-slate-400 italic rounded-2xl'
                      : isOwnMessage 
                      ? 'bg-primary-600 text-white rounded-tr-none' 
                      : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                  }`}>
                    {/* Deleted message indicator */}
                    {msg.deleted ? (
                      <span className="flex items-center gap-1 font-semibold">
                        <span>{msg.content}</span>
                      </span>
                    ) : (
                      <>
                        {/* Multimedia content renders */}
                        {msg.mediaType === 'image' && (
                          <img 
                            src={fileUrl} 
                            alt="Shared photo" 
                            className="max-w-[180px] rounded-xl object-cover cursor-pointer max-h-[140px] border border-black/10 hover:opacity-95"
                            onClick={() => window.open(fileUrl, '_blank')}
                          />
                        )}
                        {msg.mediaType === 'audio' && (
                          <audio src={fileUrl} controls className="max-w-[180px]" />
                        )}
                        {msg.mediaType === 'video' && (
                          <video src={fileUrl} controls className="max-w-[180px] rounded-xl max-h-[140px]" />
                        )}
                        
                        {/* Text message */}
                        {msg.content && (
                          <span 
                            className="break-all whitespace-pre-wrap"
                            style={!isOwnMessage ? { 
                              fontFamily: getFontFamilyStyle(fontFamily),
                              fontWeight: getFontWeightStyle(fontWeight),
                              fontStyle: fontItalic ? 'italic' : 'normal',
                              color: getFontColorHex(fontColor)
                            } : {}}
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
                        className="hover:text-primary-600 transition-colors"
                      >
                        {copiedMsgId === msg.id ? 'Copied!' : 'Copy'}
                      </button>
                    )}
                    {isOwnMessage && !msg.deleted && (
                      <button 
                        onClick={() => handleDeleteMessage(msg.id)} 
                        className="hover:text-red-500 transition-colors"
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
          onChange={(e) => handleFileUpload(e, 'image')} 
          accept="image/*" 
          className="hidden" 
        />
        <input 
          type="file" 
          ref={audioInputRef} 
          onChange={(e) => handleFileUpload(e, 'audio')} 
          accept="audio/*" 
          className="hidden" 
        />
        <input 
          type="file" 
          ref={videoInputRef} 
          onChange={(e) => handleFileUpload(e, 'video')} 
          accept="video/*" 
          className="hidden" 
        />

        {/* Hidden Theme Background Photo Input */}
        <input 
          type="file" 
          ref={themeFileInputRef} 
          onChange={handleBgImageUpload} 
          accept="image/*" 
          className="hidden" 
        />

        {/* Chat Input Box */}
        <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex gap-1.5 items-center z-30">
          <div className="flex gap-0.5">
            <button
              type="button"
              disabled={uploading}
              onClick={() => imageInputRef.current?.click()}
              className="p-1.5 text-slate-400 hover:text-primary-600 rounded-full hover:bg-slate-50 transition-colors disabled:opacity-50 shrink-0"
              title="Share Image"
            >
              <Image size={15} />
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => audioInputRef.current?.click()}
              className="p-1.5 text-slate-400 hover:text-primary-600 rounded-full hover:bg-slate-50 transition-colors disabled:opacity-50 shrink-0"
              title="Share Audio"
            >
              <Music size={15} />
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => videoInputRef.current?.click()}
              className="p-1.5 text-slate-400 hover:text-primary-600 rounded-full hover:bg-slate-50 transition-colors disabled:opacity-50 shrink-0"
              title="Share Video"
            >
              <Film size={15} />
            </button>
          </div>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={uploading ? "Uploading file..." : "Type your message..."}
            disabled={uploading}
            className="flex-1 px-4 py-2.5 bg-slate-100 border border-slate-200 focus:border-primary-500 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={(!inputText.trim() && !uploading) || uploading}
            className="w-9 h-9 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-200 text-white rounded-full flex items-center justify-center shadow-md active:scale-95 disabled:scale-100 transition-all shrink-0"
          >
            <Send size={16} />
          </button>
        </form>

        {/* Theme & Font Customization Modal */}
        {showThemeModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm max-h-[85vh] overflow-y-auto p-5 shadow-2xl flex flex-col gap-4 relative animate-slide-up">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Palette className="text-primary-600" size={18} />
                  <h3 className="font-extrabold text-slate-800 text-sm">Theme & Font Settings</h3>
                </div>
                <button 
                  onClick={() => setShowThemeModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 1. Background Color Themes */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Background Color
                </label>
                <div className="flex gap-2.5 flex-wrap">
                  {[
                    { name: 'Default Slate', class: 'bg-slate-50', border: 'border-slate-300', bg: '#f8fafc' },
                    { name: 'Soft Amber', class: 'bg-amber-50', border: 'border-amber-300', bg: '#fffbeb' },
                    { name: 'Soft Pink', class: 'bg-pink-50', border: 'border-pink-300', bg: '#fdf2f8' },
                    { name: 'Sky Blue', class: 'bg-blue-50', border: 'border-blue-300', bg: '#eff6ff' },
                    { name: 'Emerald Mint', class: 'bg-emerald-50', border: 'border-emerald-300', bg: '#ecfdf5' },
                    { name: 'Dark Theme', class: 'bg-slate-800', border: 'border-slate-700', bg: '#1e293b' },
                  ].map((color) => (
                    <button
                      key={color.class}
                      onClick={() => saveThemeSettings({ bgColor: color.class, bgImage: '' })}
                      style={{ backgroundColor: color.bg }}
                      className={`w-9 h-9 rounded-2xl border-2 shadow-sm transition-all flex items-center justify-center ${
                        !bgImage && bgColor === color.class ? 'ring-2 ring-primary-500 scale-110 border-primary-500' : color.border
                      }`}
                      title={color.name}
                    >
                      {!bgImage && bgColor === color.class && (
                        <Check size={14} className={color.class === 'bg-slate-800' ? 'text-white' : 'text-primary-600'} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Photo Background Wallpaper */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Custom Wallpaper (Photo)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => themeFileInputRef.current?.click()}
                    className="flex-1 py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Camera size={14} className="text-primary-600" />
                    <span>{bgImage ? 'Change Photo' : 'Upload Wallpaper'}</span>
                  </button>
                  {bgImage && (
                    <button
                      type="button"
                      onClick={() => saveThemeSettings({ bgImage: '' })}
                      className="py-2.5 px-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-2xl text-xs font-bold text-red-600 flex items-center justify-center gap-1 transition-all"
                    >
                      <Trash size={14} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 3. Font Family */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Font Family
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Default (Sans)', val: 'font-sans' },
                    { label: 'Classic (Serif)', val: 'font-serif' },
                    { label: 'Code (Mono)', val: 'font-mono' },
                    { label: 'Comic / Cursive', val: 'font-cursive' },
                  ].map((f) => (
                    <button
                      key={f.val}
                      onClick={() => saveThemeSettings({ fontFamily: f.val })}
                      style={{ fontFamily: getFontFamilyStyle(f.val) }}
                      className={`py-2 px-3 rounded-2xl text-xs font-bold border transition-all ${
                        fontFamily === f.val 
                          ? 'bg-primary-50 border-primary-500 text-primary-700 shadow-sm' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Font Color */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Text & Words Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: 'Charcoal', val: 'text-slate-800', hex: '#1e293b' },
                    { label: 'Navy Blue', val: 'text-blue-900', hex: '#1e3a8a' },
                    { label: 'Forest Green', val: 'text-emerald-900', hex: '#064e3b' },
                    { label: 'Deep Pink', val: 'text-pink-900', hex: '#831843' },
                    { label: 'Dark Red', val: 'text-rose-900', hex: '#881337' },
                    { label: 'Amber Gold', val: 'text-yellow-600', hex: '#854d0e' },
                  ].map((c) => (
                    <button
                      key={c.val}
                      onClick={() => saveThemeSettings({ fontColor: c.val })}
                      className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl border text-[11px] font-bold transition-all ${
                        fontColor === c.val 
                          ? 'bg-slate-100 border-slate-400 ring-1 ring-primary-500' 
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: c.hex }}></span>
                      <span style={{ color: c.hex }}>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Font Weight & Italic Style */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Text Weight & Style
                </label>
                <div className="flex gap-2">
                  <select
                    value={fontWeight}
                    onChange={(e) => saveThemeSettings({ fontWeight: e.target.value })}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    <option value="font-normal">Regular Weight</option>
                    <option value="font-medium">Medium Weight</option>
                    <option value="font-semibold">Semi-Bold</option>
                    <option value="font-bold">Bold Weight</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => saveThemeSettings({ fontItalic: !fontItalic })}
                    className={`px-4 py-2 rounded-2xl text-xs font-bold italic border transition-all ${
                      fontItalic 
                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Italic <i>(Aa)</i>
                  </button>
                </div>
              </div>

              {/* Preview Box */}
              <div className="bg-slate-100 rounded-2xl p-3 border border-slate-200 flex flex-col gap-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Live Preview</span>
                <div 
                  className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs text-xs"
                  style={{
                    fontFamily: getFontFamilyStyle(fontFamily),
                    fontWeight: getFontWeightStyle(fontWeight),
                    fontStyle: fontItalic ? 'italic' : 'normal',
                    color: getFontColorHex(fontColor)
                  }}
                >
                  Hello! Yeh group chat text ka preview hai.
                </div>
              </div>

              {/* Apply / Close Button */}
              <button
                type="button"
                onClick={() => setShowThemeModal(false)}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl text-xs font-bold active:scale-95 transition-all shadow-md mt-1"
              >
                Apply & Save Theme
              </button>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
