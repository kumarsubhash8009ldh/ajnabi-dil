import React, { useState } from 'react';
import { Sparkles, Sliders, Check, Sun, Wand2 } from 'lucide-react';

export const BEAUTY_PRESETS = [
  {
    id: 'glow',
    name: 'Glow Radiant',
    icon: '🌸',
    desc: 'Soft skin blur & natural glow',
    smooth: 45,
    brightness: 114,
    contrast: 105,
    saturate: 116,
    css: 'brightness(1.14) contrast(1.05) saturate(1.16) blur(0.35px)'
  },
  {
    id: 'rosy',
    name: 'Rosy Pink',
    icon: '💖',
    desc: 'Rosy cheeks & bright tone',
    smooth: 55,
    brightness: 116,
    contrast: 108,
    saturate: 130,
    css: 'brightness(1.16) contrast(1.08) saturate(1.30) hue-rotate(-8deg) blur(0.35px)'
  },
  {
    id: 'glam',
    name: 'Glamour Luxe',
    icon: '💎',
    desc: 'High-definition studio lighting',
    smooth: 65,
    brightness: 120,
    contrast: 114,
    saturate: 122,
    css: 'brightness(1.20) contrast(1.14) saturate(1.22) blur(0.45px)'
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    icon: '🌅',
    desc: 'Warm sunset sun-kissed aesthetic',
    smooth: 40,
    brightness: 110,
    contrast: 112,
    saturate: 135,
    css: 'brightness(1.10) contrast(1.12) saturate(1.35) sepia(0.18) hue-rotate(5deg) blur(0.3px)'
  }
];

export function getBeautyFilterCss(isActive, presetId = 'glow', customSettings = null) {
  if (!isActive) return 'none';

  if (customSettings) {
    const smoothBlur = (Number(customSettings.smooth) || 0) * 0.01; // 0px to 1px
    const bright = (Number(customSettings.brightness) || 100) / 100;
    const cont = (Number(customSettings.contrast) || 100) / 100;
    const sat = (Number(customSettings.saturate) || 100) / 100;
    return `brightness(${bright}) contrast(${cont}) saturate(${sat}) blur(${smoothBlur.toFixed(2)}px)`;
  }

  const found = BEAUTY_PRESETS.find(p => p.id === presetId);
  return found ? found.css : BEAUTY_PRESETS[0].css;
}

export default function BeautyControls({
  isActive = true,
  preset = 'glow',
  onToggle = null,
  onSelectPreset = null,
  customSettings = null,
  onChangeCustomSettings = null
}) {
  const [showSliders, setShowSliders] = useState(false);
  const currentPreset = BEAUTY_PRESETS.find(p => p.id === preset) || BEAUTY_PRESETS[0];

  return (
    <div className="w-full bg-slate-900/90 backdrop-blur-md rounded-2xl p-3 border border-slate-800 flex flex-col gap-2.5 shadow-xl">
      {/* Header & Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">✨</span>
          <div>
            <h4 className="text-xs font-black text-white flex items-center gap-1.5">
              <span>Camera Beauty Mode</span>
              {isActive && (
                <span className="text-[8px] bg-pink-500/20 text-pink-300 border border-pink-500/30 px-1.5 py-0.2 rounded font-bold">
                  Active
                </span>
              )}
            </h4>
            <p className="text-[10px] text-slate-400">
              {isActive ? `${currentPreset.name} (Smooth Skin)` : 'Beauty filter is turned OFF'}
            </p>
          </div>
        </div>

        {/* ON / OFF Switch */}
        {onToggle && (
          <button
            onClick={onToggle}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none shadow-md ${
              isActive ? 'bg-gradient-to-r from-pink-500 to-rose-500' : 'bg-slate-700'
            }`}
            title="Toggle Beauty Mode ON/OFF"
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform flex items-center justify-center text-[10px] font-bold ${
                isActive ? 'translate-x-8 text-pink-600' : 'translate-x-1 text-slate-400'
              }`}
            >
              {isActive ? '✓' : '✕'}
            </span>
          </button>
        )}
      </div>

      {/* Preset Buttons */}
      {isActive && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            {BEAUTY_PRESETS.map((p) => {
              const isSelected = p.id === preset && !showSliders;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setShowSliders(false);
                    if (onSelectPreset) onSelectPreset(p.id);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all shrink-0 border ${
                    isSelected
                      ? 'bg-gradient-to-r from-pink-600 to-rose-600 border-pink-400 text-white shadow-md'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <span>{p.icon}</span>
                  <span>{p.name}</span>
                </button>
              );
            })}

            {/* Fine Tune Sliders Toggle Button */}
            <button
              onClick={() => setShowSliders(!showSliders)}
              className={`py-1.5 px-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all shrink-0 border ${
                showSliders
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 border-amber-400 text-white shadow-md'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Fine-tune sliders"
            >
              <Sliders size={12} />
              <span>Tuning</span>
            </button>
          </div>

          {/* Detailed Fine-Tuning Sliders */}
          {showSliders && customSettings && onChangeCustomSettings && (
            <div className="bg-slate-950/70 rounded-xl p-2.5 border border-slate-800 flex flex-col gap-2 text-white">
              {/* Skin Smoothing */}
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between text-[9px] text-slate-300 font-semibold">
                  <span className="flex items-center gap-1">
                    <Wand2 size={10} className="text-pink-400" />
                    <span>Skin Smoothing</span>
                  </span>
                  <span className="text-pink-400 font-bold">{customSettings.smooth}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={customSettings.smooth}
                  onChange={(e) => onChangeCustomSettings({ ...customSettings, smooth: Number(e.target.value) })}
                  className="w-full accent-pink-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Brightness Boost */}
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between text-[9px] text-slate-300 font-semibold">
                  <span className="flex items-center gap-1">
                    <Sun size={10} className="text-yellow-400" />
                    <span>Radiant Brightness</span>
                  </span>
                  <span className="text-yellow-400 font-bold">{customSettings.brightness}%</span>
                </div>
                <input
                  type="range"
                  min="90"
                  max="140"
                  value={customSettings.brightness}
                  onChange={(e) => onChangeCustomSettings({ ...customSettings, brightness: Number(e.target.value) })}
                  className="w-full accent-yellow-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Rosy Blush / Saturation */}
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between text-[9px] text-slate-300 font-semibold">
                  <span>🌸 Rosy Saturation</span>
                  <span className="text-rose-400 font-bold">{customSettings.saturate}%</span>
                </div>
                <input
                  type="range"
                  min="90"
                  max="160"
                  value={customSettings.saturate}
                  onChange={(e) => onChangeCustomSettings({ ...customSettings, saturate: Number(e.target.value) })}
                  className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
