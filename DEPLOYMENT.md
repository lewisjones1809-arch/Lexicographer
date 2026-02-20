# Lexicographer — Production Deployment Guide

This document covers everything required before accepting real payments from real users.

---

## 1. HTTPS (Mandatory)

Passwords are sent from the browser to your server. Without HTTPS, anyone on the same network can intercept them in plaintext — even though they're hashed on arrival.

**HTTPS is non-negotiable before going live.**

### Option A — Managed hosting (recommended for simplicity)
Platforms like [Railway](https://railway.app), [Render](https://render.com), or [Fly.io](https://fly.io) provision SSL certificates automatically. Deploy your Express server there and it gets HTTPS for free.

### Option B — Self-hosted with nginx + Let's Encrypt
1. Point a domain at your server's IP
2. Install nginx and certbot
3. Run: `certbot --nginx -d yourdomain.com`
4. Configure nginx to reverse-proxy port 443 → your Express port (3001)

---

## 2. Environment Variables

Never commit secrets to version control. Set these in your hosting platform's dashboard (or a `.env` file that's in `.gitignore`).

| Variable | Purpose | How to get it |
|---|---|---|
| `STRIPE_SECRET_KEY` | Authenticates your server with Stripe | Stripe Dashboard → Developers → API keys → **Secret key** |
| `STRIPE_WEBHOOK_SECRET` | Verifies webhook payloads are from Stripe | Stripe Dashboard → Webhooks → your endpoint → Signing secret |
| `JWT_SECRET` | Signs and verifies user session tokens | Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `PORT` | Port the Express server listens on | Set to `3001` locally; hosting platforms often set this automatically |
| `CLIENT_URL` | Allowed CORS origin + Stripe return URL | Your production frontend URL e.g. `https://yourdomain.com` |
| `EMAIL_HOST` | SMTP hostname for sending password-reset emails | From your email provider (see Section 8) |
| `EMAIL_PORT` | SMTP port — `587` (STARTTLS) or `465` (SSL) | From your email provider |
| `EMAIL_USER` | SMTP login username | From your email provider |
| `EMAIL_PASS` | SMTP login password or app password | From your email provider |
| `EMAIL_FROM` | The "From" address shown to users | e.g. `Lexicographer <noreply@yourdomain.com>` |

**Generating a secure JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output. It must be at least 32 random characters — never use a dictionary word.

---

## 3. Switching Stripe from Test → Live

All development uses test mode (`sk_test_...` keys). Test payments never charge real cards.

**Before going live:**

1. **Activate your Stripe account** — Dashboard → complete the business verification form (requires business or personal details, bank account for payouts)
2. **Toggle to Live mode** in the Stripe Dashboard (top-left switch)
3. **Replace keys** — copy your Live Secret Key (`sk_live_...`) into your `STRIPE_SECRET_KEY` environment variable
4. **Create live products** — your test products don't carry over; recreate them in Live mode, copy the new `price_live_...` Price IDs into `constants.js` `IAP_PRODUCTS`
5. **Register your live webhook endpoint** — Dashboard → Webhooks → Add endpoint → enter `https://yourdomain.com/api/payments/webhook` → select event `checkout.session.completed` → copy the new signing secret into `STRIPE_WEBHOOK_SECRET`
6. **Update `success_url`** — in `server/routes/payments.js`, `CLIENT_URL` must point to your production domain (set via the `CLIENT_URL` env var, not hardcoded)

> ⚠️ Never mix test and live keys. Using a `sk_test_...` key against live mode (or vice versa) will cause all payment attempts to fail.

---

## 4. Database

The server uses SQLite (`server/lexicographer.db`). This is fine for a small game with moderate traffic.

**When to consider migrating to Postgres:**
- You're running multiple server instances (load balancer) — SQLite doesn't support concurrent writes across processes
- You have >10,000 active users — SQLite handles this fine but Postgres gives you better tooling

**Backup strategy:**
- SQLite is a single file — back it up by copying `server/lexicographer.db`
- Schedule daily backups: `cp server/lexicographer.db backups/lexicographer-$(date +%F).db`
- Most hosting platforms (Railway, Render) have managed Postgres available as an add-on when you're ready to migrate

