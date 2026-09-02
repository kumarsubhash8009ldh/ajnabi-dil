import React, { useEffect, useState, useRef } from 'react';
import { Camera, Sparkles, X, RefreshCw, Check, Sun, Heart, Wand2, Zap, Sliders, Flame, ArrowLeft, Image } from 'lucide-react';

const BEAUTY_FILTERS = [
  {
    id: 'normal',
    name: 'Normal',
    icon: '✨',
    desc: 'Original camera feed',
    cssFilter: 'none',
    overlayColor: 'transparent',
    smooth: 0,
    brightness: 100,
    contrast: 100,
    saturate: 100,
  },
  {
    id: 'smooth_radiant',
    name: 'Glow Radiant',
    icon: '🌸',
    desc: 'Skin smoothing + soft glow',
    cssFilter: 'brightness(1.12) contrast(1.05) saturate(1.15) blur(0.4px)',
    overlayColor: 'rgba(255, 230, 240, 0.12)',
    smooth: 40,
    brightness: 115,
    contrast: 105,
    saturate: 115,
  },
  {
    id: 'rosy_blush',
    name: 'Rosy Pink',
    icon: '💖',
    desc: 'Rosy cheeks & bright skin',
    cssFilter: 'brightness(1.15) contrast(1.08) saturate(1.3) hue-rotate(-8deg) blur(0.35px)',
    overlayColor: 'rgba(255, 182, 193, 0.18)',
    smooth: 50,
    brightness: 118,
    contrast: 108,
    saturate: 130,
  },
  {
    id: 'golden_hour',
    name: 'Golden Hour',
    icon: '🌅',
    desc: 'Warm sun-kissed aesthetic',
    cssFilter: 'brightness(1.1) contrast(1.12) saturate(1.35) sepia(0.2) hue-rotate(5deg) blur(0.3px)',
    overlayColor: 'rgba(255, 200, 100, 0.15)',
    smooth: 35,
    brightness: 112,
    contrast: 112,
    saturate: 135,
  },
  {
    id: 'glamour_luxe',
    name: 'Glamour Luxe',
    icon: '💎',
    desc: 'High-end beauty & soft vignette',
    cssFilter: 'brightness(1.2) contrast(1.15) saturate(1.22) blur(0.5px)',
    overlayColor: 'rgba(255, 245, 220, 0.18)',
    smooth: 65,
    brightness: 122,
    contrast: 115,
    saturate: 122,
  },
  {
    id: 'cyber_neon',
    name: 'Cyber Glow',
    icon: '⚡',
    desc: 'Futuristic vibrant tint',
    cssFilter: 'brightness(1.1) contrast(1.2) saturate(1.5) hue-rotate(25deg)',
    overlayColor: 'rgba(180, 100, 255, 0.15)',
    smooth: 30,
    brightness: 110,
    contrast: 120,
    saturate: 150,
  },
  {
    id: 'vintage_noir',
    name: 'Vintage B&W',
    icon: '🖤',
    desc: 'Classic monochrome portrait',
    cssFilter: 'grayscale(1) contrast(1.25) brightness(1.08) blur(0.2px)',
    overlayColor: 'transparent',
    smooth: 25,
    brightness: 108,
    contrast: 125,
    saturate: 0,
  },
];

