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

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true }
);
const User = mongoose.model('User', userSchema);

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
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

app.use((error, _req, res, _next) => {
  if (error?.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
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
