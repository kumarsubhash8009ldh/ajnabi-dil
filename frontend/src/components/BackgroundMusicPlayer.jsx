import React, { useEffect, useState, useRef } from 'react';
import { Music, Play, Pause, Square, Volume2, Mic, Upload, Repeat, Sparkles, X, Disc, Sliders } from 'lucide-react';

const INDIAN_MUSIC_PRESETS = [
  {
    id: 'lofi_romantic',
    title: '🌸 Bollywood Romantic Lo-Fi',
    desc: 'Soft acoustic chords & gentle night vibe',
    notes: [261.63, 329.63, 392.00, 493.88, 523.25], // C Major Pentatonic Warm
    tempo: 120,
    type: 'sine'
  },
  {
    id: 'sitar_ambient',
    title: '🪕 Sitar & Flute Classical Ambient',
    desc: 'Soulful Indian raag sitar melodies & drone',
    notes: [293.66, 311.13, 369.99, 440.00, 554.37, 587.33], // Bhairav Raag Scale
    tempo: 140,
    type: 'triangle'
  },
  {
    id: 'punjabi_beats',
    title: '🥁 Desi Punjabi Dhol Beats',
    desc: 'High-energy bhangra rhythm & party groove',
    notes: [220.00, 261.63, 293.66, 329.63, 392.00], // A Minor Groove
    tempo: 95,
    type: 'sawtooth'
  },
  {
    id: 'acoustic_love',
    title: '🎸 Indian Acoustic Melodies',
    desc: 'Sweet romantic guitar & tabla harmony',
    notes: [329.63, 392.00, 440.00, 493.88, 587.33],
    tempo: 110,
    type: 'sine'
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
  
  // Volume Controls
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
      musicGainRef.current.gain.value = musicVolume / 100;
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
      musicGainRef.current.gain.value = (musicVolume / 100) * 0.4;
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
    const notes = preset.notes;

    const playNote = () => {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') return;
      const osc = audioCtxRef.current.createOscillator();
      const noteGain = audioCtxRef.current.createGain();

      const freq = notes[step % notes.length];
      osc.type = preset.type || 'sine';
      osc.frequency.setValueAtTime(freq, audioCtxRef.current.currentTime);

      noteGain.gain.setValueAtTime(0.01, audioCtxRef.current.currentTime);
      noteGain.gain.exponentialRampToValueAtTime(0.3, audioCtxRef.current.currentTime + 0.05);
      noteGain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + (preset.tempo / 150));

      osc.connect(noteGain);
      noteGain.connect(musicGainRef.current);

      osc.start();
      osc.stop(audioCtxRef.current.currentTime + (preset.tempo / 150) + 0.1);

      step++;
    };

    playNote();
    synthIntervalRef.current = setInterval(playNote, preset.tempo * 3);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  const startPlayback = () => {
    if (isCustomFile && customAudioRef.current) {
      customAudioRef.current.play();
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

  const handleCustomAudioUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    stopPlayback();
    const url = URL.createObjectURL(file);
    if (customAudioRef.current) {
      customAudioRef.current.src = url;
      customAudioRef.current.volume = musicVolume / 100;
      customAudioRef.current.loop = isLooping;
      customAudioRef.current.play();
    }
    setCustomFileName(file.name);
    setIsCustomFile(true);
    setIsPlaying(true);
  };

  return (
    <div className="bg-slate-900/95 backdrop-blur-xl border border-pink-500/30 rounded-3xl p-4 shadow-2xl flex flex-col gap-3.5 text-white max-w-sm w-full animate-scale-up z-40">
      
      {/* Hidden Audio Tag for User Custom MP3 Songs */}
      <audio 
        ref={customAudioRef} 
        onEnded={() => { if (!isLooping) setIsPlaying(false); }}
      />

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="audio/*" 
        onChange={handleCustomAudioUpload} 
        className="hidden" 
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-yellow-400 flex items-center justify-center text-white shadow-md">
            <Music size={16} className={isPlaying ? 'animate-bounce' : ''} />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-white flex items-center gap-1.5">
              <span>Indian Songs & Background Music</span>
              {isPlaying && (
                <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
              )}
            </h4>
            <p className="text-[9px] text-pink-300 font-semibold">
              {isCustomFile ? `Playing: ${customFileName}` : currentPreset.title}
            </p>
          </div>
        </div>

        {onClose && (
          <button 
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Indian Song Presets */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center px-1">
          <span className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">
            Curated Indian Music Vibes
          </span>
          <span className="text-[8px] text-pink-400 font-bold">5 Built-in</span>
        </div>

        <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-0.5 scrollbar-none">
          {INDIAN_MUSIC_PRESETS.map((preset) => {
            const isSelected = !isCustomFile && currentPreset.id === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`p-2 rounded-2xl text-left transition-all flex items-center justify-between border ${
                  isSelected 
                    ? 'bg-gradient-to-r from-pink-600/30 to-purple-600/30 border-pink-500 text-white shadow-sm' 
                    : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-xs font-bold leading-tight">{preset.title}</span>
                  <span className="text-[9px] text-slate-400">{preset.desc}</span>
                </div>
                {isSelected && isPlaying && (
                  <div className="flex gap-0.5 items-end h-3">
                    <span className="w-1 bg-pink-400 rounded-full animate-pulse h-3"></span>
                    <span className="w-1 bg-pink-400 rounded-full animate-bounce h-2"></span>
                    <span className="w-1 bg-pink-400 rounded-full animate-pulse h-3"></span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Upload Own MP3 Song Option */}
      <div className="flex items-center gap-2 pt-1 border-t border-white/10">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 py-2 px-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 transition-all active:scale-95"
        >
          <Upload size={14} className="text-pink-400" />
          <span>Upload My Song (MP3 / Audio)</span>
        </button>
      </div>

      {/* Master Volume Controls (Music Volume & Voice Volume) */}
      <div className="bg-black/40 border border-white/10 rounded-2xl p-3 flex flex-col gap-2.5">
        
        {/* 1. Background Music Volume */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-[10px] font-bold">
            <span className="text-slate-300 flex items-center gap-1">
              <Volume2 size={12} className="text-pink-400" />
              <span>Music Volume</span>
            </span>
            <span className="text-pink-400 font-mono">{musicVolume}%</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={musicVolume} 
            onChange={(e) => setMusicVolume(Number(e.target.value))}
            className="w-full accent-pink-500 h-1.5 bg-white/20 rounded-lg cursor-pointer"
          />
        </div>

        {/* 2. Voice / Mic Level Volume */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-[10px] font-bold">
            <span className="text-slate-300 flex items-center gap-1">
              <Mic size={12} className="text-indigo-400" />
              <span>Voice / Mic Volume Boost</span>
            </span>
            <span className="text-indigo-400 font-mono">{voiceVolume}%</span>
          </div>
          <input 
            type="range" 
            min="50" 
            max="150" 
            value={voiceVolume} 
            onChange={(e) => setVoiceVolume(Number(e.target.value))}
            className="w-full accent-indigo-500 h-1.5 bg-white/20 rounded-lg cursor-pointer"
          />
        </div>

      </div>

      {/* Main Playback Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleTogglePlay}
          className={`flex-1 py-3 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all ${
            isPlaying 
              ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-red-900/30' 
              : 'bg-gradient-to-r from-pink-600 to-indigo-600 text-white shadow-pink-900/30'
          }`}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          <span>{isPlaying ? 'Pause Music' : 'Play Music'}</span>
        </button>

        <button
          onClick={() => setIsLooping(!isLooping)}
          className={`p-3 rounded-2xl border transition-all ${
            isLooping ? 'bg-pink-600/30 border-pink-500 text-pink-300' : 'bg-white/5 border-white/10 text-slate-400'
          }`}
          title="Loop Song"
        >
          <Repeat size={16} />
        </button>
      </div>

    </div>
  );
}
