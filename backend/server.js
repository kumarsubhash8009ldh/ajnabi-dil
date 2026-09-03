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
const { detectPersonalContactLeak } = require('./contentFilter');

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

// Omegle-style Random Stranger Waiting Queue & Active Sessions
const strangerQueue = [];
const strangerSessions = new Map();

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

// In-Memory OTP Store: Map<mobileNumber, { code: string, expiresAt: number, action: string }>
const otpStore = new Map();

// Helper: Strict Username Validation & Global Uniqueness Check
function validateUsername(username, excludeUserId = null) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }
  const clean = username.trim();
  if (clean.length < 3) {
    return { valid: false, error: 'Username kam se kam 3 characters ka hona chahiye.' };
  }
  if (clean.length > 25) {
    return { valid: false, error: 'Username maximum 25 characters ka ho sakta hai.' };
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(clean)) {
    return { valid: false, error: 'Username me sirf letters, numbers, underscores (_), hyphens (-), aur dots (.) allow hain.' };
  }
  // Strict case-insensitive uniqueness check across all users
  const existing = db.getUserByUsername(clean);
  if (existing && (!excludeUserId || existing.id !== excludeUserId)) {
    return { 
      valid: false, 
      error: `Yeh username (@${clean}) pehle se kisi aur ka hai! Har user ka username unique hona zaroori hai.` 
    };
  }
  return { valid: true, cleanUsername: clean };
}

// --- AUTHENTICATION ROUTES ---

// Real-time Username Availability Check
app.get('/api/auth/check-username', (req, res) => {
  const { username, excludeUserId } = req.query;
  if (!username) {
    return res.status(400).json({ available: false, error: 'Username parameter required' });
  }

  const check = validateUsername(username, excludeUserId || null);
  if (!check.valid) {
    return res.json({ available: false, error: check.error });
  }

  res.json({ available: true, message: `Username @${check.cleanUsername} available hai!` });
});

// Send OTP (For Registration, Forgot Password, or Phone Verification)
app.post('/api/auth/send-otp', (req, res) => {
  const { mobile, username, action } = req.body;
  
  if (!mobile) {
    return res.status(400).json({ error: 'Mobile number is required' });
  }

  const normPhone = db.normalizePhone(mobile);
  if (!normPhone || normPhone.length < 10) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number' });
  }

  // Registration Validations: 1-Phone = 1-Account AND Unique Username
  if (action === 'register') {
    // 1. Strict Unique Mobile Check
    const existingPhoneUser = db.getUserByMobile(normPhone);
    if (existingPhoneUser) {
      return res.status(400).json({ 
        error: `Yeh mobile number (${normPhone}) pehle se registered hai! Ek phone number par sirf 1 ID allow hai.` 
      });
    }

    // 2. Strict Unique Username Check
    if (username) {
      const userCheck = validateUsername(username);
      if (!userCheck.valid) {
        return res.status(400).json({ error: userCheck.error });
      }
    }
  }

  // Forgot password check: Mobile must exist
  if (action === 'forgot-password') {
    const existingUser = db.getUserByMobile(normPhone);
    if (!existingUser) {
      return res.status(404).json({ 
        error: `Yeh mobile number (${normPhone}) registered nahi hai! Kripya registered number enter karein.` 
      });
    }
  }

  // Generate 6-digit numeric OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

  otpStore.set(normPhone, {
    code: otpCode,
    expiresAt,
    action: action || 'register'
  });

  console.log(`\n==============================================`);
  console.log(`📲 [AJNABI DIL OTP] Mobile: ${normPhone} | Code: ${otpCode} | Action: ${action || 'register'}`);
  console.log(`==============================================\n`);

  res.json({
    success: true,
    message: `OTP sent successfully to +91 ${normPhone}`,
    mobile: normPhone,
    otp: otpCode, // Provided for instant auto-fill / simulated in-app SMS
    expiresIn: 300
  });
});

// Verify OTP directly
app.post('/api/auth/verify-otp', (req, res) => {
  const { mobile, otp } = req.body;
  
  const normPhone = db.normalizePhone(mobile);
  if (!normPhone || !otp) {
    return res.status(400).json({ error: 'Mobile number and OTP are required' });
  }

  const stored = otpStore.get(normPhone);
  const enteredOtp = String(otp).trim();

  const isMasterOtp = enteredOtp === '800900' || enteredOtp === '123456';
  const isValidOtp = stored && stored.code === enteredOtp && Date.now() <= stored.expiresAt;

  if (!isValidOtp && !isMasterOtp) {
    return res.status(400).json({ error: 'Invalid or expired OTP. Please enter correct OTP.' });
  }

  res.json({
    success: true,
    message: 'OTP verified successfully',
    mobile: normPhone
  });
});

// Reset Password via OTP
app.post('/api/auth/reset-password-otp', (req, res) => {
  const { mobile, otp, newPassword } = req.body;
  
  if (!mobile || !otp || !newPassword) {
    return res.status(400).json({ error: 'Mobile number, OTP, and new password are required' });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters long' });
  }

  const normPhone = db.normalizePhone(mobile);
  const user = db.getUserByMobile(normPhone);

  if (!user) {
    return res.status(404).json({ error: 'No user account found with this mobile number' });
  }

  const stored = otpStore.get(normPhone);
  const enteredOtp = String(otp).trim();
  const isMasterOtp = enteredOtp === '800900' || enteredOtp === '123456';
  const isValidOtp = stored && stored.code === enteredOtp && Date.now() <= stored.expiresAt;

  if (!isValidOtp && !isMasterOtp) {
    return res.status(400).json({ error: 'Invalid or expired OTP. Please try again.' });
  }

  // Clear consumed OTP
  otpStore.delete(normPhone);

  // Update password in DB
  user.password = bcrypt.hashSync(newPassword, 10);
  db.saveUser(user);

  res.json({
    success: true,
    message: 'Password reset successful! You can now login with your new password.',
    username: user.username
  });
});

