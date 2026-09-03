import React from 'react';
import { Sparkles, Check, Eye, EyeOff } from 'lucide-react';

export const MASK_STYLES = [
  {
    id: 'venetian',
    name: 'Venetian Gold',
    icon: '🎭',
    description: 'Royal Masquerade with gold lace & feathers',
    color: '#F59E0B'
  },
  {
    id: 'cyberpunk',
    name: 'Cyber Visor',
    icon: '🕶️',
    description: 'Neon glowing sci-fi hologram visor',
    color: '#06B6D4'
  },
  {
    id: 'cat',
    name: 'Cute Kitty',
    icon: '🐱',
    description: 'Neko ears, pink nose & whiskers',
    color: '#EC4899'
  },
  {
    id: 'crown',
    name: 'Royal Crown',
    icon: '👑',
    description: 'Golden king/queen tiara & sparkles',
    color: '#EAB308'
  },
  {
    id: 'fox',
    name: 'Kitsune Spirit',
    icon: '🦊',
    description: 'Japanese traditional anime fox mask',
    color: '#EF4444'
  },
  {
    id: 'shades',
    name: 'Cool Shades',
    icon: '😎',
    description: 'VIP dark sunglasses with sparkle flare',
    color: '#10B981'
  },
  {
    id: 'hearts',
    name: 'Cupid Hearts',
    icon: '💖',
    description: 'Glowing heart spectacles & soft blush',
    color: '#F43F5E'
  },
  {
    id: 'disguise',
    name: 'Funny Disguise',
    icon: '🥸',
    description: 'Classic glasses, big nose & moustache',
    color: '#8B5CF6'
  }
];

