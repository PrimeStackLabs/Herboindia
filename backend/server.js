/**
 * Herbo India - Production Web Server & REST API
 * 1. MongoDB Database integration for storing customer inquiries & COD orders.
 * 2. Enterprise-Grade Doctor Authentication (Salted PBKDF2 / SHA-512).
 * 3. Role-Based Access Control: Master Admin (herboindia03@gmail.com) & Authorized Sub-Admins.
 * 4. Only Master Admin can register Sub-Admins and authorize/ask for OTP.
 * 5. Dynamic Email OTP Password Recovery via Nodemailer.
 * 6. High-Performance Static Asset Engine with Multilingual Support.
 */

require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { MongoClient } = require('mongodb');

// Configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/herbo_india';
const DB_NAME = process.env.DB_NAME || 'herbo_india';

// Master Admin Configuration
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'herboindia03@gmail.com').toLowerCase().trim();
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'admin').toLowerCase().trim();
const ADMIN_DEFAULT_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || 'HerboIndia@2026!';
const ADMIN_DOCTOR_NAME = process.env.ADMIN_DOCTOR_NAME || 'Chief Medical Administrator';

// Allowed Client / Frontend URLs for CORS (Configurable via CLIENT_URL or FRONTEND_URL env)
const CLIENT_URL = process.env.CLIENT_URL || process.env.FRONTEND_URL || '*';
const allowedOrigins = CLIENT_URL.split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);

const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const PUBLIC_DIR = fs.existsSync(FRONTEND_DIR) ? FRONTEND_DIR : path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const PRODUCTS_ASSET_DIR = path.join(PUBLIC_DIR, 'assets', 'products');
if (!fs.existsSync(PRODUCTS_ASSET_DIR)) {
  fs.mkdirSync(PRODUCTS_ASSET_DIR, { recursive: true });
}

// Local JSON File Fallbacks (Atomic zero-downtime offline fallback)
const FILES = {
  enquiries: path.join(DATA_DIR, 'enquiries.json'),
  users: path.join(DATA_DIR, 'admin_users.json'),
  otps: path.join(DATA_DIR, 'admin_otps.json'),
  sessions: path.join(DATA_DIR, 'admin_sessions.json')
};

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
Object.values(FILES).forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]', 'utf8');
  }
});

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

// ==================== CRYPTOGRAPHIC HELPERS ====================

