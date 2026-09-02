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
      whatsappNumber: '+91 9876543210',
      supportEmail: 'support@ajnabidil.com',
      supportHours: '24x7 Live Customer Care',
      helpText: 'Official 24x7 Help Desk for Coin Recharges, Host KYC Verification & Payout Assistance.'
    },
    stories: [],
    posts: [],
    sessions: []
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
    callRate: u.callRate !== undefined ? u.callRate : 10,
    isPartner: u.isPartner !== undefined ? u.isPartner : false,
    partnerId: u.partnerId !== undefined ? u.partnerId : null,
    earnings: u.earnings !== undefined ? u.earnings : 0,
    referralCode: u.referralCode || ('REF_' + (u.id || '').split('_').pop().toUpperCase()),
    referralPoints: u.referralPoints !== undefined ? u.referralPoints : 0,
    referredBy: u.referredBy || null,
    referralCodeUsed: u.referralCodeUsed || null,
    verificationStatus: u.verificationStatus || 'none',
    verificationDetails: u.verificationDetails || null,
    flowers: u.flowers !== undefined ? u.flowers : 54,
    followersCount: u.followersCount !== undefined ? u.followersCount : 89,
    friendsCount: u.friendsCount !== undefined ? u.friendsCount : 1,
    sessionsCount: u.sessionsCount !== undefined ? u.sessionsCount : 24,
    rating: u.rating !== undefined ? u.rating : 4.9,
    goalHours: u.goalHours !== undefined ? u.goalHours : 20,
    completedGoalHours: u.completedGoalHours !== undefined ? u.completedGoalHours : 14.5,
    incomingCallsEnabled: u.incomingCallsEnabled !== undefined ? u.incomingCallsEnabled : true,
    friendsOnly: u.friendsOnly !== undefined ? u.friendsOnly : false,
    isBanned: u.isBanned !== undefined ? u.isBanned : false,
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
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : []
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
  
  getRooms: () => memoryDb.rooms,
  
  saveRoom: (room) => {
    memoryDb.rooms.push(room);
    scheduleDiskFlush();
    return room;
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
  }
};

initDb();

module.exports = db;
