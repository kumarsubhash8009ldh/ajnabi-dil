import React, { useEffect, useState, useRef } from 'react';
import { Music, Play, Pause, Square, Volume2, Mic, Upload, Repeat, Sparkles, X, Disc, Sliders, VolumeX } from 'lucide-react';

const INDIAN_MUSIC_PRESETS = [
  {
    id: 'lofi_romantic',
    title: '🌸 Bollywood Lo-Fi Romantic',
    desc: 'Soft acoustic chords & gentle night aesthetic',
    notes: [261.63, 329.63, 392.00, 493.88, 523.25],
    tempo: 120,
    type: 'sine'
  },
  {
    id: 'sitar_ambient',
    title: '🪕 Sitar & Flute Classical Raag',
    desc: 'Soulful Indian raag sitar melodies & drone',
    notes: [293.66, 311.13, 369.99, 440.00, 554.37, 587.33],
    tempo: 140,
    type: 'triangle'
  },
  {
    id: 'punjabi_beats',
    title: '🥁 Desi Punjabi Dhol Beats',
    desc: 'High-energy bhangra rhythm & party groove',
    notes: [220.00, 261.63, 293.66, 329.63, 392.00],
    tempo: 95,
    type: 'sawtooth'
  },
  {
    id: 'sufi_soul',
    title: '🎷 Late Night Sufi Ghazal',
    desc: 'Deep emotional strings & ambient drone',
    notes: [246.94, 293.66, 329.63, 369.99, 440.00],
    tempo: 160,
    type: 'triangle'
  }
];