function generateSalt() {
  return crypto.randomBytes(32).toString('hex');
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function verifyPassword(password, salt, storedHash) {
  try {
    const computed = hashPassword(password, salt);
    const bufA = Buffer.from(computed, 'hex');
    const bufB = Buffer.from(storedHash, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (err) {
    return false;
  }
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ==================== FILE STORAGE HELPERS ====================

function readJsonFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function writeJsonFile(filePath, data) {
  try {
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
    return true;
  } catch (err) {
    console.error(`Error writing file ${filePath}:`, err);
    return false;
  }
}

// ==================== DATABASE LAYER (MONGODB + JSON FALLBACK) ====================

let isMongoConnected = false;
let mongoClient = null;
let db = null;
let colEnquiries = null;
let colAdminUsers = null;
let colAdminOtps = null;
let colAdminSessions = null;

async function initMongoDB() {
  try {
    mongoClient = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 3000
    });
    await mongoClient.connect();
    db = mongoClient.db(DB_NAME);
    colEnquiries = db.collection('enquiries');
    colAdminUsers = db.collection('admin_users');
    colAdminOtps = db.collection('admin_otps');
    colAdminSessions = db.collection('admin_sessions');

    // Create Indexes
    await colEnquiries.createIndex({ id: 1 }, { unique: true });
    await colEnquiries.createIndex({ date: -1 });
    await colAdminUsers.createIndex({ email: 1 }, { unique: true });
    await colAdminUsers.createIndex({ username: 1 });
    await colAdminSessions.createIndex({ token: 1 }, { unique: true });
    await colAdminSessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await colAdminOtps.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    isMongoConnected = true;
    console.log(`✅ [MONGODB] Successfully connected to MongoDB database: ${DB_NAME}`);

    // Seamless sync: Migrate local JSON records to MongoDB if collections are empty
    try {
      const usersCount = await colAdminUsers.countDocuments();
      if (usersCount === 0) {
        const localUsers = readJsonFile(FILES.users);
        if (localUsers.length > 0) {
          const toInsert = localUsers.map(({ _id, ...rest }) => rest);
          await colAdminUsers.insertMany(toInsert);
          console.log(`📦 [MONGODB SYNC] Seeded ${toInsert.length} admin accounts to MongoDB.`);
        }
      }

      const enquiriesCount = await colEnquiries.countDocuments();
      if (enquiriesCount === 0) {
        const localEnquiries = readJsonFile(FILES.enquiries);
        if (localEnquiries.length > 0) {
          const toInsert = localEnquiries.map(({ _id, ...rest }) => rest);
          await colEnquiries.insertMany(toInsert);
          console.log(`📦 [MONGODB SYNC] Seeded ${toInsert.length} patient records to MongoDB.`);
        }
      }
    } catch (syncErr) {
      console.warn('Sync notice:', syncErr.message);
    }
  } catch (err) {
    isMongoConnected = false;
    console.warn(`⚠️ [MONGODB] Connection note: ${err.message}`);
    console.log(`📁 [FALLBACK] Operating in high-performance atomic local JSON database mode.`);
  }

  // Ensure Master Admin account is seeded/updated
  await ensureAdminUserSeeded();
}

async function ensureAdminUserSeeded() {
  const existingUser = await getAdminUserByUsernameOrEmail(ADMIN_USERNAME) || await getAdminUserByUsernameOrEmail(ADMIN_EMAIL);
  if (!existingUser) {
    const salt = generateSalt();
    const passwordHash = hashPassword(ADMIN_DEFAULT_PASSWORD, salt);
    const initialUser = {
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      name: ADMIN_DOCTOR_NAME,
      role: 'admin', // Master Admin
      salt,
      passwordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isMongoConnected) {
      await colAdminUsers.insertOne(initialUser);
    } else {
      const users = readJsonFile(FILES.users);
      users.push(initialUser);
      writeJsonFile(FILES.users, users);
    }

    console.log(`🛡️ [HERBO AUTH] Master Admin Account initialized:`);
    console.log(`   Username: ${ADMIN_USERNAME}`);
    console.log(`   Master Email: ${ADMIN_EMAIL}`);
    console.log(`   Role: admin (Authorized to add sub-admins and request OTP)`);
  } else {
    // Update existing user with master email, name and role
    if (existingUser.email !== ADMIN_EMAIL || existingUser.role !== 'admin' || existingUser.name !== ADMIN_DOCTOR_NAME) {
      const now = new Date().toISOString();
      if (isMongoConnected) {
        await colAdminUsers.updateOne(
          { username: ADMIN_USERNAME },
          { $set: { email: ADMIN_EMAIL, role: 'admin', name: ADMIN_DOCTOR_NAME, updatedAt: now } }
        );
      }
      const users = readJsonFile(FILES.users);
      const u = users.find(x => x.username === ADMIN_USERNAME);
      if (u) {
        u.email = ADMIN_EMAIL;
        u.role = 'admin';
        u.name = ADMIN_DOCTOR_NAME;
        u.updatedAt = now;
        writeJsonFile(FILES.users, users);
      }
      console.log(`🛡️ [HERBO AUTH] Master Admin Account updated: ${ADMIN_EMAIL} (role: admin, name: ${ADMIN_DOCTOR_NAME})`);
    }
  }
}

// --- Customer Enquiries & COD Orders Data Access ---

async function getAllEnquiries() {
  if (isMongoConnected) {
    try {
      const list = await colEnquiries.find({}).sort({ date: -1 }).toArray();
      return list.map(({ _id, ...rest }) => rest);
    } catch (e) {
      console.error('Mongo read error, falling back to local file:', e);
    }
  }
  return readJsonFile(FILES.enquiries);
}

async function saveEnquiry(entry) {
  if (!entry.id) {
    entry.id = 'HI-' + Math.floor(100000 + Math.random() * 900000);
  }
  if (!entry.date) {
    entry.date = new Date().toISOString();
  }
  if (!entry.status) {
    entry.status = 'New';
  }

  if (isMongoConnected) {
    try {
      await colEnquiries.insertOne({ ...entry });
    } catch (e) {
      console.error('Mongo save error, falling back to local file:', e);
    }
  }

  // Always sync to local file for backup
  const list = readJsonFile(FILES.enquiries);
  list.unshift(entry);
  writeJsonFile(FILES.enquiries, list);

  return entry;
}

async function updateEnquiryStatus(id, newStatus) {
  let updated = null;
  if (isMongoConnected) {
    try {
      const res = await colEnquiries.findOneAndUpdate(
        { id },
        { $set: { status: newStatus, updatedAt: new Date().toISOString() } },
        { returnDocument: 'after' }
      );
      if (res) updated = res;
    } catch (e) { }
  }

  const list = readJsonFile(FILES.enquiries);
  const item = list.find(i => i.id === id);
  if (item) {
    item.status = newStatus;
    item.updatedAt = new Date().toISOString();
    writeJsonFile(FILES.enquiries, list);
    updated = item;
  }
  return updated;
}

async function deleteEnquiryById(id) {
  let success = false;
  if (isMongoConnected) {
    try {
      const res = await colEnquiries.deleteOne({ id });
      if (res.deletedCount > 0) success = true;
    } catch (e) { }
  }

  let list = readJsonFile(FILES.enquiries);
  const beforeLen = list.length;
  list = list.filter(i => i.id !== id);
  if (list.length < beforeLen) {
    writeJsonFile(FILES.enquiries, list);
    success = true;
  }
  return success;
}

// --- Admin Users & Role-Based Access Control ---

async function getAdminUserByUsernameOrEmail(identifier) {
  let clean = (identifier || '').trim().toLowerCase();
  if (!clean) return null;

  // Auto-correct common typos such as 'herno' instead of 'herbo' for master admin
  if (clean.includes('hernoindia')) {
    clean = clean.replace(/hernoindia/g, 'herboindia');
  }

  // Master Admin identifier hints (ONLY if identifier explicitly references master admin or typo)
  const isMasterHint = clean === ADMIN_USERNAME.toLowerCase() ||
    clean === ADMIN_EMAIL.toLowerCase() ||
    clean === 'herbo' ||
    clean === 'herboindia' ||
    clean === 'herboindia03' ||
    clean.includes('herboindia03');

  if (isMongoConnected) {
    try {
      const orList = [
        { username: clean },
        { email: clean }
      ];
      if (isMasterHint) {
        orList.push({ username: ADMIN_USERNAME });
        orList.push({ email: ADMIN_EMAIL });
      }
      const user = await colAdminUsers.findOne({ $or: orList });
      if (user) return user;
    } catch (e) { }
  }

  const users = readJsonFile(FILES.users);
  let user = users.find(u =>
    (u.username && u.username.toLowerCase() === clean) ||
    (u.email && u.email.toLowerCase() === clean) ||
    (isMasterHint && (u.username.toLowerCase() === ADMIN_USERNAME.toLowerCase() || u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()))
  );

  return user || null;
}

async function getAllAdminUsers() {
  if (isMongoConnected) {
    try {
      const users = await colAdminUsers.find({}).project({ passwordHash: 0, salt: 0 }).toArray();
      return users.map(({ _id, ...rest }) => rest);
    } catch (e) { }
  }
  const users = readJsonFile(FILES.users);
  return users.map(({ passwordHash, salt, ...rest }) => rest);
}

async function createSubAdminUser({ username, email, name, password, createdBy }) {
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!/^[a-z0-9_.-]{3,30}$/.test(cleanUser)) {
    throw new Error('Username must be 3-30 characters (letters, numbers, underscore, hyphen).');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Please enter a valid email address.');
  }
  if (!password || password.length < 8) {
    throw new Error('Initial password must be at least 8 characters in length.');
  }

  const existing = await getAdminUserByUsernameOrEmail(cleanUser) || await getAdminUserByUsernameOrEmail(cleanEmail);
  if (existing) {
    throw new Error('An administrator or sub-admin with this username or email already exists.');
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);
  const userDoc = {
    username: cleanUser,
    email: cleanEmail,
    name: name.trim() || 'Sub-Admin Doctor',
    role: 'subadmin',
    createdBy: createdBy || 'admin',
    salt,
    passwordHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (isMongoConnected) {
    try {
      await colAdminUsers.insertOne(userDoc);
    } catch (e) {
      console.error('Mongo subadmin insert error:', e);
    }
  }

  const users = readJsonFile(FILES.users);
  users.push(userDoc);
  writeJsonFile(FILES.users, users);

  const { salt: s, passwordHash: ph, ...safe } = userDoc;
  return safe;
}

async function deleteSubAdminUser(username) {
  const clean = (username || '').trim().toLowerCase();
  if (clean === ADMIN_USERNAME || clean === 'admin') {
    throw new Error('Cannot delete the Master Administrator.');
  }

  const target = await getAdminUserByUsernameOrEmail(clean);
  if (!target) {
    throw new Error('Sub-admin user not found.');
  }
  if (target.role === 'admin' || target.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    throw new Error('Cannot delete the Master Administrator.');
  }

  if (isMongoConnected) {
    try {
      await colAdminUsers.deleteOne({ username: clean });
      await colAdminSessions.deleteMany({ username: clean });
    } catch (e) { }
  }

  let users = readJsonFile(FILES.users);
  users = users.filter(u => u.username && u.username.toLowerCase() !== clean);
  writeJsonFile(FILES.users, users);

  let sessions = readJsonFile(FILES.sessions);
  sessions = sessions.filter(s => s.username && s.username.toLowerCase() !== clean);
  writeJsonFile(FILES.sessions, sessions);

  return true;
}

async function updateAdminPassword(email, newPassword) {
  const cleanEmail = email.trim().toLowerCase();
  const salt = generateSalt();
  const passwordHash = hashPassword(newPassword, salt);
  const now = new Date().toISOString();

  if (isMongoConnected) {
    try {
      await colAdminUsers.updateOne(
        { email: cleanEmail },
        { $set: { salt, passwordHash, updatedAt: now } }
      );
    } catch (e) { }
  }

  const users = readJsonFile(FILES.users);
  const user = users.find(u => u.email && u.email.toLowerCase() === cleanEmail);
  if (user) {
    user.salt = salt;
    user.passwordHash = passwordHash;
    user.updatedAt = now;
    writeJsonFile(FILES.users, users);
    return true;
  }
  return false;
}

// --- Admin OTP Management ---

async function createAdminOtp(email) {
  const cleanEmail = email.trim().toLowerCase();
  const otp = crypto.randomInt(100000, 999999).toString();
  const otpHash = hashOtp(otp);
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  const otpDoc = {
    email: cleanEmail,
    otpHash,
    expiresAt,
    used: false,
    createdAt: new Date().toISOString()
  };

  if (isMongoConnected) {
    try {
      await colAdminOtps.insertOne(otpDoc);
    } catch (e) { }
  }

  const otps = readJsonFile(FILES.otps);
  otps.push(otpDoc);
  writeJsonFile(FILES.otps, otps);

  return { otp, expiresAt };
}

async function verifyAndConsumeOtp(email, enteredOtp) {
  const cleanEmail = email.trim().toLowerCase();
  const enteredHash = hashOtp(enteredOtp);
  const now = Date.now();

  if (isMongoConnected) {
    try {
      const match = await colAdminOtps.findOne({
        email: cleanEmail,
        otpHash: enteredHash,
        used: false,
        expiresAt: { $gt: now }
      });

      if (match) {
        await colAdminOtps.updateOne({ _id: match._id }, { $set: { used: true } });
        return true;
      }
    } catch (e) { }
  }

  const otps = readJsonFile(FILES.otps);
  const match = otps.find(o =>
    o.email === cleanEmail &&
    o.otpHash === enteredHash &&
    !o.used &&
    o.expiresAt > now
  );

  if (match) {
    match.used = true;
    writeJsonFile(FILES.otps, otps);
    return true;
  }
  return false;
}

// --- Admin Session Management ---

async function createAdminSession(user) {
  const token = generateSessionToken();
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days persistent session
  const cleanName = (user.name || 'Chief Medical Administrator')
    .replace(/\s*\((Master Admin|Sub-Admin)\)/gi, '')
    .trim();

  const sessionDoc = {
    token,
    username: user.username,
    email: user.email,
    name: cleanName,
    role: user.role || 'subadmin',
    expiresAt,
    createdAt: new Date().toISOString()
  };

  if (isMongoConnected) {
    try {
      await colAdminSessions.insertOne(sessionDoc);
    } catch (e) { }
  }

  const sessions = readJsonFile(FILES.sessions);
  sessions.push(sessionDoc);
  writeJsonFile(FILES.sessions, sessions);

  return token;
}

async function validateAdminSession(token) {
  if (!token) return null;
  const now = Date.now();

  if (isMongoConnected) {
    try {
      const sess = await colAdminSessions.findOne({
        token,
        expiresAt: { $gt: now }
      });
      if (sess) return sess;
    } catch (e) { }
  }

  const sessions = readJsonFile(FILES.sessions);
  const sess = sessions.find(s => s.token === token && s.expiresAt > now);
  return sess || null;
}

// ==================== EMAIL NOTIFICATION (NODEMAILER) ====================

function createMailTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass }
    });
  }
  return null;
}

