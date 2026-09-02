require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const os = require('os');
const db = require('./db');

const app = express();
const server = http.createServer(app);

// CORS configuration & Tunnel bypass
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use((req, res, next) => {
  res.setHeader('Bypass-Tunnel-Reminder', 'true');
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 24/7 Keep-Alive & Cloud Health Check Endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'Ajnabi Dil Realtime Engine',
    uptime: Math.floor(process.uptime()),
    onlineUsers: onlineUsers.size,
    activeLiveStreams: liveStreams.size,
    timestamp: new Date().toISOString()
  });
});
app.get('/ping', (req, res) => res.send('pong'));
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Serve Frontend Static Files for Web Chrome & Browser access
const FRONTEND_DIST = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
}

const JWT_SECRET = process.env.JWT_SECRET || 'chitchat_super_secret_key_123';

// Online users mapping (userId -> socketId)
const onlineUsers = new Map();

// Active Live Streams mapping (hostId -> stream details)
const liveStreams = new Map();

// Helper middleware for JWT validation
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access token required' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// Helper middleware for Admin validation (PIN / Secret Header / Admin User)
function authenticateAdmin(req, res, next) {
  const adminKey = req.headers['x-admin-key'] || req.headers['x-admin-pin'] || req.query.adminKey;
  if (adminKey === '8009' || adminKey === 'admin8009' || adminKey === 'admin@123') {
    req.isAdmin = true;
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err && user && (user.username === 'admin' || user.isAdmin)) {
        req.user = user;
        req.isAdmin = true;
        return next();
      }
      return res.status(403).json({ error: 'Master Admin Access Required' });
    });
  } else {
    return res.status(401).json({ error: 'Master Admin PIN or Security Key Required' });
  }
}

// --- AUTHENTICATION ROUTES ---

// Register
app.post('/api/auth/register', (req, res) => {
  const { username, password, referralCode, mobile } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  const existingUser = db.getUserByUsername(username);
  if (existingUser) {
    return res.status(400).json({ error: 'Username already taken' });
  }
  
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  const newUserId = 'user_' + Math.random().toString(36).substr(2, 9);
  const newRefCode = 'REF_' + newUserId.split('_').pop().toUpperCase();
  
  let referredByUserId = null;
  
  if (referralCode) {
    const allUsers = db.getUsers();
    const referrer = allUsers.find(u => u.referralCode === referralCode.trim());
    if (referrer) {
      referredByUserId = referrer.id;
      referrer.coins = (referrer.coins || 0) + 50;
      referrer.referralPoints = (referrer.referralPoints || 0) + 50;
      db.saveUser(referrer);
    }
  }

  const defaultVoiceRate = 10; // 10 coins / 10s (1 coin/sec)
  const defaultVideoRate = 20; // 20 coins / 10s

  const newUser = {
    id: newUserId,
    username: username,
    password: hashedPassword,
    mobile: mobile ? mobile.trim() : '',
    interests: [],
    bio: '',
    avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
    coins: 100,
    callRate: 10,
    voiceCallRate: defaultVoiceRate,
    videoCallRate: defaultVideoRate,
    isPartner: false,
    partnerId: null,
    earnings: 0,
    referralCode: newRefCode,
    referralPoints: 0,
    referredBy: referredByUserId,
    verificationStatus: 'none',
    verificationDetails: null
  };
  
  db.saveUser(newUser);
  
  // Exclude password from token
  const tokenUser = { id: newUser.id, username: newUser.username };
  const token = jwt.sign(tokenUser, JWT_SECRET, { expiresIn: '7d' });
  
  const welcomeIncomeMsg = `🎉 Welcome to Ajnabi Dil! You can earn up to 70% revenue share on Voice Calls (${newUser.voiceCallRate / 10 || 1} coin/sec), Video Calls (${newUser.videoCallRate || 20} coins/10s), Live Stream Private Shows (min 300 coins) and Virtual Gifts! Cashout earnings to Bank/UPI (Min Rs. 500). Complete Host KYC in Profile to start earning.`;

  res.status(201).json({
    token: token,
    welcomeMessage: welcomeIncomeMsg,
    user: {
      id: newUser.id,
      username: newUser.username,
      mobile: newUser.mobile,
      interests: newUser.interests,
      bio: newUser.bio,
      avatar: newUser.avatar,
      coins: newUser.coins,
      callRate: newUser.callRate,
      voiceCallRate: newUser.voiceCallRate,
      videoCallRate: newUser.videoCallRate,
      isPartner: newUser.isPartner,
      partnerId: newUser.partnerId,
      earnings: newUser.earnings,
      referralCode: newUser.referralCode,
      referralPoints: newUser.referralPoints,
      verificationStatus: newUser.verificationStatus
    }
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  const user = db.getUserByUsername(username);
  if (!user) {
    return res.status(400).json({ error: 'Invalid username or password' });
  }
  
  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ error: 'Invalid username or password' });
  }

  if (user.isBanned) {
    return res.status(403).json({ error: 'Your account has been suspended by administration. Please contact support.' });
  }
  
  const tokenUser = { id: user.id, username: user.username };
  const token = jwt.sign(tokenUser, JWT_SECRET, { expiresIn: '7d' });
  
  res.json({
    token: token,
    user: {
      id: user.id,
      username: user.username,
      mobile: user.mobile,
      email: user.email,
      interests: user.interests,
      bio: user.bio,
      avatar: user.avatar,
      coins: user.coins,
      callRate: user.callRate,
      isPartner: user.isPartner,
      partnerId: user.partnerId,
      earnings: user.earnings,
      referralCode: user.referralCode,
      referralPoints: user.referralPoints,
      verificationStatus: user.verificationStatus
    }
  });
});

