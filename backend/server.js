require('dotenv').config();

const bcrypt = require('bcryptjs');
const cors = require('cors');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 5000;
const jwtSecret = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true }
);
const User = mongoose.model('User', userSchema);

// Trusted contact: owner -> contact (one-directional add)
const trustedContactSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    contact: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);
trustedContactSchema.index({ owner: 1, contact: 1 }, { unique: true });
const TrustedContact = mongoose.model('TrustedContact', trustedContactSchema);

// Live Activity Session
const liveSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true }, // matches local history id
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    activityType: { type: String, required: true },
    title: { type: String, required: true },
    route: { type: String, default: '' },
    status: { type: String, enum: ['active', 'sos', 'ended'], default: 'active' },
    sosTriggeredAt: { type: Date },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      updatedAt: { type: Date },
    },
  },
  { timestamps: true }
);
const LiveSession = mongoose.model('LiveSession', liveSessionSchema);

// In-App Notification
const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['activity_started', 'activity_ended', 'checkin_safe', 'sos', 'missed_checkin'], required: true },
    sessionId: { type: String },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);
const Notification = mongoose.model('Notification', notificationSchema);

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function publicUser(user) {
  return { id: user.id || user._id, name: user.name, email: user.email };
}

function tokenFor(user) {
  return jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: '7d' });
}

function credentials(body, includeName) {
  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const validEmail = typeof email === 'string' && /^\S+@\S+\.\S+$/.test(email);
  if ((includeName && (!name || name.length > 80)) || !validEmail || typeof password !== 'string' || password.length < 8) return null;
  return { name, email, password };
}

function requireAuth(req, res, next) {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: 'Authentication required.' });
  try {
    req.userId = jwt.verify(token, jwtSecret).sub;
    return next();
  } catch {
    return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
  }
}

async function createNotification(recipientId, senderId, type, sessionId, message) {
  try {
    await Notification.create({ recipient: recipientId, sender: senderId, type, sessionId, message });
  } catch (e) {
    console.error('Notification creation failed', e.message);
  }
}

// ─────────────────────────────────────────────
// Auth Routes
// ─────────────────────────────────────────────

app.get('/api/health', (_req, res) => res.json({ success: true, message: 'TrailGuard API is running' }));

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const input = credentials(req.body, true);
    if (!input) return res.status(400).json({ message: 'Enter a name, valid email, and password of at least 8 characters.' });
    if (await User.exists({ email: input.email })) return res.status(409).json({ message: 'An account with this email already exists.' });
    const user = await User.create({ name: input.name, email: input.email, passwordHash: await bcrypt.hash(input.password, 12) });
    return res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
  } catch (error) { return next(error); }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const input = credentials(req.body, false);
    if (!input) return res.status(400).json({ message: 'Enter a valid email and password.' });
    const user = await User.findOne({ email: input.email }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) return res.status(401).json({ message: 'Email or password is incorrect.' });
    return res.json({ token: tokenFor(user), user: publicUser(user) });
  } catch (error) { return next(error); }
});

app.get('/api/auth/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ message: 'Your account no longer exists.' });
    return res.json({ user: publicUser(user) });
  } catch (error) { return next(error); }
});

// ─────────────────────────────────────────────
// Trusted Contacts Routes
// ─────────────────────────────────────────────

// GET /api/contacts — list my trusted contacts (as full user objects)
app.get('/api/contacts', requireAuth, async (req, res, next) => {
  try {
    const entries = await TrustedContact.find({ owner: req.userId }).populate('contact', 'name email');
    return res.json({ contacts: entries.map(e => publicUser(e.contact)) });
  } catch (e) { return next(e); }
});

// POST /api/contacts — add a contact by email
app.post('/api/contacts', requireAuth, async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Email is required.' });
    const contactUser = await User.findOne({ email });
    if (!contactUser) return res.status(404).json({ message: 'No TrailGuard account found for that email.' });
    if (contactUser._id.toString() === req.userId) return res.status(400).json({ message: 'You cannot add yourself as a contact.' });
    await TrustedContact.create({ owner: req.userId, contact: contactUser._id });
    return res.status(201).json({ contact: publicUser(contactUser) });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: 'This contact is already in your list.' });
    return next(e);
  }
});

