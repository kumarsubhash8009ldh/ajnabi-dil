const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_FILE = path.join(__dirname, 'db.json');

// In-Memory state cache for ultra-fast (sub-millisecond) reads and writes
let memoryDb = null;
let saveTimeout = null;
let isSaving = false;

// Default initial database schema
function getDefaultData() {
  const salt = bcrypt.genSaltSync(10);
  const hashedAdminPassword = bcrypt.hashSync('admin', salt);
  
  return {
    users: [
      {
        id: 'user_admin_001',
        username: 'admin',
        password: hashedAdminPassword,
        interests: ['Admin', 'Control'],
        bio: 'System Administrator account.',
        avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=admin',
        coins: 999999,
        callRate: 0,
        isAdmin: true,
        isPartner: true,
        verificationStatus: 'verified'
      }
    ],
    messages: [],
    rooms: [
      { id: "room-1", name: "General Chat", description: "Talk about anything!", isPrivate: false, creatorId: 'system' },
      { id: "room-2", name: "Gamers Hub", description: "Discuss games and find gaming buddies!", isPrivate: false, creatorId: 'system' },
      { id: "room-3", name: "Fitness & Health", description: "Workout tips and healthy living.", isPrivate: false, creatorId: 'system' },
      { id: "room-4", name: "Travel & Explore", description: "Share your travel experiences and plans.", isPrivate: false, creatorId: 'system' }
    ],
    roomMessages: [],
    rechargeRequests: [],
    withdrawalRequests: [],
    adminSettings: { 
      qrCodeUrl: '/logo.jpg',
      whatsappNumber1: '+91 9876543211',
      whatsappNumber2: '+91 9876543212',
      whatsappNumber3: '+91 9876543213',
      whatsappNumber: '+91 9876543211',
      supportEmail: 'support@ajnabidil.com',
      supportHours: '8:00 AM – 10:00 PM (Daily)',
      helpText: 'Official Help Desk for Coin Recharges, Host KYC Verification & Payout Assistance.'
    },
    stories: [],
    posts: [],
    sessions: [],
    callLogs: []
  };
}

// Helper to normalize phone numbers (e.g. extracts last 10 digits)
function normalizePhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
}

// Normalize user object fields
function normalizeUser(u) {
  const normPhone = normalizePhone(u.mobile || '');
  return {
    ...u,
    mobile: normPhone,
    isPhoneVerified: u.isPhoneVerified !== undefined ? Boolean(u.isPhoneVerified) : true,
    phoneOtp: u.phoneOtp || null,
    phoneOtpExpires: u.phoneOtpExpires || null,
    coins: u.coins !== undefined ? u.coins : 100,
    callRate: u.callRate !== undefined ? Number(u.callRate) : 5,
    voiceCallRate: u.voiceCallRate !== undefined ? Number(u.voiceCallRate) : 5,
    videoCallRate: u.videoCallRate !== undefined ? Number(u.videoCallRate) : 8,
    isPartner: u.isPartner !== undefined ? u.isPartner : false,
    partnerId: u.partnerId !== undefined ? u.partnerId : null,
    earnings: u.earnings !== undefined ? u.earnings : 0,
    referralCode: u.referralCode || ('REF_' + (u.id || '').split('_').pop().toUpperCase()),
    referralPoints: u.referralPoints !== undefined ? u.referralPoints : 0,
    referredBy: u.referredBy || null,
    referralCodeUsed: u.referralCodeUsed || null,
    verificationStatus: u.verificationStatus || 'none',
    verificationDetails: u.verificationDetails || null,
    flowers: u.flowers !== undefined ? Number(u.flowers) : 0,
    followersCount: u.followersCount !== undefined ? Number(u.followersCount) : 0,
    friendsCount: u.friendsCount !== undefined ? Number(u.friendsCount) : 0,
    sessionsCount: u.sessionsCount !== undefined ? Number(u.sessionsCount) : 0,
    rating: u.rating !== undefined ? Number(u.rating) : 0,
    goalHours: u.goalHours !== undefined ? Number(u.goalHours) : 0,
    completedGoalHours: u.completedGoalHours !== undefined ? Number(u.completedGoalHours) : 0,
    incomingCallsEnabled: u.incomingCallsEnabled !== undefined ? u.incomingCallsEnabled : true,
    friendsOnly: u.friendsOnly !== undefined ? u.friendsOnly : false,
    isBanned: u.isBanned !== undefined ? u.isBanned : false,
    warningsCount: Number(u.warningsCount) || 0,
    isSuspended: Boolean(u.isSuspended),
    suspensionReason: u.suspensionReason || null,
    warningHistory: Array.isArray(u.warningHistory) ? u.warningHistory : [],
    coverPhoto: u.coverPhoto || '/theme-bg.jpg'
  };
}

