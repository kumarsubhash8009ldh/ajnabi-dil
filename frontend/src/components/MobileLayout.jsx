import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, MessageSquare, User, LogOut, Shield, Radio, Headphones, Phone } from 'lucide-react';
import { clearSession, getStoredUser } from '../utils/api';

export default function MobileLayout({ children, title }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getStoredUser();
  const coins = user ? user.coins : 100;
  
  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };
  
  const isActive = (path) => {
    return location.pathname === path;
  };
  
  return (
    // Outer container: Centers the mobile screen on desktop
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-0 md:p-4">
      {/* Smartphone container */}
      <div className="w-full md:w-[410px] h-screen md:h-[840px] md:max-h-[90vh] bg-slate-950 flex flex-col shadow-2xl md:rounded-[40px] md:border-[10px] md:border-slate-800 overflow-hidden relative">
        {/* Phone Notch/Status Bar for Desktop */}
        <div className="hidden md:flex justify-between items-center bg-slate-900 text-slate-300 text-[11px] px-6 py-1 z-50 border-b border-white/5">
          <span>9:41</span>
          <div className="w-20 h-4 bg-black rounded-full absolute left-1/2 transform -translate-x-1/2 top-1"></div>
          <div className="flex items-center gap-1">
            <span>5G</span>
            <div className="w-4 h-2 border border-slate-400 rounded-sm p-[1px]">
              <div className="w-full h-full bg-slate-400"></div>
            </div>
          </div>
        </div>
        
        {/* Header */}
        <header className="bg-gradient-to-r from-slate-950 via-slate-900 to-black text-white px-4 py-3 flex justify-between items-center shadow-lg border-b border-pink-900/30 z-30">
          <div className="flex items-center gap-2">
            <img 
              src="/logo.jpg" 
              alt="Ajnabi Dil Logo" 
              className="w-8 h-8 rounded-full border border-pink-400/40 object-cover shadow-sm ring-1 ring-pink-500/20"
            />
            <h1 className="font-extrabold text-base tracking-wide bg-gradient-to-r from-pink-200 via-rose-100 to-white bg-clip-text text-transparent">
              {title || 'Ajnabi Dil'}
            </h1>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => navigate('/shop')} 
              className="bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md active:scale-95 transition-all"
              title="Recharge Coins"
            >
              <span>🪙</span>
              <span>{coins}</span>
            </button>
            
            <button 
              onClick={() => navigate('/help')} 
              className={`p-1.5 hover:bg-white/10 rounded-full transition-colors ${isActive('/help') ? 'bg-white/10 text-pink-300' : 'text-slate-300'}`}
              title="24x7 Help Desk & WhatsApp Support"
            >
              <Headphones size={18} />
            </button>
            
            {user && user.username === 'admin' && (
              <button 
                onClick={() => navigate('/admin')} 
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-slate-300"
                title="Admin Control Panel"
              >
                <Shield size={18} />
              </button>
            )}
            
            <button 
              onClick={handleLogout} 
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-red-400"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        
        {/* Main Content Area with Ajnabi Dil Luxury Theme Background */}
        <main 
          className="flex-1 overflow-y-auto flex flex-col pb-16 relative"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 30%, rgba(15, 23, 42, 0.94) 0%, rgba(2, 6, 23, 0.97) 100%), url('/theme-bg.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            backgroundColor: '#020617'
          }}
        >
          {/* Subtle Watermark Branding in Background */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.08] z-0">
            <img 
              src="/theme-bg.jpg" 
              alt="Ajnabi Dil Watermark" 
              className="w-80 h-80 rounded-full object-cover animate-pulse duration-[8000ms]"
            />
          </div>
          
          <div className="relative z-10 flex flex-col flex-1">
            {children}
          </div>
        </main>
        
        {/* Bottom Navigation */}
        <nav className="absolute bottom-0 left-0 right-0 h-16 bg-slate-950/95 backdrop-blur-md border-t border-pink-900/30 flex justify-around items-center px-1 z-40 shadow-2xl">
          <button 
            onClick={() => navigate('/')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all ${
              isActive('/') ? 'text-pink-400 font-bold' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <Home size={20} className={isActive('/') ? 'scale-110 text-pink-400' : ''} />
            <span className="text-[9px]">Discover</span>
          </button>
          
          <button 
            onClick={() => navigate('/rooms')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all ${
              isActive('/rooms') ? 'text-pink-400 font-bold' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <Users size={20} className={isActive('/rooms') ? 'scale-110 text-pink-400' : ''} />
            <span className="text-[9px]">Rooms</span>
          </button>

          <button 
            onClick={() => navigate('/calls')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all ${
              isActive('/calls') ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <Phone size={20} className={isActive('/calls') ? 'scale-110 text-emerald-400 animate-pulse' : ''} />
            <span className="text-[9px]">Calls</span>
          </button>
          
          <button 
            onClick={() => navigate('/chats')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all ${
              isActive('/chats') || location.pathname.startsWith('/chat/dm/') ? 'text-pink-400 font-bold' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <MessageSquare size={20} className={isActive('/chats') ? 'scale-110 text-pink-400' : ''} />
            <span className="text-[9px]">Chats</span>
          </button>
          
          <button 
            onClick={() => navigate('/live')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all ${
              isActive('/live') || location.pathname.startsWith('/live/stream/') ? 'text-rose-400 font-bold' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <Radio size={20} className={isActive('/live') ? 'scale-110 text-rose-400 animate-pulse' : ''} />
            <span className="text-[9px]">Live</span>
          </button>
          
          <button 
            onClick={() => navigate('/profile')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all ${
              isActive('/profile') ? 'text-pink-400 font-bold' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <User size={20} className={isActive('/profile') ? 'scale-110 text-pink-400' : ''} />
            <span className="text-[9px]">Profile</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