// One-Click Instant Guest / Web Demo Login (for Chrome & Browser visitors)
app.post('/api/auth/guest-login', (req, res) => {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const guestUsername = `Guest_${randomSuffix}`;
  const guestId = `guest_${Date.now()}_${randomSuffix}`;
  const guestPassword = bcrypt.hashSync(`guest_${randomSuffix}`, 10);
  
  const guestUser = {
    id: guestId,
    username: guestUsername,
    password: guestPassword,
    mobile: '',
    email: '',
    interests: ['Chat', 'Music'],
    bio: 'Guest visitor exploring Ajnabi Dil ✨',
    avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${guestUsername}`,
    coins: 100,
    callRate: 10,
    voiceCallRate: 10,
    videoCallRate: 20,
    isPartner: false,
    partnerId: null,
    earnings: 0,
    referralCode: `REF_${randomSuffix}`,
    referralPoints: 0,
    verificationStatus: 'none',
    verificationDetails: null
  };

  db.saveUser(guestUser);
  const token = jwt.sign({ id: guestUser.id, username: guestUser.username }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    user: guestUser,
    message: 'Logged in as Guest user'
  });
});

// Helper to save base64 image to uploads directory
function saveBase64File(base64Data, filenamePrefix, defaultExt = 'jpg') {
  if (!base64Data || !base64Data.startsWith('data:image/')) return '';
  try {
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const buffer = Buffer.from(matches[2], 'base64');
      const ext = matches[1].split('/')[1] || defaultExt;
      const newFilename = `${filenamePrefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, newFilename);
      fs.writeFileSync(filePath, buffer);
      return `/uploads/${newFilename}`;
    }
  } catch (e) {
    console.error(`Error saving ${filenamePrefix}:`, e);
  }
  return '';
}

// --- USER ROUTES ---

// Get active profile
app.get('/api/users/profile', authenticateToken, (req, res) => {
  const user = db.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  res.json({
    id: user.id,
    username: user.username,
    email: user.email || '',
    mobile: user.mobile || '',
    interests: user.interests,
    bio: user.bio,
    avatar: user.avatar,
    coins: user.coins,
    callRate: user.callRate,
    voiceCallRate: user.voiceCallRate || 10,
    videoCallRate: user.videoCallRate || 20,
    isPartner: user.isPartner,
    partnerId: user.partnerId,
    earnings: user.earnings,
    referralCode: user.referralCode,
    referralPoints: user.referralPoints,
    verificationStatus: user.verificationStatus,
    verificationDetails: user.verificationDetails,
    flowers: user.flowers !== undefined ? user.flowers : 54,
    followersCount: user.followersCount !== undefined ? user.followersCount : 89,
    friendsCount: user.friendsCount !== undefined ? user.friendsCount : 1,
    sessionsCount: user.sessionsCount !== undefined ? user.sessionsCount : 24,
    rating: user.rating !== undefined ? user.rating : 4.9,
    goalHours: user.goalHours !== undefined ? user.goalHours : 20,
    completedGoalHours: user.completedGoalHours !== undefined ? user.completedGoalHours : 14.5,
    incomingCallsEnabled: user.incomingCallsEnabled !== undefined ? user.incomingCallsEnabled : true,
    friendsOnly: user.friendsOnly !== undefined ? user.friendsOnly : false,
    coverPhoto: user.coverPhoto || '/theme-bg.jpg'
  });
});

// Update profile (interests, bio, callRate, email, mobile, custom calling rates, toggles, cover)
app.put('/api/users/profile', authenticateToken, (req, res) => {
  const { 
    interests, bio, avatar, coverPhoto, callRate, voiceCallRate, videoCallRate, 
    email, mobile, incomingCallsEnabled, friendsOnly, goalHours 
  } = req.body;
  const user = db.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  let finalAvatar = user.avatar;
  if (avatar && avatar.startsWith('data:image/')) {
    const saved = saveBase64File(avatar, `avatar_${user.id}`);
    if (saved) finalAvatar = saved;
  } else if (avatar !== undefined) {
    finalAvatar = avatar;
  }

  let finalCover = user.coverPhoto || '/theme-bg.jpg';
  if (coverPhoto && coverPhoto.startsWith('data:image/')) {
    const savedCover = saveBase64File(coverPhoto, `cover_${user.id}`);
    if (savedCover) finalCover = savedCover;
  } else if (coverPhoto !== undefined) {
    finalCover = coverPhoto;
  }

  const updatedUser = {
    ...user,
    email: email !== undefined ? email : user.email,
    mobile: mobile !== undefined ? mobile : user.mobile,
    interests: interests !== undefined ? interests : user.interests,
    bio: bio !== undefined ? bio : user.bio,
    avatar: finalAvatar,
    coverPhoto: finalCover,
    callRate: callRate !== undefined ? Number(callRate) : user.callRate,
    voiceCallRate: voiceCallRate !== undefined ? Math.max(1, Number(voiceCallRate)) : (user.voiceCallRate || 10),
    videoCallRate: videoCallRate !== undefined ? Math.max(5, Number(videoCallRate)) : (user.videoCallRate || 20),
    incomingCallsEnabled: incomingCallsEnabled !== undefined ? incomingCallsEnabled : user.incomingCallsEnabled,
    friendsOnly: friendsOnly !== undefined ? friendsOnly : user.friendsOnly,
    goalHours: goalHours !== undefined ? Number(goalHours) : user.goalHours
  };
  
  db.saveUser(updatedUser);
  
  res.json({
    id: updatedUser.id,
    username: updatedUser.username,
    email: updatedUser.email,
    mobile: updatedUser.mobile,
    interests: updatedUser.interests,
    bio: updatedUser.bio,
    avatar: updatedUser.avatar,
    coverPhoto: updatedUser.coverPhoto,
    coins: updatedUser.coins,
    callRate: updatedUser.callRate,
    voiceCallRate: updatedUser.voiceCallRate,
    videoCallRate: updatedUser.videoCallRate,
    isPartner: updatedUser.isPartner,
    partnerId: updatedUser.partnerId,
    earnings: updatedUser.earnings,
    referralCode: updatedUser.referralCode,
    referralPoints: updatedUser.referralPoints,
    verificationStatus: updatedUser.verificationStatus,
    flowers: updatedUser.flowers,
    followersCount: updatedUser.followersCount,
    friendsCount: updatedUser.friendsCount,
    sessionsCount: updatedUser.sessionsCount,
    rating: updatedUser.rating,
    goalHours: updatedUser.goalHours,
    completedGoalHours: updatedUser.completedGoalHours,
    incomingCallsEnabled: updatedUser.incomingCallsEnabled,
    friendsOnly: updatedUser.friendsOnly
  });
});

// Get referral downline list
app.get('/api/users/downline', authenticateToken, (req, res) => {
  const user = db.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const downline = db.getDownlineUsers(user.id, user.referralCode);
  res.json({
    referralCode: user.referralCode,
    totalReferred: downline.length,
    referralPoints: user.referralPoints || 0,
    downline
  });
});

