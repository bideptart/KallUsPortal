import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT),
  database: process.env.PG_DB,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
  // Without this, a firewall that silently drops packets (instead of
  // rejecting the connection) leaves the query hanging until the *platform's*
  // request timeout kills it — on Vercel that surfaces as a raw 503 instead
  // of the app's own "Database unavailable" JSON error. Failing fast here
  // lets the route handler's try/catch respond properly instead.
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[pg] idle client error', err);
});

export const q = (text, params) => pool.query(text, params);