---

## 5. Password Security Checklist

- [x] **Passwords hashed with bcrypt** — cost factor 12 (`bcrypt.hash(password, 12)` in `server/routes/auth.js`)
- [x] **Passwords never logged** — no `console.log(password)` anywhere in server code
- [x] **Raw passwords never stored** — only `password_hash` column in DB
- [x] **Password reset tokens expire in 1 hour** — `reset_expires` column enforced in `POST /api/auth/reset-password`
- [x] **Reset tokens single-use** — cleared from DB immediately after use
- [ ] **HTTPS enforced** — confirm before launch (see Section 1)
- [ ] **Rate limiting on auth routes** — see Section 7

---

## 6. Legal Requirements

Stripe requires these before your account can process live payments:

| Requirement | Why |
|---|---|
| **Terms of Service** | Required by Stripe; sets rules for your service |
| **Privacy Policy** | Required by Stripe and GDPR/CCPA; explains data you collect (email, purchase history) |
| **Refund Policy** | Required by consumer law in most countries; digital goods are often non-refundable but this must be stated explicitly |

**Minimum content for a digital goods refund policy:**
> "All purchases are final. Digital items are delivered immediately upon payment and are non-refundable. If you experience a technical issue preventing delivery, contact [your email] within 14 days."

These pages can be simple HTML at `/terms`, `/privacy`, `/refunds` — or link to Google Docs. Add their URLs in the Stripe Dashboard under Business Settings → Public details.

---

## 7. Rate Limiting (Security)

Without rate limiting, a bot can try millions of password guesses against `/api/auth/login`, or flood your email provider via `/api/auth/forgot-password`.

**Install:**
```bash
npm install express-rate-limit
```

**Add to `server/index.js`:**
```js
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // max 20 attempts per IP per window
  message: { error: 'Too many attempts. Please try again later.' },
});

const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                    // max 5 reset requests per IP per hour
  message: { error: 'Too many reset attempts. Please try again later.' },
});

app.use('/api/auth/login',            authLimiter);
app.use('/api/auth/register',         authLimiter);
app.use('/api/auth/forgot-password',  forgotLimiter);

const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,                   // max 10 checkout sessions per IP per hour
});
app.use('/api/payments/create-checkout-session', paymentLimiter);
```

---

## 8. Email (Password Reset)

The forgot-password flow (`POST /api/auth/forgot-password`) sends reset links via nodemailer over SMTP. You need a transactional email provider — do **not** use a personal Gmail account in production (low rate limits, spam reputation damage).

### Recommended providers