// Get user posts
app.get('/api/users/posts', authenticateToken, (req, res) => {
  const targetUserId = req.query.userId || req.user.id;
  const posts = db.getPosts(targetUserId);
  res.json(posts);
});

// Create new post
app.post('/api/users/posts', authenticateToken, (req, res) => {
  const { image, caption } = req.body;
  if (!image) return res.status(400).json({ error: 'Image is required for post' });
  
  let imageUrl = image;
  if (image.startsWith('data:image/')) {
    const saved = saveBase64File(image, `post_${req.user.id}`);
    if (saved) imageUrl = saved;
  }
  
  const user = db.getUserById(req.user.id);
  const newPost = {
    id: 'post_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    userId: req.user.id,
    username: user ? user.username : req.user.username,
    avatar: user ? user.avatar : '',
    imageUrl,
    caption: caption || '',
    likes: 0,
    timestamp: new Date().toISOString()
  };
  
  db.savePost(newPost);
  
  // Increment posts count
  if (user) {
    user.postsCount = (user.postsCount || 0) + 1;
    db.saveUser(user);
  }

  res.status(201).json(newPost);
});

// Delete post
app.delete('/api/users/posts/:id', authenticateToken, (req, res) => {
  const deleted = db.deletePost(req.params.id, req.user.id);
  if (!deleted) return res.status(404).json({ error: 'Post not found or unauthorized' });
  res.json({ message: 'Post deleted successfully', post: deleted });
});

// Get user session history
app.get('/api/users/sessions', authenticateToken, (req, res) => {
  const sessions = db.getUserSessions(req.user.id);
  res.json(sessions);
});

// Get other users (feed/match/calls)
app.get('/api/users', authenticateToken, (req, res) => {
  const currentUserId = req.user.id;
  const allUsers = db.getUsers();
  
  // Map users to clean public profiles and exclude current user
  const otherUsers = allUsers
    .filter(u => u.id !== currentUserId)
    .map(u => ({
      id: u.id,
      username: u.username,
      interests: u.interests,
      bio: u.bio,
      avatar: u.avatar,
      isOnline: onlineUsers.has(u.id),
      callRate: u.callRate,
      voiceCallRate: u.voiceCallRate || 10,
      videoCallRate: u.videoCallRate || 20,
      isPartner: u.isPartner || false
    }));
    
  res.json(otherUsers);
});

// --- CHAT ROUTES ---

// Get list of public rooms
app.get('/api/rooms', authenticateToken, (req, res) => {
  const allRooms = db.getRooms();
  const publicRooms = allRooms.filter(r => r.isPrivate !== true);
  res.json(publicRooms);
});

// Get room details by ID (for public/private join)
app.get('/api/rooms/:roomId', authenticateToken, (req, res) => {
  const { roomId } = req.params;
  const allRooms = db.getRooms();
  const room = allRooms.find(r => r.id === roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json(room);
});

// Create a new room (public or private)
app.post('/api/rooms', authenticateToken, (req, res) => {
  const { name, description, isPrivate } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Room name is required' });
  }
  
  const newRoom = {
    id: 'room_' + Math.random().toString(36).substr(2, 9),
    name: name,
    description: description || '',
    isPrivate: isPrivate === true,
    creatorId: req.user.id
  };
  
  db.saveRoom(newRoom);
  res.status(201).json(newRoom);
});

// Get room messages history
app.get('/api/chat/history/room/:roomId', authenticateToken, (req, res) => {
  const { roomId } = req.params;
  res.json(db.getRoomMessages(roomId));
});

// Get DM messages history
app.get('/api/chat/history/dm/:otherUserId', authenticateToken, (req, res) => {
  const currentUserId = req.user.id;
  const { otherUserId } = req.params;
  res.json(db.getDirectMessages(currentUserId, otherUserId));
});

// --- WALLET ROUTES ---

// Recharge wallet
app.post('/api/wallet/recharge', authenticateToken, (req, res) => {
  const { coins } = req.body;
  if (!coins || coins <= 0) {
    return res.status(400).json({ error: 'Valid coin amount is required' });
  }
  
  const user = db.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  user.coins = (user.coins || 0) + Number(coins);
  db.saveUser(user);
  
  res.json({
    id: user.id,
    username: user.username,
    interests: user.interests,
    bio: user.bio,
    avatar: user.avatar,
    coins: user.coins
  });
});

// Deduct coins during call
app.post('/api/wallet/deduct', authenticateToken, (req, res) => {
  const { coins, receiverId } = req.body;
  if (!coins || coins <= 0) {
    return res.status(400).json({ error: 'Valid coin deduction amount is required' });
  }
  
  const user = db.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  user.coins = Math.max(0, (user.coins || 0) - Number(coins));
  db.saveUser(user);

  // Credit 70% to receiver if they are a verified partner host
  if (receiverId) {
    const receiver = db.getUserById(receiverId);
    if (receiver && receiver.isPartner === true) {
      const hostEarned = Math.round(Number(coins) * 0.7); // 70% host ratio (70/30 split)
      receiver.earnings = (receiver.earnings || 0) + hostEarned;
      db.saveUser(receiver);
      console.log(`Host ${receiver.username} credited ${hostEarned} coins (70% of ${coins} call deduction)`);
    }
  }
  
  res.json({
    success: true,
    coins: user.coins
  });
});

// Upload media file (Base64)
app.post('/api/upload', authenticateToken, (req, res) => {
  const { base64Data, filename } = req.body;
  if (!base64Data || !filename) {
    return res.status(400).json({ error: 'No data or filename provided' });
  }
  
  try {
    // Extract base64 content
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 data format' });
    }
    
    const buffer = Buffer.from(matches[2], 'base64');
    const ext = filename.split('.').pop();
    const newFilename = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, newFilename);
    
    fs.writeFileSync(filePath, buffer);
    
    res.json({
      url: `/uploads/${newFilename}`
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: 'Internal server error during upload' });
  }
});

