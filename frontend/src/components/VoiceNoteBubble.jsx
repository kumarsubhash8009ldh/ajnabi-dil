import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic } from 'lucide-react';

export default function VoiceNoteBubble({ audioUrl, isOwnMessage }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn('Audio play error:', err);
      });
    }
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className={`flex items-center gap-2.5 p-2 rounded-2xl min-w-[200px] max-w-[240px] select-none ${
      isOwnMessage ? 'bg-primary-700/80 text-white' : 'bg-slate-100 text-slate-800'
    }`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Play / Pause Round Button */}
      <button
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow transition-all active:scale-90 ${
          isOwnMessage 
            ? 'bg-white text-primary-700 hover:bg-slate-100' 
            : 'bg-primary-600 text-white hover:bg-primary-700'
        }`}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>

      {/* Audio Waveform & Progress Scrubber */}
      <div className="flex-1 flex flex-col gap-1">
        <div 
          onClick={handleSeek}
          className="h-5 flex items-center gap-0.5 cursor-pointer py-1"
          title="Click to seek"
        >
          {/* Simulated Waveform Bars */}
          {[40, 70, 90, 60, 100, 50, 80, 45, 95, 65, 85, 35, 75, 55, 90, 70, 40].map((h, i) => {
            const barProgress = (i / 17) * 100;
            const currentProgress = duration > 0 ? (currentTime / duration) * 100 : 0;
            const isPlayed = currentProgress >= barProgress;

            return (
              <span
                key={i}
                style={{ height: `${h}%` }}
                className={`w-1 rounded-full transition-colors ${
                  isPlayed
                    ? isOwnMessage ? 'bg-white' : 'bg-primary-600'
                    : isOwnMessage ? 'bg-white/40' : 'bg-slate-300'
                } ${isPlaying && isPlayed ? 'animate-pulse' : ''}`}
              />
            );
          })}
        </div>

        {/* Timers & Mic Badge */}
        <div className={`flex items-center justify-between text-[9px] font-bold ${
          isOwnMessage ? 'text-white/80' : 'text-slate-500'
        }`}>
          <span>{formatTime(currentTime)}</span>
          <div className="flex items-center gap-1">
            <Mic size={10} />
            <span>{formatTime(duration || 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