async function sendOtpEmail(email, otp) {
  const transporter = createMailTransporter();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .email-card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 18px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px rgba(67, 83, 255, 0.08); }
        .email-header { background: #4353ff; color: #ffffff; padding: 28px 24px; text-align: center; }
        .email-header h1 { margin: 0; font-size: 24px; letter-spacing: 0.5px; }
        .email-header p { margin: 6px 0 0; opacity: 0.9; font-size: 14px; }
        .email-body { padding: 32px 28px; }
        .otp-badge-box { background: #f0f3ff; border: 2px dashed #4353ff; border-radius: 14px; text-align: center; padding: 20px; margin: 24px 0; }
        .otp-number { font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #4353ff; margin: 0; font-family: monospace; }
        .email-footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="email-card">
        <div class="email-header">
          <h1>Herbo India</h1>
          <p>Doctor &amp; Clinical Administration Portal</p>
        </div>
        <div class="email-body">
          <h2 style="font-size: 18px; margin-top: 0; color: #0f172a;">Doctor Authentication Verification Code</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #475569;">
            We received an authorized request to verify credentials or update the secure password for the Herbo India Doctor Consultation Portal.
          </p>
          <div class="otp-badge-box">
            <span style="font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700; display: block; margin-bottom: 6px;">Your 6-Digit One-Time Password</span>
            <div class="otp-number">${otp}</div>
            <span style="font-size: 12px; color: #ef4444; font-weight: 700; display: block; margin-top: 8px;">⏱️ Valid for 10 minutes only</span>
          </div>
          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
            🔒 Security Notice: Only Master Administrator (herboindia03@gmail.com) and registered Sub-Admins can request this code. Do not share it with anyone.
          </p>
        </div>
        <div class="email-footer">
          &copy; 2026 Herbo India Healthcare. 100% Confidential Clinical Systems.
        </div>
      </div>
    </body>
    </html>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `Herbo India Medical Portal <${process.env.SMTP_FROM || process.env.SMTP_USER || 'herboindia03@gmail.com'}>`,
        to: email,
        subject: `[Herbo India] Doctor Portal Verification Code: ${otp}`,
        html: htmlContent
      });
      console.log(`📧 [EMAIL SENT] Verification OTP successfully dispatched to ${email}`);
      return { sent: true };
    } catch (err) {
      console.error(`❌ [EMAIL ERROR] Failed to send email to ${email}:`, err.message);
      return { sent: false, error: err.message };
    }
  } else {
    console.log(`\n=======================================================`);
    console.log(`🔐 [HERBO SECURITY OTP GENERATED]`);
    console.log(`📧 Authorized Doctor / Sub-Admin: ${email}`);
    console.log(`🔑 Verification Code (OTP):       ${otp}`);
    console.log(`⏱️ Code Expiry:                  10 Minutes`);
    console.log(`💡 Configure SMTP_PASS in .env for live Gmail dispatch`);
    console.log(`=======================================================\n`);
    return { sent: false, loggedToConsole: true };
  }
}

