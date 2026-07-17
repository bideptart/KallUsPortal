const TOKEN_KEY = '9278.token';

// Base URL for the backend API. Empty in dev (the Vite proxy forwards /api to
// the local Express server) and on any host that runs the backend at the same
// origin. Set VITE_API_BASE to an absolute URL (e.g. https://api.example.com)
// when the frontend is deployed separately from the backend — as on Vercel,
// which serves only the static build and has no Node server.
const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setToken = (t) => {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
};

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
  }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
