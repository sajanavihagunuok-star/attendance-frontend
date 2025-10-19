/**
 * Ensure default export and named authFetch for compatibility.
 */
const BASE = import.meta.env.VITE_API || '';

async function request(path, opts = {}) {
  const url = BASE + path;
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  const body = opts.body && typeof opts.body !== 'string' ? JSON.stringify(opts.body) : opts.body;
  const res = await fetch(url, Object.assign({}, opts, { headers, body }));
  if (!res.ok) {
    try { const json = await res.json(); throw json; } catch (e) { throw new Error(res.statusText || 'Network error'); }
  }
  return res.json().catch(() => null);
}

const api = {
  get: (path, opts) => request(path, Object.assign({ method: 'GET' }, opts)),
  post: (path, body, opts = {}) => request(path, Object.assign({ method: 'POST', body }, opts)),
  put: (path, body, opts = {}) => request(path, Object.assign({ method: 'PUT', body }, opts)),
  del: (path, opts = {}) => request(path, Object.assign({ method: 'DELETE' }, opts)),
  rawRequest: request
};

// named helper used by some files
export async function authFetch(path, opts = {}) {
  return api.post(path, opts.body || {}, opts);
}

export default api;


