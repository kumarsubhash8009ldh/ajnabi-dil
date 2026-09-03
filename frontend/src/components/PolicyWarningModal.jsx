import React, { useEffect } from 'react';
import { AlertTriangle, ShieldAlert, ShieldX, X, AlertOctagon } from 'lucide-react';

/**
 * Play a high-priority alarm siren via Web Audio API
 */
function playWarningSiren(level) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    // Frequency sweep for siren effect
    if (level >= 3) {
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.linearRampToValueAtTime(440, now + 0.2);
      osc.frequency.linearRampToValueAtTime(880, now + 0.4);
      osc.frequency.linearRampToValueAtTime(440, now + 0.6);
    } else {
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.linearRampToValueAtTime(550, now + 0.15);
      osc.frequency.linearRampToValueAtTime(700, now + 0.3);
    }

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + (level >= 3 ? 0.7 : 0.45));

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + (level >= 3 ? 0.7 : 0.45));
  } catch (e) {
    console.warn('Audio notice:', e);
  }

  // Mobile device vibration
  if (navigator.vibrate) {
    navigator.vibrate([200, 100, 200, 100, 300]);
  }
}

export default function PolicyWarningModal({ warningData, onClose }) {
  useEffect(() => {
    if (warningData) {
      playWarningSiren(warningData.warningNumber || 1);
    }
  }, [warningData]);

  if (!warningData) return null;

  const warningNum = Number(warningData.warningNumber) || 1;
  const isSuspended = Boolean(warningData.isSuspended) || warningNum >= 3;

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className={`w-full max-w-[360px] bg-slate-950 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 border text-white relative animate-scale-up ${
        isSuspended 
          ? 'border-red-600 ring-2 ring-red-600/50 shadow-red-950' 
          : warningNum === 2 
          ? 'border-orange-500 ring-2 ring-orange-500/50 shadow-orange-950' 
          : 'border-yellow-400/80 shadow-yellow-950'
      }`}>

        {/* Top Warning Badge & Close Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2.5 rounded-2xl flex items-center justify-center ${
              isSuspended ? 'bg-red-600/20 text-red-500 border border-red-500/40 animate-pulse' :
              warningNum === 2 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 animate-bounce' :
              'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
            }`}>
              {isSuspended ? <ShieldX size={24} /> : <AlertTriangle size={24} />}
            </div>

            <div>
              <h3 className={`font-black text-sm uppercase tracking-wide ${
                isSuspended ? 'text-red-400' : warningNum === 2 ? 'text-orange-400' : 'text-yellow-400'
              }`}>
                {isSuspended ? 'Account Suspended 🚫' : warningNum === 2 ? 'Final Warning 2/3 🚨' : 'Policy Warning 1/3 ⚠️'}
              </h3>
              <p className="text-[10px] text-slate-400">
                {isSuspended ? '3 Warnings Exceeded' : `${warningNum} of 3 Strikes Used`}
              </p>
            </div>
          </div>

          {!isSuspended && (
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* 3-Strike Visual Indicator */}
        <div className="flex gap-2">
          {[1, 2, 3].map((step) => {
            const isFilled = step <= warningNum;
            const isCurrent = step === warningNum;
            return (
              <div 
                key={step} 
                className={`flex-1 py-1.5 rounded-xl text-center text-[10px] font-black border transition-all ${
                  isFilled
                    ? step === 3
                      ? 'bg-red-600 text-white border-red-500'
                      : step === 2
                      ? 'bg-orange-500 text-slate-950 border-orange-400'
                      : 'bg-yellow-400 text-slate-950 border-yellow-300'
                    : 'bg-slate-900 border-slate-800 text-slate-600'
                } ${isCurrent ? 'ring-2 ring-white/40 scale-105' : ''}`}
              >
                Strike {step}
              </div>
            );
          })}
        </div>

        {/* Hindi & English Guidance Message */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-2">
          <p className="text-xs font-extrabold text-white leading-relaxed">
            {isSuspended ? (
              <span className="text-red-300">
                Aapne 3 baar policy violate ki hai. Instagram, Facebook ya Phone number share karne ke chalte aapka account permanently suspend kar diya gaya hai.
              </span>
            ) : warningNum === 2 ? (
              <span className="text-orange-200">
                ⚠️ <strong className="text-orange-400">Antim Chetawani (Final Notice):</strong> Aapko 2 warnings mil chuki hain! Ab agar ek baar bhi phone number (digits ya words me), Instagram ya FB id share karne ki koshish ki toh account turant suspend ho jayega!
              </span>
            ) : (
              <span className="text-yellow-100">
                ⚠️ <strong className="text-yellow-400">Notice 1/3:</strong> Personal contact (Phone number, Instagram ID, Facebook) share karna community guidelines ke khilaaf hai. 3 warnings ke baad account suspend ho jayega.
              </span>
            )}
          </p>

          {/* Detected Snippet Box */}
          {warningData.snippet && (
            <div className="bg-black/60 border border-red-500/30 rounded-xl p-2 flex flex-col gap-0.5">
              <span className="text-[9px] uppercase tracking-wider text-red-400 font-bold">
                Blocked Content:
              </span>
              <span className="text-xs font-mono text-red-200 break-all font-bold">
                "{warningData.snippet}"
              </span>
            </div>
          )}

          {warningData.reason && (
            <p className="text-[10px] text-slate-400 italic">
              Reason: {warningData.reason}
            </p>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-1">
          {isSuspended ? (
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-red-950 active:scale-95 transition-all uppercase tracking-wider"
            >
              Account Suspended (Exit)
            </button>
          ) : (
            <button
              onClick={onClose}
              className={`w-full py-3 rounded-2xl text-xs font-black shadow-lg active:scale-95 transition-all ${
                warningNum === 2 
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 shadow-orange-950'
                  : 'bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 shadow-yellow-950'
              }`}
            >
              Mai Samajh Gaya (I Understand)
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