// Admin panel data monitoring
app.get('/api/admin/data', authenticateAdmin, (req, res) => {
  try {
    const allUsers = db.getUsers().map(u => ({
      id: u.id,
      username: u.username,
      mobile: u.mobile || '',
      email: u.email || '',
      interests: u.interests || [],
      bio: u.bio || '',
      avatar: u.avatar || '',
      coins: u.coins !== undefined ? u.coins : 100,
      callRate: u.callRate || 10,
      voiceCallRate: u.voiceCallRate || 10,
      videoCallRate: u.videoCallRate || 20,
      isPartner: u.isPartner || false,
      partnerId: u.partnerId || null,
      earnings: u.earnings || 0,
      referralCode: u.referralCode || '',
      referralPoints: u.referralPoints || 0,
      isBanned: u.isBanned || false,
      isAdmin: u.isAdmin || false,
      verificationStatus: u.verificationStatus || 'none',
      verificationDetails: u.verificationDetails || null
    }));
    
    const allRooms = db.getRooms();
    
    // Read raw data for DMs and room messages
    let allDMs = [];
    let allRoomMessages = [];
    try {
      const dbData = JSON.parse(fs.readFileSync(path.join(__dirname, 'db.json'), 'utf-8'));
      allDMs = dbData.messages || [];
      allRoomMessages = dbData.roomMessages || [];
    } catch (e) {
      // Fallback to empty if reading raw JSON fails
    }
    
    const recharges = db.getRechargeRequests();
    const withdrawals = db.getWithdrawalRequests();
    const adminSettings = db.getAdminSettings();
    
    res.json({
      users: allUsers,
      rooms: allRooms,
      dms: allDMs,
      roomMessages: allRoomMessages,
      recharges,
      withdrawals,
      adminSettings,
      activeLiveStreamsCount: liveStreams.size,
      onlineUsersCount: onlineUsers.size
    });
  } catch (err) {
    console.error("Admin data fetch error:", err);
    res.status(500).json({ error: 'Failed to retrieve admin details' });
  }
});

// Admin User Management: Update user coins, partner status, ban status
app.post('/api/admin/users/update', authenticateAdmin, (req, res) => {
  const { userId, coins, isBanned, isPartner, earnings } = req.body;
  if (!userId) return res.status(400).json({ error: 'User ID is required' });

  const user = db.getUserById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (coins !== undefined) user.coins = Number(coins);
  if (earnings !== undefined) user.earnings = Number(earnings);
  if (isBanned !== undefined) user.isBanned = Boolean(isBanned);
  if (isPartner !== undefined) {
    user.isPartner = Boolean(isPartner);
    if (user.isPartner && !user.partnerId) {
      user.partnerId = 'PT_' + Math.random().toString(36).substr(2, 6).toUpperCase();
    }
  }

  db.saveUser(user);
  res.json({ success: true, user });
});

