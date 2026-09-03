import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Mic, MicOff, Globe, Image, Music, Film, Trash2, 
  Sparkles, Check, AlertTriangle 
} from 'lucide-react';
import { detectPersonalContactLeak } from '../utils/contentFilterClient';
import { getSocket } from '../utils/api';

const SUPPORTED_LANGUAGES = [
  { 
    id: 'hi', 
    name: 'हिंदी', 
    code: 'hi-IN', 
    placeholder: 'हिंदी में संदेश लिखें...',
    phrases: ['नमस्ते 🙏', 'क्या हाल है?', 'कॉल करो', 'मिलते हैं 👍', 'बहुत बढ़िया!'] 
  },
  { 
    id: 'en', 
    name: 'English', 
    code: 'en-IN', 
    placeholder: 'Type a message...',
    phrases: ['Hello! 👋', 'How are you?', 'Call me', 'See you 👍', 'Awesome!'] 
  },
  { 
    id: 'hinglish', 
    name: 'Hinglish', 
    code: 'hi-IN', 
    placeholder: 'Message type karein...',
    phrases: ['Kaise ho? 😊', 'Kya kar rahe ho?', 'Call karo', 'Baad me milte hain', 'Mast! 🔥'] 
  },
  { 
    id: 'pa', 
    name: 'ਪੰਜਾਬੀ', 
    code: 'pa-IN', 
    placeholder: 'ਸੁਨੇਹਾ ਲਿਖੋ...',
    phrases: ['ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ 🙏', 'ਕੀ ਹਾਲ ਆ?', 'ਕਾਲ ਕਰੋ ਜੀ', 'ਫੇਰ ਮਿਲਦੇ ਆਂ', 'ਬਹੁਤ ਵਧੀਆ!'] 
  },
  { 
    id: 'ur', 
    name: 'اردو', 
    code: 'ur-PK', 
    placeholder: 'پیغام لکھیں...',
    phrases: ['السلام علیکم 🙏', 'کیا حال ہے؟', 'کال کریں', 'پھر ملیں گے', 'بہت خوب!'] 
  }
];

