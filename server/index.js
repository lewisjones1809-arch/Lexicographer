import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authRouter from './routes/auth.js';
import userRouter from './routes/user.js';
import paymentsRouter from './routes/payments.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

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