export default function BeautyCameraModal({ isOpen, onClose, onCapture, initialMode = 'story' }) {
  const [stream, setStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState('user'); // 'user' or 'environment'
  
  // Active Filter state
  const [selectedFilter, setSelectedFilter] = useState(BEAUTY_FILTERS[1]); // Default Glow Radiant
  
  // Custom Fine-Tuning sliders
  const [customSmooth, setCustomSmooth] = useState(40);
  const [customBrightness, setCustomBrightness] = useState(115);
  const [customBlush, setCustomBlush] = useState(15);
  const [showSliders, setShowSliders] = useState(false);

  // Captured Photo state
  const [capturedImage, setCapturedImage] = useState(null);
  const [caption, setCaption] = useState('');
  const [flashAnimation, setFlashAnimation] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileFallbackInputRef = useRef(null);

  // Start Camera on Open
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedImage(null);
      setCaption('');
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setCameraError('');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 720 },
          height: { ideal: 1280 }
        },
        audio: false
      });
      setStream(mediaStream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn("Webcam access error:", err);
      setCameraError('Camera access unavailable or permission denied. You can select a photo from your gallery below to apply Beauty Filters!');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const toggleCameraFacing = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Generate real-time CSS filter string
  const getActiveFilterStyle = () => {
    const blurPx = (customSmooth / 100) * 1.2;
    const brightFactor = customBrightness / 100;
    const satFactor = selectedFilter.saturate / 100;
    const contFactor = selectedFilter.contrast / 100;

    let filterStr = `brightness(${brightFactor}) contrast(${contFactor}) saturate(${satFactor})`;
    if (blurPx > 0) {
      filterStr += ` blur(${blurPx.toFixed(2)}px)`;
    }
    if (selectedFilter.id === 'vintage_noir') {
      filterStr += ' grayscale(1)';
    } else if (selectedFilter.id === 'golden_hour') {
      filterStr += ' sepia(0.2) hue-rotate(5deg)';
    } else if (selectedFilter.id === 'cyber_neon') {
      filterStr += ' hue-rotate(25deg)';
    }

    return filterStr;
  };

  const handleSelectFilter = (filter) => {
    setSelectedFilter(filter);
    setCustomSmooth(filter.smooth);
    setCustomBrightness(filter.brightness);
  };

  // Capture Photo with baked-in filter on Canvas
  const handleSnap = () => {
    if (!videoRef.current && !capturedImage) return;

    setFlashAnimation(true);
    setTimeout(() => setFlashAnimation(false), 200);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 720;
    const height = video.videoHeight || 1280;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Mirror if user front camera
    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    // Apply Filter to Canvas Context
    ctx.filter = getActiveFilterStyle();
    ctx.drawImage(video, 0, 0, width, height);

    // Apply soft beauty overlay color tint if any
    if (selectedFilter.overlayColor !== 'transparent') {
      ctx.fillStyle = selectedFilter.overlayColor;
      ctx.fillRect(0, 0, width, height);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);
  };

  const handleFallbackPhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.filter = getActiveFilterStyle();
        ctx.drawImage(img, 0, 0);
        if (selectedFilter.overlayColor !== 'transparent') {
          ctx.fillStyle = selectedFilter.overlayColor;
          ctx.fillRect(0, 0, img.width, img.height);
        }
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        setCapturedImage(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    if (!capturedImage) return;
    if (onCapture) {
      onCapture(capturedImage, caption);
    }
    onClose();
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCaption('');
    if (!cameraActive) {
      startCamera();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-0 select-none animate-scale-up">
      <div className="w-full max-w-[430px] h-screen max-h-[100vh] bg-slate-950 flex flex-col justify-between relative overflow-hidden">
        
        {/* Hidden Canvas for Processing Image */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Hidden File Input for Fallback Gallery */}
        <input 
          type="file" 
          ref={fileFallbackInputRef} 
          accept="image/*" 
          onChange={handleFallbackPhotoSelect} 
          className="hidden" 
        />

        {/* Flash Animation Overlay */}
        {flashAnimation && (
          <div className="absolute inset-0 bg-white z-50 transition-opacity duration-150" />
        )}

        {/* Top Control Bar */}
        <div className="absolute top-0 left-0 right-0 z-30 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between text-white">
          <button 
            onClick={onClose}
            className="p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-1 bg-pink-500/25 border border-pink-500/40 backdrop-blur-md px-3 py-1 rounded-full">
            <Sparkles size={14} className="text-pink-400 animate-pulse" />
            <span className="text-[11px] font-extrabold tracking-wider uppercase text-pink-200">
              Beauty Cam Mode
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!capturedImage && (
              <>
                <button
                  onClick={() => setShowSliders(!showSliders)}
                  className={`p-2 rounded-full transition-all ${
                    showSliders ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/30' : 'bg-black/40 hover:bg-black/60 text-white backdrop-blur-md'
                  }`}
                  title="Tune Beauty Settings"
                >
                  <Sliders size={18} />
                </button>
                <button 
                  onClick={toggleCameraFacing}
                  className="p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full transition-colors"
                  title="Flip Camera"
                >
                  <RefreshCw size={18} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Camera Video View / Captured Preview */}
        <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
          {!capturedImage ? (
            <>
              {cameraActive ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      filter: getActiveFilterStyle(),
                      transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  {/* Beauty Soft Tone Color Overlay */}
                  {selectedFilter.overlayColor !== 'transparent' && (
                    <div 
                      className="absolute inset-0 pointer-events-none transition-all duration-300"
                      style={{ backgroundColor: selectedFilter.overlayColor }}
                    />
                  )}
                </div>
              ) : (
                <div className="p-6 text-center flex flex-col items-center gap-3 text-slate-300 max-w-xs">
                  <div className="w-16 h-16 rounded-3xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                    <Camera size={32} />
                  </div>
                  <h4 className="text-sm font-bold text-white">Live Camera Preview</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {cameraError || 'Allow camera permission to snap instant beauty photos.'}
                  </p>
                  <button
                    onClick={() => fileFallbackInputRef.current?.click()}
                    className="mt-2 py-2.5 px-4 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-bold shadow-lg active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <Image size={15} />
                    <span>Choose Photo from Gallery</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <img 
                src={capturedImage} 
                alt="Captured Snap" 
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Beauty Fine-Tuning Slider Drawer */}
          {showSliders && !capturedImage && (
            <div className="absolute top-16 left-4 right-4 bg-black/75 backdrop-blur-lg border border-white/10 rounded-3xl p-4 z-40 flex flex-col gap-3 shadow-2xl animate-scale-up text-white">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-xs font-extrabold flex items-center gap-1.5 text-pink-400">
                  <Wand2 size={14} />
                  <span>Custom Beauty Retouch</span>
                </span>
                <button onClick={() => setShowSliders(false)} className="text-slate-400 hover:text-white">
                  <X size={14} />
                </button>
              </div>

              {/* Skin Smoothing Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-300">✨ Skin Smoothing</span>
                  <span className="text-pink-400 font-mono">{customSmooth}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={customSmooth} 
                  onChange={(e) => setCustomSmooth(Number(e.target.value))}
                  className="w-full accent-pink-500 h-1.5 bg-white/20 rounded-lg cursor-pointer"
                />
              </div>

              {/* Brightness / Glow Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-300">☀️ Radiant Brightness</span>
                  <span className="text-pink-400 font-mono">{customBrightness}%</span>
                </div>
                <input 
                  type="range" 
                  min="90" 
                  max="140" 
                  value={customBrightness} 
                  onChange={(e) => setCustomBrightness(Number(e.target.value))}
                  className="w-full accent-pink-500 h-1.5 bg-white/20 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="z-30 bg-gradient-to-t from-black via-black/90 to-transparent p-4 flex flex-col gap-3.5">
          
          {/* 1. Filter Selection Carousel */}
          {!capturedImage && (
            <div className="flex items-center gap-3 overflow-x-auto py-1 scrollbar-none">
              {BEAUTY_FILTERS.map((filter) => {
                const isSelected = selectedFilter.id === filter.id;
                return (
                  <button
                    key={filter.id}
                    onClick={() => handleSelectFilter(filter)}
                    className={`flex flex-col items-center gap-1 shrink-0 p-1.5 rounded-2xl transition-all ${
                      isSelected 
                        ? 'bg-pink-500/20 border-2 border-pink-500 scale-105' 
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-full bg-slate-800 flex items-center justify-center text-lg border border-white/20 shadow-inner">
                      {filter.icon}
                    </div>
                    <span className={`text-[9px] font-extrabold max-w-[55px] truncate ${
                      isSelected ? 'text-pink-400' : 'text-slate-400'
                    }`}>
                      {filter.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 2. Shutter or Action Confirmation */}
          {!capturedImage ? (
            <div className="flex items-center justify-around pt-1">
              {/* Gallery Pick */}
              <button
                onClick={() => fileFallbackInputRef.current?.click()}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-95"
                title="Open Gallery"
              >
                <Image size={18} />
              </button>

              {/* Shutter Snap Button (Instagram style ring) */}
              <button
                onClick={handleSnap}
                className="w-18 h-18 rounded-full p-1 border-4 border-white flex items-center justify-center active:scale-90 transition-transform shadow-2xl"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-yellow-400 flex items-center justify-center shadow-lg">
                  <Sparkles size={24} className="text-white animate-pulse" />
                </div>
              </button>

              {/* Quick Retouch Toggle */}
              <button
                onClick={() => setShowSliders(!showSliders)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-95"
                title="Sliders"
              >
                <Wand2 size={18} className="text-pink-400" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Optional Caption for Story / Snap */}
              <input 
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption for your story..."
                className="w-full px-4 py-2.5 bg-white/15 border border-white/20 rounded-2xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-pink-500 transition-colors"
              />

              {/* Actions: Retake or Share */}
              <div className="flex gap-2.5">
                <button
                  onClick={handleRetake}
                  className="flex-1 py-3 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft size={16} />
                  <span>Retake</span>
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-3 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-700 hover:to-indigo-700 text-white font-bold text-xs rounded-2xl active:scale-95 transition-all shadow-lg shadow-pink-500/25 flex items-center justify-center gap-1.5"
                >
                  <Check size={16} />
                  <span>Share Story</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
