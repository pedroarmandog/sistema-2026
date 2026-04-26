// Simple in-memory cache with TTL (seconds)
const store = new Map();

function _cleanup() {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (v.expires && v.expires <= now) store.delete(k);
  }
}

setInterval(_cleanup, 5000).unref && setInterval(_cleanup, 5000).unref();

function set(key, value, ttlSeconds = 10) {
  const expires = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
  store.set(key, { value, expires });
}

function get(key) {
  const rec = store.get(key);
  if (!rec) return null;
  if (rec.expires && rec.expires <= Date.now()) {
    store.delete(key);
    return null;
  }
  return rec.value;
}

function del(key) {
  store.delete(key);
}

function clear() {
  store.clear();
}

module.exports = { set, get, del, clear };
