/**
 * Simple in-memory rate limiter (cooldown) middleware.
 * - Prevents a given key from calling a route more often than `windowMs`.
 * - Key by default: authenticated user id (if available) else client IP.
 * - This is an in-memory, lightweight throttle intended to reduce DB pressure.
 */
const store = new Map();

function cleanup(windowMs) {
  const cutoff = Date.now() - windowMs * 2;
  for (const [k, t] of store) {
    if (t < cutoff) store.delete(k);
  }
}

module.exports = function rateLimit(windowMs = 3000) {
  // cleanup interval
  setInterval(() => cleanup(windowMs), Math.max(60000, windowMs));

  return (req, res, next) => {
    try {
      const route = req.baseUrl || req.originalUrl || req.path || "/";
      const userId = req.user && (req.user.id || req.user.userId);
      const ip = (req.headers["x-forwarded-for"] || req.ip || "").toString();
      const key = userId ? `u:${userId}:${route}` : `ip:${ip}:${route}`;
      const now = Date.now();
      const last = store.get(key) || 0;
      if (now - last < windowMs) {
        // Too many requests in window
        return res
          .status(429)
          .json({ error: "Too many requests. Try again later." });
      }
      store.set(key, now);
      next();
    } catch (e) {
      next();
    }
  };
};