// Admin User Management: Delete user account
app.delete('/api/admin/users/:userId', authenticateAdmin, (req, res) => {
  const { userId } = req.params;
  const deleted = db.deleteUser(userId);
  if (deleted) {
    res.json({ success: true, message: 'User deleted successfully' });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Submit Partner application (Document verification)
// Submit Partner application (Document verification, PAN card, live selfie, email, mobile)
app.post('/api/partner/apply', authenticateToken, (req, res) => {
  const { 
    email, 
    mobile, 
    idDocType, 
    idDocNumber, 
    idDocData, 
    panNumber, 
    panDocData, 
    liveSelfieData 
  } = req.body;

  if (!email || !mobile) {
    return res.status(400).json({ error: 'Email ID and Mobile Number are required' });
  }

  if (!idDocType || !idDocNumber) {
    return res.status(400).json({ error: 'Primary ID Document Type (Aadhaar/Voter/DL/Passport) and Document Number are required' });
  }

  if (!panNumber) {
    return res.status(400).json({ error: 'PAN Card Number is mandatory for Partner Host verification' });
  }

  const user = db.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  try {
    const idDocUrl = saveBase64File(idDocData, `kyc_id_${user.id}`) || (user.verificationDetails?.idDocUrl || '');
    const panDocUrl = saveBase64File(panDocData, `kyc_pan_${user.id}`) || (user.verificationDetails?.panDocUrl || '');
    const liveSelfieUrl = saveBase64File(liveSelfieData, `kyc_selfie_${user.id}`) || (user.verificationDetails?.liveSelfieUrl || '');

    user.email = email.trim();
    user.mobile = mobile.trim();
    user.verificationStatus = 'pending';
    user.verificationDetails = {
      email: email.trim(),
      mobile: mobile.trim(),
      idDocType: idDocType.trim(),
      idDocNumber: idDocNumber.trim(),
      idDocUrl,
      panNumber: panNumber.trim().toUpperCase(),
      panDocUrl,
      liveSelfieUrl,
      submittedAt: Date.now()
    };

    db.saveUser(user);

    res.json({
      success: true,
      verificationStatus: 'pending',
      verificationDetails: user.verificationDetails
    });
  } catch (err) {
    console.error("Partner application error:", err);
    res.status(500).json({ error: 'Internal server error submitting verification documents' });
  }
});

// Admin endpoint to process partner verification applications
app.post('/api/admin/verifications/action', authenticateAdmin, (req, res) => {
  const { userId, action } = req.body;
  if (!userId || !action) {
    return res.status(400).json({ error: 'UserId and Action (approve/reject) are required' });
  }

  const user = db.getUserById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (action === 'approve') {
    user.isPartner = true;
    user.verificationStatus = 'approved';
    user.partnerId = 'PT_' + Math.random().toString(36).substr(2, 6).toUpperCase();
  } else {
    user.isPartner = false;
    user.verificationStatus = 'rejected';
  }

  db.saveUser(user);
  res.json({
    success: true,
    userId: user.id,
    isPartner: user.isPartner,
    partnerId: user.partnerId,
    verificationStatus: user.verificationStatus
  });
});

// Submit Recharge Request (User to Admin)
app.post('/api/wallet/recharge/request', authenticateToken, (req, res) => {
  const { coins, amount, transactionId } = req.body;
  if (!coins || !amount || !transactionId) {
    return res.status(400).json({ error: 'Coins, Amount, and Transaction ID are required' });
  }

  const user = db.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const request = {
    id: 'req_' + Math.random().toString(36).substr(2, 9),
    userId: user.id,
    username: user.username,
    coins: Number(coins),
    amount: Number(amount),
    transactionId: transactionId.trim(),
    status: 'pending',
    timestamp: Date.now()
  };

  db.saveRechargeRequest(request);
  res.json({ success: true, request });
});

// Submit Withdrawal Request (Partner Host to Admin - Minimum Rs. 500 / 500 Coins)
app.post('/api/wallet/withdraw/request', authenticateToken, (req, res) => {
  const { coins, upiId } = req.body;
  if (!coins || Number(coins) < 500 || !upiId) {
    return res.status(400).json({ error: 'Minimum withdrawal amount is Rs. 500 (500 Coins) and UPI ID is required' });
  }

  const user = db.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.earnings < Number(coins)) {
    return res.status(400).json({ error: 'Insufficient earnings balance to withdraw' });
  }

  // Deduct coins from earnings temporarily (holding state)
  user.earnings -= Number(coins);
  db.saveUser(user);

  const request = {
    id: 'wdr_' + Math.random().toString(36).substr(2, 9),
    userId: user.id,
    username: user.username,
    coins: Number(coins),
    upiId: upiId.trim(),
    status: 'pending',
    timestamp: Date.now()
  };

  db.saveWithdrawalRequest(request);
  res.json({ success: true, request, remainingEarnings: user.earnings });
});

// Admin endpoint to Approve/Reject Recharge request
app.post('/api/admin/recharges/action', authenticateAdmin, (req, res) => {
  const { id, action } = req.body;
  if (!id || !action) {
    return res.status(400).json({ error: 'Request ID and action are required' });
  }

  const requests = db.getRechargeRequests();
  const foundReq = requests.find(r => r.id === id);
  if (!foundReq) return res.status(404).json({ error: 'Recharge request not found' });

  if (foundReq.status !== 'pending') {
    return res.status(400).json({ error: 'Request has already been processed' });
  }

  if (action === 'approve') {
    foundReq.status = 'approved';
    const user = db.getUserById(foundReq.userId);
    if (user) {
      user.coins = (user.coins || 0) + foundReq.coins;
      db.saveUser(user);
    }
  } else {
    foundReq.status = 'rejected';
  }

  db.saveRechargeRequest(foundReq);
  res.json({ success: true, request: foundReq });
});

// Admin endpoint to Approve/Reject Withdrawal request
app.post('/api/admin/withdrawals/action', authenticateAdmin, (req, res) => {
  const { id, action } = req.body;
  if (!id || !action) {
    return res.status(400).json({ error: 'Request ID and action are required' });
  }

  const requests = db.getWithdrawalRequests();
  const foundReq = requests.find(w => w.id === id);
  if (!foundReq) return res.status(404).json({ error: 'Withdrawal request not found' });

  if (foundReq.status !== 'pending') {
    return res.status(400).json({ error: 'Request has already been processed' });
  }

  if (action === 'approve') {
    foundReq.status = 'approved';
  } else {
    foundReq.status = 'rejected';
    // Refund earnings coins back to host
    const user = db.getUserById(foundReq.userId);
    if (user) {
      user.earnings = (user.earnings || 0) + foundReq.coins;
      db.saveUser(user);
    }
  }

  db.saveWithdrawalRequest(foundReq);
  res.json({ success: true, request: foundReq });
});

// Admin endpoint to upload Official UPI payment QR Code
app.post('/api/admin/qrcode', authenticateAdmin, (req, res) => {
  const { qrPhotoData, qrPhotoName } = req.body;
  if (!qrPhotoData || !qrPhotoName) {
    return res.status(400).json({ error: 'Photo data and filename are required' });
  }

  try {
    const matches = qrPhotoData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 data format' });
    }

    const buffer = Buffer.from(matches[2], 'base64');
    const ext = qrPhotoName.split('.').pop();
    const newFilename = `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, newFilename);
    fs.writeFileSync(filePath, buffer);

    const settings = {
      qrCodeUrl: `/uploads/${newFilename}`
    };

    db.saveAdminSettings(settings);
    res.json({ success: true, qrCodeUrl: settings.qrCodeUrl });
  } catch (err) {
    console.error("QR Code update error:", err);
    res.status(500).json({ error: 'Internal server error uploading payment code' });
  }
});

// Public endpoint to load admin payment and support settings
app.get('/api/admin/settings', (req, res) => {
  const settings = db.getAdminSettings() || {};
  res.json({
    qrCodeUrl: settings.qrCodeUrl || '',
    whatsappNumber: settings.whatsappNumber || '+91 9876543210',
    supportEmail: settings.supportEmail || 'support@ajnabidil.com',
    supportHours: settings.supportHours || '24x7 Live Help Desk',
    helpText: settings.helpText || 'Official Ajnabi Dil Help Desk for Coin Recharges, Host KYC Verification & Payout Assistance.'
  });
});

app.get('/api/support/info', (req, res) => {
  const settings = db.getAdminSettings() || {};
  res.json({
    qrCodeUrl: settings.qrCodeUrl || '',
    whatsappNumber: settings.whatsappNumber || '+91 9876543210',
    supportEmail: settings.supportEmail || 'support@ajnabidil.com',
    supportHours: settings.supportHours || '24x7 Live Help Desk',
    helpText: settings.helpText || 'Official Ajnabi Dil Help Desk for Coin Recharges, Host KYC Verification & Payout Assistance.'
  });
});

// Update support & payment settings (Admin Only)
app.put('/api/admin/settings', authenticateAdmin, (req, res) => {
  const { whatsappNumber, supportEmail, supportHours, helpText } = req.body;
  const currentSettings = db.getAdminSettings() || {};
  
  const updatedSettings = {
    ...currentSettings,
    whatsappNumber: whatsappNumber !== undefined ? whatsappNumber.trim() : (currentSettings.whatsappNumber || '+91 9876543210'),
    supportEmail: supportEmail !== undefined ? supportEmail.trim() : (currentSettings.supportEmail || 'support@ajnabidil.com'),
    supportHours: supportHours !== undefined ? supportHours.trim() : (currentSettings.supportHours || '24x7 Live Help Desk'),
    helpText: helpText !== undefined ? helpText.trim() : (currentSettings.helpText || 'Official Ajnabi Dil Help Desk.')
  };

  db.saveAdminSettings(updatedSettings);
  res.json({ success: true, settings: updatedSettings });
});

// Public endpoint for help desk support info
app.get('/api/support/info', (req, res) => {
  const settings = db.getAdminSettings() || {};
  res.json({
    whatsappNumber: settings.whatsappNumber || '+91 9876543210',
    supportEmail: settings.supportEmail || 'support@ajnabidil.com',
    supportHours: settings.supportHours || '24x7 Live Help Desk',
    helpText: settings.helpText || 'Official Help Desk for Coin Recharges, Host KYC Verification & Payout Assistance.'
  });
});

// Upload a new story
app.post('/api/stories', authenticateToken, (req, res) => {
  const { mediaData, mediaName, caption } = req.body;
  if (!mediaData || !mediaName) {
    return res.status(400).json({ error: 'Media data and name are required' });
  }

  const user = db.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  try {
    const matches = mediaData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 data format' });
    }

    const buffer = Buffer.from(matches[2], 'base64');
    const ext = mediaName.split('.').pop();
    const newFilename = `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, newFilename);
    fs.writeFileSync(filePath, buffer);

    const story = {
      id: 'story_' + Math.random().toString(36).substr(2, 9),
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      mediaUrl: `/uploads/${newFilename}`,
      caption: caption || '',
      timestamp: Date.now()
    };

    db.saveStory(story);
    res.status(201).json(story);
  } catch (err) {
    console.error("Story upload error:", err);
    res.status(500).json({ error: 'Internal server error uploading story' });
  }
});