| Provider | Free tier | Setup |
|---|---|---|
| [Resend](https://resend.com) | 100 emails/day, 3,000/month | API key + domain DNS records |
| [Brevo](https://brevo.com) | 300 emails/day | SMTP credentials in dashboard |
| [Mailgun](https://mailgun.com) | 5,000/month for 3 months | Domain verification + SMTP credentials |

### Setup steps (Resend example — recommended)

1. Sign up at [resend.com](https://resend.com) and verify your sending domain (add the DNS TXT/MX records they give you)
2. Create an API key in the Resend dashboard
3. Resend provides an SMTP relay — set your env vars:

```
EMAIL_HOST=smtp.resend.com
EMAIL_PORT=587
EMAIL_USER=resend
EMAIL_PASS=re_xxxxxxxxxxxx   ← your Resend API key
EMAIL_FROM=Lexicographer <noreply@yourdomain.com>
```

### Setup steps (Brevo example)

1. Sign up at [brevo.com](https://brevo.com)
2. Go to SMTP & API → SMTP tab → copy the credentials
3. Set env vars:

```
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USER=your@email.com
EMAIL_PASS=your-brevo-smtp-key
EMAIL_FROM=Lexicographer <noreply@yourdomain.com>
```

### Testing before launch

Send a real reset email to yourself in production mode before going live:
1. Create an account with your email
2. Sign out
3. Click "Forgot password?" in the sign-in modal
4. Confirm the email arrives, the link works, and you can set a new password and sign in

---

## 9. Account Management

### Inspecting the database

While the server is running, query the live database with this one-liner:

```bash
node --experimental-sqlite -e "
import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('./server/lexicographer.db');
const users = db.prepare('SELECT id, email, created_at FROM users').all();
console.table(users);
db.close();
"
```

### Deleting a specific user account

```bash
node --experimental-sqlite -e "
import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('./server/lexicographer.db');
const email = 'user@example.com';
const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
if (!user) { console.log('User not found'); process.exit(1); }
db.prepare('DELETE FROM user_state WHERE user_id = ?').run(user.id);
db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
console.log('Deleted user', email);
db.close();
"
```

### Manually resetting a user's password (admin override)

Use this if a user is locked out and the email reset isn't working (e.g. email provider not yet configured):

```bash
node --experimental-sqlite -e "
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
const db = new DatabaseSync('./server/lexicographer.db');
const email = 'user@example.com';
const newPassword = 'TemporaryPass123';
const hash = await bcrypt.hash(newPassword, 12);
const result = db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE email = ?').run(hash, email);
console.log(result.changes ? 'Password updated' : 'User not found');
db.close();
" --input-type=module
```

Then tell the user their temporary password and instruct them to change it after signing in.

### Wiping all accounts (development only)

```bash
node --experimental-sqlite -e "
import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('./server/lexicographer.db');
db.exec('DELETE FROM purchases; DELETE FROM user_state; DELETE FROM users;');
console.log('All accounts cleared');
db.close();
"
```

> ⚠️ Never run this against a production database.

### Checking for stuck reset tokens

Reset tokens expire after 1 hour but remain in the DB until used. To clean up expired tokens:

```bash
node --experimental-sqlite -e "
import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('./server/lexicographer.db');
const result = db.prepare(\"UPDATE users SET reset_token = NULL, reset_expires = NULL WHERE reset_expires < datetime('now')\").run();
console.log('Cleared', result.changes, 'expired token(s)');
db.close();
"
```

You can schedule this as a daily cron job.

---

## 10. Pre-Launch Stripe Test Checklist

Run through these with Stripe **test mode** before flipping to live:

| Scenario | Test card number | Expected result |
|---|---|---|
| Successful payment | `4242 4242 4242 4242` | Redirects back, items granted |
| Card declined | `4000 0000 0000 0002` | Stripe shows decline, no items granted |
| Insufficient funds | `4000 0000 0000 9995` | Stripe shows decline, no items granted |
| 3D Secure required | `4000 0025 0000 3155` | Stripe shows 3DS challenge, items granted after |
| Idempotency (reload after success) | Reload `?iap_session=...` URL | Items NOT doubled (already fulfilled) |

Use expiry `12/34`, CVC `123`, any postcode for all test cards.

---

## 11. Running in Production

```bash
# Install dependencies
npm install --omit=dev

# Set all environment variables (or ensure .env exists)
# Then start the Express server:
node server/index.js

# Build and serve the frontend (Vite output → serve statically via nginx or a CDN)
npm run build
# Deploy dist/ folder to your static host or serve via Express:
# app.use(express.static('dist'));
```

**Recommended architecture:**
```
nginx (HTTPS, port 443)
  ├── /api  →  Express server (port 3001)
  └── /     →  Static files from dist/
```

---

## 12. Checklist Before Launch

- [ ] HTTPS configured and tested
- [ ] `.env` set with live Stripe keys
- [ ] Live Stripe products created, Price IDs updated in `constants.js`
- [ ] Webhook endpoint registered in Stripe Live mode
- [ ] `CLIENT_URL` env var set to production domain
- [ ] Rate limiting added to auth, forgot-password, and payment routes
- [ ] Terms of Service, Privacy Policy, Refund Policy pages live
- [ ] Business verified in Stripe Dashboard
- [ ] Bank account added to Stripe for payouts
- [ ] All 5 Stripe test scenarios pass in test mode
- [ ] Email provider configured (`EMAIL_HOST/PORT/USER/PASS/FROM` set)
- [ ] Password reset flow tested end-to-end (email arrives, link works, sign-in succeeds)
- [ ] SQLite database backed up before going live
- [ ] Database file excluded from version control (`.gitignore`)
- [ ] Expired reset token cleanup scheduled (daily cron — see Section 9)