export default function CameraMaskOverlay({
  isActive = false,
  maskStyle = 'venetian',
  onToggle = null,
  onSelectStyle = null,
  interactive = false,
  label = '',
  isDualMode = false
}) {
  const currentStyle = MASK_STYLES.find(s => s.id === maskStyle) || MASK_STYLES[0];

  return (
    <>
      {/* 1. RENDER ACTIVE MASK OVERLAY OVER VIDEO */}
      {isActive && (
        <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center overflow-hidden">
          <div className="relative w-full h-full flex items-center justify-center animate-fade-in">
            {/* --- 1. VENETIAN MASQUERADE MASK --- */}
            {maskStyle === 'venetian' && (
              <div className="absolute top-[22%] w-[78%] max-w-[260px] flex flex-col items-center drop-shadow-[0_8px_20px_rgba(234,179,8,0.45)]">
                {/* Feathers at top */}
                <div className="flex justify-center -mb-4 space-x-2">
                  <div className="w-4 h-12 bg-gradient-to-t from-amber-500 to-yellow-200 rounded-full transform -rotate-25 origin-bottom animate-pulse"></div>
                  <div className="w-5 h-16 bg-gradient-to-t from-amber-600 via-yellow-400 to-white rounded-full transform -rotate-10 origin-bottom"></div>
                  <div className="w-5 h-16 bg-gradient-to-t from-amber-600 via-yellow-400 to-white rounded-full transform rotate-10 origin-bottom"></div>
                  <div className="w-4 h-12 bg-gradient-to-t from-amber-500 to-yellow-200 rounded-full transform rotate-25 origin-bottom animate-pulse"></div>
                </div>
                
                {/* Main Masquerade Eye Mask SVG */}
                <svg viewBox="0 0 300 120" className="w-full h-auto filter drop-shadow-md">
                  <defs>
                    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FDE68A" />
                      <stop offset="30%" stopColor="#F59E0B" />
                      <stop offset="70%" stopColor="#D97706" />
                      <stop offset="100%" stopColor="#78350F" />
                    </linearGradient>
                    <linearGradient id="gemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#F43F5E" />
                      <stop offset="100%" stopColor="#881337" />
                    </linearGradient>
                  </defs>
                  
                  {/* Outer mask shell */}
                  <path 
                    d="M 150 70 C 130 90, 80 110, 20 85 C -5 70, 0 30, 40 20 C 90 10, 130 50, 150 45 C 170 50, 210 10, 260 20 C 300 30, 305 70, 280 85 C 220 110, 170 90, 150 70 Z" 
                    fill="url(#goldGrad)" 
                    stroke="#FEF3C7" 
                    strokeWidth="3"
                  />
                  {/* Left Eye Cutout */}
                  <ellipse cx="85" cy="55" rx="32" ry="18" fill="rgba(0,0,0,0.6)" stroke="#FEF3C7" strokeWidth="2.5" />
                  {/* Right Eye Cutout */}
                  <ellipse cx="215" cy="55" rx="32" ry="18" fill="rgba(0,0,0,0.6)" stroke="#FEF3C7" strokeWidth="2.5" />
                  
                  {/* Center Gem */}
                  <polygon points="150,30 160,45 150,60 140,45" fill="url(#gemGrad)" stroke="#FFFFFF" strokeWidth="1.5" />
                  <circle cx="150" cy="45" r="3" fill="#FFFFFF" />
                  
                  {/* Gold Filigree accents */}
                  <circle cx="50" cy="35" r="4" fill="#FDE68A" />
                  <circle cx="250" cy="35" r="4" fill="#FDE68A" />
                  <circle cx="85" cy="80" r="3" fill="#FDE68A" />
                  <circle cx="215" cy="80" r="3" fill="#FDE68A" />
                </svg>
              </div>
            )}

            {/* --- 2. CYBERPUNK NEON VISOR --- */}
            {maskStyle === 'cyberpunk' && (
              <div className="absolute top-[26%] w-[82%] max-w-[270px] flex flex-col items-center">
                <div className="relative w-full h-20 bg-gradient-to-r from-cyan-500/80 via-blue-600/85 to-fuchsia-600/80 rounded-2xl border-2 border-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.85)] backdrop-blur-sm flex items-center justify-between px-4 overflow-hidden">
                  {/* Scanner Grid Lines */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none"></div>
                  
                  {/* Animated laser scan line */}
                  <div className="absolute top-0 bottom-0 w-1.5 bg-white/90 shadow-[0_0_10px_#FFFFFF] animate-bounce left-1/4"></div>

                  <div className="text-[9px] font-mono font-black text-cyan-200 tracking-widest uppercase z-10 flex flex-col">
                    <span>SYS::HUD-ON</span>
                    <span className="text-[7px] text-fuchsia-300">98.4% SYNC</span>
                  </div>

                  {/* Center HUD Eye Marks */}
                  <div className="flex gap-12 items-center z-10 opacity-90">
                    <div className="w-8 h-8 rounded-full border border-dashed border-cyan-200 flex items-center justify-center animate-spin">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                    <div className="w-8 h-8 rounded-full border border-dashed border-fuchsia-300 flex items-center justify-center animate-spin">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </div>

                  <div className="text-[9px] font-mono font-black text-fuchsia-200 tracking-wider z-10">
                    <span>AR-V3</span>
                  </div>
                </div>
              </div>
            )}

            {/* --- 3. CUTE KITTY & WHISKERS --- */}
            {maskStyle === 'cat' && (
              <div className="absolute top-[12%] w-[85%] max-w-[270px] flex flex-col items-center">
                {/* Kitty Ears */}
                <div className="w-full flex justify-between px-6 -mb-3">
                  <div className="w-16 h-16 bg-pink-500 rounded-tl-full border-4 border-white shadow-lg relative transform -rotate-12 overflow-hidden flex items-end justify-center">
                    <div className="w-8 h-8 bg-pink-300 rounded-tl-full"></div>
                  </div>
                  <div className="w-16 h-16 bg-pink-500 rounded-tr-full border-4 border-white shadow-lg relative transform rotate-12 overflow-hidden flex items-end justify-center">
                    <div className="w-8 h-8 bg-pink-300 rounded-tr-full"></div>
                  </div>
                </div>

                {/* Nose & Whiskers at face level */}
                <div className="mt-16 flex flex-col items-center">
                  {/* Pink Heart Nose */}
                  <div className="w-6 h-5 bg-pink-500 rounded-full flex items-center justify-center shadow-md">
                    <div className="w-2 h-2 bg-pink-200 rounded-full"></div>
                  </div>

                  {/* Whiskers */}
                  <div className="w-56 flex justify-between items-center -mt-2">
                    {/* Left Whiskers */}
                    <div className="flex flex-col gap-1.5 -rotate-6">
                      <div className="w-14 h-1 bg-white rounded-full shadow"></div>
                      <div className="w-16 h-1 bg-white rounded-full shadow"></div>
                      <div className="w-12 h-1 bg-white rounded-full shadow"></div>
                    </div>
                    {/* Right Whiskers */}
                    <div className="flex flex-col gap-1.5 rotate-6">
                      <div className="w-14 h-1 bg-white rounded-full shadow"></div>
                      <div className="w-16 h-1 bg-white rounded-full shadow"></div>
                      <div className="w-12 h-1 bg-white rounded-full shadow"></div>
                    </div>
                  </div>

                  {/* Rosy Blush */}
                  <div className="w-48 flex justify-between -mt-6">
                    <div className="w-7 h-4 bg-pink-400/50 rounded-full blur-xs"></div>
                    <div className="w-7 h-4 bg-pink-400/50 rounded-full blur-xs"></div>
                  </div>
                </div>
              </div>
            )}

            {/* --- 4. ROYAL CROWN & SPARKLES --- */}
            {maskStyle === 'crown' && (
              <div className="absolute top-[8%] w-[75%] max-w-[240px] flex flex-col items-center">
                <svg viewBox="0 0 200 120" className="w-full h-auto filter drop-shadow-[0_8px_16px_rgba(234,179,8,0.6)] animate-pulse">
                  <defs>
                    <linearGradient id="crownGold" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFFBEB" />
                      <stop offset="35%" stopColor="#FBBF24" />
                      <stop offset="70%" stopColor="#D97706" />
                      <stop offset="100%" stopColor="#78350F" />
                    </linearGradient>
                  </defs>
                  {/* Crown Points */}
                  <polygon 
                    points="20,110 30,40 70,80 100,20 130,80 170,40 180,110" 
                    fill="url(#crownGold)" 
                    stroke="#FFFFFF" 
                    strokeWidth="3"
                  />
                  {/* Jewels on tips */}
                  <circle cx="30" cy="35" r="7" fill="#EF4444" stroke="#FFF" strokeWidth="2" />
                  <circle cx="100" cy="15" r="9" fill="#3B82F6" stroke="#FFF" strokeWidth="2.5" />
                  <circle cx="170" cy="35" r="7" fill="#10B981" stroke="#FFF" strokeWidth="2" />
                  {/* Base Jewels */}
                  <circle cx="60" cy="100" r="5" fill="#EC4899" />
                  <circle cx="100" cy="100" r="6" fill="#F59E0B" />
                  <circle cx="140" cy="100" r="5" fill="#8B5CF6" />
                </svg>
                {/* Floating sparkles */}
                <div className="flex gap-16 text-yellow-300 text-lg animate-bounce">
                  <span>✨</span>
                  <span>⭐</span>
                  <span>✨</span>
                </div>
              </div>
            )}

            {/* --- 5. KITSUNE FOX MASK --- */}
            {maskStyle === 'fox' && (
              <div className="absolute top-[18%] w-[78%] max-w-[250px] flex flex-col items-center drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
                <svg viewBox="0 0 240 160" className="w-full h-auto">
                  {/* Fox Ears */}
                  <polygon points="30,80 50,10 90,60" fill="#FFFFFF" stroke="#DC2626" strokeWidth="4" />
                  <polygon points="50,25 55,60 75,50" fill="#EF4444" />
                  <polygon points="210,80 190,10 150,60" fill="#FFFFFF" stroke="#DC2626" strokeWidth="4" />
                  <polygon points="190,25 185,60 165,50" fill="#EF4444" />

                  {/* Mask Face Base */}
                  <path d="M 40 80 C 40 130, 80 150, 120 155 C 160 150, 200 130, 200 80 C 200 60, 160 55, 120 55 C 80 55, 40 60, 40 80 Z" fill="#FFFFFF" stroke="#DC2626" strokeWidth="3" />
                  
                  {/* Eye Slits */}
                  <path d="M 65 95 Q 85 85 100 100" stroke="#000000" strokeWidth="4" strokeLinecap="round" fill="none" />
                  <path d="M 140 100 Q 155 85 175 95" stroke="#000000" strokeWidth="4" strokeLinecap="round" fill="none" />

                  {/* Red Ritual Markings */}
                  <path d="M 50 110 Q 75 115 85 130" stroke="#DC2626" strokeWidth="4" strokeLinecap="round" fill="none" />
                  <path d="M 190 110 Q 165 115 155 130" stroke="#DC2626" strokeWidth="4" strokeLinecap="round" fill="none" />
                  <circle cx="120" cy="75" r="5" fill="#DC2626" />
                  <polygon points="120,135 114,142 126,142" fill="#000000" />
                </svg>
              </div>
            )}

            {/* --- 6. COOL DARK SHADES --- */}
            {maskStyle === 'shades' && (
              <div className="absolute top-[28%] w-[75%] max-w-[250px] flex flex-col items-center">
                <div className="w-full flex items-center justify-center relative">
                  {/* Bridge */}
                  <div className="absolute w-8 h-2 bg-neutral-900 top-3"></div>
                  
                  {/* Lenses */}
                  <div className="flex gap-4 w-full justify-center">
                    <div className="w-24 h-14 bg-black rounded-b-2xl border-4 border-neutral-900 shadow-2xl relative overflow-hidden flex items-start justify-start p-1.5">
                      <div className="w-full h-2.5 bg-gradient-to-r from-transparent via-white/40 to-transparent transform -rotate-12"></div>
                    </div>
                    <div className="w-24 h-14 bg-black rounded-b-2xl border-4 border-neutral-900 shadow-2xl relative overflow-hidden flex items-start justify-start p-1.5">
                      <div className="w-full h-2.5 bg-gradient-to-r from-transparent via-white/40 to-transparent transform -rotate-12"></div>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-[10px] font-black tracking-widest text-emerald-400 bg-black/70 px-2 py-0.5 rounded border border-emerald-500/40">
                  🕶️ VIP MODE
                </div>
              </div>
            )}

            {/* --- 7. CUPID ROMANTIC HEARTS --- */}
            {maskStyle === 'hearts' && (
              <div className="absolute top-[26%] w-[78%] max-w-[250px] flex flex-col items-center">
                <div className="flex gap-6 items-center">
                  <div className="text-4xl text-rose-500 animate-ping">💖</div>
                  <div className="text-4xl text-rose-500 animate-ping">💖</div>
                </div>
                {/* Heart spectacles */}
                <div className="flex gap-6 items-center -mt-8">
                  <div className="w-16 h-16 bg-rose-500/30 border-3 border-rose-400 rounded-full flex items-center justify-center backdrop-blur-xs shadow-[0_0_15px_rgba(244,63,94,0.7)]">
                    <span className="text-2xl">💕</span>
                  </div>
                  <div className="w-6 h-1 bg-rose-400"></div>
                  <div className="w-16 h-16 bg-rose-500/30 border-3 border-rose-400 rounded-full flex items-center justify-center backdrop-blur-xs shadow-[0_0_15px_rgba(244,63,94,0.7)]">
                    <span className="text-2xl">💕</span>
                  </div>
                </div>
                <div className="mt-1 flex gap-20">
                  <div className="w-8 h-5 bg-rose-400/40 rounded-full blur-xs"></div>
                  <div className="w-8 h-5 bg-rose-400/40 rounded-full blur-xs"></div>
                </div>
              </div>
            )}

            {/* --- 8. FUNNY DISGUISE (GLASSES + BIG NOSE + MOUSTACHE) --- */}
            {maskStyle === 'disguise' && (
              <div className="absolute top-[22%] w-[78%] max-w-[250px] flex flex-col items-center">
                {/* Bushy Eyebrows + Round Glasses */}
                <div className="w-full flex justify-center items-center relative">
                  {/* Eyebrows */}
                  <div className="absolute -top-3 flex gap-10">
                    <div className="w-16 h-4 bg-neutral-900 rounded-full transform -rotate-6"></div>
                    <div className="w-16 h-4 bg-neutral-900 rounded-full transform rotate-6"></div>
                  </div>

                  {/* Round Spectacles */}
                  <div className="flex gap-5 items-center">
                    <div className="w-18 h-18 rounded-full border-4 border-black bg-white/20 shadow-md"></div>
                    <div className="w-6 h-1.5 bg-black"></div>
                    <div className="w-18 h-18 rounded-full border-4 border-black bg-white/20 shadow-md"></div>
                  </div>
                </div>

                {/* Big Cartoon Pink Nose */}
                <div className="w-12 h-14 bg-gradient-to-b from-rose-300 to-rose-400 rounded-full border-2 border-rose-500 shadow-lg -mt-5 z-10"></div>

                {/* Giant Bushy Black Moustache */}
                <div className="w-28 h-8 bg-neutral-950 rounded-full -mt-2 shadow-xl flex items-center justify-center z-10 border border-neutral-800">
                  <div className="w-3 h-3 bg-neutral-900 rounded-full"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. OPTIONAL STATUS BADGE ON VIDEO (For remote or local) */}
      <div className="absolute top-2.5 right-2.5 z-20 pointer-events-none flex items-center gap-1.5">
        {isActive ? (
          <span className="bg-amber-500/90 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full shadow flex items-center gap-1 uppercase tracking-wider backdrop-blur-sm border border-amber-300">
            <span>{currentStyle.icon}</span>
            <span>{label ? `${label} Mask` : currentStyle.name}</span>
          </span>
        ) : (
          label && (
            <span className="bg-black/60 text-slate-400 text-[8px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm">
              {label}: Mask Off
            </span>
          )
        )}
      </div>

      {/* 3. INTERACTIVE MASK CONTROL PANEL (If interactive=true) */}
      {interactive && (
        <div className="w-full bg-slate-900/90 backdrop-blur-md rounded-2xl p-3 border border-slate-800 flex flex-col gap-2.5 shadow-xl">
          {/* Header & Toggle Switch */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎭</span>
              <div>
                <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                  <span>Camera Face Mask</span>
                  {isDualMode && (
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold">
                      2-User Active
                    </span>
                  )}
                </h4>
                <p className="text-[10px] text-slate-400">
                  {isActive ? currentStyle.name : 'Mask is turned OFF'}
                </p>
              </div>
            </div>

            {/* ON / OFF Switch */}
            {onToggle && (
              <button
                onClick={onToggle}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none shadow-md ${
                  isActive ? 'bg-gradient-to-r from-pink-500 to-amber-500' : 'bg-slate-700'
                }`}
                title="Toggle Face Mask ON/OFF"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform flex items-center justify-center text-[10px] font-bold ${
                    isActive ? 'translate-x-8 text-amber-600' : 'translate-x-1 text-slate-400'
                  }`}
                >
                  {isActive ? '✓' : '✕'}
                </span>
              </button>
            )}
          </div>

          {/* Mask Style Selector Carousel */}
          {isActive && (
            <div className="flex gap-2 overflow-x-auto scrollbar-none py-1">
              {MASK_STYLES.map((style) => {
                const isSelected = style.id === maskStyle;
                return (
                  <button
                    key={style.id}
                    onClick={() => onSelectStyle && onSelectStyle(style.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all shrink-0 w-20 border ${
                      isSelected
                        ? 'bg-gradient-to-b from-amber-500/20 to-pink-500/20 border-amber-400 shadow-sm scale-105'
                        : 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-2xl">{style.icon}</span>
                    <span className={`text-[9px] font-bold truncate max-w-[70px] ${
                      isSelected ? 'text-amber-300' : 'text-slate-300'
                    }`}>
                      {style.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}