// Retrieve stories
app.get('/api/stories', authenticateToken, (req, res) => {
  res.json(db.getStories());
});

// Fetch active live streams list
app.get('/api/live/streams', authenticateToken, (req, res) => {
  const streams = Array.from(liveStreams.values());
  res.json(streams);
});

// --- SOCKET.IO REAL-TIME LOGIC ---
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  },
  pingTimeout: 10000,
  pingInterval: 15000,
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 1e7
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication token required'));
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return next(new Error('Invalid token'));
    socket.user = user;
    next();
  });
});

io.on('connection', (socket) => {
  const userId = socket.user.id;
  console.log(`User connected: ${socket.user.username} (${userId})`);
  
  // Register active socket connection
  onlineUsers.set(userId, socket.id);
  io.emit('user-status-change', { userId: userId, isOnline: true });
  
  // Handle Room Join
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`${socket.user.username} joined room: ${roomId}`);
  });
  
  // Handle Room Message
  socket.on('send-room-message', (data) => {
    const { roomId, content, mediaType, fileUrl } = data;
    if (!roomId || (!content && !fileUrl)) return;
    
    const message = {
      id: 'msg_' + Math.random().toString(36).substr(2, 9),
      roomId: roomId,
      senderId: userId,
      senderName: socket.user.username,
      content: content || '',
      mediaType: mediaType || 'text',
      fileUrl: fileUrl || null,
      timestamp: new Date().toISOString()
    };
    
    db.saveRoomMessage(message);
    io.to(roomId).emit('receive-room-message', message);
  });
  
  // Handle Direct Message
  socket.on('send-direct-message', (data) => {
    const { receiverId, content, mediaType, fileUrl } = data;
    if (!receiverId || (!content && !fileUrl)) return;
    
    const message = {
      id: 'msg_' + Math.random().toString(36).substr(2, 9),
      senderId: userId,
      receiverId: receiverId,
      content: content || '',
      mediaType: mediaType || 'text',
      fileUrl: fileUrl || null,
      timestamp: new Date().toISOString()
    };
    
    db.saveDirectMessage(message);
    
    // Send to receiver if online
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('receive-direct-message', message);
    }
    
    // Also send back to sender's other tabs if any, or acknowledge
    socket.emit('receive-direct-message', message);
  });

  // Handle Message Deletion
  socket.on('delete-message', (data) => {
    const { messageId, targetId, isDM } = data;
    if (!messageId || !targetId) return;
    
    let deletedMessage = null;
    if (isDM) {
      deletedMessage = db.deleteDirectMessage(messageId, userId);
      if (deletedMessage) {
        const receiverSocketId = onlineUsers.get(targetId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('message-deleted', { messageId, isDM: true });
        }
        socket.emit('message-deleted', { messageId, isDM: true });
      }
    } else {
      deletedMessage = db.deleteRoomMessage(messageId, userId);
      if (deletedMessage) {
        io.to(targetId).emit('message-deleted', { messageId, isDM: false, roomId: targetId });
      }
    }
  });
  
  // --- REAL-TIME PAID CALL SIGNALS ---
  
  // 1. Caller initiates a call
  socket.on('initiate-call', (data) => {
    const { receiverId, type } = data; // type: 'audio' or 'video'
    const receiverSocketId = onlineUsers.get(receiverId);
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('incoming-call', {
        callerId: userId,
        callerName: socket.user.username,
        callerAvatar: socket.user.avatar,
        type: type
      });
      console.log(`Call initiated: ${socket.user.username} -> ${receiverId} (${type})`);
    } else {
      socket.emit('call-failed', { reason: 'User is offline' });
    }
  });

  // 2. Receiver accepts the call
  socket.on('accept-call', (data) => {
    const { callerId } = data;
    const callerSocketId = onlineUsers.get(callerId);
    
    if (callerSocketId) {
      io.to(callerSocketId).emit('call-accepted', {
        receiverId: userId
      });
      console.log(`Call accepted by: ${userId} for caller: ${callerId}`);
    }
  });

  // 3. Receiver rejects the call
  socket.on('reject-call', (data) => {
    const { callerId } = data;
    const callerSocketId = onlineUsers.get(callerId);
    
    if (callerSocketId) {
      io.to(callerSocketId).emit('call-rejected', {
        reason: 'Call declined'
      });
      console.log(`Call rejected by: ${userId}`);
    }
  });

  // 4. Either hangs up
  socket.on('hangup-call', (data) => {
    const { otherUserId } = data;
    const otherSocketId = onlineUsers.get(otherUserId);
    
    if (otherSocketId) {
      io.to(otherSocketId).emit('call-ended');
    }
    console.log(`Call hung up by: ${userId} with: ${otherUserId}`);
  });

  // 5. Triggered if coin wallet runs dry during call
  socket.on('insufficient-coins-end', (data) => {
    const { otherUserId } = data;
    const otherSocketId = onlineUsers.get(otherUserId);
    
    if (otherSocketId) {
      io.to(otherSocketId).emit('call-ended', { reason: 'insufficient_coins' });
    }
    console.log(`Call ended due to insufficient coins: ${userId} calling ${otherUserId}`);
  });
  
  // --- REAL-TIME LIVE STREAM EVENTS ---

  // Start live stream (Allowed for Partner Hosts OR Normal IDs with min. Rs. 500 / 500 Coins)
  socket.on('start-live', (data) => {
    const { title } = data;
    const hostUser = db.getUserById(userId);
    if (!hostUser) return;

    // Normal ID check: Must have at least Rs. 500 (500 Coins) in wallet
    if (!hostUser.isPartner && (hostUser.coins || 0) < 500) {
      socket.emit('live-error', { 
        reason: 'Minimum Rs. 500 (500 Coins) in wallet is required for Normal IDs to start a Live Show. Please recharge.' 
      });
      return;
    }

    const stream = {
      id: 'stream_' + userId,
      hostId: userId,
      hostName: hostUser.username,
      hostAvatar: hostUser.avatar,
      title: title || `${hostUser.username}'s Live Show`,
      isPrivate: false,
      entryFee: 0,
      viewers: []
    };

    liveStreams.set(userId, stream);
    socket.join(`live_room_${userId}`);
    io.emit('live-list-updated', Array.from(liveStreams.values()));
    console.log(`Live stream started by ${hostUser.isPartner ? 'Partner Host' : 'Normal User (Wallet >= 500c)'}: ${hostUser.username}`);
  });

  // Viewer joins live stream
  socket.on('join-live', (data) => {
    const { hostId } = data;
    const stream = liveStreams.get(hostId);
    if (!stream) {
      socket.emit('live-error', { reason: 'Stream not active' });
      return;
    }

    socket.join(`live_room_${hostId}`);
    
    // Add viewer if not already in list
    if (!stream.viewers.includes(userId)) {
      stream.viewers.push(userId);
    }
    
    liveStreams.set(hostId, stream);
    io.to(`live_room_${hostId}`).emit('viewer-list-updated', { viewersCount: stream.viewers.length });
    io.emit('live-list-updated', Array.from(liveStreams.values()));
    
    // Send current status of the stream to joiner
    socket.emit('live-status', { 
      isPrivate: stream.isPrivate, 
      entryFee: stream.entryFee,
      privateDurationMinutes: stream.privateDurationMinutes || 0,
      privateExpiresAt: stream.privateExpiresAt || null
    });
    
    console.log(`Viewer ${socket.user.username} joined live stream of: ${hostId}`);
  });

  // Viewer leaves live stream
  socket.on('leave-live', (data) => {
    const { hostId } = data;
    socket.leave(`live_room_${hostId}`);
    
    const stream = liveStreams.get(hostId);
    if (stream) {
      stream.viewers = stream.viewers.filter(v => v !== userId);
      liveStreams.set(hostId, stream);
      io.to(`live_room_${hostId}`).emit('viewer-list-updated', { viewersCount: stream.viewers.length });
      io.emit('live-list-updated', Array.from(liveStreams.values()));
    }
    console.log(`Viewer ${socket.user.username} left live stream of: ${hostId}`);
  });

  // Host toggles private show (with custom timer & minimum 300 coins entry fee)
  socket.on('toggle-private', (data) => {
    const { isPrivate, entryFee, durationMinutes } = data;
    const stream = liveStreams.get(userId);
    if (!stream) return;

    stream.isPrivate = isPrivate;
    stream.entryFee = isPrivate ? Math.max(300, Number(entryFee) || 300) : 0;
    stream.privateDurationMinutes = Number(durationMinutes) || 0;
    stream.privateExpiresAt = isPrivate && Number(durationMinutes) > 0 ? Date.now() + (Number(durationMinutes) * 60 * 1000) : null;
    
    liveStreams.set(userId, stream);
    io.to(`live_room_${userId}`).emit('live-switched-private', { 
      isPrivate: stream.isPrivate, 
      entryFee: stream.entryFee,
      privateDurationMinutes: stream.privateDurationMinutes,
      privateExpiresAt: stream.privateExpiresAt
    });
    io.emit('live-list-updated', Array.from(liveStreams.values()));
    console.log(`Host ${socket.user.username} switched live stream private: ${isPrivate} with fee: ${stream.entryFee}, timer: ${durationMinutes} mins`);
  });

  // Viewer pays entry fee
  socket.on('pay-live-fee', (data) => {
    const { hostId, fee } = data;
    const viewerUser = db.getUserById(userId);
    const hostUser = db.getUserById(hostId);
    if (!viewerUser || !hostUser) return;

    const coinsToDeduct = Number(fee);
    if (viewerUser.coins < coinsToDeduct) {
      socket.emit('live-error', { reason: 'Insufficient coins to unlock Private Show' });
      return;
    }

    // Deduct coins from viewer
    viewerUser.coins = Math.max(0, (viewerUser.coins || 0) - coinsToDeduct);
    db.saveUser(viewerUser);

    // Credit 70% earnings to host (70/30 split)
    const hostEarned = Math.round(coinsToDeduct * 0.7);
    hostUser.earnings = (hostUser.earnings || 0) + hostEarned;
    db.saveUser(hostUser);

    // Send success responses
    socket.emit('fee-paid-success', { coins: viewerUser.coins });
    io.to(`live_room_${hostId}`).emit('live-comment-received', {
      sender: 'System',
      comment: `🎉 @${viewerUser.username} entered the Private Show!`
    });
    console.log(`Viewer ${viewerUser.username} paid ${fee} coins to enter ${hostUser.username}'s private live (Host earned: ${hostEarned})`);
  });

  // Live comment
  socket.on('send-live-comment', (data) => {
    const { hostId, comment } = data;
    io.to(`live_room_${hostId}`).emit('live-comment-received', {
      sender: socket.user.username,
      comment: comment
    });
  });

  // Live gift
  socket.on('send-live-gift', (data) => {
    const { hostId, giftType, coins } = data;
    const viewerUser = db.getUserById(userId);
    const hostUser = db.getUserById(hostId);
    if (!viewerUser || !hostUser) return;

    const giftCost = Number(coins);
    if (viewerUser.coins < giftCost) {
      socket.emit('live-error', { reason: 'Insufficient coins to send gift' });
      return;
    }

    // Deduct from viewer
    viewerUser.coins = Math.max(0, (viewerUser.coins || 0) - giftCost);
    db.saveUser(viewerUser);

    // Credit 70% earnings to host (70/30 split)
    const hostEarned = Math.round(giftCost * 0.7);
    hostUser.earnings = (hostUser.earnings || 0) + hostEarned;
    db.saveUser(hostUser);

    // Broadcast gift received to the room
    io.to(`live_room_${hostId}`).emit('live-gift-received', {
      sender: socket.user.username,
      giftType: giftType,
      coins: giftCost,
      viewerCoins: viewerUser.coins
    });
    
    socket.emit('fee-paid-success', { coins: viewerUser.coins });

    console.log(`Viewer ${viewerUser.username} sent ${giftType} (${coins} coins) to host ${hostUser.username}`);
  });

  // Host ends live stream
  socket.on('end-live', (data) => {
    const stream = liveStreams.get(userId);
    if (stream) {
      io.to(`live_room_${userId}`).emit('live-ended');
      liveStreams.delete(userId);
      io.emit('live-list-updated', Array.from(liveStreams.values()));
      console.log(`Live stream ended by host: ${socket.user.username}`);
    }
  });

  // Handle Disconnect
  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    io.emit('user-status-change', { userId: userId, isOnline: false });
    
    // Clean up live stream if host disconnects
    if (liveStreams.has(userId)) {
      io.to(`live_room_${userId}`).emit('live-ended');
      liveStreams.delete(userId);
      io.emit('live-list-updated', Array.from(liveStreams.values()));
    }
    // Remove viewer from other live streams
    for (const [hostId, stream] of liveStreams.entries()) {
      if (stream.viewers.includes(userId)) {
        stream.viewers = stream.viewers.filter(v => v !== userId);
        liveStreams.set(hostId, stream);
        io.to(`live_room_${hostId}`).emit('viewer-list-updated', { viewersCount: stream.viewers.length });
      }
    }
    
    console.log(`User disconnected: ${socket.user.username}`);
  });
});

