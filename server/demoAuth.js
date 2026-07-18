// Zero-setup demo login (superadmin/admin/user) — completely independent of
// the Postgres `users`/`sessions` tables used by the rest of the app.
// Mounted at /api/auth in server/index.js.
//
// Stateless by design: sessions are signed tokens (HMAC-SHA256), not rows in
// a database. That's required to run correctly on Vercel serverless, where
// each request can hit a different, freshly-cold-started instance with no
// shared filesystem or in-memory state — a DB-backed session (SQLite file,
// in-memory Map, etc.) would randomly "forget" logins between requests.
// Verifying a signature needs no shared state at all, so it works the same
// whether this runs as a long-lived local process or a serverless function.
//
// Three fixed demo accounts, one per tier (password hashes below are
// bcrypt(10) of the literal passwords — never derived from anything secret):
//   superadmin@9278.ai / SuperAdmin1234  (role: superadmin -> /admin)
//   admin@9278.ai       / Admin1234      (role: admin      -> /admin)
//   user@9278.ai        / User1234       (role: user       -> /dashboard)
import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const ACCOUNTS = [
  { id: '1', name: 'Portal Superadmin', email: 'superadmin@9278.ai', username: 'superadmin', role: 'superadmin', passwordHash: '$2a$10$HrdQueReKqQWeOktnwcTHOOyVURSXwYiAxsKGGvgRbq3w3teOVsD2' },
  { id: '2', name: 'Portal Admin',      email: 'admin@9278.ai',       username: 'admin',      role: 'admin',      passwordHash: '$2a$10$uh3bh5VR4YelJKC2QkQf1ej40tQy7pRvscSjTAf7EGPCMyjofeddG' },
  { id: '3', name: 'Portal User',       email: 'user@9278.ai',        username: 'user',       role: 'user',       passwordHash: '$2a$10$7I7qww8mxOTgERNb8fM5/eOExetNRJaTSIFFHWvw/EE46W01lrOaW' },
];

// Falls back to a fixed dev-only secret so local/demo use keeps working with
// no setup. On a real deployment (Vercel included) set SESSION_SECRET so
// tokens can't be forged by anyone who reads this source file.
const SECRET = process.env.SESSION_SECRET || 'kallus-demo-auth-dev-only-insecure-secret';
const SESSION_DAYS = 30;
const SESSION_IDLE_MIN = Math.max(1, Number(process.env.SESSION_IDLE_MINUTES) || 30);

const b64url = (buf) => Buffer.from(buf).toString('base64url');

const signToken = (payload) => {
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
};

const verifyToken = (token) => {
  const parts = String(token || '').split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
};

const publicUser = (acc) => ({
  id: acc.id,
  name: acc.name,
  email: acc.email,
  username: acc.username,
  role: acc.role,
  userType: acc.role,
});

const auth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Session expired' });
  req.authUser = payload;
  next();
};

export const sqliteAuthRouter = express.Router();

sqliteAuthRouter.post('/signin', (req, res) => {
  const { identifier, password } = req.body || {};
  if (!identifier || !password) return res.status(400).json({ error: 'Missing credentials' });
  const idn = String(identifier).trim().toLowerCase();
  const acc = ACCOUNTS.find((a) => a.email.toLowerCase() === idn || a.username.toLowerCase() === idn);
  if (!acc || !bcrypt.compareSync(String(password), acc.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email/username or password' });
  }
  const user = publicUser(acc);
  const token = signToken({ ...user, exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000 });
  res.json({ token, user });
});

sqliteAuthRouter.post('/signout', auth, (_req, res) => {
  // Stateless tokens can't be server-side revoked without reintroducing
  // shared state; the frontend already discards the token on sign-out.
  res.json({ ok: true });
});

sqliteAuthRouter.get('/me', auth, (req, res) => {
  const { exp: _exp, ...user } = req.authUser;
  res.json({ user });
});

sqliteAuthRouter.post('/session/ping', auth, (_req, res) => {
  res.json({ ok: true, idleMinutes: SESSION_IDLE_MIN });
});
