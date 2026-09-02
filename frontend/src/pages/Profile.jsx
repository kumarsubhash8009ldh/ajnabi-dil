import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Share2, Settings, Camera, Flower2, Award, 
  Wallet, Info, Phone, Video, MessageSquare, ChevronRight,
  Sparkles, Save, Check, Lock, ShieldCheck, Mail, ShieldAlert,
  Gift, Copy, FileText, Headphones, X, CheckCircle2, User as UserIcon,
  Plus, Trash2, ExternalLink, Star, Users, Radio
} from 'lucide-react';
import { apiRequest, getStoredUser, setSession, clearSession } from '../utils/api';
import MobileLayout from '../components/MobileLayout';

const AVAILABLE_INTERESTS = [
  "Gaming", "Music", "Fitness", "Tech", "Travel", 
  "Movies", "Reading", "Cooking", "Photography", "Art"
];

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [callRate, setCallRate] = useState(10);
  const [voiceCallRate, setVoiceCallRate] = useState(10);
  const [videoCallRate, setVideoCallRate] = useState(20);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState('');

  // Toggles matching reference UI
  const [incomingCalls, setIncomingCalls] = useState(true);
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'subposts'

  // Modals
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showRatesModal, setShowRatesModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);
  const [showDownlineModal, setShowDownlineModal] = useState(false);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [showAllSessionsModal, setShowAllSessionsModal] = useState(false);
  const [selectedPostImage, setSelectedPostImage] = useState(null);

  // Data states
  const [posts, setPosts] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [downlineData, setDownlineData] = useState({ totalReferred: 0, referralPoints: 0, downline: [] });
  const [newPostImage, setNewPostImage] = useState('');
  const [newPostCaption, setNewPostCaption] = useState('');
  const [uploadingPost, setUploadingPost] = useState(false);

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const postImageInputRef = useRef(null);
  const [coverPhoto, setCoverPhoto] = useState('/theme-bg.jpg');

  // Host KYC Verification Application state
  const [idDocType, setIdDocType] = useState('Aadhaar Card');
  const [idDocNumber, setIdDocNumber] = useState('');
  const [idDocPhotoPreview, setIdDocPhotoPreview] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [panPhotoPreview, setPanPhotoPreview] = useState('');
  const [liveSelfiePreview, setLiveSelfiePreview] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Withdrawal Request States
  const [withdrawCoins, setWithdrawCoins] = useState('');
  const [withdrawUpi, setWithdrawUpi] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // File Input Refs for KYC
  const idDocInputRef = useRef(null);
  const panDocInputRef = useRef(null);
  const liveSelfieInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
    fetchPosts();
    fetchSessions();
    fetchDownline();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await apiRequest('/api/users/profile');
      setProfile(data);
      setBio(data.bio || '');
      setEmail(data.email || '');
      setMobile(data.mobile || '');
      setSelectedInterests(data.interests || []);
      setCallRate(data.callRate !== undefined ? data.callRate : 10);
      setVoiceCallRate(data.voiceCallRate !== undefined ? data.voiceCallRate : 10);
      setVideoCallRate(data.videoCallRate !== undefined ? data.videoCallRate : 20);
      setIncomingCalls(data.incomingCallsEnabled !== undefined ? data.incomingCallsEnabled : true);
      setFriendsOnly(data.friendsOnly !== undefined ? data.friendsOnly : false);
      if (data.coverPhoto) setCoverPhoto(data.coverPhoto);
    } catch (err) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const data = await apiRequest('/api/users/posts');
      if (Array.isArray(data) && data.length > 0) {
        setPosts(data);
      } else {
        setPosts([
          {
            id: 'sample_p1',
            imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
            caption: 'Good vibes only ✨ #AjnabiDil',
            timestamp: '1d ago'
          },
          {
            id: 'sample_p2',
            imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
            caption: 'Live stream moments 💖',
            timestamp: '3d ago'
          }
        ]);
      }
    } catch (err) {
      console.warn('Could not fetch posts:', err);
    }
  };

  const fetchSessions = async () => {
    try {
      const data = await apiRequest('/api/users/sessions');
      setSessions(data || []);
    } catch (err) {
      console.warn('Could not fetch sessions:', err);
    }
  };

  const fetchDownline = async () => {
    try {
      const data = await apiRequest('/api/users/downline');
      setDownlineData(data || { totalReferred: 0, referralPoints: 0, downline: [] });
    } catch (err) {
      console.warn('Could not fetch downline:', err);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result;
        const updated = await apiRequest('/api/users/profile', 'PUT', {
          avatar: base64Data
        });
        setProfile(prev => ({ ...prev, avatar: updated.avatar }));
        
        const token = localStorage.getItem('chitchat_token');
        setSession(token, updated);
        alert('Profile photo updated successfully!');
      } catch (err) {
        alert(err.message || 'Failed to update profile photo');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCoverChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Cover = reader.result;
        setCoverPhoto(base64Cover);
        await apiRequest('/api/users/profile', 'PUT', {
          coverPhoto: base64Cover
        });
        alert('Cover banner updated successfully!');
      } catch (err) {
        alert(err.message || 'Failed to update cover');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleToggleIncoming = async () => {
    const nextVal = !incomingCalls;
    setIncomingCalls(nextVal);
    try {
      await apiRequest('/api/users/profile', 'PUT', { incomingCallsEnabled: nextVal });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFriends = async () => {
    const nextVal = !friendsOnly;
    setFriendsOnly(nextVal);
    try {
      await apiRequest('/api/users/profile', 'PUT', { friendsOnly: nextVal });
    } catch (err) {
      console.error(err);
    }
  };

  const handleImageToBase64 = (e, setPreview) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleInterestToggle = (interest) => {
    setSelectedInterests(prev => 
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    setError('');
    
    try {
      const updatedData = await apiRequest('/api/users/profile', 'PUT', {
        bio,
        email: email.trim(),
        mobile: mobile.trim(),
        interests: selectedInterests,
        callRate: Number(callRate),
        voiceCallRate: Number(voiceCallRate),
        videoCallRate: Number(videoCallRate)
      });
      
      const token = localStorage.getItem('chitchat_token');
      setSession(token, updatedData);
      
      setProfile(updatedData);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      setShowSettingsModal(false);
      setShowRatesModal(false);
      alert('Profile details & Calling Rates saved successfully!');
    } catch (err) {
      alert(err.message || 'Failed to save profile details');
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostImage) {
      alert('Please select a photo to post');
      return;
    }
    setUploadingPost(true);
    try {
      const created = await apiRequest('/api/users/posts', 'POST', {
        image: newPostImage,
        caption: newPostCaption.trim()
      });
      setPosts(prev => [created, ...prev]);
      setNewPostImage('');
      setNewPostCaption('');
      setShowNewPostModal(false);
      if (profile) {
        setProfile(prev => ({ ...prev, postsCount: (prev.postsCount || posts.length) + 1 }));
      }
      alert('Post published successfully to your profile!');
    } catch (err) {
      alert(err.message || 'Failed to publish post');
    } finally {
      setUploadingPost(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await apiRequest('/api/users/posts/' + postId, 'DELETE');
      setPosts(prev => prev.filter(p => p.id !== postId));
      setSelectedPostImage(null);
    } catch (err) {
      alert(err.message || 'Failed to delete post');
    }
  };

  const handleApplyPartner = async (e) => {
    e.preventDefault();
    if (!email.trim() || !mobile.trim()) {
      alert('Please provide your Email ID and Mobile Number.');
      return;
    }
    if (!idDocNumber.trim()) {
      alert(`Please enter your ${idDocType} number.`);
      return;
    }
    if (!panNumber.trim()) {
      alert('PAN Card Number is mandatory for Partner verification.');
      return;
    }
    if (!idDocPhotoPreview) {
      alert(`Please upload a photo of your ${idDocType}.`);
      return;
    }
    if (!panPhotoPreview) {
      alert('Please upload a photo of your PAN Card.');
      return;
    }
    if (!liveSelfiePreview) {
      alert('Please upload your Live Selfie photo.');
      return;
    }

    setApplyLoading(true);
    try {
      const response = await apiRequest('/api/partner/apply', 'POST', {
        email: email.trim(),
        mobile: mobile.trim(),
        idDocType,
        idDocNumber: idDocNumber.trim(),
        idDocData: idDocPhotoPreview,
        panNumber: panNumber.trim(),
        panDocData: panPhotoPreview,
        liveSelfieData: liveSelfiePreview
      });

      setProfile(prev => ({
        ...prev,
        verificationStatus: response.verificationStatus,
        verificationDetails: response.verificationDetails
      }));

      setShowKycModal(false);
      alert('Your Confidential KYC Partner Application has been submitted to Admin! Verification takes 15-30 minutes.');
    } catch (err) {
      alert(err.message || 'Application submission failed.');
    } finally {
      setApplyLoading(false);
    }
  };

  const handleRequestWithdrawal = async (e) => {
    e.preventDefault();
    const coinsNum = Number(withdrawCoins);
    if (!coinsNum || coinsNum < 500) {
      alert('Minimum withdrawal amount is Rs. 500 (500 Coins).');
      return;
    }
    if (!withdrawUpi.trim()) {
      alert('Please enter your valid UPI ID (e.g. yourname@okaxis).');
      return;
    }

    setWithdrawLoading(true);
    try {
      const res = await apiRequest('/api/wallet/withdraw/request', 'POST', {
        coins: coinsNum,
        upiId: withdrawUpi.trim()
      });

      setProfile(prev => ({
        ...prev,
        earnings: res.remainingEarnings
      }));

      setShowWithdrawModal(false);
      setWithdrawCoins('');
      setWithdrawUpi('');
      alert(`Withdrawal request for Rs. ${coinsNum} submitted successfully! Admin will transfer to ${withdrawUpi.trim()} via instant UPI.`);
    } catch (err) {
      alert(err.message || 'Failed to submit withdrawal request.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const getReferralShareUrl = () => {
    const code = profile?.referralCode || 'AJNABIDIL';
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      const pathname = window.location.pathname;
      return `${origin}${pathname}#/register?ref=${code}`;
    }
    return `https://ajnabidil.app/#/register?ref=${code}`;
  };

  const handleCopyReferralLink = () => {
    const url = getReferralShareUrl();
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareToWhatsApp = () => {
    const code = profile?.referralCode || 'AJNABIDIL';
    const url = getReferralShareUrl();
    const shareText = `💖 *Join me on Ajnabi Dil!* \n\nDirect Voice & Video Calling with Real Verified Hosts. Earn 70% commission on calls & live shows!\n\n🎁 Use my referral invite code: *${code}* to get free bonus coins!\n👉 Register here: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleCopyCode = () => {
    if (profile?.referralCode) {
      navigator.clipboard.writeText(profile.referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  if (loading) {
    return (
      <MobileLayout title="Profile">
        <div className="flex-1 flex flex-col justify-center items-center bg-[#0a0e0a] text-lime-400 gap-3">
          <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold text-slate-400">Loading Profile...</span>
        </div>
      </MobileLayout>
    );
  }

  const userEarnings = profile ? profile.earnings : 0;
  const flowersCount = profile?.flowers !== undefined ? profile.flowers : 54;
  const followersCount = profile?.followersCount !== undefined ? profile.followersCount : 89;
  const friendsCount = profile?.friendsCount !== undefined ? profile.friendsCount : 1;
  const sessionsCount = profile?.sessionsCount !== undefined ? profile.sessionsCount : 24;
  const totalPostsCount = posts.length;
  const goalHours = profile?.goalHours || 20;
  const completedHours = profile?.completedGoalHours || 14.5;
  const goalPercent = Math.min(100, Math.round((completedHours / goalHours) * 100));

  return (
    <MobileLayout title="Profile">
      <div className="flex-1 overflow-y-auto bg-[#0a0e0a] text-slate-100 pb-20 select-none">
        
        {/* 1. COVER BANNER & HEADER NAVIGATION */}
        <div className="relative h-44 w-full overflow-hidden bg-slate-900 border-b border-[#1c291c]">
          <img 
            src={coverPhoto} 
            alt="Cover" 
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-[#0a0e0a]"></div>

          {/* Top Bar Actions */}
          <div className="absolute top-3 left-0 right-0 px-4 flex justify-between items-center z-10">
            <button 
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white active:scale-95 transition-all"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="flex items-center gap-2">
              {/* Cover Photo Change */}
              <button 
                onClick={() => coverInputRef.current?.click()}
                className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-lime-400 active:scale-95 transition-all"
                title="Change Cover Banner"
              >
                <Camera size={16} />
              </button>
              <input 
                type="file" 
                ref={coverInputRef} 
                onChange={handleCoverChange} 
                accept="image/*" 
                className="hidden" 
              />

              {/* Share Referral Link */}
              <button 
                onClick={() => setShowDownlineModal(true)}
                className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white active:scale-95 transition-all"
                title="Share Referral Link & Downline"
              >
                <Share2 size={16} />
              </button>

              {/* Settings */}
              <button 
                onClick={() => setShowSettingsModal(true)}
                className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white active:scale-95 transition-all"
                title="Profile Settings"
              >
                <Settings size={16} />
              </button>
            </div>
          </div>

          {/* Centered Avatar */}
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 z-20">
            <div className="relative">
              <img 
                src={profile?.avatar || '/logo.jpg'} 
                alt="Avatar" 
                className="w-24 h-24 rounded-full object-cover border-2 border-lime-400 bg-slate-900 shadow-xl ring-4 ring-black"
              />
              <button 
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#131b13] border-2 border-lime-400 flex items-center justify-center text-lime-400 shadow-md active:scale-90 transition-all"
                title="Change Profile Photo"
              >
                <Camera size={14} />
              </button>
              <input 
                type="file" 
                ref={avatarInputRef} 
                onChange={handleAvatarChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          </div>
        </div>

        {/* 2. USERNAME & STATS ROW */}
        <div className="mt-10 px-4 flex flex-col items-center">
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
            {profile?.username || 'angel'}
            {profile?.isPartner && (
              <span className="text-[10px] bg-lime-500/20 text-lime-400 font-extrabold px-2 py-0.5 rounded-full border border-lime-400/40">
                PRO HOST
              </span>
            )}
          </h2>

          {profile?.bio && (
            <p className="text-xs text-slate-400 mt-1 max-w-xs text-center line-clamp-2">
              {profile.bio}
            </p>
          )}

          {/* Stats Bar */}
          <div className="w-full mt-4 bg-[#101710] border border-[#203020] rounded-2xl p-3.5 flex justify-around items-center text-center shadow-lg">
            <div className="flex-1">
              <span className="text-xl font-black text-lime-400 block leading-tight">
                {friendsCount}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                Friends
              </span>
            </div>
            <div className="h-7 w-[1px] bg-[#223522]"></div>
            <div className="flex-1">
              <span className="text-xl font-black text-lime-400 block leading-tight">
                {followersCount}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                Followers
              </span>
            </div>
            <div className="h-7 w-[1px] bg-[#223522]"></div>
            <div className="flex-1">
              <span className="text-xl font-black text-lime-400 block leading-tight">
                {sessionsCount}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                Sessions
              </span>
            </div>
            <div className="h-7 w-[1px] bg-[#223522]"></div>
            <div className="flex-1">
              <span className="text-xl font-black text-lime-400 block leading-tight">
                {totalPostsCount}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                Posts
              </span>
            </div>
          </div>

          {/* 3. BUY VIP BUTTON */}
          <button 
            onClick={() => navigate('/shop')}
            className="w-full mt-3.5 py-3 rounded-full bg-lime-400 hover:bg-lime-300 text-black font-extrabold text-sm tracking-wide shadow-lg shadow-lime-900/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span>Buy VIP</span>
          </button>

          {/* 4. DUAL TOGGLE BUTTONS */}
          <div className="w-full mt-3 grid grid-cols-2 gap-2.5">
            <div className="bg-[#101710] border border-[#203020] rounded-full px-3.5 py-2 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 truncate">
                Incoming ...
              </span>
              <button 
                onClick={handleToggleIncoming}
                className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${incomingCalls ? 'bg-lime-400' : 'bg-slate-700'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-black shadow-md transform transition-transform duration-200 ease-in-out ${incomingCalls ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </button>
            </div>

            <div className="bg-[#101710] border border-[#203020] rounded-full px-3.5 py-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-slate-200 truncate">
                  Friends...
                </span>
                <Info size={12} className="text-slate-400" />
              </div>
              <button 
                onClick={handleToggleFriends}
                className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${friendsOnly ? 'bg-lime-400' : 'bg-slate-700'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-black shadow-md transform transition-transform duration-200 ease-in-out ${friendsOnly ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </button>
            </div>
          </div>

          {/* 5. 3-CARD ACTION GRID (Flowers, Subs, Withdraw) */}
          <div className="w-full mt-3.5 grid grid-cols-3 gap-2.5">
            <div className="bg-[#101710] border border-[#203020] rounded-2xl p-3 flex flex-col items-center justify-center text-center">
              <Flower2 size={20} className="text-lime-400 mb-1" />
              <span className="text-xs font-bold text-slate-200">Flowers</span>
              <span className="text-[11px] font-semibold text-slate-400">{flowersCount}</span>
            </div>

            <button 
              onClick={() => setShowKycModal(true)}
              className="bg-[#101710] border border-[#203020] rounded-2xl p-3 flex flex-col items-center justify-center text-center active:scale-95 transition-all"
            >
              <Award size={20} className="text-lime-400 mb-1" />
              <span className="text-xs font-bold text-slate-200">Subs</span>
              <span className="text-[11px] font-semibold text-slate-400">
                {profile?.isPartner ? 'Verified' : 'Setup'}
              </span>
            </button>

            <button 
              onClick={() => setShowWithdrawModal(true)}
              className="bg-[#101710] border border-[#203020] rounded-2xl p-3 flex flex-col items-center justify-center text-center active:scale-95 transition-all"
            >
              <Wallet size={20} className="text-lime-400 mb-1" />
              <span className="text-xs font-bold text-slate-200">Withdraw</span>
              <span className="text-[11px] font-semibold text-slate-400">
                Rs. {userEarnings}
              </span>
            </button>
          </div>

          {/* 6. GOAL TRACKER BAR */}
          <div className="w-full mt-4 bg-[#101710] border border-[#203020] rounded-2xl p-3.5">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-1.5 text-lime-400 font-extrabold text-xs">
                <span>Goal:</span>
                <Info size={13} className="text-slate-400" />
              </div>
              <span className="text-xs font-bold text-slate-300">
                {completedHours} / {goalHours} Hrs
              </span>
            </div>
            <div className="w-full h-2.5 bg-[#0a0e0a] rounded-full overflow-hidden border border-[#203020]">
              <div 
                className="h-full bg-lime-400 rounded-full transition-all duration-500"
                style={{ width: `${goalPercent}%` }}
              ></div>
            </div>
          </div>

          {/* 7. SESSION HISTORY */}
          <div className="w-full mt-4 bg-[#101710] border border-[#203020] rounded-2xl p-3.5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-extrabold text-white">
                Session History
              </span>
              <button 
                onClick={() => setShowAllSessionsModal(true)}
                className="text-[11px] font-bold text-lime-400 hover:underline flex items-center gap-0.5"
              >
                <span>See all</span>
                <ChevronRight size={12} />
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {sessions.slice(0, 2).map((sess, idx) => (
                <div key={sess.id || idx} className="flex items-center justify-between border-b border-[#1c291c] pb-2 last:border-none last:pb-0">
                  <div className="flex items-center gap-2.5">
                    <img 
                      src={sess.peerAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + (sess.peerName || 'user')} 
                      alt="Peer" 
                      className="w-8 h-8 rounded-full object-cover bg-slate-800 border border-lime-400/40"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-200">
                        {sess.peerName || 'Deleted User'}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <span className="text-lime-400">↗ {sess.direction || 'Outgoing'}</span>
                        <span>· {sess.duration || '29s'}</span>
                        {sess.type === 'video' ? <Video size={10} /> : <Phone size={10} />}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-500">{sess.timestamp || '6d ago'}</span>
                    <span className={`text-xs font-black flex items-center gap-0.5 ${sess.flowers >= 0 ? 'text-lime-400' : 'text-rose-400'}`}>
                      🌸 {sess.flowers || sess.costCoins || -8}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 8. POSTS & SUB POSTS TABS & GALLERY */}
          <div className="w-full mt-5">
            <div className="flex items-center justify-center gap-3 mb-3.5">
              <button 
                onClick={() => setActiveTab('posts')}
                className={`px-6 py-2 rounded-full text-xs font-black transition-all ${activeTab === 'posts' ? 'bg-lime-400 text-black shadow-md' : 'bg-[#101710] text-slate-400 border border-[#203020]'}`}
              >
                Posts
              </button>
              <button 
                onClick={() => setActiveTab('subposts')}
                className={`px-6 py-2 rounded-full text-xs font-black transition-all ${activeTab === 'subposts' ? 'bg-lime-400 text-black shadow-md' : 'bg-[#101710] text-slate-400 border border-[#203020]'}`}
              >
                Sub posts
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Upload New Post Card */}
              <button 
                onClick={() => setShowNewPostModal(true)}
                className="h-44 bg-[#101710] border-2 border-dashed border-[#273d27] rounded-2xl flex flex-col items-center justify-center text-lime-400 hover:bg-[#152015] active:scale-95 transition-all p-3 text-center"
              >
                <div className="w-10 h-10 rounded-full bg-lime-400/10 border border-lime-400/40 flex items-center justify-center mb-1.5">
                  <Plus size={20} />
                </div>
                <span className="text-xs font-bold">Add New Post</span>
                <span className="text-[10px] text-slate-400">Share photo & updates</span>
              </button>

              {/* Uploaded Posts */}
              {posts.map((post) => (
                <div 
                  key={post.id} 
                  onClick={() => setSelectedPostImage(post)}
                  className="h-44 bg-slate-900 rounded-2xl overflow-hidden relative group cursor-pointer border border-[#203020]"
                >
                  <img 
                    src={post.imageUrl} 
                    alt="Post" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {post.caption && (
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-[10px] text-slate-200 truncate">
                      {post.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* MODAL: SHARE REFERRAL & DOWNLINE MEMBER LIST */}
        {showDownlineModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#101710] border border-[#203020] rounded-3xl p-5 w-full max-w-sm flex flex-col gap-3.5 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center border-b border-[#203020] pb-2">
                <div className="flex items-center gap-2">
                  <Share2 className="text-lime-400" size={18} />
                  <h3 className="font-black text-sm text-white">Share Referral & Downline</h3>
                </div>
                <button onClick={() => setShowDownlineModal(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="bg-[#0a0e0a] border border-[#203020] rounded-2xl p-3 flex flex-col gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">Your Referral Code:</span>
                <div className="flex items-center justify-between bg-[#131b13] px-3 py-2 rounded-xl border border-lime-400/30">
                  <span className="font-mono font-black text-lime-400 text-sm">{profile?.referralCode}</span>
                  <button onClick={handleCopyCode} className="text-xs font-bold text-slate-200 bg-lime-500/20 px-2 py-1 rounded-lg hover:bg-lime-500/30">
                    {copiedCode ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={handleCopyReferralLink}
                  className="py-2.5 rounded-xl bg-[#131b13] border border-[#203020] text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Copy size={14} className="text-lime-400" />
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
                </button>
                <button 
                  onClick={handleShareToWhatsApp}
                  className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 shadow-md"
                >
                  <span>💬 WhatsApp</span>
                </button>
              </div>

              <div className="mt-1">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-extrabold text-white">My Referred Members</span>
                  <span className="text-[10px] font-bold text-lime-400">Total: {downlineData.totalReferred}</span>
                </div>

                <div className="max-h-40 overflow-y-auto flex flex-col gap-1.5 pr-1">
                  {downlineData.downline && downlineData.downline.length > 0 ? (
                    downlineData.downline.map((mem, idx) => (
                      <div key={mem.id || idx} className="bg-[#0a0e0a] border border-[#1c291c] p-2 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img src={mem.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + mem.username} alt="avatar" className="w-6 h-6 rounded-full" />
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-200">@{mem.username}</span>
                            <span className="text-[9px] text-slate-400">Joined: {mem.joinedAt}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-extrabold text-lime-400">+10% Bonus</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 bg-[#0a0e0a] rounded-xl border border-[#1c291c] text-xs text-slate-500">
                      No members joined yet. Share your link to start earning referral commission!
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* MODAL: UPLOAD NEW POST PHOTO */}
        {showNewPostModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#101710] border border-[#203020] rounded-3xl p-5 w-full max-w-sm flex flex-col gap-3.5 shadow-2xl">
              <div className="flex justify-between items-center border-b border-[#203020] pb-2">
                <h3 className="font-black text-sm text-white">Create New Post</h3>
                <button onClick={() => setShowNewPostModal(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreatePost} className="flex flex-col gap-3">
                <div 
                  onClick={() => postImageInputRef.current?.click()}
                  className="h-40 bg-[#0a0e0a] border-2 border-dashed border-[#203020] rounded-2xl flex flex-col items-center justify-center text-slate-400 cursor-pointer overflow-hidden relative"
                >
                  {newPostImage ? (
                    <img src={newPostImage} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera size={24} className="text-lime-400 mb-1" />
                      <span className="text-xs font-bold text-slate-300">Tap to Select Photo</span>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={postImageInputRef} 
                  onChange={(e) => handleImageToBase64(e, setNewPostImage)} 
                  accept="image/*" 
                  className="hidden" 
                />

                <input 
                  type="text"
                  placeholder="Write a caption..."
                  value={newPostCaption}
                  onChange={(e) => setNewPostCaption(e.target.value)}
                  className="bg-[#0a0e0a] border border-[#203020] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-lime-400"
                />

                <button 
                  type="submit"
                  disabled={uploadingPost || !newPostImage}
                  className="w-full py-2.5 rounded-full bg-lime-400 text-black font-black text-xs shadow-md disabled:opacity-50"
                >
                  {uploadingPost ? 'Publishing...' : 'Publish Post'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: VIEW / DELETE POST */}
        {selectedPostImage && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#101710] border border-[#203020] rounded-3xl p-4 w-full max-w-sm flex flex-col gap-3 shadow-2xl">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400">{selectedPostImage.timestamp}</span>
                <button onClick={() => setSelectedPostImage(null)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <img src={selectedPostImage.imageUrl} alt="Post" className="w-full h-64 object-cover rounded-2xl border border-[#203020]" />
              {selectedPostImage.caption && (
                <p className="text-xs text-slate-300 font-medium px-1">{selectedPostImage.caption}</p>
              )}
              <div className="flex justify-end pt-2 border-t border-[#203020]">
                <button 
                  onClick={() => handleDeletePost(selectedPostImage.id)}
                  className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  <Trash2 size={14} />
                  <span>Delete Post</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: FULL SESSIONS HISTORY */}
        {showAllSessionsModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#101710] border border-[#203020] rounded-3xl p-5 w-full max-w-sm flex flex-col gap-3 shadow-2xl max-h-[80vh]">
              <div className="flex justify-between items-center border-b border-[#203020] pb-2">
                <h3 className="font-black text-sm text-white">Full Session History</h3>
                <button onClick={() => setShowAllSessionsModal(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto flex flex-col gap-2.5 pr-1">
                {sessions.map((sess, idx) => (
                  <div key={sess.id || idx} className="bg-[#0a0e0a] border border-[#1c291c] p-3 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img src={sess.peerAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + (sess.peerName || 'user')} alt="Peer" className="w-8 h-8 rounded-full border border-lime-400/40" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200">{sess.peerName || 'Deleted User'}</span>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <span className="text-lime-400">↗ {sess.direction || 'Outgoing'}</span>
                          <span>· {sess.duration || '29s'}</span>
                          {sess.type === 'video' ? <Video size={10} /> : <Phone size={10} />}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-slate-500">{sess.timestamp || '6d ago'}</span>
                      <span className="text-xs font-black text-lime-400">🌸 {sess.flowers || sess.costCoins || -8}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODAL: SETTINGS & CALL RATES */}
        {showSettingsModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#101710] border border-[#203020] rounded-3xl p-5 w-full max-w-sm flex flex-col gap-3 shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-[#203020] pb-2">
                <h3 className="font-black text-sm text-white">Profile & Rates Setup</h3>
                <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="flex flex-col gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Bio / About You</label>
                  <textarea 
                    value={bio} 
                    onChange={(e) => setBio(e.target.value)} 
                    rows={2} 
                    className="w-full bg-[#0a0e0a] border border-[#203020] rounded-xl p-2.5 text-xs text-white mt-1 focus:outline-none focus:border-lime-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">📞 Voice Call (Coins/10s)</label>
                    <input 
                      type="number" 
                      value={voiceCallRate} 
                      onChange={(e) => setVoiceCallRate(e.target.value)} 
                      className="w-full bg-[#0a0e0a] border border-[#203020] rounded-xl p-2 text-xs text-white mt-1 focus:outline-none focus:border-lime-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">📹 Video Call (Coins/10s)</label>
                    <input 
                      type="number" 
                      value={videoCallRate} 
                      onChange={(e) => setVideoCallRate(e.target.value)} 
                      className="w-full bg-[#0a0e0a] border border-[#203020] rounded-xl p-2 text-xs text-white mt-1 focus:outline-none focus:border-lime-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Interests</label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {AVAILABLE_INTERESTS.map((interest) => (
                      <button
                        type="button"
                        key={interest}
                        onClick={() => handleInterestToggle(interest)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                          selectedInterests.includes(interest)
                            ? 'bg-lime-400 border-lime-400 text-black font-extrabold'
                            : 'bg-[#0a0e0a] border-[#203020] text-slate-400'
                        }`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={saving}
                  className="w-full py-2.5 rounded-full bg-lime-400 text-black font-black text-xs shadow-md mt-2"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: KYC VERIFICATION */}
        {showKycModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#101710] border border-[#203020] rounded-3xl p-5 w-full max-w-sm flex flex-col gap-3 shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-[#203020] pb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-lime-400" size={18} />
                  <h3 className="font-black text-sm text-white">Host Partner Verification</h3>
                </div>
                <button onClick={() => setShowKycModal(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              {profile?.verificationStatus === 'verified' ? (
                <div className="text-center py-6 flex flex-col items-center gap-2">
                  <CheckCircle2 className="text-lime-400" size={40} />
                  <h4 className="font-black text-base text-white">Verified Partner Host!</h4>
                  <p className="text-xs text-slate-400">You are earning 70% direct revenue on all calls and live gifts.</p>
                </div>
              ) : profile?.verificationStatus === 'pending' ? (
                <div className="text-center py-6 flex flex-col items-center gap-2">
                  <Award className="text-amber-400" size={40} />
                  <h4 className="font-black text-base text-white">Application Under Review</h4>
                  <p className="text-xs text-slate-400">Admin is verifying your KYC documents. Payout access will activate shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleApplyPartner} className="flex flex-col gap-2.5">
                  <p className="text-[11px] text-slate-400">Earn 70% revenue share on paid voice calls, video calls & virtual gifts.</p>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Document Type</label>
                    <select 
                      value={idDocType} 
                      onChange={(e) => setIdDocType(e.target.value)} 
                      className="w-full bg-[#0a0e0a] border border-[#203020] rounded-xl p-2 text-xs text-white mt-1"
                    >
                      <option value="Aadhaar Card">Aadhaar Card</option>
                      <option value="Voter ID Card">Voter ID Card</option>
                      <option value="Driving License">Driving License</option>
                      <option value="Passport">Passport</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Document Number</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 1234 5678 9012"
                      value={idDocNumber} 
                      onChange={(e) => setIdDocNumber(e.target.value)} 
                      className="w-full bg-[#0a0e0a] border border-[#203020] rounded-xl p-2 text-xs text-white mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">PAN Card Number</label>
                    <input 
                      type="text" 
                      placeholder="e.g. ABCDE1234F"
                      value={panNumber} 
                      onChange={(e) => setPanNumber(e.target.value)} 
                      className="w-full bg-[#0a0e0a] border border-[#203020] rounded-xl p-2 text-xs text-white mt-1 uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button 
                      type="button" 
                      onClick={() => idDocInputRef.current?.click()}
                      className="p-2.5 bg-[#0a0e0a] border border-[#203020] rounded-xl text-[10px] font-bold text-lime-400"
                    >
                      {idDocPhotoPreview ? '✓ ID Uploaded' : 'Upload ID Photo'}
                    </button>
                    <input type="file" ref={idDocInputRef} onChange={(e) => handleImageToBase64(e, setIdDocPhotoPreview)} accept="image/*" className="hidden" />

                    <button 
                      type="button" 
                      onClick={() => panDocInputRef.current?.click()}
                      className="p-2.5 bg-[#0a0e0a] border border-[#203020] rounded-xl text-[10px] font-bold text-lime-400"
                    >
                      {panPhotoPreview ? '✓ PAN Uploaded' : 'Upload PAN Photo'}
                    </button>
                    <input type="file" ref={panDocInputRef} onChange={(e) => handleImageToBase64(e, setPanPhotoPreview)} accept="image/*" className="hidden" />
                  </div>

                  <button 
                    type="button" 
                    onClick={() => liveSelfieInputRef.current?.click()}
                    className="w-full p-2.5 bg-[#0a0e0a] border border-[#203020] rounded-xl text-[10px] font-bold text-lime-400"
                  >
                    {liveSelfiePreview ? '✓ Live Selfie Uploaded' : 'Upload Live Selfie'}
                  </button>
                  <input type="file" ref={liveSelfieInputRef} onChange={(e) => handleImageToBase64(e, setLiveSelfiePreview)} accept="image/*" className="hidden" />

                  <button 
                    type="submit" 
                    disabled={applyLoading}
                    className="w-full py-2.5 rounded-full bg-lime-400 text-black font-black text-xs shadow-md mt-2"
                  >
                    {applyLoading ? 'Submitting...' : 'Submit Confidential Application'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* MODAL: EARNINGS WITHDRAWAL */}
        {showWithdrawModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#101710] border border-[#203020] rounded-3xl p-5 w-full max-w-sm flex flex-col gap-3 shadow-2xl">
              <div className="flex justify-between items-center border-b border-[#203020] pb-2">
                <div className="flex items-center gap-2">
                  <Wallet className="text-lime-400" size={18} />
                  <h3 className="font-black text-sm text-white">Withdraw Host Earnings</h3>
                </div>
                <button onClick={() => setShowWithdrawModal(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="bg-[#0a0e0a] border border-[#203020] p-3 rounded-2xl flex justify-between items-center">
                <span className="text-xs text-slate-400">Available Balance:</span>
                <span className="text-sm font-black text-lime-400">Rs. {userEarnings}</span>
              </div>

              <form onSubmit={handleRequestWithdrawal} className="flex flex-col gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Withdrawal Amount (Min Rs. 500)</label>
                  <input 
                    type="number" 
                    placeholder="Enter coins / Rs. (Min 500)"
                    min={500}
                    value={withdrawCoins}
                    onChange={(e) => setWithdrawCoins(e.target.value)}
                    className="w-full bg-[#0a0e0a] border border-[#203020] rounded-xl p-2.5 text-xs text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">UPI ID / Bank Payout</label>
                  <input 
                    type="text" 
                    placeholder="e.g. mobile@upi or yourname@okaxis"
                    value={withdrawUpi}
                    onChange={(e) => setWithdrawUpi(e.target.value)}
                    className="w-full bg-[#0a0e0a] border border-[#203020] rounded-xl p-2.5 text-xs text-white mt-1"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={withdrawLoading || userEarnings < 500}
                  className="w-full py-2.5 rounded-full bg-lime-400 text-black font-black text-xs shadow-md disabled:opacity-50 mt-1"
                >
                  {withdrawLoading ? 'Processing Request...' : 'Submit Instant Withdrawal'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </MobileLayout>
  );
}
