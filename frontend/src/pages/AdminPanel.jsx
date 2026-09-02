import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Users, ShieldAlert, MessageSquare, ShieldCheck, Mail, 
  Database, CheckCircle, XCircle, Settings, Upload, Image, 
  Search, Lock, Unlock, UserCheck, UserX, Ban, DollarSign, 
  Plus, Minus, Trash2, Eye, ExternalLink, RefreshCw, Radio
} from 'lucide-react';
import { apiRequest } from '../utils/api';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('users');

  // Admin PIN & Lock State
  const [adminPin, setAdminPin] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return sessionStorage.getItem('admin_master_unlocked') === 'true';
  });
  const [pinError, setPinError] = useState('');

  // User Search & Coin Editor State
  const [userSearch, setUserSearch] = useState('');
  const [coinModalUser, setCoinModalUser] = useState(null);
  const [coinAmountToAdd, setCoinAmountToAdd] = useState('');

  // KYC Image Preview Modal State
  const [kycPreviewUrl, setKycPreviewUrl] = useState(null);

  // DM & Room Selection State
  const [selectedDmUser1, setSelectedDmUser1] = useState('');
  const [selectedDmUser2, setSelectedDmUser2] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');

  // Support & Settings State
  const [supportWhatsapp, setSupportWhatsapp] = useState('+91 9876543210');
  const [supportEmail, setSupportEmail] = useState('support@ajnabidil.com');
  const [supportHours, setSupportHours] = useState('24x7 Live Customer Care');
  const [supportHelpText, setSupportHelpText] = useState('');
  const [savingSupport, setSavingSupport] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState(false);
  const [qrUploading, setQrUploading] = useState(false);
  const [qrSuccess, setQrSuccess] = useState(false);

  const handleUnlockAdmin = (e) => {
    e.preventDefault();
    if (adminPin === '8009' || adminPin === 'admin8009' || adminPin === 'admin@123') {
      sessionStorage.setItem('admin_master_unlocked', 'true');
      setIsUnlocked(true);
      setPinError('');
    } else {
      setPinError('Invalid Master Admin Security PIN. (Default: 8009)');
    }
  };

  const handleLockSession = () => {
    sessionStorage.removeItem('admin_master_unlocked');
    setIsUnlocked(false);
    setAdminPin('');
  };

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/admin/data');
      setData(response);
      if (response.rooms && response.rooms.length > 0 && !selectedRoomId) {
        setSelectedRoomId(response.rooms[0].id);
      }
      if (response.users && response.users.length > 1 && !selectedDmUser1) {
        setSelectedDmUser1(response.users[0].id);
        setSelectedDmUser2(response.users[1].id);
      }
      if (response.adminSettings) {
        setSupportWhatsapp(response.adminSettings.whatsappNumber || '+91 9876543210');
        setSupportEmail(response.adminSettings.supportEmail || 'support@ajnabidil.com');
        setSupportHours(response.adminSettings.supportHours || '24x7 Live Customer Care');
        setSupportHelpText(response.adminSettings.helpText || '');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch admin dashboard logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      fetchAdminData();
    } else {
      setLoading(false);
    }
  }, [isUnlocked]);

  // User Actions: Coins, Ban, Partner, Delete
  const handleAdjustCoins = async (userId, change) => {
    const user = data?.users.find(u => u.id === userId);
    if (!user) return;
    const newCoins = Math.max(0, (user.coins || 0) + change);
    try {
      await apiRequest('/api/admin/users/update', 'POST', { userId, coins: newCoins });
      setData(prev => ({
        ...prev,
        users: prev.users.map(u => u.id === userId ? { ...u, coins: newCoins } : u)
      }));
      setCoinModalUser(null);
      setCoinAmountToAdd('');
    } catch (err) {
      alert(err.message || 'Failed to update coins');
    }
  };

  const handleCustomCoinSubmit = (e) => {
    e.preventDefault();
    if (!coinModalUser || !coinAmountToAdd) return;
    const amount = Number(coinAmountToAdd);
    if (isNaN(amount)) return;
    handleAdjustCoins(coinModalUser.id, amount);
  };

  const handleToggleBan = async (userId, currentBanned) => {
    const nextBanned = !currentBanned;
    if (!window.confirm(`Are you sure you want to ${nextBanned ? 'BAN' : 'UNBAN'} this user?`)) return;
    try {
      await apiRequest('/api/admin/users/update', 'POST', { userId, isBanned: nextBanned });
      setData(prev => ({
        ...prev,
        users: prev.users.map(u => u.id === userId ? { ...u, isBanned: nextBanned } : u)
      }));
      alert(`User account has been ${nextBanned ? 'BANNED' : 'UNBANNED'} successfully!`);
    } catch (err) {
      alert(err.message || 'Failed to update user ban status');
    }
  };

  const handleTogglePartner = async (userId, currentPartner) => {
    const nextPartner = !currentPartner;
    try {
      const res = await apiRequest('/api/admin/users/update', 'POST', { userId, isPartner: nextPartner });
      setData(prev => ({
        ...prev,
        users: prev.users.map(u => u.id === userId ? { ...u, isPartner: res.user.isPartner, partnerId: res.user.partnerId } : u)
      }));
      alert(`User Pro Host status ${nextPartner ? 'ACTIVATED' : 'REVOKED'}!`);
    } catch (err) {
      alert(err.message || 'Failed to update host partner status');
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`⚠️ PERMANENT DELETE: Are you sure you want to delete @${username}?`)) return;
    try {
      await apiRequest(`/api/admin/users/${userId}`, 'DELETE');
      setData(prev => ({
        ...prev,
        users: prev.users.filter(u => u.id !== userId)
      }));
      alert(`User @${username} deleted successfully!`);
    } catch (err) {
      alert(err.message || 'Failed to delete user');
    }
  };

  // KYC Verification Action
  const handleVerificationAction = async (userId, action) => {
    try {
      const response = await apiRequest('/api/admin/verifications/action', 'POST', { userId, action });
      setData(prev => ({
        ...prev,
        users: prev.users.map(u => 
          u.id === userId 
            ? { ...u, isPartner: response.isPartner, partnerId: response.partnerId, verificationStatus: response.verificationStatus } 
            : u
        )
      }));
      alert(`KYC Application successfully ${action === 'approve' ? 'APPROVED' : 'REJECTED'}!`);
    } catch (err) {
      alert(err.message || 'Action failed');
    }
  };

  // Recharge Action
  const handleRechargeAction = async (id, action) => {
    try {
      const response = await apiRequest('/api/admin/recharges/action', 'POST', { id, action });
      setData(prev => {
        const updatedRecharges = prev.recharges.map(r => r.id === id ? response.request : r);
        let updatedUsers = prev.users;
        if (action === 'approve') {
          updatedUsers = prev.users.map(u => 
            u.id === response.request.userId 
              ? { ...u, coins: (u.coins || 0) + response.request.coins } 
              : u
          );
        }
        return { ...prev, recharges: updatedRecharges, users: updatedUsers };
      });
      alert(`Recharge request ${action === 'approve' ? 'APPROVED & Coins Added' : 'REJECTED'}!`);
    } catch (err) {
      alert(err.message || 'Failed to update recharge request');
    }
  };

  // Withdrawal Action
  const handleWithdrawalAction = async (id, action) => {
    try {
      const response = await apiRequest('/api/admin/withdrawals/action', 'POST', { id, action });
      setData(prev => {
        const updatedWithdrawals = prev.withdrawals.map(w => w.id === id ? response.request : w);
        let updatedUsers = prev.users;
        if (action === 'reject') {
          updatedUsers = prev.users.map(u => 
            u.id === response.request.userId 
              ? { ...u, earnings: (u.earnings || 0) + response.request.coins } 
              : u
          );
        }
        return { ...prev, withdrawals: updatedWithdrawals, users: updatedUsers };
      });
      alert(`Withdrawal payout ${action === 'approve' ? 'MARKED AS COMPLETED' : 'REJECTED & Coins Refunded'}!`);
    } catch (err) {
      alert(err.message || 'Failed to update withdrawal request');
    }
  };

  // Support & QR Settings
  const handleSaveSupportSettings = async (e) => {
    e.preventDefault();
    setSavingSupport(true);
    setSupportSuccess(false);
    try {
      await apiRequest('/api/admin/settings', 'PUT', {
        whatsappNumber: supportWhatsapp,
        supportEmail,
        supportHours,
        helpText: supportHelpText
      });
      setSupportSuccess(true);
      setTimeout(() => setSupportSuccess(false), 3000);
      alert('Support and WhatsApp settings saved successfully!');
    } catch (err) {
      alert(err.message || 'Failed to save support settings');
    } finally {
      setSavingSupport(false);
    }
  };

  const handleQrUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setQrUploading(true);
    setQrSuccess(false);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const response = await apiRequest('/api/admin/qrcode', 'POST', {
          qrPhotoData: reader.result,
          qrPhotoName: file.name
        });
        setData(prev => ({
          ...prev,
          adminSettings: { ...prev.adminSettings, qrCodeUrl: response.qrCodeUrl }
        }));
        setQrSuccess(true);
        setTimeout(() => setQrSuccess(false), 3000);
        alert('Official Shop QR Code updated successfully!');
      } catch (err) {
        alert(err.message || 'Failed to upload QR Code');
      } finally {
        setQrUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Filtered users list
  const filteredUsers = (data?.users || []).filter(u => {
    const query = userSearch.toLowerCase().trim();
    if (!query) return true;
    return (
      (u.username || '').toLowerCase().includes(query) ||
      (u.mobile || '').includes(query) ||
      (u.id || '').toLowerCase().includes(query)
    );
  });

  // Pending counters
  const pendingKycCount = (data?.users || []).filter(u => u.verificationStatus === 'pending').length;
  const pendingRechargesCount = (data?.recharges || []).filter(r => r.status === 'pending').length;
  const pendingWithdrawalsCount = (data?.withdrawals || []).filter(w => w.status === 'pending').length;

  // Render Pin Lock Screen
  if (!isUnlocked) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-950 to-black rounded-3xl border border-pink-500/40 p-6 text-white shadow-2xl relative text-center">
          
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-600/30 border border-pink-400/30">
            <Lock size={32} className="text-white animate-pulse" />
          </div>

          <h2 className="text-xl font-black bg-gradient-to-r from-pink-200 via-rose-300 to-white bg-clip-text text-transparent">
            Master Admin Control
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Restricted Master Access. Please enter your secret Security PIN / Key.
          </p>

          <form onSubmit={handleUnlockAdmin} className="mt-6 space-y-3">
            <input 
              type="password"
              placeholder="Enter Master PIN (8009)"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-pink-500/40 text-center text-lg tracking-widest text-pink-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-500 font-mono"
              autoFocus
            />

            {pinError && (
              <p className="text-xs font-bold text-rose-400">{pinError}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-pink-600/30 active:scale-95 transition-all"
            >
              Verify & Unlock Control
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full py-2 text-xs text-slate-400 hover:text-white"
            >
              Return to User App
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col">
      {/* Master Top Cockpit Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex flex-wrap justify-between items-center gap-2 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-600 to-rose-500 flex items-center justify-center text-white font-black text-xs shadow-md">
            👑
          </div>
          <div>
            <h1 className="text-sm font-black text-white flex items-center gap-2">
              <span>Ajnabi Dil Master Control</span>
              <span className="text-[9px] bg-red-950 text-red-400 border border-red-500/40 px-2 py-0.5 rounded-full font-bold uppercase">
                Owner Only
              </span>
            </h1>
            <p className="text-[10px] text-slate-400">Total Users: {data?.users?.length || 0} • Live Streams: {data?.activeLiveStreamsCount || 0}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAdminData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
            title="Refresh Data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => navigate('/')}
            className="px-3 py-1.5 bg-pink-600/30 hover:bg-pink-600/50 text-pink-300 border border-pink-500/30 rounded-xl text-xs font-bold transition-all"
          >
            Open App
          </button>

          <button
            onClick={handleLockSession}
            className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/40 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
            title="Lock Admin Control"
          >
            <Lock size={13} />
            <span>Lock</span>
          </button>
        </div>
      </header>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-slate-900/40 border-b border-slate-800/80">
        <div 
          onClick={() => setActiveTab('users')} 
          className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 cursor-pointer hover:border-pink-500/40 transition-all"
        >
          <span className="text-[10px] text-slate-400 uppercase font-bold">Total Accounts</span>
          <p className="text-lg font-black text-white mt-0.5">{data?.users?.length || 0}</p>
        </div>

        <div 
          onClick={() => setActiveTab('verifications')} 
          className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 cursor-pointer hover:border-pink-500/40 transition-all"
        >
          <span className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-1">
            <span>Pending KYC</span>
            {pendingKycCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>}
          </span>
          <p className="text-lg font-black text-amber-300 mt-0.5">{pendingKycCount}</p>
        </div>

        <div 
          onClick={() => setActiveTab('recharges')} 
          className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 cursor-pointer hover:border-pink-500/40 transition-all"
        >
          <span className="text-[10px] text-emerald-400 uppercase font-bold flex items-center gap-1">
            <span>Recharge Requests</span>
            {pendingRechargesCount > 0 && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>}
          </span>
          <p className="text-lg font-black text-emerald-300 mt-0.5">{pendingRechargesCount}</p>
        </div>

        <div 
          onClick={() => setActiveTab('withdrawals')} 
          className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 cursor-pointer hover:border-pink-500/40 transition-all"
        >
          <span className="text-[10px] text-rose-400 uppercase font-bold flex items-center gap-1">
            <span>Pending Payouts</span>
            {pendingWithdrawalsCount > 0 && <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>}
          </span>
          <p className="text-lg font-black text-rose-300 mt-0.5">{pendingWithdrawalsCount}</p>
        </div>
      </div>

      {/* Master Tabs Navigation */}
      <div className="flex overflow-x-auto bg-slate-900/90 border-b border-slate-800 scrollbar-none px-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'users' ? 'border-pink-500 text-pink-400 bg-pink-950/20' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users size={15} />
          <span>User Manager</span>
        </button>

        <button
          onClick={() => setActiveTab('verifications')}
          className={`py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'verifications' ? 'border-amber-500 text-amber-400 bg-amber-950/20' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck size={15} />
          <span>Host KYC ({pendingKycCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('recharges')}
          className={`py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'recharges' ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <DollarSign size={15} />
          <span>Coin Recharges ({pendingRechargesCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'withdrawals' ? 'border-rose-500 text-rose-400 bg-rose-950/20' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database size={15} />
          <span>UPI Payouts ({pendingWithdrawalsCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'settings' ? 'border-sky-500 text-sky-400 bg-sky-950/20' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings size={15} />
          <span>Support & QR Setup</span>
        </button>

        <button
          onClick={() => setActiveTab('rooms')}
          className={`py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'rooms' ? 'border-purple-500 text-purple-400 bg-purple-950/20' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare size={15} />
          <span>Voice Rooms</span>
        </button>

        <button
          onClick={() => setActiveTab('dms')}
          className={`py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'dms' ? 'border-indigo-500 text-indigo-400 bg-indigo-950/20' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Mail size={15} />
          <span>1-on-1 Chats</span>
        </button>
      </div>

      {/* Main Tab View Area */}
      <main className="flex-1 p-4 max-w-6xl w-full mx-auto overflow-y-auto">
        
        {/* 1. USER MANAGER TAB */}
        {activeTab === 'users' && (
          <div className="flex flex-col gap-4">
            {/* Search and Filter Box */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-2 px-3">
              <Search size={18} className="text-slate-400" />
              <input 
                type="text"
                placeholder="Search users by username, phone number, or ID..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
              />
              {userSearch && (
                <button onClick={() => setUserSearch('')} className="text-slate-400 hover:text-white text-xs font-bold">
                  Clear
                </button>
              )}
            </div>

            {/* Users List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredUsers.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                  No users found matching "{userSearch}"
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <div 
                    key={u.id}
                    className={`bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-md ${
                      u.isBanned ? 'border-red-600/50 bg-red-950/20' : 'border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <img 
                          src={u.avatar || '/logo.jpg'} 
                          alt="Avatar" 
                          className="w-12 h-12 rounded-2xl object-cover bg-slate-800 border border-slate-700 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-sm font-black text-white">@{u.username}</h3>
                            {u.isPartner && (
                              <span className="text-[9px] bg-lime-950 text-lime-400 border border-lime-500/40 px-1.5 py-0.2 rounded font-bold uppercase">
                                PRO HOST
                              </span>
                            )}
                            {u.isBanned && (
                              <span className="text-[9px] bg-red-950 text-red-400 border border-red-500/40 px-1.5 py-0.2 rounded font-bold uppercase">
                                BANNED
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            📞 {u.mobile || 'No Mobile'} • ID: {u.id}
                          </p>
                        </div>
                      </div>

                      {/* Coins Badge */}
                      <button
                        onClick={() => setCoinModalUser(u)}
                        className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/40 text-amber-300 px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1 transition-all"
                        title="Click to add/deduct coins"
                      >
                        <span>🪙 {u.coins || 0}</span>
                      </button>
                    </div>

                    {/* KYC and Earnings summary */}
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 flex justify-between items-center text-xs">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Host Earnings</span>
                        <span className="font-extrabold text-emerald-400">🪙 {u.earnings || 0} Coins (₹{u.earnings || 0})</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">KYC Status</span>
                        <span className={`font-bold capitalize ${
                          u.verificationStatus === 'approved' ? 'text-emerald-400' :
                          u.verificationStatus === 'pending' ? 'text-amber-400' : 'text-slate-400'
                        }`}>
                          {u.verificationStatus || 'None'}
                        </span>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/60">
                      {/* Coins Edit Button */}
                      <button
                        onClick={() => setCoinModalUser(u)}
                        className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                      >
                        <Plus size={13} />
                        <span>Edit Coins</span>
                      </button>

                      {/* Pro Host Partner Toggle */}
                      <button
                        onClick={() => handleTogglePartner(u.id, u.isPartner)}
                        className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                          u.isPartner 
                            ? 'bg-lime-950/60 text-lime-400 border border-lime-500/30' 
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        <UserCheck size={13} />
                        <span>{u.isPartner ? 'Host: Yes' : 'Make Host'}</span>
                      </button>

                      {/* Ban / Unban Toggle */}
                      <button
                        onClick={() => handleToggleBan(u.id, u.isBanned)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                          u.isBanned 
                            ? 'bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40' 
                            : 'bg-red-950/60 hover:bg-red-950 text-red-400 border border-red-500/30'
                        }`}
                      >
                        <Ban size={13} />
                        <span>{u.isBanned ? 'Unban' : 'Ban'}</span>
                      </button>

                      {/* Delete User */}
                      <button
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        className="p-1.5 bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-300 rounded-xl transition-colors"
                        title="Delete User"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 2. KYC VERIFICATIONS TAB */}
        {activeTab === 'verifications' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xs font-black uppercase text-amber-400 tracking-wider">
              Pending Host Partner KYC Applications ({pendingKycCount})
            </h2>

            {pendingKycCount === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                No pending KYC applications at this time.
              </div>
            ) : (
              data?.users.filter(u => u.verificationStatus === 'pending').map((u) => (
                <div 
                  key={u.id}
                  className="bg-slate-900 border border-amber-500/30 rounded-3xl p-5 shadow-xl flex flex-col gap-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <img src={u.avatar || '/logo.jpg'} alt="Avatar" className="w-12 h-12 rounded-2xl object-cover bg-slate-800" />
                      <div>
                        <h3 className="text-sm font-black text-white">@{u.username}</h3>
                        <p className="text-[11px] text-amber-400 font-semibold">Applying for 70% Revenue Share Host Partner</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-full font-bold uppercase">
                      Pending Review
                    </span>
                  </div>

                  {/* KYC Submitted Details */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400">Mobile / WhatsApp:</span>
                        <p className="text-white font-mono font-bold">{u.verificationDetails?.mobile || u.mobile || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Email:</span>
                        <p className="text-white font-bold">{u.verificationDetails?.email || u.email || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">ID Type & Number:</span>
                        <p className="text-pink-300 font-mono font-bold">
                          {u.verificationDetails?.idDocType || 'Aadhaar'}: {u.verificationDetails?.idDocNumber || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">PAN Number:</span>
                        <p className="text-amber-300 font-mono font-bold">{u.verificationDetails?.panNumber || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Photos Preview */}
                    <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* ID Photo */}
                      {u.verificationDetails?.idDocUrl && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] text-slate-400 uppercase font-bold">1. Primary ID Photo</span>
                          <img 
                            src={u.verificationDetails.idDocUrl.startsWith('http') ? u.verificationDetails.idDocUrl : `http://localhost:5000${u.verificationDetails.idDocUrl}`}
                            alt="ID Document"
                            onClick={() => setKycPreviewUrl(u.verificationDetails.idDocUrl)}
                            className="w-full h-32 object-cover rounded-xl border border-slate-700 cursor-pointer hover:opacity-90"
                          />
                        </div>
                      )}

                      {/* PAN Photo */}
                      {u.verificationDetails?.panDocUrl && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] text-slate-400 uppercase font-bold">2. PAN Card Photo</span>
                          <img 
                            src={u.verificationDetails.panDocUrl.startsWith('http') ? u.verificationDetails.panDocUrl : `http://localhost:5000${u.verificationDetails.panDocUrl}`}
                            alt="PAN Card"
                            onClick={() => setKycPreviewUrl(u.verificationDetails.panDocUrl)}
                            className="w-full h-32 object-cover rounded-xl border border-slate-700 cursor-pointer hover:opacity-90"
                          />
                        </div>
                      )}

                      {/* Live Selfie */}
                      {u.verificationDetails?.liveSelfieUrl && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] text-slate-400 uppercase font-bold">3. Live Selfie (Face)</span>
                          <img 
                            src={u.verificationDetails.liveSelfieUrl.startsWith('http') ? u.verificationDetails.liveSelfieUrl : `http://localhost:5000${u.verificationDetails.liveSelfieUrl}`}
                            alt="Live Selfie"
                            onClick={() => setKycPreviewUrl(u.verificationDetails.liveSelfieUrl)}
                            className="w-full h-32 object-cover rounded-xl border border-slate-700 cursor-pointer hover:opacity-90"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleVerificationAction(u.id, 'reject')}
                      className="flex-1 py-2.5 bg-red-950/60 hover:bg-red-900/60 border border-red-500/30 text-red-300 rounded-xl text-xs font-black transition-all"
                    >
                      Reject Application
                    </button>
                    <button
                      onClick={() => handleVerificationAction(u.id, 'approve')}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-900/30 transition-all"
                    >
                      Approve & Grant 70% Share Partner ID
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 3. RECHARGES APPROVAL TAB */}
        {activeTab === 'recharges' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xs font-black uppercase text-emerald-400 tracking-wider">
              Pending Coin Recharge Requests ({pendingRechargesCount})
            </h2>

            {pendingRechargesCount === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                No pending coin recharge requests at this time.
              </div>
            ) : (
              data?.recharges.filter(r => r.status === 'pending').map((req) => (
                <div 
                  key={req.id}
                  className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-lg flex flex-col gap-3"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-black text-white">@{req.username}</h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        UTR / Transaction ID: <span className="text-amber-300 font-bold select-all">{req.transactionId}</span>
                      </p>
                    </div>
                    <span className="text-sm font-black text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 rounded-xl">
                      ₹{req.amount}
                    </span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex justify-between items-center text-xs">
                    <span className="text-slate-400">Coins to Credit:</span>
                    <span className="font-black text-amber-300 text-sm">🪙 {req.coins} Coins</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRechargeAction(req.id, 'reject')}
                      className="flex-1 py-2 bg-red-950/60 hover:bg-red-900/60 border border-red-500/30 text-red-300 rounded-xl text-xs font-black transition-all"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleRechargeAction(req.id, 'approve')}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md transition-all"
                    >
                      Approve & Credit Coins
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 4. WITHDRAWALS APPROVAL TAB */}
        {activeTab === 'withdrawals' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xs font-black uppercase text-rose-400 tracking-wider">
              Pending Host Payout Requests ({pendingWithdrawalsCount})
            </h2>

            {pendingWithdrawalsCount === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                No pending withdrawal requests at this time.
              </div>
            ) : (
              data?.withdrawals.filter(w => w.status === 'pending').map((wdr) => (
                <div 
                  key={wdr.id}
                  className="bg-slate-900 border border-rose-500/30 rounded-2xl p-4 shadow-lg flex flex-col gap-3"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-black text-white">@{wdr.username}</h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        UPI ID: <span className="text-rose-300 font-bold select-all">{wdr.upiId}</span>
                      </p>
                    </div>
                    <span className="text-sm font-black text-rose-400 bg-rose-950/60 border border-rose-500/40 px-3 py-1 rounded-xl">
                      ₹{wdr.coins} Payout
                    </span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex justify-between items-center text-xs">
                    <span className="text-slate-400">Withdrawal Coins Deducted:</span>
                    <span className="font-black text-rose-300 text-sm">🪙 {wdr.coins} Coins</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleWithdrawalAction(wdr.id, 'reject')}
                      className="flex-1 py-2 bg-red-950/60 hover:bg-red-900/60 border border-red-500/30 text-red-300 rounded-xl text-xs font-black transition-all"
                    >
                      Reject & Refund Coins
                    </button>
                    <button
                      onClick={() => handleWithdrawalAction(wdr.id, 'approve')}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md transition-all"
                    >
                      Mark as Transferred / Paid
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 5. SUPPORT & PAYMENT QR SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* WhatsApp Support Configuration */}
            <form onSubmit={handleSaveSupportSettings} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3 shadow-lg">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <span>Help Desk & WhatsApp Setup</span>
              </h3>
              <p className="text-[11px] text-slate-400">Users reach this number for 24/7 Recharge and Host Support</p>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Official WhatsApp Number</label>
                <input 
                  type="text"
                  required
                  value={supportWhatsapp}
                  onChange={(e) => setSupportWhatsapp(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-white font-mono text-xs outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Support Email</label>
                <input 
                  type="email"
                  required
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="support@ajnabidil.com"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-white text-xs outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Operating Hours</label>
                <input 
                  type="text"
                  value={supportHours}
                  onChange={(e) => setSupportHours(e.target.value)}
                  placeholder="24x7 Live Customer Care"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-white text-xs outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Help Desk Notice</label>
                <textarea 
                  rows={2}
                  value={supportHelpText}
                  onChange={(e) => setSupportHelpText(e.target.value)}
                  placeholder="Official Ajnabi Dil Help Desk for Coin Recharges..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-white text-xs outline-none resize-none"
                />
              </div>

              {supportSuccess && (
                <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs p-2 rounded-xl text-center font-bold">
                  Settings saved successfully!
                </div>
              )}

              <button
                type="submit"
                disabled={savingSupport}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md active:scale-95 transition-all mt-2"
              >
                {savingSupport ? 'Saving...' : 'Save Support Settings'}
              </button>
            </form>

            {/* Payment Scanner QR Configuration */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3 shadow-lg text-center">
              <h3 className="text-sm font-black text-white">Payment Scanner QR Code</h3>
              <p className="text-[11px] text-slate-400">This QR is shown to users during PhonePe / GPay coin recharges</p>

              <div className="w-44 h-44 mx-auto my-2 p-2 bg-white rounded-2xl border-2 border-pink-400 shadow-md flex items-center justify-center">
                <img 
                  src={data?.adminSettings?.qrCodeUrl ? (data.adminSettings.qrCodeUrl.startsWith('http') ? data.adminSettings.qrCodeUrl : `http://localhost:5000${data.adminSettings.qrCodeUrl}`) : '/logo.jpg'}
                  alt="Shop QR Code"
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>

              <div className="flex flex-col gap-1 text-left">
                <label className="text-[10px] uppercase font-bold text-slate-400">Upload New QR Scanner Image</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleQrUpload}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-300"
                />
              </div>

              {qrUploading && (
                <div className="text-xs text-amber-300 font-bold animate-pulse">
                  Uploading QR scanner image...
                </div>
              )}

              {qrSuccess && (
                <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs p-2 rounded-xl font-bold">
                  QR Code updated!
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. ROOMS TAB */}
        {activeTab === 'rooms' && (
          <div className="flex flex-col gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400">Select Room</label>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none"
              >
                {data?.rooms?.map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({r.isPrivate ? 'Private' : 'Public'})</option>
                ))}
              </select>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2 min-h-[300px]">
              {(data?.roomMessages || []).filter(m => m.roomId === selectedRoomId).map(msg => (
                <div key={msg.id} className="border-b border-slate-800 pb-2">
                  <span className="font-bold text-xs text-pink-400">@{msg.senderName}:</span>
                  <span className="text-xs text-slate-200 ml-2">{msg.content}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. DMs TAB */}
        {activeTab === 'dms' && (
          <div className="flex flex-col gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400">User 1</label>
                <select
                  value={selectedDmUser1}
                  onChange={(e) => setSelectedDmUser1(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none"
                >
                  {data?.users?.map(u => (
                    <option key={u.id} value={u.id}>@{u.username}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400">User 2</label>
                <select
                  value={selectedDmUser2}
                  onChange={(e) => setSelectedDmUser2(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none"
                >
                  {data?.users?.map(u => (
                    <option key={u.id} value={u.id}>@{u.username}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2 min-h-[300px]">
              {(data?.dms || []).filter(m => 
                (m.senderId === selectedDmUser1 && m.receiverId === selectedDmUser2) ||
                (m.senderId === selectedDmUser2 && m.receiverId === selectedDmUser1)
              ).map(msg => (
                <div key={msg.id} className="border-b border-slate-800 pb-2 text-xs">
                  <span className="font-bold text-pink-400">@{msg.senderName}:</span>
                  <span className="text-slate-200 ml-2">{msg.content}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* COIN ADJUSTMENT MODAL */}
      {coinModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl border border-amber-500/40 p-5 text-white shadow-2xl">
            <h3 className="text-base font-black text-amber-300">
              Adjust Coins for @{coinModalUser.username}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Current Balance: 🪙 {coinModalUser.coins || 0} Coins</p>

            {/* Quick Add Presets */}
            <div className="grid grid-cols-4 gap-2 my-4">
              {[+100, +500, +1000, +5000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleAdjustCoins(coinModalUser.id, amt)}
                  className="py-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 rounded-xl text-xs font-black border border-slate-700 transition-all"
                >
                  +{amt}
                </button>
              ))}
            </div>

            {/* Quick Deduct Presets */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[-100, -500, -1000, -5000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleAdjustCoins(coinModalUser.id, amt)}
                  className="py-2 bg-slate-800 hover:bg-rose-500 hover:text-white rounded-xl text-xs font-black border border-slate-700 transition-all"
                >
                  {amt}
                </button>
              ))}
            </div>

            {/* Custom Amount Form */}
            <form onSubmit={handleCustomCoinSubmit} className="space-y-3">
              <input 
                type="number"
                placeholder="Enter custom amount (+ or -)"
                value={coinAmountToAdd}
                onChange={(e) => setCoinAmountToAdd(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none font-mono"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCoinModalUser(null)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-md"
                >
                  Apply Change
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KYC PHOTO ZOOM MODAL */}
      {kycPreviewUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer"
          onClick={() => setKycPreviewUrl(null)}
        >
          <div className="max-w-xl max-h-[85vh] bg-slate-900 p-2 rounded-3xl border border-pink-500/40 shadow-2xl relative">
            <img 
              src={kycPreviewUrl.startsWith('http') ? kycPreviewUrl : `http://localhost:5000${kycPreviewUrl}`} 
              alt="KYC Proof Zoom"
              className="max-h-[75vh] w-auto object-contain rounded-2xl mx-auto"
            />
            <p className="text-center text-xs text-slate-400 mt-2 font-bold">Click anywhere to close preview</p>
          </div>
        </div>
      )}

    </div>
  );
}
