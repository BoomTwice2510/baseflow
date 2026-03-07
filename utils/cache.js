// utils/cache.js

// Simple in-memory cache for signals API
// Note: Ye process memory me rahega, Vercel / GitHub Action restart pe reset ho jayega.

let CACHE = null;

/**
 * Pura response object store karta hai
 * (agent, network, timestamp, signals, meta, etc.)
 */
export function setCache(value) {
  CACHE = {
    ...value,
    _cachedAt: Date.now(),
  };
}

/**
 * Last cached value return karta hai
 * (null agar kuch nahi hai)
 */
export function getCache() {
  return CACHE;
}

/**
 * Cache expiry check:
 * - true  => cache expire ho chuka, naya fetch karo (Dune + RPC, etc.)
 * - false => cache fresh hai, same response reuse karo
 *
 * Abhi 20 minutes TTL set hai.
 */
export function isExpired() {
  if (!CACHE || !CACHE._cachedAt) return true;

  const ageMs = Date.now() - CACHE._cachedAt;
  const twentyMinutes = 20 * 60 * 1000; // 20 minutes

  return ageMs > twentyMinutes;
}