// DELETE /api/contacts/:contactId — remove a contact
app.delete('/api/contacts/:contactId', requireAuth, async (req, res, next) => {
  try {
    await TrustedContact.deleteOne({ owner: req.userId, contact: req.params.contactId });
    return res.json({ success: true });
  } catch (e) { return next(e); }
});

// ─────────────────────────────────────────────
// Live Session Routes
// ─────────────────────────────────────────────

// POST /api/sessions — start a live session
app.post('/api/sessions', requireAuth, async (req, res, next) => {
  try {
    const { sessionId, activityType, title, route, sharedWithEmails, latitude, longitude } = req.body;
    if (!sessionId || !activityType || !title) return res.status(400).json({ message: 'sessionId, activityType, and title are required.' });

    // Resolve sharedWith emails to user IDs
    let sharedWithIds = [];
    if (Array.isArray(sharedWithEmails) && sharedWithEmails.length > 0) {
      const users = await User.find({ email: { $in: sharedWithEmails.map(e => e.toLowerCase()) } });
      sharedWithIds = users.map(u => u._id);
    }

    const session = await LiveSession.create({
      sessionId,
      owner: req.userId,
      sharedWith: sharedWithIds,
      activityType,
      title,
      route: route || '',
      status: 'active',
      startedAt: new Date(),
      location: { latitude, longitude, updatedAt: new Date() },
    });

    // Notify all shared contacts
    const owner = await User.findById(req.userId);
    for (const recipientId of sharedWithIds) {
      await createNotification(
        recipientId,
        req.userId,
        'activity_started',
        sessionId,
        `${owner.name} started a ${activityType} and is sharing their live location with you.`
      );
    }

    return res.status(201).json({ session });
  } catch (e) { return next(e); }
});

// PATCH /api/sessions/:sessionId/location — update location
app.patch('/api/sessions/:sessionId/location', requireAuth, async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;
    const session = await LiveSession.findOneAndUpdate(
      { sessionId: req.params.sessionId, owner: req.userId, status: { $ne: 'ended' } },
      { $set: { 'location.latitude': latitude, 'location.longitude': longitude, 'location.updatedAt': new Date() } },
      { new: true }
    );
    if (!session) return res.status(404).json({ message: 'Session not found.' });
    return res.json({ success: true });
  } catch (e) { return next(e); }
});

// POST /api/sessions/:sessionId/checkin — I am safe
app.post('/api/sessions/:sessionId/checkin', requireAuth, async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;
    const session = await LiveSession.findOne({ sessionId: req.params.sessionId, owner: req.userId });
    if (!session) return res.status(404).json({ message: 'Session not found.' });

    if (latitude && longitude) {
      session.location = { latitude, longitude, updatedAt: new Date() };
      await session.save();
    }

    const owner = await User.findById(req.userId);
    for (const recipientId of session.sharedWith) {
      await createNotification(
        recipientId,
        req.userId,
        'checkin_safe',
        req.params.sessionId,
        `${owner.name} checked in and is safe during their ${session.activityType}.`
      );
    }
    return res.json({ success: true });
  } catch (e) { return next(e); }
});

// POST /api/sessions/:sessionId/sos — trigger SOS
app.post('/api/sessions/:sessionId/sos', requireAuth, async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;
    const session = await LiveSession.findOneAndUpdate(
      { sessionId: req.params.sessionId, owner: req.userId },
      { $set: { status: 'sos', sosTriggeredAt: new Date(), 'location.latitude': latitude, 'location.longitude': longitude, 'location.updatedAt': new Date() } },
      { new: true }
    );
    if (!session) return res.status(404).json({ message: 'Session not found.' });

    const owner = await User.findById(req.userId);
    for (const recipientId of session.sharedWith) {
      await createNotification(
        recipientId,
        req.userId,
        'sos',
        req.params.sessionId,
        `URGENT SOS ALERT: ${owner.name} has triggered an emergency during their ${session.activityType}!`
      );
    }
    return res.json({ success: true });
  } catch (e) { return next(e); }
});

