# Lexicographer — Production Deployment Guide

This document covers everything required before accepting real payments from real users.

---

## 1. HTTPS (Mandatory)

Passwords are sent from the browser to your server. Without HTTPS, anyone on the same network can intercept them in plaintext — even though they're hashed on arrival.

**HTTPS is non-negotiable before going live.**

### Option A — Railway (current setup — recommended)
Railway provisions SSL certificates automatically. Your app is already on HTTPS at your `.railway.app` domain.

### Option B — Self-hosted with nginx + Let's Encrypt
1. Point a domain at your server's IP
2. Install nginx and certbot
3. Run: `certbot --nginx -d yourdomain.com`
4. Configure nginx to reverse-proxy port 443 → your Express port

---

## 2. Environment Variables

Never commit secrets to version control. Set these in Railway's Variables tab (or a `.env` file that's in `.gitignore` for local dev).

| Variable | Purpose | How to get it |
|---|---|---|
| `STRIPE_SECRET_KEY` | Authenticates your server with Stripe | Stripe Dashboard → Developers → API keys → **Secret key** |
| `STRIPE_WEBHOOK_SECRET` | Verifies webhook payloads are from Stripe | Stripe Dashboard → Webhooks → your endpoint → Signing secret |
| `JWT_SECRET` | Signs and verifies user session tokens | Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `PORT` | Port the Express server listens on | Set automatically by Railway; set to `3001` locally |
| `CLIENT_URL` | CORS origin + Stripe success/cancel URL | Your Railway URL e.g. `https://yourapp.up.railway.app` |
| `EMAIL_PASS` | Resend API key for sending password-reset emails | Resend Dashboard → API Keys (see Section 8) |
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
3. **Replace keys** — copy your Live Secret Key (`sk_live_...`) into your `STRIPE_SECRET_KEY` Railway variable
4. **Register your live webhook endpoint** — Dashboard → Webhooks → Add endpoint → enter `https://yourapp.up.railway.app/api/payments/webhook` → select event `checkout.session.completed` → copy the new signing secret into `STRIPE_WEBHOOK_SECRET`
5. **Update `CLIENT_URL`** — ensure it points to your production domain so Stripe redirects work

> ⚠️ Never mix test and live keys. Using a `sk_test_...` key against live mode (or vice versa) will cause all payment attempts to fail.

---

## 4. Database

The server uses SQLite via Node's built-in `node:sqlite` module. On Railway, the database file lives at `/app/data/lexicographer.db` (persisted via a Railway Volume). Locally it lives at `server/lexicographer.db`.

### Railway persistent volume setup

Without a volume, the database resets on every redeploy. The volume is mounted at `/app/data` — `server/db.js` detects `RAILWAY_ENVIRONMENT` and uses that path automatically.

To add or verify the volume:
1. Railway project → your service → **Volumes** tab → **Add Volume**
2. Mount path: `/app/data`

### Backup strategy
- SQLite is a single file — back it up by copying the database file
- On Railway, use the CLI: `railway run cp /app/data/lexicographer.db /app/data/lexicographer-backup-$(date +%F).db`
- Most hosting platforms (Railway, Render) have managed Postgres available as an add-on when you're ready to migrate

**When to consider migrating to Postgres:**
- You're running multiple server instances (load balancer) — SQLite doesn't support concurrent writes across processes
- You have >10,000 active users

---

## 5. Password Security Checklist

- [x] **Passwords hashed with bcrypt** — cost factor 12 (`bcrypt.hash(password, 12)` in `server/routes/auth.js`)
- [x] **Passwords never logged** — no `console.log(password)` anywhere in server code
- [x] **Raw passwords never stored** — only `password_hash` column in DB
- [x] **Password reset tokens expire in 1 hour** — `reset_expires` column enforced in `POST /api/auth/reset-password`
- [x] **Reset tokens single-use** — cleared from DB immediately after use
- [x] **HTTPS enforced** — provided automatically by Railway
- [x] **Rate limiting on auth routes** — implemented in `server/index.js` (see Section 7)

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

Already implemented in `server/index.js`:

- **Auth routes** (`/login`, `/register`): max 20 attempts per IP per 15 minutes
- **Forgot password**: max 5 requests per IP per hour
- **Checkout session creation**: max 10 per IP per hour

No action needed — this is done.

---

## 8. Email (Password Reset)

The forgot-password flow uses the **Resend HTTP API** (not SMTP) via the `resend` npm package. SMTP is blocked by most cloud hosts; the HTTP API works everywhere.

### Setup (Resend — current provider)

1. Sign up at [resend.com](https://resend.com)
2. **For testing**: use `onboarding@resend.dev` as `EMAIL_FROM` — only sends to your Resend account email
3. **For production**: verify your own domain (Resend → Domains → Add Domain → add the DNS records) then use `noreply@yourdomain.com`
4. Create an API key in the Resend dashboard → copy it
5. Set Railway variables:

```
EMAIL_PASS=re_xxxxxxxxxxxx   ← your Resend API key
EMAIL_FROM=Lexicographer <noreply@yourdomain.com>
```

### Testing before launch

1. Create an account with your email on the live Railway URL
2. Sign out
3. Click "Forgot password?" in the sign-in modal
4. Confirm the email arrives, the link works, and you can set a new password and sign in

---

## 9. Account Management

### Inspecting the database (local)

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

Use this if a user is locked out and the email reset isn't working:

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

Use expiry `12/34`, CVC `123`, any name and postcode for all test cards.

To test idempotency: after a successful payment, find the Checkout Session ID (`cs_test_...`) in Stripe Dashboard → Payments, then manually open `https://yourapp.up.railway.app/?iap_session=cs_test_THATID`.

---

## 11. Running in Production

Express serves both the API and the built frontend from a single process.

```bash
# Build frontend + start server
npm run build
node --experimental-sqlite server/index.js
```

Railway handles this automatically using:
- **Build command:** `npm run build`
- **Start command:** `node --experimental-sqlite server/index.js`

No nginx or separate static host needed — Express serves `dist/` via `express.static`.

---

## 12. Checklist Before Launch

- [x] HTTPS configured — provided by Railway automatically
- [x] Rate limiting on auth, forgot-password, and payment routes
- [x] SQLite persistent volume configured (mounted at `/app/data`)
- [x] Database file excluded from version control (`.gitignore`)
- [x] All 5 Stripe test scenarios pass in test mode
- [x] Email provider configured (`EMAIL_PASS` and `EMAIL_FROM` set)
- [x] Password reset flow tested end-to-end (email arrives, link works, sign-in succeeds)
- [ ] `CLIENT_URL` env var set to production domain
- [ ] `.env` updated with live Stripe keys
- [ ] Webhook endpoint registered in Stripe Live mode
- [ ] Business verified in Stripe Dashboard
- [ ] Bank account added to Stripe for payouts
- [ ] Terms of Service, Privacy Policy, Refund Policy pages live
- [ ] Resend domain verified (so emails send from your own domain, not `onboarding@resend.dev`)
- [ ] SQLite database backed up before going live
- [ ] Expired reset token cleanup scheduled (daily cron — see Section 9)
