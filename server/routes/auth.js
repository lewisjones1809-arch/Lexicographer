import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { getUserByEmail, createUser, setResetToken, getUserByResetToken, clearResetToken, updatePassword } from '../db.js';

const router = Router();

function signToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  try {
    const existing = getUserByEmail(email.toLowerCase());
    if (existing) return res.status(409).json({ error: 'An account with that email already exists' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = createUser(email.toLowerCase(), passwordHash);
    const token = signToken(user);
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const user = getUserByEmail(email.toLowerCase());
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = signToken(user);
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/verify
router.get('/verify', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ valid: false });

  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    res.json({ valid: true, user: { id: payload.userId, email: payload.email } });
  } catch {
    res.status(401).json({ valid: false });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  // Always respond 200 — never reveal whether the email exists
  res.json({ ok: true });

  try {
    const user = getUserByEmail(email.toLowerCase());
    console.log('[forgot-password] email:', email.toLowerCase(), '| user found:', !!user);
    if (!user) return;

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
    setResetToken(user.id, token, expires);

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}?reset=${token}`;

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_PORT === '465',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    console.log('[forgot-password] sending email to:', user.email, '| host:', process.env.EMAIL_HOST, '| user:', process.env.EMAIL_USER);
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: user.email,
      subject: 'Reset your Lexicographer password',
      text: `Click the link below to reset your password (expires in 1 hour):\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
      html: `<p>Click the link below to reset your password (expires in 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
    });
    console.log('[forgot-password] email sent successfully');
  } catch (err) {
    console.error('[forgot-password] SMTP error:', err.message);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token: resetToken, password } = req.body;
  if (!resetToken || !password) return res.status(400).json({ error: 'Token and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  try {
    const user = getUserByResetToken(resetToken);
    if (!user || !user.reset_expires) return res.status(400).json({ error: 'Invalid or expired reset link' });
    if (new Date(user.reset_expires) < new Date()) {
      clearResetToken(user.id);
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    updatePassword(user.id, passwordHash);
    clearResetToken(user.id);

    const authToken = signToken(user);
    res.json({ token: authToken, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('Reset-password error:', err.message);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

export default router;
