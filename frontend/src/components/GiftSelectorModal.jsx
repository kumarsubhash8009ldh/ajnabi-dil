import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles, Plus, Flame, Heart } from 'lucide-react';

export const VIRTUAL_GIFTS = [
  {
    id: 'rose',
    name: 'Rose',
    hindi: 'गुलाब 🌹',
    icon: '🌹',
    coins: 10,
    color: 'from-red-500/20 to-pink-500/20',
    border: 'border-red-500/40'
  },
  {
    id: 'heart',
    name: 'Romantic Heart',
    hindi: 'सच्चा दिल 💖',
    icon: '💖',
    coins: 50,
    color: 'from-pink-500/20 to-rose-500/20',
    border: 'border-pink-500/40'
  },
  {
    id: 'chocolate',
    name: 'Sweet Chocolate',
    hindi: 'चॉकलेट 🍫',
    icon: '🍫',
    coins: 100,
    color: 'from-amber-700/20 to-yellow-600/20',
    border: 'border-amber-600/40'
  },
  {
    id: 'diamond',
    name: 'Sparkling Diamond',
    hindi: 'हीरा 💎',
    icon: '💎',
    coins: 200,
    color: 'from-cyan-500/20 to-blue-500/20',
    border: 'border-cyan-400/40'
  },
  {
    id: 'crown',
    name: 'Royal Crown',
    hindi: 'शाही ताज 👑',
    icon: '👑',
    coins: 500,
    color: 'from-yellow-500/20 to-amber-500/20',
    border: 'border-yellow-400/50'
  },
  {
    id: 'supercar',
    name: 'Supercar Rocket',
    hindi: 'सुपरकार 🚀',
    icon: '🚀',
    coins: 1000,
    color: 'from-purple-500/20 to-pink-500/20',
    border: 'border-purple-400/50'
  }
];

// Full-screen Dazzling Gift Animation Overlay Component
export function GiftAnimationOverlay({ gift, onFinish }) {
  useEffect(() => {
    if (!gift) return;
    const timer = setTimeout(() => {
      if (onFinish) onFinish();
    }, 3200);
    return () => clearTimeout(timer);
  }, [gift, onFinish]);

  if (!gift) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex flex-col items-center justify-center animate-fade-in">
      <div className="flex flex-col items-center gap-2 animate-bounce-short">
        <div className="text-7xl filter drop-shadow-[0_10px_25px_rgba(255,255,255,0.7)] transform scale-125 transition-transform">
          {gift.icon || '🎁'}
        </div>
        <div className="bg-slate-900/90 border border-yellow-400/80 px-4 py-1.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2">
          <span className="text-xs font-black text-white">
            @{gift.senderName || 'Friend'} sent a <span className="text-yellow-300 font-black">{gift.giftType || gift.name}</span>!
          </span>
          <span className="text-[10px] bg-yellow-400 text-slate-950 font-black px-2 py-0.5 rounded-full">
            🪙 {gift.coins} Coins
          </span>
        </div>
      </div>
    </div>
  );
}

export default function GiftSelectorModal({ isOpen, onClose, onSendGift, userCoins = 0 }) {
  const [selectedGift, setSelectedGift] = useState(VIRTUAL_GIFTS[0]);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSend = () => {
    if (!selectedGift) return;
    if (userCoins < selectedGift.coins) {
      alert(`Insufficient coins! You need ${selectedGift.coins} coins but have ${userCoins} coins.`);
      return;
    }
    if (onSendGift) {
      onSendGift(selectedGift.name, selectedGift.coins, selectedGift.icon);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center p-0 md:p-4">
      <div className="w-full md:w-[400px] bg-gradient-to-b from-slate-900 to-slate-950 rounded-t-[32px] md:rounded-[32px] border-t md:border border-pink-500/30 p-4 shadow-2xl flex flex-col gap-3.5 animate-slide-up text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎁</span>
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-1.5">
                <span>Send Virtual Gift</span>
                <span className="text-[9px] bg-pink-500/20 text-pink-300 border border-pink-500/30 px-1.5 py-0.2 rounded font-bold">
                  70% Host Share
                </span>
              </h3>
              <p className="text-[10px] text-slate-400">Gift sends direct coins to recipient</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Coins Balance Bar & Recharge Shortcut */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span className="text-yellow-400">🪙 Your Balance:</span>
            <span className="text-yellow-300 font-black text-sm">{userCoins} Coins</span>
          </div>

          <button
            onClick={() => {
              onClose();
              navigate('/shop');
            }}
            className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1 shadow active:scale-95 transition-all"
          >
            <Plus size={12} />
            <span>Recharge</span>
          </button>
        </div>

        {/* 6 Gifts Grid */}
        <div className="grid grid-cols-3 gap-2 py-1">
          {VIRTUAL_GIFTS.map((g) => {
            const isSelected = selectedGift?.id === g.id;
            const canAfford = userCoins >= g.coins;

            return (
              <button
                key={g.id}
                onClick={() => setSelectedGift(g)}
                className={`p-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all border relative ${
                  isSelected
                    ? 'bg-gradient-to-b from-pink-500/30 to-amber-500/30 border-yellow-400 shadow-md scale-105 ring-1 ring-yellow-400/50'
                    : `bg-slate-900/90 ${g.border} hover:border-slate-500`
                } ${!canAfford ? 'opacity-70' : ''}`}
              >
                <span className="text-3xl animate-bounce-short">{g.icon}</span>
                <span className="text-[10px] font-black truncate max-w-[80px] text-white">
                  {g.name}
                </span>
                <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full ${
                  canAfford ? 'bg-yellow-400/20 text-yellow-300' : 'bg-red-500/20 text-red-300'
                }`}>
                  🪙 {g.coins}c
                </span>
              </button>
            );
          })}
        </div>

        {/* Send Button */}
        <div className="pt-1 flex gap-2">
          <button
            onClick={handleSend}
            disabled={userCoins < selectedGift.coins}
            className={`flex-1 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${
              userCoins >= selectedGift.coins
                ? 'bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 text-white shadow-pink-950'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span>Send {selectedGift?.name}</span>
            <span>(🪙 {selectedGift?.coins} Coins)</span>
          </button>
        </div>

      </div>
    </div>
  );
}