export default function ChatInputBar({ 
  inputText, 
  setInputText, 
  onSendMessage, 
  onSendVoiceNote, 
  uploading,
  imageInputRef,
  audioInputRef,
  videoInputRef
}) {
  const [selectedLang, setSelectedLang] = useState(SUPPORTED_LANGUAGES[0]);
  const [showLangMenu, setShowLangMenu] = useState(false);
  
  // Voice-to-Text (Speech Recognition) States
  const [isSpeechListening, setIsSpeechListening] = useState(false);
  const speechRecognitionRef = useRef(null);

  // Voice Note (Audio Recording) States
  const [isRecordingVoiceNote, setIsRecordingVoiceNote] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const audioStreamRef = useRef(null);
  const voiceNoteTranscriptRef = useRef('');
  const voiceNoteSpeechRef = useRef(null);
  const [voiceNoteError, setVoiceNoteError] = useState(null);
  const shouldSendRef = useRef(false);
  const recordingSecondsRef = useRef(0);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLang.code;

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setInputText((prev) => (prev ? prev + ' ' : '') + transcript.trim());
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsSpeechListening(false);
      };

      recognition.onend = () => {
        setIsSpeechListening(false);
      };

      speechRecognitionRef.current = recognition;
    }

    return () => {
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch(e) {}
      }
      stopVoiceRecording(false);
    };
  }, []);

  // Update speech recognition language when user changes language
  useEffect(() => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.lang = selectedLang.code;
    }
  }, [selectedLang]);

  // Toggle Voice-to-Text Typing
  const toggleSpeechRecognition = () => {
    if (!speechRecognitionRef.current) {
      alert('Aapke browser me Voice-to-Text speech recognition support nahi hai. Please Chrome use karein.');
      return;
    }

    if (isSpeechListening) {
      speechRecognitionRef.current.stop();
      setIsSpeechListening(false);
    } else {
      try {
        speechRecognitionRef.current.lang = selectedLang.code;
        speechRecognitionRef.current.start();
        setIsSpeechListening(true);
      } catch (e) {
        console.warn('Failed to start speech recognition:', e);
      }
    }
  };

  // Start Voice Note Recording
  const startVoiceRecording = async () => {
    try {
      if (isSpeechListening && speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
        setIsSpeechListening(false);
      }

      // Initialize parallel Speech Recognition to scan what is being spoken in real-time
      voiceNoteTranscriptRef.current = '';
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const scanner = new SpeechRecognition();
          scanner.continuous = true;
          scanner.interimResults = true;
          scanner.lang = selectedLang.code;
          scanner.onresult = (event) => {
            let tr = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              tr += event.results[i][0].transcript;
            }
            if (tr) {
              voiceNoteTranscriptRef.current += ' ' + tr;
            }
          };
          scanner.start();
          voiceNoteSpeechRef.current = scanner;
        } catch (e) {
          console.warn('Voice note speech scanner notice:', e);
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Stop background speech scanner if running
        if (voiceNoteSpeechRef.current) {
          try { voiceNoteSpeechRef.current.stop(); } catch(e) {}
          voiceNoteSpeechRef.current = null;
        }

        // --- SCAN SPOKEN AUDIO TRANSCRIPT FOR NUMBER / PERSONAL CONTACT LEAK ---
        const spokenTranscript = (voiceNoteTranscriptRef.current || '').trim();
        const leakCheck = detectPersonalContactLeak(spokenTranscript);

        if (leakCheck.detected) {
          // --- VOICE NOTE FAILS IMMEDIATELY! ---
          console.warn('Voice note blocked due to spoken number/contact:', leakCheck);
          audioChunksRef.current = []; // Discard audio data completely!
          
          setVoiceNoteError(`❌ Voice Note Failed! Audio me phone number bola gaya hai: "${leakCheck.snippet}"`);
          setTimeout(() => setVoiceNoteError(null), 7000);

          // Notify server to log the strike & trigger PolicyWarningModal with siren
          const socket = getSocket();
          if (socket) {
            socket.emit('voice-note-audio-leak', {
              transcript: spokenTranscript,
              violationType: leakCheck.type,
              snippet: leakCheck.snippet,
              reason: leakCheck.reason
            });
          }
          return; // DO NOT SEND VOICE NOTE!
        }

        if (audioChunksRef.current.length > 0 && shouldSendRef.current) {
          const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm');
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64Audio = reader.result;
            if (onSendVoiceNote) {
              onSendVoiceNote(base64Audio, recordingSecondsRef.current || 1);
            }
          };
        }
      };

      shouldSendRef.current = true;
      recordingSecondsRef.current = 0;
      mediaRecorder.start();
      setIsRecordingVoiceNote(true);
      setRecordingSeconds(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        recordingSecondsRef.current += 1;
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error accessing microphone for voice note:', err);
      alert('Microphone permission enable karein voice note record karne ke liye.');
    }
  };

  // Stop or Cancel Voice Recording
  const stopVoiceRecording = (send = true) => {
    shouldSendRef.current = send;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (voiceNoteSpeechRef.current) {
      try { voiceNoteSpeechRef.current.stop(); } catch(e) {}
      voiceNoteSpeechRef.current = null;
    }

    if (!send) {
      audioChunksRef.current = [];
      voiceNoteTranscriptRef.current = '';
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    setIsRecordingVoiceNote(false);
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-white border-t border-slate-200 flex flex-col z-30 select-none">
      
      {/* Voice Note Spoken Number Violation Alert Banner */}
      {voiceNoteError && (
        <div className="px-3 py-2 bg-red-600 text-white text-xs font-bold flex items-center justify-between gap-2 animate-bounce">
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={15} className="shrink-0 text-yellow-300" />
            <span>{voiceNoteError}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setVoiceNoteError(null)}
            className="p-1 text-white hover:text-slate-200 text-xs font-black"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. KEYBOARD LANGUAGE SELECTOR & QUICK PHRASES BAR */}
      <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {/* Language Switcher Pill */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 border border-primary-200 text-[10px] font-black hover:bg-primary-100 transition-colors"
          >
            <Globe size={11} />
            <span>{selectedLang.name}</span>
          </button>

          {showLangMenu && (
            <div className="absolute bottom-8 left-0 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-700 py-1.5 min-w-[120px] z-50 animate-scale-up">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => {
                    setSelectedLang(lang);
                    setShowLangMenu(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-slate-800 ${
                    selectedLang.id === lang.id ? 'text-primary-400 font-bold' : 'text-slate-300'
                  }`}
                >
                  <span>{lang.name}</span>
                  {selectedLang.id === lang.id && <Check size={12} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Phrase Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {selectedLang.phrases.map((phrase, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setInputText((prev) => (prev ? prev + ' ' : '') + phrase)}
              className="whitespace-nowrap px-2.5 py-0.5 rounded-full bg-white hover:bg-primary-50 text-slate-700 hover:text-primary-700 border border-slate-200 text-[10px] font-semibold transition-colors active:scale-95 shrink-0"
            >
              {phrase}
            </button>
          ))}
        </div>
      </div>

      {/* 2. RECORDING ACTIVE OVERLAY OR STANDARD INPUT FORM */}
      {isRecordingVoiceNote ? (
        // --- VOICE NOTE RECORDING ACTIVE VIEW ---
        <div className="p-3 flex items-center justify-between gap-3 bg-red-50/90 animate-fade-in">
          {/* Recording Timer & Pulse Indicator */}
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600 animate-ping"></span>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-red-700">Recording Voice Note</span>
                <span className="text-xs font-mono font-bold text-red-600">({formatTimer(recordingSeconds)})</span>
              </div>
              <span className="text-[9px] text-red-500 font-medium">
                ⚠️ Policy: Audio me phone number ya ID share karna mana hai
              </span>
            </div>
          </div>

          {/* Cancel & Send Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => stopVoiceRecording(false)}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors active:scale-90"
              title="Cancel Recording"
            >
              <Trash2 size={18} />
            </button>

            <button
              type="button"
              onClick={() => stopVoiceRecording(true)}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Send size={13} />
              <span>Send</span>
            </button>
          </div>
        </div>
      ) : (
        // --- STANDARD INPUT FORM ---
        <form onSubmit={onSendMessage} className="p-2.5 flex gap-1.5 items-center">
          
          {/* Media Attachments Dropdown/Buttons */}
          <div className="flex gap-0.5 shrink-0">
            {imageInputRef && (
              <button
                type="button"
                disabled={uploading}
                onClick={() => imageInputRef.current?.click()}
                className="p-1.5 text-slate-400 hover:text-primary-600 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50"
                title="Photo"
              >
                <Image size={15} />
              </button>
            )}
            {audioInputRef && (
              <button
                type="button"
                disabled={uploading}
                onClick={() => audioInputRef.current?.click()}
                className="p-1.5 text-slate-400 hover:text-primary-600 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50"
                title="Music File"
              >
                <Music size={15} />
              </button>
            )}
            {videoInputRef && (
              <button
                type="button"
                disabled={uploading}
                onClick={() => videoInputRef.current?.click()}
                className="p-1.5 text-slate-400 hover:text-primary-600 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50"
                title="Video"
              >
                <Film size={15} />
              </button>
            )}
          </div>

          {/* Text Input with Dynamic Language Placeholder */}
          <div className="relative flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={uploading ? "Uploading file..." : selectedLang.placeholder}
              disabled={uploading}
              className={`w-full px-4 py-2 pr-9 bg-slate-100 border focus:border-primary-500 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white transition-colors disabled:opacity-50 ${
                isSpeechListening ? 'border-red-400 bg-red-50/40 animate-pulse' : 'border-slate-200'
              }`}
            />

            {/* Voice-to-Text (Speech Recognition) Mic Button inside input */}
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${
                isSpeechListening 
                  ? 'text-red-600 bg-red-100 animate-bounce' 
                  : 'text-slate-400 hover:text-primary-600'
              }`}
              title={`Voice Typing in ${selectedLang.name} (बोल कर लिखें)`}
            >
              {isSpeechListening ? <Mic size={14} className="text-red-600" /> : <Mic size={14} />}
            </button>
          </div>

          {/* Right Action: Either Send Text OR Record Voice Note Button */}
          {inputText.trim() ? (
            <button
              type="submit"
              disabled={uploading}
              className="w-9 h-9 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-200 text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all shrink-0"
              title="Send Message"
            >
              <Send size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={startVoiceRecording}
              className="w-9 h-9 bg-gradient-to-tr from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-full flex items-center justify-center shadow-md active:scale-90 transition-all shrink-0"
              title="Record Voice Note (वॉइस नोट रिकॉर्ड करें)"
            >
              <Mic size={16} />
            </button>
          )}

        </form>
      )}

      {/* Speech-to-Text Active Notification Banner */}
      {isSpeechListening && (
        <div className="px-3 py-1 bg-red-600 text-white text-[10px] font-bold flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
            <span>Listening in {selectedLang.name}... Bolkar likhein!</span>
          </div>
          <button 
            type="button" 
            onClick={toggleSpeechRecognition}
            className="underline text-[9px] hover:text-slate-200"
          >
            Done
          </button>
        </div>
      )}

    </div>
  );
}