// Initialize database in RAM
function initDb() {
  if (memoryDb) return memoryDb;

  if (!fs.existsSync(DB_FILE)) {
    memoryDb = getDefaultData();
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(memoryDb, null, 2), 'utf-8');
    } catch (e) {
      console.warn("Notice: Local DB file write skipped (using RAM storage):", e.message);
    }
  } else {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      memoryDb = {
        users: Array.isArray(parsed.users) ? parsed.users.map(normalizeUser) : [],
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        rooms: Array.isArray(parsed.rooms) && parsed.rooms.length > 0 ? parsed.rooms : getDefaultData().rooms,
        roomMessages: Array.isArray(parsed.roomMessages) ? parsed.roomMessages : [],
        rechargeRequests: Array.isArray(parsed.rechargeRequests) ? parsed.rechargeRequests : [],
        withdrawalRequests: Array.isArray(parsed.withdrawalRequests) ? parsed.withdrawalRequests : [],
        adminSettings: parsed.adminSettings || getDefaultData().adminSettings,
        stories: Array.isArray(parsed.stories) ? parsed.stories : [],
        posts: Array.isArray(parsed.posts) ? parsed.posts : [],
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
        callLogs: Array.isArray(parsed.callLogs) ? parsed.callLogs : []
      };

      // Ensure Admin exists
      if (!memoryDb.users.find(u => u.username === 'admin')) {
        const salt = bcrypt.genSaltSync(10);
        const hashedAdminPassword = bcrypt.hashSync('admin', salt);
        memoryDb.users.push({
          id: 'user_admin_001',
          username: 'admin',
          password: hashedAdminPassword,
          interests: ['Admin', 'Control'],
          bio: 'System Administrator account.',
          avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=admin',
          coins: 999999,
          callRate: 0,
          isAdmin: true,
          isPartner: true,
          verificationStatus: 'verified'
        });
      }
    } catch (err) {
      console.error("Error reading db.json, initializing fresh in-memory schema:", err);
      memoryDb = getDefaultData();
    }
  }
  return memoryDb;
}

// Non-blocking async background flush to disk (Debounced 300ms)
function scheduleDiskFlush() {
  if (saveTimeout) clearTimeout(saveTimeout);
  
  saveTimeout = setTimeout(async () => {
    if (isSaving || !memoryDb) return;
    isSaving = true;
    try {
      const jsonStr = JSON.stringify(memoryDb, null, 2);
      await fs.promises.writeFile(DB_FILE, jsonStr, 'utf-8');
    } catch (err) {
      console.error("Background DB flush error:", err.message);
    } finally {
      isSaving = false;
    }
  }, 300);
}

// Immediate synchronous write when needed (e.g., process shutdown)
function flushSync() {
  if (!memoryDb) return;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(memoryDb, null, 2), 'utf-8');
  } catch (e) {
    // Ignore on shutdown
  }
}

// Graceful exit handlers
process.on('SIGINT', () => { flushSync(); process.exit(0); });
process.on('SIGTERM', () => { flushSync(); process.exit(0); });

// Initialize immediately
initDb();