// DELETE /api/sessions/:sessionId/sos — cancel SOS
app.delete('/api/sessions/:sessionId/sos', requireAuth, async (req, res, next) => {
  try {
    await LiveSession.findOneAndUpdate(
      { sessionId: req.params.sessionId, owner: req.userId },
      { $set: { status: 'active', sosTriggeredAt: null } }
    );
    return res.json({ success: true });
  } catch (e) { return next(e); }
});

// POST /api/sessions/:sessionId/end — end session
app.post('/api/sessions/:sessionId/end', requireAuth, async (req, res, next) => {
  try {
    const session = await LiveSession.findOneAndUpdate(
      { sessionId: req.params.sessionId, owner: req.userId },
      { $set: { status: 'ended', endedAt: new Date() } },
      { new: true }
    );
    if (!session) return res.status(404).json({ message: 'Session not found.' });

    const owner = await User.findById(req.userId);
    for (const recipientId of session.sharedWith) {
      await createNotification(
        recipientId,
        req.userId,
        'activity_ended',
        req.params.sessionId,
        `${owner.name} ended their ${session.activityType}.`
      );
    }
    return res.json({ success: true });
  } catch (e) { return next(e); }
});

// GET /api/sessions/shared — get live sessions shared with me
app.get('/api/sessions/shared', requireAuth, async (req, res, next) => {
  try {
    const sessions = await LiveSession.find({
      sharedWith: req.userId,
      status: { $ne: 'ended' },
    }).populate('owner', 'name email');
    return res.json({ sessions: sessions.map(s => ({
      sessionId: s.sessionId,
      owner: publicUser(s.owner),
      activityType: s.activityType,
      title: s.title,
      route: s.route,
      status: s.status,
      sosTriggeredAt: s.sosTriggeredAt,
      startedAt: s.startedAt,
      location: s.location,
    })) });
  } catch (e) { return next(e); }
});

// GET /api/sessions/:sessionId — get a specific live session (must be owner or sharedWith)
app.get('/api/sessions/:sessionId', requireAuth, async (req, res, next) => {
  try {
    const session = await LiveSession.findOne({ sessionId: req.params.sessionId }).populate('owner', 'name email');
    if (!session) return res.status(404).json({ message: 'Session not found.' });
    const isOwner = session.owner._id.toString() === req.userId;
    const isShared = session.sharedWith.map(id => id.toString()).includes(req.userId);
    if (!isOwner && !isShared) return res.status(403).json({ message: 'Access denied.' });
    return res.json({ session: {
      sessionId: session.sessionId,
      owner: publicUser(session.owner),
      activityType: session.activityType,
      title: session.title,
      route: session.route,
      status: session.status,
      sosTriggeredAt: session.sosTriggeredAt,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      location: session.location,
    }});
  } catch (e) { return next(e); }
});

// ─────────────────────────────────────────────
// Notification Routes
// ─────────────────────────────────────────────

// GET /api/notifications — get my unread notifications
app.get('/api/notifications', requireAuth, async (req, res, next) => {
  try {
    const notifs = await Notification.find({ recipient: req.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('sender', 'name email');
    return res.json({ notifications: notifs.map(n => ({
      id: n._id,
      type: n.type,
      sessionId: n.sessionId,
      message: n.message,
      read: n.read,
      sender: publicUser(n.sender),
      createdAt: n.createdAt,
    })) });
  } catch (e) { return next(e); }
});

// PATCH /api/notifications/read-all — mark all as read
app.patch('/api/notifications/read-all', requireAuth, async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.userId, read: false }, { $set: { read: true } });
    return res.json({ success: true });
  } catch (e) { return next(e); }
});

// PATCH /api/notifications/:id/read — mark one as read
app.patch('/api/notifications/:id/read', requireAuth, async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, recipient: req.userId }, { $set: { read: true } });
    return res.json({ success: true });
  } catch (e) { return next(e); }
});

// ─────────────────────────────────────────────
// Error Handler
// ─────────────────────────────────────────────

app.use((error, _req, res, _next) => {
  if (error?.code === 11000) return res.status(409).json({ message: 'Duplicate entry.' });
  console.error(error);
  return res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

if (!jwtSecret) {
  console.error('JWT_SECRET is required. Add it to backend/.env.');
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => app.listen(port, () => console.log(`TrailGuard API running on port ${port}`)))
  .catch((error) => console.error('MongoDB connection failed:', error.message));
