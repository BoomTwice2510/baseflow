// utils/cache.js

const CACHE = new Map();

const DEFAULT_TTL = 30 * 1000; // 30 sec

export function setCache(key, value, ttl = DEFAULT_TTL) {
  CACHE.set(key, {
    value,
    expireAt: Date.now() + ttl,
  });
}

export function getCache(key) {
  const entry = CACHE.get(key);

  if (!entry) return null;

  if (Date.now() > entry.expireAt) {
    CACHE.delete(key);
    return null;
  }

  return entry.value;
}

export function isExpired(key) {
  const entry = CACHE.get(key);

  if (!entry) return true;

  return Date.now() > entry.expireAt;
}

export function clearCache(key) {
  CACHE.delete(key);
}