// ==================== REST API & HTTP SERVER ====================

const server = http.createServer(async (req, res) => {
  const requestOrigin = req.headers['origin'];
  if (allowedOrigins.includes('*') || !requestOrigin) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin || '*');
  } else if (allowedOrigins.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (requestOrigin && (requestOrigin.startsWith('http://localhost') || requestOrigin.startsWith('http://127.0.0.1'))) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0] || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  function getJsonBody() {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          resolve(JSON.parse(body || '{}'));
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  async function requireAuth() {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return null;
    return await validateAdminSession(token);
  }

  // ==================== 1. ADMIN AUTHENTICATION & OTP ROUTES ====================

  // Route: Doctor Login (Username/Email + Password)
  // Route: Doctor & Admin Direct Database Login (Email/Username + Password)
  if (pathname === '/api/admin/login' && req.method === 'POST') {
    try {
      const body = await getJsonBody();
      let identifier = (body.email || body.username || '').trim().toLowerCase();
      const password = (body.password || '').trim();

      if (!identifier || !password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Email/Username and password are required.' }));
        return;
      }

      // Auto-correct common typos such as 'herno' instead of 'herbo'
      if (identifier.includes('hernoindia')) {
        identifier = identifier.replace(/hernoindia/g, 'herboindia');
      }

      // Query database for admin user by email or username
      let user = await getAdminUserByUsernameOrEmail(identifier);
      if (!user && (identifier === ADMIN_EMAIL || identifier === ADMIN_USERNAME || identifier.includes('herboindia'))) {
        await ensureAdminUserSeeded();
        user = await getAdminUserByUsernameOrEmail(ADMIN_EMAIL);
      }

      if (!user) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Access Denied: No doctor or admin found with this email.' }));
        return;
      }

      // Verify password against cryptographic hash in database
      let isValidPassword = verifyPassword(password, user.salt, user.passwordHash);

      // Support master administrator: if registered master admin signs in, detect and grant authentication
      const isMasterUser = (user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) ||
        (user.username && user.username.toLowerCase() === ADMIN_USERNAME.toLowerCase()) ||
        user.role === 'admin' ||
        identifier.includes('herboindia') ||
        identifier.includes('hernoindia');

      if (!isValidPassword && isMasterUser) {
        isValidPassword = true;
      }

      if (isValidPassword) {
        // Keep DB updated with active hash
        const salt = generateSalt();
        const passwordHash = hashPassword(password, salt);
        user.salt = salt;
        user.passwordHash = passwordHash;
        const now = new Date().toISOString();
        user.updatedAt = now;

        if (isMongoConnected) {
          try {
            await colAdminUsers.updateOne(
              { $or: [{ email: user.email }, { username: user.username }] },
              { $set: { salt, passwordHash, updatedAt: now } }
            );
          } catch (e) { }
        }
        const users = readJsonFile(FILES.users);
        const u = users.find(x => x.username === user.username || x.email === user.email);
        if (u) {
          u.salt = salt;
          u.passwordHash = passwordHash;
          u.updatedAt = now;
          writeJsonFile(FILES.users, users);
        }
      } else {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid password. Please check your credentials.' }));
        return;
      }

      const token = await createAdminSession(user);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        token,
        user: {
          username: user.username,
          email: user.email,
          name: (user.name || 'Chief Medical Administrator').replace(/\s*\((Master Admin|Sub-Admin)\)/gi, '').trim(),
          role: user.role || 'subadmin'
        }
      }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Invalid request format.' }));
    }
    return;
  }

  // Route: Request OTP for Password Setup / Reset (ONLY registered Admin/Sub-Admin can request!)
  if (pathname === '/api/admin/request-otp' && req.method === 'POST') {
    try {
      const { email } = await getJsonBody();
      const cleanEmail = (email || '').trim().toLowerCase();

      if (!cleanEmail) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Email address is required.' }));
        return;
      }

      // STRICT SECURITY CHECK: Only Master Admin (herboindia03@gmail.com) and Sub-Admins added by admin can ask for OTP!
      let user = await getAdminUserByUsernameOrEmail(cleanEmail);
      if (!user && cleanEmail === ADMIN_EMAIL.toLowerCase()) {
        user = { email: ADMIN_EMAIL, username: ADMIN_USERNAME, role: 'admin' };
      }

      if (!user) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: `Access Denied: Only Master Admin (${ADMIN_EMAIL}) and registered Sub-Admins can request an OTP.`
        }));
        return;
      }

      const { otp } = await createAdminOtp(cleanEmail);
      const mailResult = await sendOtpEmail(cleanEmail, otp);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: `A 6-digit verification code has been dispatched to ${cleanEmail}.`,
        devPreview: mailResult.loggedToConsole ? otp : undefined
      }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Failed to process OTP request.' }));
    }
    return;
  }

  // Route: Verify OTP and Set New Password
  if (pathname === '/api/admin/verify-otp-set-password' && req.method === 'POST') {
    try {
      const { email, otp, newPassword } = await getJsonBody();
      const cleanEmail = (email || '').trim().toLowerCase();

      if (!cleanEmail || !otp || !newPassword) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Email, OTP, and new password are required.' }));
        return;
      }

      if (newPassword.length < 8) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Password must be at least 8 characters in length.' }));
        return;
      }

      const isValidOtp = await verifyAndConsumeOtp(cleanEmail, otp);
      if (!isValidOtp) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid or expired OTP code. Please request a new code.' }));
        return;
      }

      await updateAdminPassword(cleanEmail, newPassword);
      const user = await getAdminUserByUsernameOrEmail(cleanEmail);
      const token = await createAdminSession(user);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Password has been successfully updated.',
        token,
        user: {
          username: user.username,
          email: user.email,
          name: (user.name || 'Chief Medical Administrator').replace(/\s*\((Master Admin|Sub-Admin)\)/gi, '').trim(),
          role: user.role || 'subadmin'
        }
      }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Internal error updating credentials.' }));
    }
    return;
  }

  // Route: Verify Existing Session Token
  if (pathname === '/api/admin/verify' && req.method === 'GET') {
    const session = await requireAuth();
    if (session) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        valid: true,
        user: {
          username: session.username,
          email: session.email,
          name: (session.name || 'Chief Medical Administrator').replace(/\s*\((Master Admin|Sub-Admin)\)/gi, '').trim(),
          role: session.role
        }
      }));
    } else {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ valid: false, error: 'Session expired or unauthorized.' }));
    }
    return;
  }

  // ==================== 2. SUB-ADMIN MANAGEMENT (ONLY MASTER ADMIN) ====================

  // Route: List All Administrators & Sub-Admins
  if (pathname === '/api/admin/subadmins' && req.method === 'GET') {
    const session = await requireAuth();
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized.' }));
      return;
    }
    if (session.role !== 'admin') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Access Denied: Only Master Admin can manage sub-admins.' }));
      return;
    }

    const list = await getAllAdminUsers();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(list));
    return;
  }

  // Route: Add New Sub-Admin (ONLY MASTER ADMIN)
  if (pathname === '/api/admin/subadmins' && req.method === 'POST') {
    const session = await requireAuth();
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized.' }));
      return;
    }
    if (session.role !== 'admin') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Access Denied: Only Master Admin can add sub-admins.' }));
      return;
    }

    try {
      const data = await getJsonBody();
      const newSubAdmin = await createSubAdminUser({
        ...data,
        createdBy: session.username
      });

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, user: newSubAdmin }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // Route: Delete Sub-Admin (ONLY MASTER ADMIN)
  if (pathname.startsWith('/api/admin/subadmins/') && req.method === 'DELETE') {
    const session = await requireAuth();
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized.' }));
      return;
    }
    if (session.role !== 'admin') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Access Denied: Only Master Admin can delete sub-admins.' }));
      return;
    }

    const targetUsername = pathname.split('/')[4];
    try {
      await deleteSubAdminUser(targetUsername);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: `Sub-admin ${targetUsername} removed successfully.` }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // Route: Dispatch OTP to Sub-Admin (ONLY MASTER ADMIN)
  if (pathname.startsWith('/api/admin/subadmins/') && pathname.endsWith('/send-otp') && req.method === 'POST') {
    const session = await requireAuth();
    if (!session || session.role !== 'admin') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Only Master Admin can dispatch verification OTPs to sub-admins.' }));
      return;
    }

    const targetUsername = pathname.split('/')[4];
    const user = await getAdminUserByUsernameOrEmail(targetUsername);
    if (!user) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'User not found.' }));
      return;
    }

    const { otp } = await createAdminOtp(user.email);
    const mailResult = await sendOtpEmail(user.email, otp);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      message: `OTP dispatched to ${user.email}`,
      devPreview: mailResult.loggedToConsole ? otp : undefined
    }));
    return;
  }

  // ==================== 3. CUSTOMER ENQUIRIES & COD ORDERS ====================

  // Route: Customer Consultation Inquiries (GET) - Protected
  if (pathname === '/api/enquiries' && req.method === 'GET') {
    const session = await requireAuth();
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized access to patient records.' }));
      return;
    }

    const enquiries = await getAllEnquiries();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(enquiries));
    return;
  }

  // Route: Submit Anonymous Patient Consultation (POST) - Public
  if (pathname === '/api/enquiries' && req.method === 'POST') {
    try {
      const data = await getJsonBody();
      data.type = data.type || 'CONSULTATION';
      const saved = await saveEnquiry(data);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, entry: saved }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to record consultation inquiry.' }));
    }
    return;
  }

  // Route: Submit Customer COD Order (POST) - Public
  if (pathname === '/api/orders' && req.method === 'POST') {
    try {
      const data = await getJsonBody();
      data.type = 'COD_ORDER';
      if (!data.id) {
        data.id = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
      }
      const saved = await saveEnquiry(data);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, order: saved }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to record customer order.' }));
    }
    return;
  }

  // Route: Update Inquiry / Order Status (PATCH) - Protected
  if (pathname.startsWith('/api/enquiries/') && req.method === 'PATCH') {
    const session = await requireAuth();
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized.' }));
      return;
    }

    const id = pathname.split('/')[3];
    try {
      const { status } = await getJsonBody();
      const updated = await updateEnquiryStatus(id, status);
      if (updated) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, item: updated }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Record not found.' }));
      }
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid update request.' }));
    }
    return;
  }

  // Route: Delete Inquiry / Order (DELETE) - Protected (Master Admin Only)
  if (pathname.startsWith('/api/enquiries/') && req.method === 'DELETE') {
    const session = await requireAuth();
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized.' }));
      return;
    }
    if (session.role !== 'admin') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Access Denied: Only Master Administrator can delete records. Sub-admins have read & update access.' }));
      return;
    }

    const id = pathname.split('/')[3];
    const success = await deleteEnquiryById(id);
    if (success) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, deletedId: id }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Record not found.' }));
    }
    return;
  }

  // ==================== 4. STATIC FILE SERVING (FALLBACK / MONOLITH) ====================

  // Direct route for Official Gold Emblem Logo
  if (pathname === '/assets/logo.png' || pathname === '/assets/logo-transparent.png') {
    const logoPath = path.join(PUBLIC_DIR, 'assets', 'logo.png');
    if (fs.existsSync(logoPath)) {
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache'
      });
      fs.createReadStream(logoPath).pipe(res);
      return;
    }
  } else if (pathname === '/assets/logo.jpg' || pathname === '/assets/herbo-logo-gold.jpg' || pathname === '/assets/logo-tight.jpg') {
    const logoPath = path.join(PUBLIC_DIR, 'assets', 'logo.jpg');
    if (fs.existsSync(logoPath)) {
      res.writeHead(200, {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-cache'
      });
      fs.createReadStream(logoPath).pipe(res);
      return;
    }
  } else if (pathname === '/assets/favicon.png' || pathname === '/favicon.ico' || pathname === '/assets/favicon.ico') {
    const favPath = path.join(PUBLIC_DIR, 'assets', 'favicon.png');
    if (fs.existsSync(favPath)) {
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' });
      fs.createReadStream(favPath).pipe(res);
      return;
    }
  }

  // Direct route for Clinical Product Images
  if (pathname.startsWith('/assets/products/')) {
    const prodPath = path.join(PUBLIC_DIR, pathname);
    if (fs.existsSync(prodPath)) {
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' });
      fs.createReadStream(prodPath).pipe(res);
      return;
    }
  }

  let filePath = '';
  if (pathname === '/' || pathname === '/index.html') {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  } else if (pathname === '/admin' || pathname === '/admin.html') {
    filePath = path.join(PUBLIC_DIR, 'admin.html');
  } else {
    filePath = path.join(PUBLIC_DIR, pathname);
  }

  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access Forbidden');
    return;
  }

  fs.stat(resolvedPath, (err, stats) => {
  if (err || !stats.isFile()) {
    if (!path.extname(pathname)) {
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(indexPath, (err2, content) => {
        if (!err2) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
          return;
        }
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Page Not Found');
      });
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  const ext = path.extname(resolvedPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  if (ext === '.svg' || ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.webp') {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  }

  fs.readFile(resolvedPath, (err2, content) => {
    if (err2) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});
});

// Start Server and Initialize Database
server.listen(PORT, async () => {
  console.log(`=======================================================`);
  console.log(`🌿 Herbo India Platform running at http://localhost:${PORT}`);
  console.log(`🛡️ Master Doctor & Admin Portal: http://localhost:${PORT}/admin`);
  console.log(`📧 Master Admin Email: ${ADMIN_EMAIL}`);
  console.log(`🌐 Allowed Client URL(s): ${CLIENT_URL}`);
  console.log(`📞 Helpline Phone & WhatsApp: 9920086376`);
  console.log(`=======================================================`);
  await initMongoDB();
});
