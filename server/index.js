import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authRouter from './routes/auth.js';
import userRouter from './routes/user.js';
import paymentsRouter from './routes/payments.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Rate limiting
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many attempts. Please try again later.' } });
const forgotLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: { error: 'Too many reset attempts. Please try again later.' } });
const paymentLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 });
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', forgotLimiter);
app.use('/api/payments/create-checkout-session', paymentLimiter);

// Stripe webhooks need the raw body for signature verification
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/payments', paymentsRouter);

// Health check
app.get('/api/health', (_, res) => res.json({ ok: true }));

// Serve built frontend
const distPath = join(__dirname, '../dist');
app.use(express.static(distPath));
app.get('*', (_, res) => res.sendFile(join(distPath, 'index.html')));

app.listen(PORT, () => {
  console.log(`Lexicographer server running on http://localhost:${PORT}`);
});