export default function BackgroundMusicPlayer({ isCall = false, onClose }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPreset, setCurrentPreset] = useState(INDIAN_MUSIC_PRESETS[0]);
  const [isCustomFile, setIsCustomFile] = useState(false);
  const [customFileName, setCustomFileName] = useState('');
  
  // Dual Volume Controls (Voice & Song)
  const [musicVolume, setMusicVolume] = useState(70); // 0 - 100
  const [voiceVolume, setVoiceVolume] = useState(100); // 0 - 150
  const [isLooping, setIsLooping] = useState(true);

  // Audio Context and Synth Refs
  const audioCtxRef = useRef(null);
  const synthIntervalRef = useRef(null);
  const customAudioRef = useRef(null);
  const musicGainRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize Web Audio Context
  useEffect(() => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtxRef.current = new AudioContext();
      musicGainRef.current = audioCtxRef.current.createGain();
      musicGainRef.current.gain.value = (musicVolume / 100) * 0.35;
      musicGainRef.current.connect(audioCtxRef.current.destination);
    }

    return () => {
      stopPlayback();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // Update Music Volume
  useEffect(() => {
    if (musicGainRef.current) {
      musicGainRef.current.gain.value = (musicVolume / 100) * 0.35;
    }
    if (customAudioRef.current) {
      customAudioRef.current.volume = musicVolume / 100;
    }
  }, [musicVolume]);

  const playSynthPreset = (preset) => {
    if (!audioCtxRef.current) return;
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    clearInterval(synthIntervalRef.current);
    let step = 0;
    const intervalMs = (60 / preset.tempo) * 1000;

    synthIntervalRef.current = setInterval(() => {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') return;
      const now = audioCtxRef.current.currentTime;
      const freq = preset.notes[step % preset.notes.length];
      
      const osc = audioCtxRef.current.createOscillator();
      const noteGain = audioCtxRef.current.createGain();

      osc.type = preset.type || 'sine';
      osc.frequency.setValueAtTime(freq, now);

      noteGain.gain.setValueAtTime(0, now);
      noteGain.gain.linearRampToValueAtTime(0.3, now + 0.05);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + (intervalMs / 1000) * 0.9);

      osc.connect(noteGain);
      noteGain.connect(musicGainRef.current);

      osc.start(now);
      osc.stop(now + (intervalMs / 1000));

      step++;
    }, intervalMs);
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  const startPlayback = () => {
    if (isCustomFile && customAudioRef.current) {
      customAudioRef.current.play().catch(e => console.warn('Audio play notice:', e));
      setIsPlaying(true);
    } else {
      playSynthPreset(currentPreset);
      setIsPlaying(true);
    }
  };

  const stopPlayback = () => {
    clearInterval(synthIntervalRef.current);
    if (customAudioRef.current) {
      customAudioRef.current.pause();
    }
    setIsPlaying(false);
  };

  const handleSelectPreset = (preset) => {
    setCurrentPreset(preset);
    setIsCustomFile(false);
    if (customAudioRef.current) {
      customAudioRef.current.pause();
    }
    if (isPlaying) {
      playSynthPreset(preset);
    }
  };

  // Upload Local Audio Song From Phone / Computer Storage
  const handleCustomAudioUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    stopPlayback();
    const url = URL.createObjectURL(file);
    if (customAudioRef.current) {
      customAudioRef.current.src = url;
      customAudioRef.current.volume = musicVolume / 100;
      customAudioRef.current.loop = isLooping;
      customAudioRef.current.play().catch(err => console.warn('Audio play notice:', err));
    }
    setCustomFileName(file.name);
    setIsCustomFile(true);
    setIsPlaying(true);
  };

  return (
    <div className="w-full bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl p-4 shadow-2xl flex flex-col gap-3.5 text-white animate-fade-in">
      
      {/* Hidden Audio Tag for Local Songs */}
      <audio 
        ref={customAudioRef} 
        onEnded={() => {
          if (!isLooping) setIsPlaying(false);
        }} 
      />

      {/* Hidden File Input for Phone Storage */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleCustomAudioUpload}
        className="hidden"
      />

      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-2xl ${isPlaying ? 'bg-pink-600 text-white animate-spin' : 'bg-slate-800 text-pink-400'}`}>
            <Disc size={18} />
          </div>
          <div>
            <h3 className="font-extrabold text-xs flex items-center gap-1.5">
              <span>Background Audio Songs</span>
              {isPlaying && (
                <span className="text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold animate-pulse">
                  Playing
                </span>
              )}
            </h3>
            <p className="text-[10px] text-slate-400 truncate max-w-[200px]">
              {isCustomFile ? `📁 ${customFileName}` : currentPreset.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Main Play/Pause Button */}
          <button
            onClick={togglePlay}
            className={`p-2 rounded-full shadow transition-all active:scale-95 ${
              isPlaying
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-white/10"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 1. SELECT SONG FROM PHONE STORAGE BUTTON */}
      <div className="bg-slate-950/80 border border-pink-500/30 rounded-2xl p-2.5 flex items-center justify-between shadow-inner">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
            <Upload size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-extrabold text-[11px] text-pink-200 truncate">
              {isCustomFile ? customFileName : 'Phone Se Gaana Chunein (Select Song)'}
            </h4>
            <p className="text-[9px] text-slate-400">MP3, WAV ya audio files play karein</p>
          </div>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl shadow active:scale-95 transition-all shrink-0 ml-2"
        >
          {isCustomFile ? 'Change Song' : '📁 Pick Song'}
        </button>
      </div>

      {/* 2. DUAL VOLUME CONTROLS (VOICE & MUSIC) */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2.5">
        
        {/* A. VOICE / MIC VOLUME */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-300">
            <span className="flex items-center gap-1 text-emerald-400">
              <Mic size={11} />
              <span>Voice / Mic Volume: {voiceVolume}%</span>
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setVoiceVolume(0)}
                className={`text-[8px] px-1.5 py-0.2 rounded font-bold border ${voiceVolume === 0 ? 'bg-red-600 text-white border-red-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
              >
                Mute
              </button>
              <button
                onClick={() => setVoiceVolume(100)}
                className={`text-[8px] px-1.5 py-0.2 rounded font-bold border ${voiceVolume === 100 ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
              >
                100%
              </button>
              <button
                onClick={() => setVoiceVolume(150)}
                className={`text-[8px] px-1.5 py-0.2 rounded font-bold border ${voiceVolume === 150 ? 'bg-amber-600 text-white border-amber-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
              >
                Boost 150%
              </button>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="150"
            value={voiceVolume}
            onChange={(e) => setVoiceVolume(Number(e.target.value))}
            className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* B. SONG / MUSIC VOLUME */}
        <div className="flex flex-col gap-1 pt-1 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-300">
            <span className="flex items-center gap-1 text-pink-400">
              <Volume2 size={11} />
              <span>Song Volume: {musicVolume}%</span>
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setMusicVolume(0)}
                className={`text-[8px] px-1.5 py-0.2 rounded font-bold border ${musicVolume === 0 ? 'bg-red-600 text-white border-red-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
              >
                Mute
              </button>
              <button
                onClick={() => setMusicVolume(35)}
                className={`text-[8px] px-1.5 py-0.2 rounded font-bold border ${musicVolume === 35 ? 'bg-pink-600 text-white border-pink-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
              >
                Soft 35%
              </button>
              <button
                onClick={() => setMusicVolume(100)}
                className={`text-[8px] px-1.5 py-0.2 rounded font-bold border ${musicVolume === 100 ? 'bg-pink-600 text-white border-pink-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
              >
                Full 100%
              </button>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={musicVolume}
            onChange={(e) => setMusicVolume(Number(e.target.value))}
            className="w-full accent-pink-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

      </div>

      {/* 3. PRESET SONGS CAROUSEL */}
      <div className="flex flex-col gap-1">
        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold flex items-center justify-between">
          <span>Indian Mood Presets</span>
          <button
            onClick={() => {
              setIsLooping(!isLooping);
              if (customAudioRef.current) customAudioRef.current.loop = !isLooping;
            }}
            className={`text-[9px] flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all ${
              isLooping ? 'bg-pink-500/20 text-pink-300 border-pink-500/40' : 'text-slate-500 border-slate-800'
            }`}
          >
            <Repeat size={10} />
            <span>Loop {isLooping ? 'ON' : 'OFF'}</span>
          </button>
        </span>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {INDIAN_MUSIC_PRESETS.map((p) => {
            const isSelected = !isCustomFile && currentPreset.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                className={`py-1.5 px-2.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 shrink-0 transition-all border ${
                  isSelected
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 border-pink-400 text-white shadow-md'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <span>{p.title.split(' ')[0]}</span>
                <span className="truncate max-w-[90px]">{p.title.split(' ').slice(1, 3).join(' ')}</span>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
