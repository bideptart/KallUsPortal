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

// Collapses concurrent identical GET requests into a single network call —
// covers React StrictMode's dev-only double-invoke and any two components
// that happen to request the same path in the same tick. Only GETs are safe
// to share (mutations must never be deduped), and the entry is cleared as
// soon as it settles, so it never masks a genuinely fresh request later.
const inflightGets = new Map();

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const isGet = method === 'GET';
  const key = isGet ? `${auth ? '1' : '0'}:${path}` : null;
  if (isGet && inflightGets.has(key)) return inflightGets.get(key);

  const request = (async () => {
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
  })();

  if (isGet) {
    inflightGets.set(key, request);
    request.finally(() => inflightGets.delete(key));
  }
  return request;
}
