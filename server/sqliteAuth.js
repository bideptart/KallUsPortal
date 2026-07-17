// Standalone SQLite-backed auth — completely separate from the Postgres
// `users`/`sessions` tables used by the rest of the app. Exists so the team
// can clone the repo and log in with zero database setup: no Postgres, no
// .env, just `npm run server`. Mounted at /api/auth in server/index.js.
//
// Three fixed demo accounts, one per tier:
//   superadmin@9278.ai / SuperAdmin1234  (role: superadmin -> /admin)
//   admin@9278.ai       / Admin1234      (role: admin      -> /admin)
//   user@9278.ai        / User1234       (role: user       -> /dashboard)
import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'auth.sqlite3'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS auth_users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'user'))
  );
  CREATE TABLE IF NOT EXISTS auth_sessions (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
`);

const SEED_ACCOUNTS = [
  { name: 'Portal Superadmin', email: 'superadmin@9278.ai', username: 'superadmin', password: 'SuperAdmin1234', role: 'superadmin' },
  { name: 'Portal Admin',      email: 'admin@9278.ai',       username: 'admin',      password: 'Admin1234',      role: 'admin' },
  { name: 'Portal User',       email: 'user@9278.ai',        username: 'user',       password: 'User1234',       role: 'user' },
];

const userCount = db.prepare('SELECT COUNT(*) AS c FROM auth_users').get().c;
if (userCount === 0) {
  const insert = db.prepare(
    'INSERT INTO auth_users (name, email, username, password_hash, role) VALUES (?, ?, ?, ?, ?)',
  );
  for (const acc of SEED_ACCOUNTS) {
    insert.run(acc.name, acc.email, acc.username, bcrypt.hashSync(acc.password, 10), acc.role);
  }
  console.log('[sqlite-auth] seeded superadmin/admin/user demo accounts');
}

const SESSION_DAYS = 30;
const SESSION_IDLE_MIN = Math.max(1, Number(process.env.SESSION_IDLE_MINUTES) || 30);

const publicUser = (row) => ({
  id: String(row.id),
  name: row.name,
  email: row.email,
  username: row.username,
  role: row.role,
  userType: row.role,
});

const findByIdentifier = db.prepare(
  `SELECT * FROM auth_users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?) LIMIT 1`,
);
const findSession = db.prepare(
  `SELECT u.* FROM auth_sessions s JOIN auth_users u ON u.id = s.user_id
   WHERE s.token = ? AND s.expires_at > ?`,
);
const insertSession = db.prepare(
  `INSERT INTO auth_sessions (token, user_id, expires_at) VALUES (?, ?, ?)`,
);
const touchSession = db.prepare(`UPDATE auth_sessions SET expires_at = ? WHERE token = ?`);
const deleteSession = db.prepare(`DELETE FROM auth_sessions WHERE token = ?`);

const auth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  const row = findSession.get(token, Date.now());
  if (!row) return res.status(401).json({ error: 'Session expired' });
  touchSession.run(Date.now() + SESSION_IDLE_MIN * 60 * 1000, token);
  req.authUser = row;
  req.authToken = token;
  next();
};

export const sqliteAuthRouter = express.Router();

sqliteAuthRouter.post('/signin', (req, res) => {
  const { identifier, password } = req.body || {};
  if (!identifier || !password) return res.status(400).json({ error: 'Missing credentials' });
  const user = findByIdentifier.get(String(identifier).trim(), String(identifier).trim());
  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email/username or password' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  insertSession.run(token, user.id, Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  res.json({ token, user: publicUser(user) });
});

sqliteAuthRouter.post('/signout', auth, (req, res) => {
  deleteSession.run(req.authToken);
  res.json({ ok: true });
});

sqliteAuthRouter.get('/me', auth, (req, res) => {
  res.json({ user: publicUser(req.authUser) });
});

sqliteAuthRouter.post('/session/ping', auth, (_req, res) => {
  res.json({ ok: true, idleMinutes: SESSION_IDLE_MIN });
});
