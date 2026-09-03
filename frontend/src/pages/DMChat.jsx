import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Sparkles, Phone, Video, Paperclip, Image, Music, Film, Copy, Trash2, Check } from 'lucide-react';
import { apiRequest, getSocket, getStoredUser, initSocket, setSession } from '../utils/api';
import ChatInputBar from '../components/ChatInputBar';
import VoiceNoteBubble from '../components/VoiceNoteBubble';
import { useCall } from '../context/CallContext';

export default function DMChat() {
  const { otherUserId } = useParams();
  const navigate = useNavigate();
  const [otherUser, setOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [userCoins, setUserCoins] = useState(100);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  
  // Multimedia Upload Ref States
  const [uploading, setUploading] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const { startCall } = useCall();

  // Setup Chat & Socket Listeners
  useEffect(() => {
    const user = getStoredUser();
    setCurrentUser(user);
    if (user) {
      setUserCoins(user.coins !== undefined ? user.coins : 100);
    }

    let isMounted = true;
    const socket = initSocket();

    if (socket) {
      // Listen for incoming DMs
      socket.on('receive-direct-message', (message) => {
        if (!isMounted) return;
        const isFromOther = message.senderId === otherUserId && message.receiverId === user.id;
        const isFromMe = message.senderId === user.id && message.receiverId === otherUserId;
        
        if (isFromOther || isFromMe) {
          setMessages((prev) => [...prev, message]);
        }
      });

      // Listen for message deletion
      socket.on('message-deleted', (data) => {
        if (!isMounted) return;
        const { messageId } = data;
        setMessages((prev) => prev.map(m => 
          m.id === messageId
            ? { ...m, deleted: true, content: '🚫 This message was deleted', fileUrl: undefined, mediaType: undefined }
            : m
        ));
      });
    }

    const setupChat = async () => {
      try {
        // Fetch all users to find this particular contact
        const users = await apiRequest('/api/users');
        const contact = users.find(u => u.id === otherUserId);
        
        if (!contact) {
          throw new Error('User not found');
        }
        if (isMounted) {
          setOtherUser(contact);
        }

        // Fetch DM history
        const history = await apiRequest(`/api/chat/history/dm/${otherUserId}`);
        if (isMounted) {
          setMessages(history);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load private chat', err);
        if (isMounted) {
          navigate('/chats');
        }
      }
    };

    setupChat();

    return () => {
      isMounted = false;
      if (socket) {
        socket.off('receive-direct-message');
        socket.off('message-deleted');
      }
    };
  }, [otherUserId, navigate]);

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
          socket.emit('send-direct-message', {
            receiverId: otherUserId,
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
    if (window.confirm('Delete this message for everyone?')) {
      const socket = getSocket();
      if (socket) {
        socket.emit('delete-message', {
          messageId: msgId,
          targetId: otherUserId,
          isDM: true
        });
      }
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const socket = getSocket();
    if (socket) {
      socket.emit('send-direct-message', {
        receiverId: otherUserId,
        content: inputText
      });
      setInputText('');
    }
  };

  const handleSendVoiceNote = (base64Audio, duration) => {
    if (!base64Audio) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('send-direct-message', {
        receiverId: otherUserId,
        content: `🎙️ Voice Note (${Math.floor(duration || 0)}s)`,
        mediaType: 'audio',
        fileUrl: base64Audio
      });
    }
  };

  // --- CALLING ACTION ---
  const handleStartCall = (type) => {
    if (otherUser) {
      startCall(otherUser, type);
    }
  };

  const getSharedInterests = () => {
    if (!currentUser || !currentUser.interests || !otherUser || !otherUser.interests) return [];
    return otherUser.interests.filter(i => currentUser.interests.includes(i));
  };

  const sharedInterests = getSharedInterests();

  return (
    <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-0 md:p-4">
      <div className="w-full md:w-[410px] h-screen md:h-[840px] md:max-h-[90vh] bg-white flex flex-col shadow-2xl md:rounded-[40px] md:border-[10px] md:border-slate-800 overflow-hidden relative">
        
        {/* Smartphone Notch */}
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
        <header className="bg-primary-600 text-white px-3 py-3 flex items-center border-b border-primary-700 shadow-sm z-30 justify-between">
          <div className="flex items-center min-w-0">
            <button 
              onClick={() => navigate('/chats')}
              className="p-1 hover:bg-primary-700 rounded-full transition-colors mr-2 text-white"
            >
              <ArrowLeft size={20} />
            </button>
            
            <div className="relative shrink-0 mr-2.5">
              <img 
                src={otherUser ? otherUser.avatar : ''} 
                alt={otherUser ? otherUser.username : ''} 
                className="w-10 h-10 bg-slate-100 rounded-xl object-cover"
              />
              <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                otherUser?.isOnline ? 'bg-green-500 animate-pulse-online' : 'bg-slate-300'
              }`}></span>
            </div>
            
            <div className="min-w-0">
              <h2 className="font-bold text-sm truncate">{otherUser ? otherUser.username : 'Chat'}</h2>
              <span className="text-[9px] text-primary-200">
                {otherUser?.isOnline ? 'Active Now' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Calling Action Buttons */}
          {otherUser?.isOnline && (
            <div className="flex items-center gap-1 mr-1">
              <button 
                onClick={() => handleStartCall('audio')}
                className="p-2 hover:bg-primary-700 rounded-full transition-colors"
                title="Voice Call (5 coins / min)"
              >
                <Phone size={16} />
              </button>
              <button 
                onClick={() => handleStartCall('video')}
                className="p-2 hover:bg-primary-700 rounded-full transition-colors"
                title="Video Call (8 coins / min)"
              >
                <Video size={16} />
              </button>
            </div>
          )}
        </header>

        {/* Interests Helper Bar */}
        {sharedInterests.length > 0 && (
          <div className="bg-primary-50 px-4 py-2 border-b border-slate-200 flex items-center gap-1.5 z-20 overflow-x-auto select-none shrink-0">
            <Sparkles size={11} className="text-primary-600 shrink-0" />
            <span className="text-[9px] text-primary-700 font-semibold uppercase tracking-wider shrink-0 mr-1">Common:</span>
            <div className="flex gap-1">
              {sharedInterests.map((interest, idx) => (
                <span key={idx} className="bg-white text-primary-700 text-[8px] font-bold px-2 py-0.5 rounded-full border border-primary-200">
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 flex flex-col gap-2">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mb-2"></div>
              <span className="text-xs">Loading chat history...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400">
              <img 
                src={otherUser?.avatar} 
                alt="contact avatar" 
                className="w-14 h-14 bg-slate-200 rounded-2xl mb-2 opacity-50"
              />
              <span className="text-xs font-semibold">Say hello to {otherUser?.username}!</span>
              <p className="text-[10px] text-slate-400 mt-1 px-14">Start a conversation to find out what you have in common.</p>
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
                          <VoiceNoteBubble 
                            audioUrl={fileUrl || msg.fileUrl} 
                            isOwnMessage={isOwnMessage} 
                          />
                        )}
                        {msg.mediaType === 'video' && (
                          <video src={fileUrl} controls className="max-w-[180px] rounded-xl max-h-[140px]" />
                        )}
                        
                        {/* Text message */}
                        {msg.content && <span className="break-all whitespace-pre-wrap">{msg.content}</span>}
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

        {/* Modern Multi-Language, Speech-to-Text & Voice Note Input Bar */}
        <ChatInputBar
          inputText={inputText}
          setInputText={setInputText}
          onSendMessage={handleSendMessage}
          onSendVoiceNote={handleSendVoiceNote}
          uploading={uploading}
          imageInputRef={imageInputRef}
          audioInputRef={audioInputRef}
          videoInputRef={videoInputRef}
        />
      </div>
    </div>
  );
}
