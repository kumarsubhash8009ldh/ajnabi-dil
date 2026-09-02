import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, ShieldAlert, MessageSquare, ShieldCheck, Mail, Database, HelpCircle, CheckCircle, XCircle, Settings, Upload, Image } from 'lucide-react';
import { apiRequest, getStoredUser } from '../utils/api';
import MobileLayout from '../components/MobileLayout';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'rooms', 'dms', 'verifications'

  // DM Selection state
  const [selectedDmUser1, setSelectedDmUser1] = useState('');
  const [selectedDmUser2, setSelectedDmUser2] = useState('');

  // Room Selection state
  const [selectedRoomId, setSelectedRoomId] = useState('');

  const [adminPin, setAdminPin] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return sessionStorage.getItem('admin_master_unlocked') === 'true';
  });
  const [pinError, setPinError] = useState('');

  const handleUnlockAdmin = (e) => {
    e.preventDefault();
    if (adminPin === '8009' || adminPin === 'admin8009' || adminPin === 'admin@123') {
      sessionStorage.setItem('admin_master_unlocked', 'true');
      setIsUnlocked(true);
      setPinError('');
    } else {
      setPinError('Invalid Admin Master Security Key / PIN');
    }
  };

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const response = await apiRequest('/api/admin/data');
        setData(response);
        if (response.rooms && response.rooms.length > 0) {
          setSelectedRoomId(response.rooms[0].id);
        }
        if (response.users && response.users.length > 1) {
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

    if (isUnlocked) {
      fetchAdminData();
    } else {
      setLoading(false);
    }
  }, [navigate, isUnlocked]);

  const [supportWhatsapp, setSupportWhatsapp] = useState('+91 9876543210');
  const [supportEmail, setSupportEmail] = useState('support@ajnabidil.com');
  const [supportHours, setSupportHours] = useState('24x7 Live Customer Care');
  const [supportHelpText, setSupportHelpText] = useState('');
  const [savingSupport, setSavingSupport] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState(false);

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
      alert('Official Help Desk WhatsApp & Support Settings saved successfully!');
    } catch (err) {
      alert(err.message || 'Failed to save support settings');
    } finally {
      setSavingSupport(false);
    }
  };

  const handleVerificationAction = async (userId, action) => {
    try {
      const response = await apiRequest('/api/admin/verifications/action', 'POST', { userId, action });
      
      // Update local data state
      setData(prev => {
        const updatedUsers = prev.users.map(u => 
          u.id === userId 
            ? { 
                ...u, 
                isPartner: response.isPartner, 
                partnerId: response.partnerId, 
                verificationStatus: response.verificationStatus 
              } 
            : u
        );
        return {
          ...prev,
          users: updatedUsers
        };
      });
      alert(`Account successfully ${action === 'approve' ? 'Approved' : 'Rejected'}!`);
    } catch (err) {
      alert(err.message || 'Action failed');
    }
  };

  const [qrUploading, setQrUploading] = useState(false);
  const [qrSuccess, setQrSuccess] = useState(false);

  const handleRechargeAction = async (id, action) => {
    try {
      const response = await apiRequest('/api/admin/recharges/action', 'POST', { id, action });
      
      // Update local state
      setData(prev => {
        const updatedRecharges = prev.recharges.map(r => 
          r.id === id ? response.request : r
        );
        // Also update the target user's coins dynamically if approved
        let updatedUsers = prev.users;
        if (action === 'approve') {
          updatedUsers = prev.users.map(u => 
            u.id === response.request.userId 
              ? { ...u, coins: (u.coins || 0) + response.request.coins }
              : u
          );
        }
        return {
          ...prev,
          recharges: updatedRecharges,
          users: updatedUsers
        };
      });
      alert(`Recharge request ${action === 'approve' ? 'Approved' : 'Rejected'} successfully!`);
    } catch (err) {
      alert(err.message || 'Failed to update recharge request');
    }
  };

  const handleWithdrawalAction = async (id, action) => {
    try {
      const response = await apiRequest('/api/admin/withdrawals/action', 'POST', { id, action });
      
      // Update local state
      setData(prev => {
        const updatedWithdrawals = prev.withdrawals.map(w => 
          w.id === id ? response.request : w
        );
        // If rejected, refund the host earnings balance dynamically in the list
        let updatedUsers = prev.users;
        if (action === 'reject') {
          updatedUsers = prev.users.map(u => 
            u.id === response.request.userId 
              ? { ...u, earnings: (u.earnings || 0) + response.request.coins }
              : u
          );
        }
        return {
          ...prev,
          withdrawals: updatedWithdrawals,
          users: updatedUsers
        };
      });
      alert(`Withdrawal request ${action === 'approve' ? 'Approved' : 'Rejected'} successfully!`);
    } catch (err) {
      alert(err.message || 'Failed to update withdrawal request');
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
        const base64Data = reader.result;
        const response = await apiRequest('/api/admin/qrcode', 'POST', {
          qrPhotoData: base64Data,
          qrPhotoName: file.name
        });
        
        setData(prev => ({
          ...prev,
          adminSettings: { ...prev.adminSettings, qrCodeUrl: response.qrCodeUrl }
        }));
        setQrSuccess(true);
        setTimeout(() => setQrSuccess(false), 3000);
      } catch (err) {
        alert(err.message || 'Failed to upload QR Code');
      } finally {
        setQrUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (!isUnlocked) {
    return (
      <MobileLayout title="Master Control">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-white text-center">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-pink-600 to-rose-500 flex items-center justify-center shadow-xl shadow-pink-600/30 mb-4 border border-pink-400/40 animate-pulse">
            <ShieldAlert size={32} className="text-white" />
          </div>
          <h2 className="text-xl font-black bg-gradient-to-r from-pink-200 to-white bg-clip-text text-transparent">
            Admin Master Portal
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Restricted access. Please enter your secret Master Admin Security Key / PIN.
          </p>

          <form onSubmit={handleUnlockAdmin} className="w-full max-w-xs mt-6 space-y-3">
            <input 
              type="password"
              placeholder="Enter Master PIN (8009)"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-pink-500/40 text-center text-lg tracking-widest text-pink-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-500"
              autoFocus
            />
            {pinError && (
              <p className="text-xs font-bold text-rose-400">{pinError}</p>
            )}
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 font-bold text-sm rounded-2xl shadow-lg shadow-pink-600/30 active:scale-95 transition-all"
            >
              Verify & Unlock Control
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full py-2.5 text-xs text-slate-400 hover:text-white"
            >
              Back to Home
            </button>
          </form>
        </div>
      </MobileLayout>
    );
  }

  if (loading) {
    return (
      <MobileLayout title="Admin Control">
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2"></div>
          <span className="text-xs">Fetching logs...</span>
        </div>
      </MobileLayout>
    );
  }

  if (error) {
    return (
      <MobileLayout title="Admin Control">
        <div className="p-6 text-center text-red-500 text-xs flex flex-col items-center gap-2">
          <ShieldAlert size={36} />
          <span>{error}</span>
          <button 
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
          >
            Go Back Home
          </button>
        </div>
      </MobileLayout>
    );
  }

  // Filter DMs between selected users
  const getFilteredDMs = () => {
    if (!data || !selectedDmUser1 || !selectedDmUser2) return [];
    return data.dms.filter(
      (m) =>
        (m.senderId === selectedDmUser1 && m.receiverId === selectedDmUser2) ||
        (m.senderId === selectedDmUser2 && m.receiverId === selectedDmUser1)
    );
  };

  // Get Room chats
  const getRoomChats = () => {
    if (!data || !selectedRoomId) return [];
    return data.roomMessages.filter((m) => m.roomId === selectedRoomId);
  };

  const getUsernameById = (id) => {
    const u = data?.users.find((u) => u.id === id);
    return u ? `@${u.username}` : 'System/Deleted';
  };

  const renderMediaBubble = (msg) => {
    const fileUrl = msg.fileUrl 
      ? (msg.fileUrl.startsWith('http') ? msg.fileUrl : `http://localhost:5000${msg.fileUrl}`)
      : '';
      
    if (msg.mediaType === 'image') {
      return (
        <img 
          src={fileUrl} 
          alt="Admin View Photo" 
          className="max-w-[120px] rounded-lg mt-1 border border-slate-200"
        />
      );
    }
    if (msg.mediaType === 'audio') {
      return (
        <audio src={fileUrl} controls className="max-w-[150px] mt-1 scale-90 origin-left" />
      );
    }
    if (msg.mediaType === 'video') {
      return (
        <video src={fileUrl} controls className="max-w-[120px] rounded-lg mt-1" />
      );
    }
    return null;
  };

  return (
    <MobileLayout title="Admin Panel">
      <div className="flex-grow flex flex-col h-full bg-slate-50 relative min-h-0">
        
        {/* Admin Welcome Title Bar */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-green-400" />
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-slate-300">
              System Audit Dashboard
            </span>
          </div>
          <span className="text-[8px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold">
            Total Users: {data?.users.length}
          </span>
        </div>

        {/* Audit Tab buttons selector */}
        <div className="flex border-b border-slate-200 bg-white">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-3 text-[10px] uppercase tracking-wider font-extrabold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'users'
                ? 'border-primary-600 text-primary-600 bg-primary-50/20'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Users size={12} />
            <span>Users</span>
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex-1 py-3 text-[10px] uppercase tracking-wider font-extrabold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'rooms'
                ? 'border-primary-600 text-primary-600 bg-primary-50/20'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <MessageSquare size={12} />
            <span>Groups</span>
          </button>
          <button
            onClick={() => setActiveTab('dms')}
            className={`flex-1 py-3 text-[10px] uppercase tracking-wider font-extrabold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'dms'
                ? 'border-primary-600 text-primary-600 bg-primary-50/20'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Mail size={12} />
            <span>1-on-1 DMs</span>
          </button>
          <button
            onClick={() => setActiveTab('verifications')}
            className={`flex-1 py-3 text-[10px] uppercase tracking-wider font-extrabold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'verifications'
                ? 'border-primary-600 text-primary-600 bg-primary-50/20'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <ShieldCheck size={12} />
            <span>Staff Apply</span>
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 py-3 text-[10px] uppercase tracking-wider font-extrabold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'transactions'
                ? 'border-primary-600 text-primary-600 bg-primary-50/20'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Database size={12} />
            <span>Payments</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-3 text-[10px] uppercase tracking-wider font-extrabold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'settings'
                ? 'border-primary-600 text-primary-600 bg-primary-50/20'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Settings size={12} />
            <span>QR Config</span>
          </button>
        </div>

        {/* Tab Contents Area */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0 flex flex-col">
          
          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div className="flex flex-col gap-3 flex-1">
              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 pl-0.5">
                Registered Database Accounts
              </span>
              
              <div className="flex flex-col gap-2.5">
                {data?.users.map((u) => (
                  <div 
                    key={u.id} 
                    className="bg-white border border-slate-200 rounded-3xl p-3.5 shadow-sm flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={u.avatar} 
                        alt="Avatar" 
                        className="w-10 h-10 bg-slate-100 rounded-xl object-cover"
                      />
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-xs">
                          @{u.username} {u.isAdmin && <span className="text-[8px] bg-red-100 text-red-700 px-1 py-0.2 rounded font-bold uppercase ml-1">Admin</span>}
                        </h4>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">ID: {u.id}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                      <span className="text-[10px] font-bold text-slate-700">🪙 {u.coins} Coins</span>
                      <span className="text-[8px] text-slate-400 font-bold uppercase">Rate: {u.callRate}c/10s</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GROUP ROOMS TAB */}
          {activeTab === 'rooms' && (
            <div className="flex flex-col gap-3 flex-1 min-h-0">
              {/* Dropdown selectors */}
              <div className="bg-white border border-slate-200 rounded-3xl p-3 shadow-sm flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase pl-0.5">Select Group Chat Room</label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none"
                >
                  {data?.rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.isPrivate ? '🔑 Private' : '🌎 Public'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Chat Log Output */}
              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 pl-0.5 mt-1">
                Room Messages Log
              </span>
              
              <div className="flex-1 overflow-y-auto bg-white border border-slate-200 rounded-3xl p-4 min-h-[250px] shadow-inner flex flex-col gap-3">
                {getRoomChats().length === 0 ? (
                  <div className="flex-grow flex items-center justify-center text-slate-400 text-xs py-10 font-medium">
                    No logs found for this group
                  </div>
                ) : (
                  getRoomChats().map((msg) => (
                    <div key={msg.id} className="border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="font-extrabold text-[10px] text-primary-600">@{msg.senderName}</span>
                        <span className="text-[8px] text-slate-400 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <div className="text-xs text-slate-800 pl-0.5">
                        {msg.deleted ? (
                          <span className="italic text-slate-400 font-semibold">{msg.content}</span>
                        ) : (
                          <>
                            {renderMediaBubble(msg)}
                            {msg.content && <p className="mt-1 font-medium">{msg.content}</p>}
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* DMs TAB */}
          {activeTab === 'dms' && (
            <div className="flex flex-col gap-3 flex-1 min-h-0">
              
              {/* Dual dropdown selections */}
              <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex flex-col gap-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase pl-0.5">Select Chat Partners</span>
                
                <div className="flex gap-2">
                  <div className="flex-1 flex flex-col gap-1">
                    <label className="text-[8px] font-extrabold text-slate-400 uppercase pl-0.5">User 1</label>
                    <select
                      value={selectedDmUser1}
                      onChange={(e) => setSelectedDmUser1(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-semibold text-slate-800 focus:outline-none"
                    >
                      {data?.users.map((u) => (
                        <option key={u.id} value={u.id}>@{u.username}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-1">
                    <label className="text-[8px] font-extrabold text-slate-400 uppercase pl-0.5">User 2</label>
                    <select
                      value={selectedDmUser2}
                      onChange={(e) => setSelectedDmUser2(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-semibold text-slate-800 focus:outline-none"
                    >
                      {data?.users.map((u) => (
                        <option key={u.id} value={u.id}>@{u.username}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Chat Log Output */}
              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 pl-0.5 mt-1">
                Private Chat Logs
              </span>
              
              <div className="flex-1 overflow-y-auto bg-white border border-slate-200 rounded-3xl p-4 min-h-[250px] shadow-inner flex flex-col gap-3">
                {selectedDmUser1 === selectedDmUser2 ? (
                  <div className="flex-grow flex items-center justify-center text-slate-400 text-xs py-10 font-medium px-4 text-center">
                    Please select two different users to view their private chat transcript.
                  </div>
                ) : getFilteredDMs().length === 0 ? (
                  <div className="flex-grow flex items-center justify-center text-slate-400 text-xs py-10 font-medium px-4 text-center">
                    No DMs found between {getUsernameById(selectedDmUser1)} and {getUsernameById(selectedDmUser2)}
                  </div>
                ) : (
                  getFilteredDMs().map((msg) => (
                    <div key={msg.id} className="border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="font-extrabold text-[10px] text-primary-600">
                          {getUsernameById(msg.senderId)} ➡️ {getUsernameById(msg.receiverId)}
                        </span>
                        <span className="text-[8px] text-slate-400 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <div className="text-xs text-slate-800 pl-0.5">
                        {msg.deleted ? (
                          <span className="italic text-slate-400 font-semibold">{msg.content}</span>
                        ) : (
                          <>
                            {renderMediaBubble(msg)}
                            {msg.content && <p className="mt-1 font-medium">{msg.content}</p>}
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* STAFF VERIFICATIONS TAB */}
          {activeTab === 'verifications' && (
            <div className="flex flex-col gap-3 flex-1 min-h-0">
              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 pl-0.5">
                Pending Staff Verification Requests
              </span>

              <div className="flex-1 overflow-y-auto flex flex-col gap-3">
                {data?.users.filter(u => u.verificationStatus === 'pending').length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-400 text-xs py-16 font-medium">
                    No pending partner host applications at this moment.
                  </div>
                ) : (
                  data?.users
                    .filter(u => u.verificationStatus === 'pending')
                    .map((u) => (
                      <div 
                        key={u.id} 
                        className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex flex-col gap-3.5"
                      >
                        <div className="flex items-center gap-3">
                          <img 
                            src={u.avatar} 
                            alt="Avatar" 
                            className="w-10 h-10 bg-slate-100 rounded-xl object-cover"
                          />
                          <div>
                            <h4 className="font-extrabold text-slate-800 text-xs">@{u.username}</h4>
                            <p className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400 mt-0.5">
                              Applying for Partner Host Staff
                            </p>
                          </div>
                        </div>

                        {/* Document details box */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-slate-700 flex flex-col gap-3">
                          
                          {/* Confidentiality Notice */}
                          <div className="bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1 text-[9px] font-bold text-amber-800 flex items-center gap-1">
                            <span>🔒 Confidential Data: Only visible to Platform Admin</span>
                          </div>

                          {/* Contact Info */}
                          <div className="flex flex-col gap-1 border-b border-slate-200 pb-2">
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase">Contact Information</span>
                            <div className="flex justify-between text-[11px] font-bold">
                              <span className="text-slate-500">Mobile:</span>
                              <span className="text-slate-800 font-mono">{u.verificationDetails?.mobile || u.mobile || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between text-[11px] font-bold">
                              <span className="text-slate-500">Email:</span>
                              <span className="text-slate-800">{u.verificationDetails?.email || u.email || 'N/A'}</span>
                            </div>
                          </div>

                          {/* Primary ID Proof */}
                          <div className="flex flex-col gap-1.5 border-b border-slate-200 pb-2.5">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span className="text-slate-500">ID Type:</span>
                              <span className="text-primary-700">{u.verificationDetails?.idDocType || u.verificationDetails?.docType || 'Aadhaar Card'}</span>
                            </div>
                            <div className="flex justify-between text-[11px] font-bold">
                              <span className="text-slate-500">ID Number:</span>
                              <span className="text-slate-800 font-mono">{u.verificationDetails?.idDocNumber || u.verificationDetails?.docNumber || 'N/A'}</span>
                            </div>
                            
                            {(u.verificationDetails?.idDocUrl || u.verificationDetails?.docPhotoUrl) && (
                              <div className="mt-1">
                                <span className="text-[8px] uppercase font-bold text-slate-400 block mb-1">Attached ID Proof Photo:</span>
                                <a 
                                  href={(u.verificationDetails?.idDocUrl || u.verificationDetails?.docPhotoUrl).startsWith('http') ? (u.verificationDetails?.idDocUrl || u.verificationDetails?.docPhotoUrl) : `http://localhost:5000${u.verificationDetails?.idDocUrl || u.verificationDetails?.docPhotoUrl}`} 
                                  target="_blank" 
                                  rel="noreferrer"
                                >
                                  <img 
                                    src={(u.verificationDetails?.idDocUrl || u.verificationDetails?.docPhotoUrl).startsWith('http') ? (u.verificationDetails?.idDocUrl || u.verificationDetails?.docPhotoUrl) : `http://localhost:5000${u.verificationDetails?.idDocUrl || u.verificationDetails?.docPhotoUrl}`} 
                                    alt="ID Proof Photo" 
                                    className="max-w-[220px] max-h-[140px] object-cover rounded-xl border border-slate-300 shadow-sm hover:opacity-90 transition-opacity"
                                  />
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Mandatory PAN Card */}
                          <div className="flex flex-col gap-1.5 border-b border-slate-200 pb-2.5">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span className="text-slate-500">PAN Number (Must):</span>
                              <span className="text-pink-700 font-mono font-extrabold">{u.verificationDetails?.panNumber || 'N/A'}</span>
                            </div>

                            {u.verificationDetails?.panDocUrl && (
                              <div className="mt-1">
                                <span className="text-[8px] uppercase font-bold text-slate-400 block mb-1">Attached PAN Card Photo:</span>
                                <a 
                                  href={u.verificationDetails.panDocUrl.startsWith('http') ? u.verificationDetails.panDocUrl : `http://localhost:5000${u.verificationDetails.panDocUrl}`} 
                                  target="_blank" 
                                  rel="noreferrer"
                                >
                                  <img 
                                    src={u.verificationDetails.panDocUrl.startsWith('http') ? u.verificationDetails.panDocUrl : `http://localhost:5000${u.verificationDetails.panDocUrl}`} 
                                    alt="PAN Card Photo" 
                                    className="max-w-[220px] max-h-[140px] object-cover rounded-xl border border-slate-300 shadow-sm hover:opacity-90 transition-opacity"
                                  />
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Mandatory Live Selfie */}
                          {u.verificationDetails?.liveSelfieUrl && (
                            <div className="flex flex-col gap-1">
                              <span className="text-[8px] uppercase font-bold text-slate-400 block">Live Selfie (Face Verification):</span>
                              <a 
                                href={u.verificationDetails.liveSelfieUrl.startsWith('http') ? u.verificationDetails.liveSelfieUrl : `http://localhost:5000${u.verificationDetails.liveSelfieUrl}`} 
                                target="_blank" 
                                rel="noreferrer"
                              >
                                <img 
                                  src={u.verificationDetails.liveSelfieUrl.startsWith('http') ? u.verificationDetails.liveSelfieUrl : `http://localhost:5000${u.verificationDetails.liveSelfieUrl}`} 
                                  alt="Live Selfie" 
                                  className="w-24 h-24 object-cover rounded-2xl border border-slate-300 shadow-sm hover:opacity-90 transition-opacity"
                                />
                              </a>
                            </div>
                          )}

                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2.5">
                          <button
                            onClick={() => handleVerificationAction(u.id, 'reject')}
                            className="flex-1 py-2.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-2xl text-[10px] font-extrabold uppercase transition-colors"
                          >
                            Reject Application
                          </button>
                          <button
                            onClick={() => handleVerificationAction(u.id, 'approve')}
                            className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-2xl text-[10px] font-extrabold uppercase shadow transition-colors"
                          >
                            Approve & Verify
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {/* TRANSACTIONS / PAYMENTS TAB */}
          {activeTab === 'transactions' && (
            <div className="flex flex-col gap-5 flex-1 min-h-0">
              
              {/* RECHARGE REQUESTS */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 pl-0.5">
                  Pending Coin Recharge Requests (UPI scan proof)
                </span>

                <div className="flex flex-col gap-3">
                  {data?.recharges.filter(r => r.status === 'pending').length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center text-slate-400 text-xs font-semibold">
                      No pending coin recharge requests
                    </div>
                  ) : (
                    data?.recharges
                      .filter(r => r.status === 'pending')
                      .map((req) => (
                        <div 
                          key={req.id} 
                          className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex flex-col gap-2.5"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-extrabold text-slate-800 text-xs">@{req.username}</h4>
                              <p className="text-[9px] text-slate-400 font-mono mt-0.5">UTR: {req.transactionId}</p>
                            </div>
                            <span className="bg-amber-100 text-amber-800 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                              ₹{req.amount}
                            </span>
                          </div>

                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 flex justify-between items-center text-slate-700">
                            <span className="text-[9px] font-bold">Coins requested:</span>
                            <span className="text-xs font-extrabold">🪙 {req.coins} Coins</span>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRechargeAction(req.id, 'reject')}
                              className="flex-1 py-2 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-[10px] font-extrabold uppercase transition-colors"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleRechargeAction(req.id, 'approve')}
                              className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[10px] font-extrabold uppercase shadow transition-colors"
                            >
                              Approve
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* WITHDRAWAL REQUESTS */}
              <div className="flex flex-col gap-2.5 mt-2">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 pl-0.5">
                  Pending Host Earning Withdrawals (Payouts)
                </span>

                <div className="flex flex-col gap-3">
                  {data?.withdrawals.filter(w => w.status === 'pending').length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center text-slate-400 text-xs font-semibold">
                      No pending withdrawal requests
                    </div>
                  ) : (
                    data?.withdrawals
                      .filter(w => w.status === 'pending')
                      .map((wdr) => (
                        <div 
                          key={wdr.id} 
                          className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex flex-col gap-2.5"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-extrabold text-slate-800 text-xs">@{wdr.username}</h4>
                              <p className="text-[9px] text-slate-400 font-mono mt-0.5">UPI ID: {wdr.upiId}</p>
                            </div>
                            <span className="bg-primary-100 text-primary-800 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Pending Payout
                            </span>
                          </div>

                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 flex justify-between items-center text-slate-700">
                            <span className="text-[9px] font-bold">Withdraw Amount:</span>
                            <span className="text-xs font-extrabold text-primary-600">🪙 {wdr.coins} Coins</span>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleWithdrawalAction(wdr.id, 'reject')}
                              className="flex-1 py-2 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-[10px] font-extrabold uppercase transition-colors"
                            >
                              Reject & Refund
                            </button>
                            <button
                              onClick={() => handleWithdrawalAction(wdr.id, 'approve')}
                              className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[10px] font-extrabold uppercase shadow transition-colors"
                            >
                              Approve / Settled
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* SETTINGS / QR CODE & HELP DESK CONFIG TAB */}
          {activeTab === 'settings' && (
            <div className="flex flex-col gap-4 flex-1 pb-4">
              
              {/* 🟢 1. WHATSAPP & HELP DESK CONFIGURATION */}
              <div className="flex flex-col gap-2">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 pl-0.5">
                  Official Help Desk & WhatsApp Support Setup
                </span>

                <form onSubmit={handleSaveSupportSettings} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col gap-3.5">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
                      <MessageSquare size={16} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs">Help Desk & WhatsApp Configuration</h4>
                      <p className="text-[9px] text-slate-400">Users tap this to get direct 1-click WhatsApp support</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-extrabold text-slate-500 uppercase pl-0.5">
                      Official WhatsApp Number (With Country Code)
                    </label>
                    <input 
                      type="text"
                      required
                      value={supportWhatsapp}
                      onChange={(e) => setSupportWhatsapp(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-extrabold text-slate-500 uppercase pl-0.5">
                      Support Email Address
                    </label>
                    <input 
                      type="email"
                      required
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      placeholder="support@ajnabidil.com"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-extrabold text-slate-500 uppercase pl-0.5">
                      Support Operating Hours
                    </label>
                    <input 
                      type="text"
                      value={supportHours}
                      onChange={(e) => setSupportHours(e.target.value)}
                      placeholder="e.g. 24x7 Live Customer Care"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-extrabold text-slate-500 uppercase pl-0.5">
                      Help Desk Description & Notice
                    </label>
                    <textarea 
                      value={supportHelpText}
                      onChange={(e) => setSupportHelpText(e.target.value)}
                      rows={2}
                      placeholder="Official Help Desk for Coin Recharges, Host KYC Verification & Payout Assistance."
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>

                  {supportSuccess && (
                    <div className="bg-emerald-50 text-emerald-700 text-[10px] p-2.5 rounded-xl border border-emerald-100 text-center font-bold">
                      WhatsApp & Support Settings updated successfully!
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={savingSupport}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-extrabold shadow-md shadow-emerald-200 active:scale-95 transition-all disabled:opacity-50 mt-1"
                  >
                    {savingSupport ? 'Saving...' : 'Save WhatsApp & Support Settings'}
                  </button>
                </form>
              </div>

              {/* 📷 2. OFFICIAL UPI SCANNER CONFIGURATION */}
              <div className="flex flex-col gap-2">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 pl-0.5">
                  Official UPI Scanner configuration
                </span>

                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col gap-4">
                  <div className="text-center">
                    <h4 className="font-extrabold text-slate-800 text-xs">Configure Shop QR Code</h4>
                    <p className="text-[9px] text-slate-400 mt-0.5">This QR Code displays to all users on GPay/PhonePe recharges</p>
                  </div>

                  <div className="flex flex-col items-center justify-center p-3 border border-slate-100 rounded-2xl bg-slate-50 w-full max-w-[180px] mx-auto shadow-inner">
                    <img 
                      src={data?.adminSettings?.qrCodeUrl ? (data.adminSettings.qrCodeUrl.startsWith('http') ? data.adminSettings.qrCodeUrl : `http://localhost:5000${data?.adminSettings?.qrCodeUrl}`) : 'https://api.dicebear.com/7.x/identicon/svg?seed=qr'} 
                      alt="Current Scanner QR" 
                      className="w-36 h-36 object-contain rounded-xl border border-slate-200 bg-white shadow-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 mt-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase pl-0.5">Upload New QR Code Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleQrUpload}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                    />
                  </div>

                  {qrUploading && (
                    <div className="text-center text-[10px] text-slate-400 font-bold animate-pulse mt-2">
                      Uploading QR scanner to uploads database...
                    </div>
                  )}

                  {qrSuccess && (
                    <div className="bg-green-50 text-green-700 text-[10px] p-2.5 rounded-xl border border-green-100 text-center font-bold">
                      UPI QR Code updated successfully!
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </MobileLayout>
  );
}