// High-speed API matching original db interface with O(1)/O(N) RAM access
const db = {
  getUsers: () => memoryDb.users,
  
  getUserById: (id) => memoryDb.users.find(u => u.id === id),
  
  getUserByUsername: (username) => {
    if (!username) return null;
    const target = String(username).trim().toLowerCase();
    return memoryDb.users.find(u => (u.username || '').trim().toLowerCase() === target);
  },

  getUserByMobile: (mobile) => {
    const norm = normalizePhone(mobile);
    if (!norm) return null;
    return memoryDb.users.find(u => normalizePhone(u.mobile) === norm);
  },

  normalizePhone,
  
  saveUser: (user) => {
    const normalized = normalizeUser(user);
    const index = memoryDb.users.findIndex(u => u.id === normalized.id);
    if (index !== -1) {
      memoryDb.users[index] = { ...memoryDb.users[index], ...normalized };
    } else {
      memoryDb.users.push(normalized);
    }
    scheduleDiskFlush();
    return normalized;
  },

  isUserSuspended: (userId) => {
    const user = memoryDb.users.find(u => u.id === userId);
    return Boolean(user && user.isSuspended);
  },

  addWarningToUser: (userId, violationType, snippet) => {
    const user = memoryDb.users.find(u => u.id === userId);
    if (!user) return { warningsCount: 1, isSuspended: false, warningNumber: 1, message: 'Policy Warning' };

    user.warningsCount = (Number(user.warningsCount) || 0) + 1;
    if (!user.warningHistory) user.warningHistory = [];

    const warningEntry = {
      id: 'warn_' + Date.now(),
      warningNumber: user.warningsCount,
      violationType: violationType || 'CONTACT_LEAK',
      snippet: snippet || '',
      timestamp: new Date().toISOString()
    };
    user.warningHistory.push(warningEntry);

    let isSuspended = false;
    let message = '';

    if (user.warningsCount === 1) {
      message = '⚠️ Warning 1/3: Instagram, Facebook ya Phone number share karna sakht mana hai. Policy violation!';
    } else if (user.warningsCount === 2) {
      message = '🚨 Final Warning 2/3: Dobara personal contact dene ki koshish ki toh account PERMANENT BAN ho jayega!';
    } else {
      user.isSuspended = true;
      user.suspensionReason = 'Community Guidelines: Sharing personal contact or social accounts after 3 warnings.';
      isSuspended = true;
      message = '🚫 ACCOUNT SUSPENDED (3/3): 3 warnings poori hone par aapka account suspend kar diya gaya hai.';
    }

    db.saveUser(user);
    return {
      warningsCount: user.warningsCount,
      warningNumber: Math.min(3, user.warningsCount),
      isSuspended: user.isSuspended,
      message,
      snippet: snippet || '',
      suspensionReason: user.suspensionReason
    };
  },
  
  getRooms: () => memoryDb.rooms,

  getRoomById: (roomId) => {
    return memoryDb.rooms.find(r => r.id === roomId) || null;
  },
  
  saveRoom: (room) => {
    const normalized = {
      ...room,
      isPrivate: Boolean(room.isPrivate),
      entryCode: room.entryCode ? String(room.entryCode).trim() : null,
      entryFee: Number(room.entryFee) || 0,
      unlockedUsers: Array.isArray(room.unlockedUsers) ? room.unlockedUsers : (room.creatorId ? [room.creatorId] : [])
    };
    const idx = memoryDb.rooms.findIndex(r => r.id === room.id);
    if (idx !== -1) {
      memoryDb.rooms[idx] = normalized;
    } else {
      memoryDb.rooms.push(normalized);
    }
    scheduleDiskFlush();
    return normalized;
  },

  unlockRoom: (roomId, userId, code) => {
    const room = memoryDb.rooms.find(r => r.id === roomId);
    if (!room) return { success: false, error: 'Room not found' };

    const user = memoryDb.users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'User not found' };

    // If public room, creator, or already unlocked
    if (!room.isPrivate || room.creatorId === userId || (room.unlockedUsers && room.unlockedUsers.includes(userId))) {
      return { success: true, room, alreadyUnlocked: true, remainingCoins: user.coins || 0 };
    }

    // Verify code if set
    if (room.entryCode) {
      if (!code || String(code).trim().toLowerCase() !== String(room.entryCode).trim().toLowerCase()) {
        return { success: false, error: 'INVALID_CODE', message: 'Galat Secret Room Code! Kripya sahi code dalein.' };
      }
    }

    // Verify coin entry fee if set
    const fee = Number(room.entryFee) || 0;
    if (fee > 0) {
      if ((user.coins || 0) < fee) {
        return { 
          success: false, 
          error: 'INSUFFICIENT_COINS', 
          requiredCoins: fee, 
          userCoins: user.coins || 0,
          message: `Is private room me enter hone ke liye ${fee} Coins chahiye. Aapke paas sirf ${user.coins || 0} Coins hain.`
        };
      }

      // Deduct coins
      user.coins = Math.max(0, (user.coins || 0) - fee);
      db.saveUser(user);

      // Credit 70% to creator
      if (room.creatorId) {
        const creator = memoryDb.users.find(u => u.id === room.creatorId);
        if (creator) {
          const earned = Math.round(fee * 0.7);
          creator.earnings = (creator.earnings || 0) + earned;
          db.saveUser(creator);
        }
      }
    }

    // Add to unlocked list
    if (!room.unlockedUsers) room.unlockedUsers = [];
    if (!room.unlockedUsers.includes(userId)) {
      room.unlockedUsers.push(userId);
      scheduleDiskFlush();
    }

    return { 
      success: true, 
      room, 
      coinsDeducted: fee, 
      remainingCoins: user.coins 
    };
  },

  deleteRoom: (roomId) => {
    const idx = memoryDb.rooms.findIndex(r => r.id === roomId);
    if (idx !== -1) {
      memoryDb.rooms.splice(idx, 1);
      memoryDb.roomMessages = memoryDb.roomMessages.filter(m => m.roomId !== roomId);
      scheduleDiskFlush();
      return true;
    }
    return false;
  },
  
  getRoomMessages: (roomId) => {
    return memoryDb.roomMessages.filter(m => m.roomId === roomId);
  },
  
  saveRoomMessage: (msg) => {
    memoryDb.roomMessages.push(msg);
    // Keep max 5000 recent room messages in RAM to prevent memory leak under heavy traffic
    if (memoryDb.roomMessages.length > 5000) {
      memoryDb.roomMessages = memoryDb.roomMessages.slice(-5000);
    }
    scheduleDiskFlush();
    return msg;
  },
  
  getDirectMessages: (user1, user2) => {
    return memoryDb.messages.filter(m => 
      (m.senderId === user1 && m.receiverId === user2) || 
      (m.senderId === user2 && m.receiverId === user1)
    );
  },
  
  saveDirectMessage: (msg) => {
    memoryDb.messages.push(msg);
    // Keep max 10000 recent messages in RAM
    if (memoryDb.messages.length > 10000) {
      memoryDb.messages = memoryDb.messages.slice(-10000);
    }
    scheduleDiskFlush();
    return msg;
  },
  
  deleteDirectMessage: (msgId, userId) => {
    const index = memoryDb.messages.findIndex(m => m.id === msgId && m.senderId === userId);
    if (index !== -1) {
      memoryDb.messages[index] = {
        ...memoryDb.messages[index],
        deleted: true,
        content: '🚫 This message was deleted',
        fileUrl: undefined,
        mediaType: undefined
      };
      scheduleDiskFlush();
      return memoryDb.messages[index];
    }
    return null;
  },
  
  deleteRoomMessage: (msgId, userId) => {
    const index = memoryDb.roomMessages.findIndex(m => m.id === msgId && m.senderId === userId);
    if (index !== -1) {
      memoryDb.roomMessages[index] = {
        ...memoryDb.roomMessages[index],
        deleted: true,
        content: '🚫 This message was deleted',
        fileUrl: undefined,
        mediaType: undefined
      };
      scheduleDiskFlush();
      return memoryDb.roomMessages[index];
    }
    return null;
  },

  deleteUser: (userId) => {
    const index = memoryDb.users.findIndex(u => u.id === userId);
    if (index !== -1) {
      const removed = memoryDb.users.splice(index, 1)[0];
      scheduleDiskFlush();
      return removed;
    }
    return null;
  },
  
  getRechargeRequests: () => memoryDb.rechargeRequests,
  saveRechargeRequest: (req) => {
    const index = memoryDb.rechargeRequests.findIndex(r => r.id === req.id);
    if (index !== -1) {
      memoryDb.rechargeRequests[index] = req;
    } else {
      memoryDb.rechargeRequests.push(req);
    }
    scheduleDiskFlush();
    return req;
  },
  
  getWithdrawalRequests: () => memoryDb.withdrawalRequests,
  saveWithdrawalRequest: (req) => {
    const index = memoryDb.withdrawalRequests.findIndex(w => w.id === req.id);
    if (index !== -1) {
      memoryDb.withdrawalRequests[index] = req;
    } else {
      memoryDb.withdrawalRequests.push(req);
    }
    scheduleDiskFlush();
    return req;
  },
  
  getAdminSettings: () => memoryDb.adminSettings,
  saveAdminSettings: (settings) => {
    memoryDb.adminSettings = settings;
    scheduleDiskFlush();
    return settings;
  },
  
  getStories: () => memoryDb.stories,
  saveStory: (story) => {
    memoryDb.stories.push(story);
    scheduleDiskFlush();
    return story;
  },
  
  getPosts: (userId = null) => {
    if (userId) {
      return memoryDb.posts.filter(p => p.userId === userId);
    }
    return memoryDb.posts;
  },
  
  savePost: (post) => {
    memoryDb.posts.unshift(post);
    scheduleDiskFlush();
    return post;
  },
  
  deletePost: (postId, userId) => {
    const index = memoryDb.posts.findIndex(p => p.id === postId && (p.userId === userId || userId === 'user_admin_001'));
    if (index !== -1) {
      const deleted = memoryDb.posts.splice(index, 1);
      scheduleDiskFlush();
      return deleted[0];
    }
    return null;
  },
  
  getUserSessions: (userId) => {
    const userSessions = memoryDb.sessions.filter(s => s.userId === userId || s.partnerId === userId);
    if (userSessions.length === 0) {
      return [
        {
          id: 'sess_sample_1',
          userId,
          peerName: 'Priya Sharma',
          peerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          type: 'video',
          direction: 'outgoing',
          duration: '29s',
          timestamp: '2h ago',
          costCoins: -8,
          flowers: -8
        },
        {
          id: 'sess_sample_2',
          userId,
          peerName: 'Rahul Verma',
          peerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          type: 'voice',
          direction: 'incoming',
          duration: '38s',
          timestamp: '6d ago',
          costCoins: 20,
          flowers: 20
        },
        {
          id: 'sess_sample_3',
          userId,
          peerName: 'Simran Kaur',
          peerAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
          type: 'live',
          direction: 'outgoing',
          duration: '15m',
          timestamp: '1w ago',
          costCoins: 300,
          flowers: 300
        }
      ];
    }
    return userSessions;
  },
  
  saveSession: (session) => {
    memoryDb.sessions.unshift(session);
    scheduleDiskFlush();
    return session;
  },
  
  getDownlineUsers: (userId, referralCode) => {
    return memoryDb.users
      .filter(u => u.referredBy === userId || (referralCode && u.referralCodeUsed === referralCode))
      .map(u => ({
        id: u.id,
        username: u.username,
        avatar: u.avatar,
        joinedAt: u.createdAt || 'Recent',
        isPartner: u.isPartner,
        coinsContributed: Math.floor((u.coins || 100) * 0.1)
      }));
  },

  // --- CALL LOGS & UNIFIED INBOX METHODS ---
  saveCallLog: (call) => {
    const log = {
      id: call.id || 'call_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      callerId: call.callerId,
      callerName: call.callerName || 'User',
      callerAvatar: call.callerAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=caller',
      receiverId: call.receiverId,
      receiverName: call.receiverName || 'User',
      receiverAvatar: call.receiverAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=receiver',
      type: call.type || 'video', // 'video', 'audio', 'stranger'
      status: call.status || 'completed', // 'completed', 'missed', 'declined'
      durationSeconds: Number(call.durationSeconds) || 0,
      timestamp: call.timestamp || new Date().toISOString()
    };

    if (!Array.isArray(memoryDb.callLogs)) {
      memoryDb.callLogs = [];
    }
    memoryDb.callLogs.unshift(log);
    if (memoryDb.callLogs.length > 2000) {
      memoryDb.callLogs = memoryDb.callLogs.slice(0, 2000);
    }
    scheduleDiskFlush();
    return log;
  },

  getUserCallLogs: (userId) => {
    if (!Array.isArray(memoryDb.callLogs)) {
      memoryDb.callLogs = [];
    }
    return memoryDb.callLogs.filter(c => c.callerId === userId || c.receiverId === userId);
  },

  getUserConversations: (userId) => {
    const convoMap = new Map();
    const userMsgs = memoryDb.messages.filter(m => m.senderId === userId || m.receiverId === userId);

    userMsgs.forEach(m => {
      const otherId = m.senderId === userId ? m.receiverId : m.senderId;
      if (!otherId) return;

      const existing = convoMap.get(otherId);
      const isUnread = m.receiverId === userId && !m.read;

      if (!existing || new Date(m.timestamp) > new Date(existing.lastTimestamp)) {
        convoMap.set(otherId, {
          otherUserId: otherId,
          lastMessage: m.content || (m.mediaType === 'image' ? '📷 Photo' : '💬 Attachment'),
          lastTimestamp: m.timestamp,
          lastSenderId: m.senderId,
          unreadCount: (existing ? existing.unreadCount : 0) + (isUnread ? 1 : 0)
        });
      } else if (isUnread) {
        existing.unreadCount = (existing.unreadCount || 0) + 1;
      }
    });

    // Populate user profile info
    const conversations = [];
    convoMap.forEach(conv => {
      const otherUser = memoryDb.users.find(u => u.id === conv.otherUserId);
      conversations.push({
        ...conv,
        otherUsername: otherUser ? otherUser.username : 'User',
        otherAvatar: otherUser ? otherUser.avatar : 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + conv.otherUserId,
        isOnline: Boolean(otherUser && otherUser.isOnline)
      });
    });

    return conversations.sort((a, b) => new Date(b.lastTimestamp) - new Date(a.lastTimestamp));
  },

  getActivitySummary: (userId) => {
    const calls = (memoryDb.callLogs || []).filter(c => c.callerId === userId || c.receiverId === userId);
    const conversations = db.getUserConversations(userId);
    const missedCount = calls.filter(c => c.receiverId === userId && c.status === 'missed').length;
    const totalUnreadMessages = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

    return {
      calls,
      conversations,
      missedCount,
      totalUnreadMessages
    };
  }
};

initDb();

module.exports = db;