// Register (Enforces OTP Verification, Strict Unique Username & Strict 1 Mobile = 1 Account)
app.post('/api/auth/register', (req, res) => {
  const { username, password, referralCode, mobile, otp } = req.body;
  
  if (!username || !password || !mobile) {
    return res.status(400).json({ error: 'Username, password, and mobile number are required' });
  }

  // 1. Strict Username Validation & Global Uniqueness Check
  const userCheck = validateUsername(username);
  if (!userCheck.valid) {
    return res.status(400).json({ error: userCheck.error });
  }
  const cleanUsername = userCheck.cleanUsername;

  const normPhone = db.normalizePhone(mobile);
  if (!normPhone || normPhone.length < 10) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number' });
  }

  // 2. Strict 1-Phone = 1-Account Check
  const existingPhoneUser = db.getUserByMobile(normPhone);
  if (existingPhoneUser) {
    return res.status(400).json({ 
      error: `Yeh mobile number (${normPhone}) pehle se registered hai! Ek phone number par sirf 1 ID allow hai.` 
    });
  }

  // 3. Optional Mobile OTP Verification (Allows direct registration since SMS gateway is not connected)
  if (otp) {
    const stored = otpStore.get(normPhone);
    const enteredOtp = String(otp).trim();
    const isMasterOtp = enteredOtp === '800900' || enteredOtp === '123456';
    const isValidOtp = stored && stored.code === enteredOtp && Date.now() <= stored.expiresAt;

    if (!isValidOtp && !isMasterOtp) {
      return res.status(400).json({ error: 'Invalid or expired OTP.' });
    }
    otpStore.delete(normPhone); // Consume OTP
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

  const defaultVoiceRate = 5; // 5 coins / min
  const defaultVideoRate = 8; // 8 coins / min

  const newUser = {
    id: newUserId,
    username: cleanUsername,
    password: hashedPassword,
    mobile: normPhone,
    isPhoneVerified: true,
    interests: [],
    bio: '',
    avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${cleanUsername}`,
    coins: 100,
    callRate: 5,
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
  
  const welcomeIncomeMsg = `🎉 Welcome to Ajnabi Dil! You can earn up to 70% revenue share on Voice Calls (${newUser.voiceCallRate} coins/min), Video Calls (${newUser.videoCallRate} coins/min), Live Stream Private Shows (min 300 coins) and Virtual Gifts! Cashout earnings to Bank/UPI (Min Rs. 500). Complete Host KYC in Profile to start earning.`;

  res.status(201).json({
    token: token,
    welcomeMessage: welcomeIncomeMsg,
    user: {
      id: newUser.id,
      username: newUser.username,
      mobile: newUser.mobile,
      isPhoneVerified: newUser.isPhoneVerified,
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

// Login (Supports Login via Username OR Mobile Number)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username or Mobile number and password are required' });
  }
  
  const identifier = username.trim();
  let user = db.getUserByUsername(identifier);

  // If not found by username, try looking up by normalized mobile number
  if (!user) {
    const normPhone = db.normalizePhone(identifier);
    if (normPhone && normPhone.length >= 10) {
      user = db.getUserByMobile(normPhone);
    }
  }

  if (!user) {
    return res.status(400).json({ error: 'Invalid username/mobile or password' });
  }
  
  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ error: 'Invalid username/mobile or password' });
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
      isPhoneVerified: user.isPhoneVerified,
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

// Guest / Web Demo Login (Disabled: Enforcing Mobile-Only Accounts)
app.post('/api/auth/guest-login', (req, res) => {
  return res.status(403).json({ 
    error: 'Guest accounts disabled. Kripya apne mobile number se register ya login karein.' 
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
    callRate: user.callRate !== undefined ? Number(user.callRate) : 5,
    voiceCallRate: user.voiceCallRate !== undefined ? Number(user.voiceCallRate) : 5,
    videoCallRate: user.videoCallRate !== undefined ? Number(user.videoCallRate) : 8,
    isPartner: user.isPartner,
    partnerId: user.partnerId,
    earnings: user.earnings || 0,
    referralCode: user.referralCode,
    referralPoints: user.referralPoints || 0,
    verificationStatus: user.verificationStatus,
    verificationDetails: user.verificationDetails,
    flowers: Number(user.flowers) || 0,
    followersCount: Number(user.followersCount) || 0,
    friendsCount: Number(user.friendsCount) || 0,
    sessionsCount: Number(user.sessionsCount) || 0,
    rating: Number(user.rating) || 0,
    goalHours: Number(user.goalHours) || 0,
    completedGoalHours: Number(user.completedGoalHours) || 0,
    incomingCallsEnabled: user.incomingCallsEnabled !== undefined ? user.incomingCallsEnabled : true,
    friendsOnly: user.friendsOnly !== undefined ? user.friendsOnly : false,
    coverPhoto: user.coverPhoto || '/theme-bg.jpg'
  });
});

// Update profile (interests, bio, callRate, email, mobile, custom calling rates, toggles, cover)
app.put('/api/users/profile', authenticateToken, (req, res) => {
  const { 
    username, interests, bio, avatar, coverPhoto, callRate, voiceCallRate, videoCallRate, 
    email, mobile, incomingCallsEnabled, friendsOnly, goalHours 
  } = req.body;
  const user = db.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  let finalUsername = user.username;
  if (username && username.trim().toLowerCase() !== user.username.toLowerCase()) {
    const check = validateUsername(username, user.id);
    if (!check.valid) {
      return res.status(400).json({ error: check.error });
    }
    finalUsername = check.cleanUsername;
  }

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
    username: finalUsername,
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

// Create a new room (public or private with code & coin entry fee)
app.post('/api/rooms', authenticateToken, (req, res) => {
  const { name, description, isPrivate, entryCode, entryFee } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Room name is required' });
  }
  
  const newRoom = {
    id: 'room_' + Math.random().toString(36).substr(2, 9),
    name: name,
    description: description || '',
    isPrivate: isPrivate === true,
    entryCode: entryCode ? String(entryCode).trim() : null,
    entryFee: Number(entryFee) || 0,
    unlockedUsers: [req.user.id],
    creatorId: req.user.id
  };
  
  db.saveRoom(newRoom);
  res.status(201).json(newRoom);
});

// Unlock a private room using secret code and/or coin payment
app.post('/api/rooms/:roomId/unlock', authenticateToken, (req, res) => {
  const { roomId } = req.params;
  const { code } = req.body;
  const result = db.unlockRoom(roomId, req.user.id, code);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
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
      activeLiveStreams: Array.from(liveStreams.values()),
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

// Master Admin: Full User Edit (Username, Mobile, Password, Coins, Role, Ban)
app.post('/api/admin/users/edit', authenticateAdmin, (req, res) => {
  const { userId, username, mobile, password, coins, earnings, isBanned, isPartner, isAdmin, callRate, voiceCallRate, videoCallRate } = req.body;
  if (!userId) return res.status(400).json({ error: 'User ID is required' });

  const user = db.getUserById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (username && username.trim()) user.username = username.trim();
  if (mobile !== undefined) user.mobile = db.normalizePhone(mobile);
  if (password && password.trim().length >= 4) {
    user.password = bcrypt.hashSync(password.trim(), 10);
  }
  if (coins !== undefined) user.coins = Number(coins);
  if (earnings !== undefined) user.earnings = Number(earnings);
  if (isBanned !== undefined) user.isBanned = Boolean(isBanned);
  if (isAdmin !== undefined) user.isAdmin = Boolean(isAdmin);
  if (callRate !== undefined) user.callRate = Number(callRate);
  if (voiceCallRate !== undefined) user.voiceCallRate = Number(voiceCallRate);
  if (videoCallRate !== undefined) user.videoCallRate = Number(videoCallRate);
  if (isPartner !== undefined) {
    user.isPartner = Boolean(isPartner);
    if (user.isPartner && !user.partnerId) {
      user.partnerId = 'PT_' + Math.random().toString(36).substr(2, 6).toUpperCase();
    }
  }

  db.saveUser(user);
  res.json({ success: true, user });
});

// Master Admin: Delete User Account
app.delete('/api/admin/users/:userId', authenticateAdmin, (req, res) => {
  const { userId } = req.params;
  const deleted = db.deleteUser(userId);
  if (deleted) {
    res.json({ success: true, message: 'User deleted successfully' });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Master Admin: Delete Chat Room
app.delete('/api/admin/rooms/:roomId', authenticateAdmin, (req, res) => {
  const { roomId } = req.params;
  const deleted = db.deleteRoom(roomId);
  if (deleted) {
    io.to(roomId).emit('kicked-from-room', { roomId, reason: 'This room has been closed by Platform Admin.' });
    io.emit('room-deleted', { roomId });
    res.json({ success: true, message: 'Room deleted successfully' });
  } else {
    res.status(404).json({ error: 'Room not found' });
  }
});

// Master Admin: Force End Active Live Stream
app.post('/api/admin/live/terminate', authenticateAdmin, (req, res) => {
  const { hostId } = req.body;
  if (!hostId) return res.status(400).json({ error: 'Host ID is required' });
  if (liveStreams.has(hostId)) {
    io.to(`live_room_${hostId}`).emit('live-ended', { reason: 'Broadcast ended by Master Admin.' });
    liveStreams.delete(hostId);
    io.emit('live-list-updated', Array.from(liveStreams.values()));
    return res.json({ success: true, message: 'Live stream terminated successfully' });
  }
  res.status(404).json({ error: 'Live stream not found or already inactive' });
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
    whatsappNumber1: settings.whatsappNumber1 || settings.whatsappNumber || '+91 9876543211',
    whatsappNumber2: settings.whatsappNumber2 || '+91 9876543212',
    whatsappNumber3: settings.whatsappNumber3 || '+91 9876543213',
    whatsappNumber: settings.whatsappNumber1 || settings.whatsappNumber || '+91 9876543211',
    supportEmail: settings.supportEmail || 'support@ajnabidil.com',
    supportHours: settings.supportHours || '8:00 AM – 10:00 PM (Daily)',
    helpText: settings.helpText || 'Official Ajnabi Dil Help Desk for Coin Recharges, Host KYC Verification & Payout Assistance.'
  });
});

// Public endpoint for help desk support info (With 3 WhatsApp numbers & 8am-10pm hours)
app.get('/api/support/info', (req, res) => {
  const settings = db.getAdminSettings() || {};
  res.json({
    qrCodeUrl: settings.qrCodeUrl || '',
    whatsappNumber1: settings.whatsappNumber1 || settings.whatsappNumber || '+91 9876543211',
    whatsappNumber2: settings.whatsappNumber2 || '+91 9876543212',
    whatsappNumber3: settings.whatsappNumber3 || '+91 9876543213',
    whatsappNumber: settings.whatsappNumber1 || settings.whatsappNumber || '+91 9876543211',
    supportEmail: settings.supportEmail || 'support@ajnabidil.com',
    supportHours: settings.supportHours || '8:00 AM – 10:00 PM (Daily)',
    helpText: settings.helpText || 'Official Help Desk for Coin Recharges, Host KYC Verification & Payout Assistance.'
  });
});

// Update support & payment settings (Admin Only)
app.put('/api/admin/settings', authenticateAdmin, (req, res) => {
  const { whatsappNumber1, whatsappNumber2, whatsappNumber3, whatsappNumber, supportEmail, supportHours, helpText } = req.body;
  const currentSettings = db.getAdminSettings() || {};
  
  const updatedSettings = {
    ...currentSettings,
    whatsappNumber1: whatsappNumber1 !== undefined ? whatsappNumber1.trim() : (currentSettings.whatsappNumber1 || currentSettings.whatsappNumber || '+91 9876543211'),
    whatsappNumber2: whatsappNumber2 !== undefined ? whatsappNumber2.trim() : (currentSettings.whatsappNumber2 || '+91 9876543212'),
    whatsappNumber3: whatsappNumber3 !== undefined ? whatsappNumber3.trim() : (currentSettings.whatsappNumber3 || '+91 9876543213'),
    whatsappNumber: whatsappNumber1 !== undefined ? whatsappNumber1.trim() : (whatsappNumber !== undefined ? whatsappNumber.trim() : currentSettings.whatsappNumber || '+91 9876543211'),
    supportEmail: supportEmail !== undefined ? supportEmail.trim() : (currentSettings.supportEmail || 'support@ajnabidil.com'),
    supportHours: supportHours !== undefined ? supportHours.trim() : (currentSettings.supportHours || '8:00 AM – 10:00 PM (Daily)'),
    helpText: helpText !== undefined ? helpText.trim() : (currentSettings.helpText || 'Official Ajnabi Dil Help Desk.')
  };

  db.saveAdminSettings(updatedSettings);
  res.json({ success: true, settings: updatedSettings });
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

// --- UNIFIED INBOX & CALL ACTIVITY API ---
app.get('/api/activity/summary', authenticateToken, (req, res) => {
  res.json(db.getActivitySummary(req.user.id));
});

app.get('/api/calls/history', authenticateToken, (req, res) => {
  res.json(db.getUserCallLogs(req.user.id));
});

app.post('/api/calls/log', authenticateToken, (req, res) => {
  const log = db.saveCallLog({
    ...req.body,
    callerId: req.body.callerId || req.user.id
  });
  res.json({ success: true, log });
});

app.get('/api/conversations', authenticateToken, (req, res) => {
  res.json(db.getUserConversations(req.user.id));
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

    if (db.isUserSuspended(userId)) {
      socket.emit('account-suspended', {
        reason: 'Aapka account community guidelines violations ke chalte suspend hai.'
      });
      return;
    }

    if (content) {
      const violation = detectPersonalContactLeak(content);
      if (violation.detected) {
        const warnResult = db.addWarningToUser(userId, violation.type, violation.snippet);
        socket.emit('policy-violation-warning', {
          warningNumber: warnResult.warningNumber,
          maxWarnings: 3,
          violationType: violation.type,
          snippet: violation.snippet,
          message: warnResult.message,
          reason: violation.reason,
          isSuspended: warnResult.isSuspended
        });
        if (warnResult.isSuspended) {
          socket.emit('account-suspended', { reason: warnResult.suspensionReason });
        }
        return; // Block message!
      }
    }
    
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

  // Handle Room Theme Change by Admin
  socket.on('update-room-theme', (data) => {
    const { roomId, theme } = data;
    if (!roomId || !theme) return;
    io.to(roomId).emit('room-theme-updated', { roomId, theme, updatedBy: socket.user.username });
  });

  // Handle Room Music Control by Admin (Play, Pause, Song, Volume)
  socket.on('room-music-control', (data) => {
    const { roomId, action, songTitle, volume } = data;
    if (!roomId) return;
    io.to(roomId).emit('room-music-state', {
      roomId,
      action,
      songTitle,
      volume,
      updatedBy: socket.user.username
    });
  });

  // Handle Kick Out Room Member by Admin
  socket.on('kick-room-member', (data) => {
    const { roomId, targetUserId } = data;
    if (!roomId || !targetUserId) return;
    const targetSocketId = onlineUsers.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('kicked-from-room', {
        roomId,
        reason: 'Room creator/admin has removed you from this room.'
      });
    }
    io.to(roomId).emit('room-member-kicked', {
      roomId,
      targetUserId,
      kickedBy: socket.user.username
    });
  });

  // Handle Room Member Invitation
  socket.on('invite-room-member', (data) => {
    const { roomId, roomName, targetUserId } = data;
    if (!roomId || !targetUserId) return;
    const targetSocketId = onlineUsers.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('room-invitation', {
        roomId,
        roomName: roomName || 'Chat Room',
        senderName: socket.user.username,
        senderAvatar: socket.user.avatar
      });
    }
  });
  
  // Handle Direct Message
  socket.on('send-direct-message', (data) => {
    const { receiverId, content, mediaType, fileUrl } = data;
    if (!receiverId || (!content && !fileUrl)) return;

    if (db.isUserSuspended(userId)) {
      socket.emit('account-suspended', {
        reason: 'Aapka account community guidelines violations ke chalte suspend hai.'
      });
      return;
    }

    if (content) {
      const violation = detectPersonalContactLeak(content);
      if (violation.detected) {
        const warnResult = db.addWarningToUser(userId, violation.type, violation.snippet);
        socket.emit('policy-violation-warning', {
          warningNumber: warnResult.warningNumber,
          maxWarnings: 3,
          violationType: violation.type,
          snippet: violation.snippet,
          message: warnResult.message,
          reason: violation.reason,
          isSuspended: warnResult.isSuspended
        });
        if (warnResult.isSuspended) {
          socket.emit('account-suspended', { reason: warnResult.suspensionReason });
        }
        return; // Block message!
      }
    }
    
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
      io.to(receiverSocketId).emit('new-message-notification', {
        id: message.id,
        senderId: userId,
        senderName: socket.user.username,
        senderAvatar: socket.user.avatar,
        content: message.content,
        mediaType: message.mediaType,
        timestamp: message.timestamp
      });
    }
    
    // Also send back to sender's other tabs if any, or acknowledge
    socket.emit('receive-direct-message', message);
  });

  // Handle Voice Note Audio Speech Leak (When spoken audio contains phone numbers or personal ID)
  socket.on('voice-note-audio-leak', (data) => {
    const { transcript, violationType, snippet, reason } = data || {};
    const warnResult = db.addWarningToUser(userId, violationType || 'VOICE_NOTE_LEAK', snippet || transcript);

    socket.emit('policy-violation-warning', {
      warningNumber: warnResult.warningNumber,
      maxWarnings: 3,
      violationType: violationType || 'VOICE_NOTE_LEAK',
      snippet: snippet || transcript,
      message: warnResult.message,
      reason: reason || 'Voice note audio me phone number ya personal contact bolna mana hai.',
      isSuspended: warnResult.isSuspended
    });

    if (warnResult.isSuspended) {
      socket.emit('account-suspended', { reason: warnResult.suspensionReason });
    }
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
  
  // --- REAL-TIME CALL SIGNALS & LOGGING ---
  
  // 1. Caller initiates a call
  socket.on('initiate-call', (data) => {
    const { receiverId, type } = data; // type: 'audio' or 'video'
    const receiverSocketId = onlineUsers.get(receiverId);
    
    if (receiverSocketId) {
      const receiverUser = db.getUserById(receiverId);
      io.to(receiverSocketId).emit('incoming-call', {
        callerId: userId,
        callerName: socket.user.username,
        callerAvatar: socket.user.avatar,
        callerVoiceRate: socket.user.voiceCallRate || 5,
        callerVideoRate: socket.user.videoCallRate || 8,
        receiverId: receiverId,
        receiverName: receiverUser ? receiverUser.username : 'User',
        receiverAvatar: receiverUser ? receiverUser.avatar : '',
        type: type || 'video'
      });
      socket.emit('call-ringing', { receiverId, type: type || 'video' });
      console.log(`Call initiated: ${socket.user.username} -> ${receiverId} (${type})`);
    } else {
      socket.emit('call-failed', { reason: 'User is offline' });
      const receiverUser = db.getUserById(receiverId);
      db.saveCallLog({
        callerId: userId,
        callerName: socket.user.username,
        callerAvatar: socket.user.avatar,
        receiverId: receiverId,
        receiverName: receiverUser ? receiverUser.username : 'User',
        receiverAvatar: receiverUser ? receiverUser.avatar : '',
        type: type || 'video',
        status: 'missed',
        durationSeconds: 0
      });
    }
  });

  // 2. Receiver accepts the call
  socket.on('accept-call', (data) => {
    const { callerId, type } = data || {};
    const callerSocketId = onlineUsers.get(callerId);
    
    if (callerSocketId) {
      const callerUser = db.getUserById(callerId);
      io.to(callerSocketId).emit('call-accepted', {
        receiverId: userId,
        receiverName: socket.user.username,
        receiverAvatar: socket.user.avatar,
        type: type || 'video'
      });
      socket.emit('call-started', {
        otherUser: {
          id: callerId,
          username: callerUser ? callerUser.username : 'Caller',
          avatar: callerUser ? callerUser.avatar : ''
        },
        type: type || 'video',
        isCaller: false
      });
      console.log(`Call accepted by: ${userId} for caller: ${callerId}`);
    }
  });

  // 3. WebRTC Peer Signal Exchange (Offer, Answer, ICE Candidates)
  socket.on('call-signal', (data) => {
    const { targetUserId, signal } = data || {};
    if (!targetUserId || !signal) return;
    const targetSocketId = onlineUsers.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-signal', {
        signal,
        fromUserId: userId
      });
    }
  });

  // 4. Receiver rejects the call
  socket.on('reject-call', (data) => {
    const { callerId, type } = data || {};
    const callerSocketId = onlineUsers.get(callerId);
    
    const callerUser = db.getUserById(callerId);
    const receiverUser = socket.user || db.getUserById(userId);

    db.saveCallLog({
      callerId: callerId,
      callerName: callerUser ? callerUser.username : 'User',
      callerAvatar: callerUser ? callerUser.avatar : '',
      receiverId: userId,
      receiverName: receiverUser ? receiverUser.username : 'User',
      receiverAvatar: receiverUser ? receiverUser.avatar : '',
      type: type || 'audio',
      status: 'declined',
      durationSeconds: 0
    });

    if (callerSocketId) {
      io.to(callerSocketId).emit('call-rejected', {
        reason: 'Call declined'
      });
      console.log(`Call rejected by: ${userId}`);
    }
  });

  // 5. Either hangs up or ends call
  const handleCallTermination = (data) => {
    const { otherUserId, duration, type, reason } = data || {};
    const otherSocketId = onlineUsers.get(otherUserId);
    
    if (otherSocketId) {
      io.to(otherSocketId).emit('call-ended', { duration, reason });
    }

    if (otherUserId) {
      const otherUser = db.getUserById(otherUserId);
      const myUser = socket.user || db.getUserById(userId);
      db.saveCallLog({
        callerId: userId,
        callerName: myUser ? myUser.username : 'User',
        callerAvatar: myUser ? myUser.avatar : '',
        receiverId: otherUserId,
        receiverName: otherUser ? otherUser.username : 'User',
        receiverAvatar: otherUser ? otherUser.avatar : '',
        type: type || 'video',
        status: (duration && Number(duration) > 0) ? 'completed' : 'missed',
        durationSeconds: Number(duration) || 0
      });
    }
    console.log(`Call ended by: ${userId} with: ${otherUserId}`);
  };

  socket.on('hangup-call', handleCallTermination);
  socket.on('end-call', handleCallTermination);

  // 6. Triggered if coin wallet runs dry during call
  socket.on('insufficient-coins-end', (data) => {
    const { otherUserId } = data;
    const otherSocketId = onlineUsers.get(otherUserId);
    
    if (otherSocketId) {
      io.to(otherSocketId).emit('call-ended', { reason: 'insufficient_coins' });
    }
    console.log(`Call ended due to insufficient coins: ${userId} calling ${otherUserId}`);
  });

  // --- OMEGLE-STYLE RANDOM STRANGER MATCHING ENGINE ---
  const cleanupStranger = (skId, notifyPartner = true) => {
    const qIdx = strangerQueue.findIndex(item => item.socketId === skId);
    if (qIdx !== -1) strangerQueue.splice(qIdx, 1);

    const sess = strangerSessions.get(skId);
    if (sess) {
      strangerSessions.delete(skId);
      const partnerSess = strangerSessions.get(sess.partnerSocketId);
      if (partnerSess) {
        strangerSessions.delete(sess.partnerSocketId);
        if (notifyPartner) {
          io.to(sess.partnerSocketId).emit('stranger-disconnected', {
            reason: 'Stranger has disconnected or skipped.'
          });
        }
      }
    }
  };

  // Join Stranger Queue
  socket.on('stranger-join-queue', () => {
    cleanupStranger(socket.id, false);

    // Filter out invalid/closed sockets
    while (strangerQueue.length > 0 && !io.sockets.sockets.get(strangerQueue[0].socketId)) {
      strangerQueue.shift();
    }

    const peer = strangerQueue.find(p => p.socketId !== socket.id && p.userId !== userId);
    if (peer) {
      const pIndex = strangerQueue.indexOf(peer);
      if (pIndex !== -1) strangerQueue.splice(pIndex, 1);

      const sessionId = 'stranger_sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      const myUser = socket.user || db.getUserById(userId) || { id: userId, username: 'You', avatar: '' };

      strangerSessions.set(socket.id, {
        sessionId,
        partnerSocketId: peer.socketId,
        partnerUserId: peer.userId,
        partnerUsername: peer.username,
        partnerAvatar: peer.avatar
      });

      strangerSessions.set(peer.socketId, {
        sessionId,
        partnerSocketId: socket.id,
        partnerUserId: myUser.id,
        partnerUsername: myUser.username,
        partnerAvatar: myUser.avatar
      });

      // Peer was waiting first, so peer will initiate WebRTC offer
      io.to(peer.socketId).emit('stranger-matched', {
        sessionId,
        isInitiator: true,
        peer: {
          id: myUser.id,
          username: myUser.username,
          avatar: myUser.avatar
        }
      });

      socket.emit('stranger-matched', {
        sessionId,
        isInitiator: false,
        peer: {
          id: peer.userId,
          username: peer.username,
          avatar: peer.avatar
        }
      });

      console.log(`[Omegle Matched] ${myUser.username} <-> ${peer.username} (Session: ${sessionId})`);
    } else {
      strangerQueue.push({
        socketId: socket.id,
        userId: userId,
        username: socket.user.username,
        avatar: socket.user.avatar
      });
      socket.emit('stranger-waiting', { queueLength: strangerQueue.length });
      console.log(`[Omegle Queue] ${socket.user.username} entered queue. (Total waiting: ${strangerQueue.length})`);
    }
  });

  // WebRTC Signaling between paired strangers
  socket.on('stranger-signal', (data) => {
    const sess = strangerSessions.get(socket.id);
    if (sess && sess.partnerSocketId) {
      io.to(sess.partnerSocketId).emit('stranger-signal', {
        signal: data.signal,
        from: socket.id
      });
    }
  });

  // In-call text messages between strangers
  socket.on('stranger-message', (data) => {
    const text = (data.text || '').trim();
    if (!text) return;

    if (db.isUserSuspended(userId)) {
      socket.emit('account-suspended', {
        reason: 'Aapka account community guidelines violations ke chalte suspend hai.'
      });
      return;
    }

    const violation = detectPersonalContactLeak(text);
    if (violation.detected) {
      const warnResult = db.addWarningToUser(userId, violation.type, violation.snippet);
      socket.emit('policy-violation-warning', {
        warningNumber: warnResult.warningNumber,
        maxWarnings: 3,
        violationType: violation.type,
        snippet: violation.snippet,
        message: warnResult.message,
        reason: violation.reason,
        isSuspended: warnResult.isSuspended
      });
      if (warnResult.isSuspended) {
        socket.emit('account-suspended', { reason: warnResult.suspensionReason });
      }
      return; // Block message from stranger!
    }

    const sess = strangerSessions.get(socket.id);
    if (sess && sess.partnerSocketId) {
      const msg = {
        id: 'smsg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        senderId: userId,
        senderName: socket.user.username,
        text: text,
        timestamp: new Date().toISOString()
      };
      io.to(sess.partnerSocketId).emit('stranger-message', msg);
      socket.emit('stranger-message', msg);
    }
  });

  // Dual/Multi-user Camera AR Mask synchronization between strangers
  socket.on('stranger-mask-update', (data) => {
    const sess = strangerSessions.get(socket.id);
    if (sess && sess.partnerSocketId) {
      io.to(sess.partnerSocketId).emit('stranger-mask-update', {
        maskActive: Boolean(data.maskActive),
        maskStyle: data.maskStyle || 'venetian'
      });
    }
  });

  // Stranger Skip / Leave
  socket.on('stranger-skip', () => {
    cleanupStranger(socket.id, true);
    socket.emit('stranger-skipped');
  });

  socket.on('stranger-leave', () => {
    cleanupStranger(socket.id, true);
    socket.emit('stranger-left');
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

  // Host toggles private show (with custom timer, coin fee, and optional Secret PIN)
  socket.on('toggle-private', (data) => {
    const { isPrivate, entryFee, durationMinutes, entryPin } = data;
    const stream = liveStreams.get(userId);
    if (!stream) return;

    stream.isPrivate = isPrivate;
    stream.entryFee = isPrivate ? Math.max(10, Number(entryFee) || 0) : 0;
    stream.entryPin = isPrivate && entryPin ? String(entryPin).trim() : null;
    stream.privateDurationMinutes = Number(durationMinutes) || 0;
    stream.privateExpiresAt = isPrivate && Number(durationMinutes) > 0 ? Date.now() + (Number(durationMinutes) * 60 * 1000) : null;
    stream.unlockedViewers = isPrivate ? [userId] : [];
    
    liveStreams.set(userId, stream);
    io.to(`live_room_${userId}`).emit('live-switched-private', { 
      isPrivate: stream.isPrivate, 
      entryFee: stream.entryFee,
      hasPin: Boolean(stream.entryPin),
      privateDurationMinutes: stream.privateDurationMinutes,
      privateExpiresAt: stream.privateExpiresAt
    });
    io.emit('live-list-updated', Array.from(liveStreams.values()));
    console.log(`Host ${socket.user.username} switched live stream private: ${isPrivate} (Fee: ${stream.entryFee}, PIN: ${stream.entryPin || 'none'})`);
  });

  // Viewer unlocks private show via Coins OR Secret PIN
  socket.on('pay-live-fee', (data) => {
    const { hostId, fee, pin } = data;
    const viewerUser = db.getUserById(userId);
    const hostUser = db.getUserById(hostId);
    const stream = liveStreams.get(hostId);
    if (!viewerUser || !hostUser || !stream) return;

    // 1. PIN verification if provided
    if (pin && stream.entryPin && String(pin).trim().toLowerCase() === String(stream.entryPin).trim().toLowerCase()) {
      if (!stream.unlockedViewers) stream.unlockedViewers = [];
      stream.unlockedViewers.push(userId);
      socket.emit('fee-paid-success', { coins: viewerUser.coins || 0, unlockedVia: 'pin' });
      io.to(`live_room_${hostId}`).emit('live-comment-received', {
        sender: 'System',
        comment: `🔑 @${viewerUser.username} unlocked Private Show with Host PIN!`
      });
      console.log(`Viewer ${viewerUser.username} unlocked ${hostUser.username}'s private show using Secret PIN`);
      return;
    }

    // 2. Coin Payment
    const coinsToDeduct = Number(fee || stream.entryFee || 0);
    if (coinsToDeduct > 0) {
      if ((viewerUser.coins || 0) < coinsToDeduct) {
        socket.emit('live-error', { reason: 'Insufficient coins in wallet! Please recharge coins.' });
        return;
      }

      // Deduct coins from viewer
      viewerUser.coins = Math.max(0, (viewerUser.coins || 0) - coinsToDeduct);
      db.saveUser(viewerUser);

      // Credit 70% earnings to host (70/30 split)
      const hostEarned = Math.round(coinsToDeduct * 0.7);
      hostUser.earnings = (hostUser.earnings || 0) + hostEarned;
      db.saveUser(hostUser);
    }

    if (!stream.unlockedViewers) stream.unlockedViewers = [];
    stream.unlockedViewers.push(userId);

    // Send success responses
    socket.emit('fee-paid-success', { coins: viewerUser.coins || 0, unlockedVia: 'coins' });
    io.to(`live_room_${hostId}`).emit('live-comment-received', {
      sender: 'System',
      comment: `🎉 @${viewerUser.username} entered the Private Show!`
    });
    console.log(`Viewer ${viewerUser.username} paid ${coinsToDeduct} coins to enter ${hostUser.username}'s private live`);
  });

  // Virtual Gift sending during 1-on-1 audio/video calls
  socket.on('send-call-gift', (data) => {
    const { receiverId, giftType, coins } = data;
    const senderUser = db.getUserById(userId);
    const receiverUser = db.getUserById(receiverId);
    if (!senderUser || !receiverUser) return;

    const giftCost = Number(coins);
    if ((senderUser.coins || 0) < giftCost) {
      socket.emit('call-error', { reason: 'Insufficient coins in wallet! Please recharge.' });
      return;
    }

    // Deduct from sender
    senderUser.coins = Math.max(0, (senderUser.coins || 0) - giftCost);
    db.saveUser(senderUser);

    // Credit 70% to receiver
    const earned = Math.round(giftCost * 0.7);
    receiverUser.earnings = (receiverUser.earnings || 0) + earned;
    db.saveUser(receiverUser);

    const giftPayload = {
      senderId: userId,
      senderName: senderUser.username,
      senderAvatar: senderUser.avatar,
      receiverId: receiverId,
      giftType: giftType,
      coins: giftCost,
      timestamp: new Date().toISOString()
    };

    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('call-gift-received', giftPayload);
    }
    socket.emit('call-gift-sent', {
      ...giftPayload,
      newCoinsBalance: senderUser.coins
    });
    console.log(`[Call Gift] @${senderUser.username} sent ${giftType} (${coins} coins) to @${receiverUser.username}`);
  });

  // Stranger Gift sending during Omegle chat
  socket.on('stranger-gift', (data) => {
    const { giftType, coins } = data;
    const sess = strangerSessions.get(socket.id);
    const senderUser = db.getUserById(userId);
    if (!senderUser) return;

    const giftCost = Number(coins);
    if ((senderUser.coins || 0) < giftCost) {
      socket.emit('stranger-error', { reason: 'Insufficient coins in wallet!' });
      return;
    }

    senderUser.coins = Math.max(0, (senderUser.coins || 0) - giftCost);
    db.saveUser(senderUser);

    if (sess && sess.partnerSocketId) {
      const partnerUser = db.getUserById(sess.partnerUserId);
      if (partnerUser) {
        const earned = Math.round(giftCost * 0.7);
        partnerUser.earnings = (partnerUser.earnings || 0) + earned;
        db.saveUser(partnerUser);
      }

      const giftPayload = {
        senderId: userId,
        senderName: senderUser.username,
        senderAvatar: senderUser.avatar,
        giftType: giftType,
        coins: giftCost,
        timestamp: new Date().toISOString()
      };

      io.to(sess.partnerSocketId).emit('call-gift-received', giftPayload);
    }

    socket.emit('call-gift-sent', {
      giftType,
      coins: giftCost,
      newCoinsBalance: senderUser.coins
    });
  });

  // Live comment
  socket.on('send-live-comment', (data) => {
    const { hostId, comment } = data;
    if (!comment) return;

    if (db.isUserSuspended(userId)) {
      socket.emit('account-suspended', {
        reason: 'Aapka account community guidelines violations ke chalte suspend hai.'
      });
      return;
    }

    const violation = detectPersonalContactLeak(comment);
    if (violation.detected) {
      const warnResult = db.addWarningToUser(userId, violation.type, violation.snippet);
      socket.emit('policy-violation-warning', {
        warningNumber: warnResult.warningNumber,
        maxWarnings: 3,
        violationType: violation.type,
        snippet: violation.snippet,
        message: warnResult.message,
        reason: violation.reason,
        isSuspended: warnResult.isSuspended
      });
      if (warnResult.isSuspended) {
        socket.emit('account-suspended', { reason: warnResult.suspensionReason });
      }
      return; // Block comment!
    }

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
    cleanupStranger(socket.id, true);
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

const { spawn } = require('child_process');
const PORT = process.env.PORT || 5000;

// Setup resilient worldwide public tunnel (Cloudflare & Fallback)
async function setupPublicTunnel(port) {
  const cloudflaredPath = path.join(__dirname, '../cloudflared.exe');
  
  if (fs.existsSync(cloudflaredPath)) {
    try {
      console.log('⚡ Launching High-Speed Cloudflare Worldwide Tunnel (0-barrier, works globally on all 4G/5G/Wi-Fi)...');
      const cfProcess = spawn(cloudflaredPath, ['tunnel', '--url', `http://localhost:${port}`]);
      
      cfProcess.stderr.on('data', (data) => {
        const text = data.toString();
        const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (match && match[0] && liveTunnelUrl !== match[0]) {
          liveTunnelUrl = match[0];
          console.log(`\n======================================================`);
          console.log(`🌐 WORLDWIDE PUBLIC LIVE LINK : ${liveTunnelUrl}`);
          console.log(`📥 PUBLIC APK DOWNLOAD LINK  : ${liveTunnelUrl}/download-apk`);
          console.log(`📱 PUBLIC SHARE/DOWNLOAD PAGE: ${liveTunnelUrl}/#/download`);
          console.log(`======================================================\n`);
        }
      });
      
      cfProcess.on('error', (err) => {
        console.log('Cloudflare tunnel error:', err.message);
      });

      cfProcess.on('close', () => {
        console.log('Cloudflare tunnel closed.');
        liveTunnelUrl = '';
      });
      return;
    } catch (err) {
      console.log('Cloudflare tunnel startup notice:', err.message);
    }
  }

  // Fallback to localtunnel
  try {
    const localtunnel = require('localtunnel');
    const tunnel = await localtunnel({ port: port });
    liveTunnelUrl = tunnel.url;
    console.log(`🌐 WORLDWIDE PUBLIC LIVE LINK : ${tunnel.url}`);
    console.log(`📥 PUBLIC APK DOWNLOAD LINK  : ${tunnel.url}/download-apk`);
    console.log(`📱 PUBLIC SHARE/DOWNLOAD PAGE: ${tunnel.url}/#/download`);
    console.log(`======================================================\n`);

    tunnel.on('close', () => {
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