// Dynamic Local IP Detection Helper
function getLocalIpAddress() {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal && iface.address !== '127.0.0.1') {
          return iface.address;
        }
      }
    }
  } catch (e) {}
  return '172.20.10.2';
}

const activeLocalIp = getLocalIpAddress();

// App & APK Download Endpoints for Direct Chrome / Browser Downloads
const handleApkDownload = (req, res) => {
  const candidatePaths = [
    path.join(__dirname, '../AjnabiDil_Latest.apk'),
    path.join(__dirname, '../frontend/dist/AjnabiDil_Latest.apk'),
    path.join(__dirname, '../frontend/public/AjnabiDil_Latest.apk'),
    path.join(__dirname, '../AjnabiDil_Trial.apk')
  ];

  let apkPath = null;
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      apkPath = p;
      break;
    }
  }

  if (apkPath) {
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="AjnabiDil_Latest.apk"');
    res.sendFile(path.resolve(apkPath));
  } else {
    res.status(404).send('Ajnabi Dil APK is currently preparing. Please try again in a moment.');
  }
};

app.get('/download-apk', handleApkDownload);
app.get('/download/apk', handleApkDownload);
app.get('/AjnabiDil_Latest.apk', handleApkDownload);
app.get('/AjnabiDil.apk', handleApkDownload);

