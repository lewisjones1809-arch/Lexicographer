import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new DatabaseSync(join(__dirname, 'lexicographer.db'));

// Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_state (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    quills INTEGER DEFAULT 0,
    golden_notebooks INTEGER DEFAULT 0,
    published_lexicons TEXT DEFAULT '[]',
    owned_covers TEXT DEFAULT '["classic"]',
    owned_pages TEXT DEFAULT '["parchment"]',
    active_cover_id TEXT DEFAULT 'classic',
    active_page_id TEXT DEFAULT 'parchment',
    perm_upgrade_levels TEXT DEFAULT '{}',
    ink_boost_pending INTEGER DEFAULT 0,
    letter_pack_pending TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    stripe_session_id TEXT UNIQUE NOT NULL,
    product_id TEXT NOT NULL,
    fulfilled INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Password reset columns (safe to run on existing DB — silently ignored if already present)
try { db.exec('ALTER TABLE users ADD COLUMN reset_token TEXT'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN reset_expires TEXT'); } catch {}

// --- User helpers ---

export function getUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

export function getUserById(id) {
  return db.prepare('SELECT id, email, created_at FROM users WHERE id = ?').get(id);
}

export function createUser(email, passwordHash) {
  const result = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, passwordHash);
  const userId = result.lastInsertRowid;
  db.prepare('INSERT INTO user_state (user_id) VALUES (?)').run(userId);
  return getUserById(userId);
}

export function setResetToken(userId, token, expiresAt) {
  db.prepare('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?').run(token, expiresAt, userId);
}

export function getUserByResetToken(token) {
  return db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token);
}

export function clearResetToken(userId) {
  db.prepare('UPDATE users SET reset_token = NULL, reset_expires = NULL WHERE id = ?').run(userId);
}

export function updatePassword(userId, passwordHash) {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId);
}

// --- User state helpers ---

export function getUserState(userId) {
  const row = db.prepare('SELECT * FROM user_state WHERE user_id = ?').get(userId);
  if (!row) return null;
  return {
    quills: row.quills,
    goldenNotebooks: row.golden_notebooks,
    publishedLexicons: JSON.parse(row.published_lexicons),
    ownedCovers: JSON.parse(row.owned_covers),
    ownedPages: JSON.parse(row.owned_pages),
    activeCoverId: row.active_cover_id,
    activePageId: row.active_page_id,
    permUpgradeLevels: JSON.parse(row.perm_upgrade_levels),
    inkBoostPending: row.ink_boost_pending,
    letterPackPending: JSON.parse(row.letter_pack_pending),
  };
}

export function saveUserState(userId, state) {
  db.prepare(`
    UPDATE user_state SET
      quills = ?,
      golden_notebooks = ?,
      published_lexicons = ?,
      owned_covers = ?,
      owned_pages = ?,
      active_cover_id = ?,
      active_page_id = ?,
      perm_upgrade_levels = ?,
      ink_boost_pending = ?,
      letter_pack_pending = ?
    WHERE user_id = ?
  `).run(
    state.quills ?? 0,
    state.goldenNotebooks ?? 0,
    JSON.stringify(state.publishedLexicons ?? []),
    JSON.stringify(state.ownedCovers ?? ['classic']),
    JSON.stringify(state.ownedPages ?? ['parchment']),
    state.activeCoverId ?? 'classic',
    state.activePageId ?? 'parchment',
    JSON.stringify(state.permUpgradeLevels ?? {}),
    state.inkBoostPending ? 1 : 0,
    JSON.stringify(state.letterPackPending ?? []),
    userId
  );
}

// --- Purchase helpers ---

export function createPurchase(userId, stripeSessionId, productId) {
  db.prepare('INSERT OR IGNORE INTO purchases (user_id, stripe_session_id, product_id) VALUES (?, ?, ?)').run(userId, stripeSessionId, productId);
}

export function getPurchase(stripeSessionId) {
  return db.prepare('SELECT * FROM purchases WHERE stripe_session_id = ?').get(stripeSessionId);
}

export function fulfillPurchase(stripeSessionId) {
  db.prepare('UPDATE purchases SET fulfilled = 1 WHERE stripe_session_id = ?').run(stripeSessionId);
}

export default db;