app.get('/api/app/info', (req, res) => {
  const host = req.get('host');
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const isCloudHost = host && !host.includes('localhost') && !host.includes('127.0.0.1') && !host.includes('172.20.10.2');
  const serverBase = isCloudHost ? `${protocol}://${host}` : (liveTunnelUrl || `http://${activeLocalIp}:${PORT}`);

  res.json({
    appName: 'Ajnabi Dil',
    version: '2.5.0',
    tagline: 'Dil Se Dil Ka Connection 💖',
    apkDownloadUrl: `${serverBase}/download-apk`,
    webAppUrl: `${serverBase}/`,
    downloadPageUrl: `${serverBase}/#/download`,
    releaseDate: '2026-09-02',
    apkSize: '731 KB'
  });
});

let liveTunnelUrl = '';

// Live Tunnel & Cloud Host Info Endpoint for public sharing
app.get('/api/tunnel/info', (req, res) => {
  const host = req.get('host');
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const isCloudHost = host && !host.includes('localhost') && !host.includes('127.0.0.1') && !host.includes('172.20.10.2');
  const cloudUrl = isCloudHost ? `${protocol}://${host}` : '';
  const lanUrl = `http://${activeLocalIp}:${PORT}`;
  const localUrl = `http://localhost:${PORT}`;
  const preferredUrl = cloudUrl || liveTunnelUrl || lanUrl;

  res.json({
    tunnelUrl: liveTunnelUrl || cloudUrl,
    cloudUrl: cloudUrl,
    lanUrl: lanUrl,
    localUrl: localUrl,
    preferredUrl: preferredUrl,
    apkDownloadUrl: `${preferredUrl}/download-apk`,
    webAppUrl: `${preferredUrl}/#/download`
  });
});

// SPA wildcard fallback for Chrome and Web Browser navigation
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io') || req.path.endsWith('.apk')) {
    return next();
  }
  const indexHtml = path.join(FRONTEND_DIST, 'index.html');
  if (fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }
  res.json({ status: 'Ajnabi Dil Realtime Engine is running' });
});

const PORT = process.env.PORT || 5000;

// Setup resilient tunnel
async function setupPublicTunnel(port) {
  try {
    const localtunnel = require('localtunnel');
    const tunnel = await localtunnel({ port: port });
    liveTunnelUrl = tunnel.url;
    console.log(`🌐 WORLDWIDE PUBLIC LIVE LINK : ${tunnel.url}`);
    console.log(`📥 PUBLIC APK DOWNLOAD LINK  : ${tunnel.url}/download-apk`);
    console.log(`📱 PUBLIC SHARE/DOWNLOAD PAGE: ${tunnel.url}/#/download`);
    console.log(`======================================================\n`);

    tunnel.on('close', () => {
      console.log('Tunnel closed. Reconnecting in 5 seconds...');
      liveTunnelUrl = '';
      setTimeout(() => setupPublicTunnel(port), 5000);
    });

    tunnel.on('error', (err) => {
      console.log('Tunnel error:', err.message);
      liveTunnelUrl = '';
    });
  } catch (err) {
    console.log('Public tunnel note:', err.message);
    console.log(`======================================================\n`);
  }
}

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Ajnabi Dil Local Server: http://localhost:${PORT}`);
  console.log(`📱 LAN Mobile Network IP   : http://${activeLocalIp}:${PORT}`);
  console.log(`📲 Direct APK Download     : http://${activeLocalIp}:${PORT}/download-apk`);
  console.log(`✨ Web App / Download Page : http://${activeLocalIp}:${PORT}/#/download`);
  
  await setupPublicTunnel(PORT);
});
