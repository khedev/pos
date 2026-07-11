/**
 * Client-side caching utilities for performance optimization.
 * Provides localStorage, session storage, and IndexedDB caching.
 */

// ============================================================
// LocalStorage Cache - for data that changes infrequently
// ============================================================

const LOCAL_CACHE_PREFIX = 'pgpos_cache_';
const DEFAULT_LOCAL_TTL = 30 * 60 * 1000; // 30 minutes

export const localCache = {
  /**
   * Store data in localStorage with expiration
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   * @param {number} ttl - Time to live in ms (default: 30 min)
   */
  set(key, data, ttl = DEFAULT_LOCAL_TTL) {
    try {
      const item = {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + ttl,
      };
      localStorage.setItem(LOCAL_CACHE_PREFIX + key, JSON.stringify(item));
    } catch (e) {
      // localStorage full or unavailable - silently fail
      if (e.name === 'QuotaExceededError') {
        this.cleanup();
        try {
          localStorage.setItem(LOCAL_CACHE_PREFIX + key, JSON.stringify({ data, timestamp: Date.now(), expiry: Date.now() + ttl }));
        } catch {}
      }
    }
  },

  /**
   * Retrieve data from localStorage cache
   * @param {string} key - Cache key
   * @returns {*|null} Cached data or null if expired/missing
   */
  get(key) {
    try {
      const raw = localStorage.getItem(LOCAL_CACHE_PREFIX + key);
      if (!raw) return null;

      const item = JSON.parse(raw);

      // Check if expired
      if (Date.now() > item.expiry) {
        localStorage.removeItem(LOCAL_CACHE_PREFIX + key);
        return null;
      }

      return item.data;
    } catch {
      return null;
    }
  },

  /**
   * Remove a specific cache entry
   */
  remove(key) {
    try {
      localStorage.removeItem(LOCAL_CACHE_PREFIX + key);
    } catch {}
  },

  /**
   * Clear all cached data (only our prefixed items)
   */
  clear() {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(LOCAL_CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch {}
  },

  /**
   * Remove expired cache entries to free up space
   */
  cleanup() {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(LOCAL_CACHE_PREFIX)) {
          try {
            const item = JSON.parse(localStorage.getItem(key));
            if (Date.now() > item.expiry) {
              localStorage.removeItem(key);
            }
          } catch {
            localStorage.removeItem(key);
          }
        }
      });
    } catch {}
  },
};

// ============================================================
// Session Cache - for temporary data during a session
// ============================================================

const SESSION_CACHE_PREFIX = 'pgpos_session_';

export const sessionCache = {
  /**
   * Store data in sessionStorage
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   */
  set(key, data) {
    try {
      const item = {
        data,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(SESSION_CACHE_PREFIX + key, JSON.stringify(item));
    } catch {
      // Silently fail
    }
  },

  /**
   * Retrieve data from sessionStorage cache
   */
  get(key) {
    try {
      const raw = sessionStorage.getItem(SESSION_CACHE_PREFIX + key);
      if (!raw) return null;
      const item = JSON.parse(raw);
      return item.data;
    } catch {
      return null;
    }
  },

  /**
   * Remove a specific session cache entry
   */
  remove(key) {
    try {
      sessionStorage.removeItem(SESSION_CACHE_PREFIX + key);
    } catch {}
  },

  /**
   * Clear all session cache entries
   */
  clear() {
    try {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith(SESSION_CACHE_PREFIX)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch {}
  },
};

// ============================================================
// IndexedDB Cache - for large datasets
// ============================================================

const DB_NAME = 'pgpos_cache';
const DB_VERSION = 1;
const DB_STORE = 'cache_store';

function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        const store = db.createObjectStore(DB_STORE, { keyPath: 'key' });
        store.createIndex('expiry', 'expiry', { unique: false });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

export const indexedDBCache = {
  /**
   * Store large datasets in IndexedDB
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   * @param {number} ttl - Time to live in ms (default: 1 hour)
   */
  async set(key, data, ttl = 60 * 60 * 1000) {
    try {
      const db = await openDB();
      const tx = db.transaction(DB_STORE, 'readwrite');
      const store = tx.objectStore(DB_STORE);

      store.put({
        key,
        data,
        timestamp: Date.now(),
        expiry: Date.now() + ttl,
      });

      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
      });
    } catch {
      // Silently fail if IndexedDB is unavailable
    }
  },

  /**
   * Retrieve data from IndexedDB cache
   */
  async get(key) {
    try {
      const db = await openDB();
      const tx = db.transaction(DB_STORE, 'readonly');
      const store = tx.objectStore(DB_STORE);
      const request = store.get(key);

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const result = event.target.result;
          if (!result) {
            resolve(null);
            return;
          }

          // Check if expired
          if (Date.now() > result.expiry) {
            // Delete expired entry
            const deleteTx = db.transaction(DB_STORE, 'readwrite');
            deleteTx.objectStore(DB_STORE).delete(key);
            resolve(null);
            return;
          }

          resolve(result.data);
        };
        request.onerror = (e) => reject(e.target.error);
      });
    } catch {
      return null;
    }
  },

  /**
   * Remove a specific cache entry
   */
  async remove(key) {
    try {
      const db = await openDB();
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).delete(key);
    } catch {}
  },

  /**
   * Clear all cached data
   */
  async clear() {
    try {
      const db = await openDB();
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).clear();
    } catch {}
  },

  /**
   * Clean up expired entries
   */
  async cleanup() {
    try {
      const db = await openDB();
      const tx = db.transaction(DB_STORE, 'readwrite');
      const store = tx.objectStore(DB_STORE);
      const index = store.index('expiry');
      const range = IDBKeyRange.upperBound(Date.now());
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        }
      };
    } catch {}
  },
};

// ============================================================
// Request deduplication utility
// ============================================================

const pendingRequests = new Map();

/**
 * Deduplicate concurrent API requests to avoid duplicate network calls
 * @param {string} key - Unique request key
 * @param {Function} fetcher - Async function to fetch data
 * @returns {Promise} - Shared promise
 */
export function dedupeRequest(key, fetcher) {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  const promise = fetcher().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

// ============================================================
// Cache-first data fetcher (for infrequent-changing data)
// ============================================================

/**
 * Fetch data with cache-first strategy
 * @param {string} cacheKey - Cache key
 * @param {Function} fetcher - API fetcher function
 * @param {Object} options
 * @param {number} options.localTTL - localStorage TTL in ms
 * @param {boolean} options.useIndexedDB - Use IndexedDB for large datasets
 * @param {number} options.indexedDBTTL - IndexedDB TTL in ms
 * @returns {Promise<*>} - Data from cache or fresh fetch
 */
export async function fetchWithCache(cacheKey, fetcher, options = {}) {
  const {
    localTTL = DEFAULT_LOCAL_TTL,
    useIndexedDB = false,
    indexedDBTTL = 60 * 60 * 1000,
  } = options;

  // Try localStorage first (for small data)
  if (!useIndexedDB) {
    const cached = localCache.get(cacheKey);
    if (cached) return cached;
  }

  // Try IndexedDB for large data
  if (useIndexedDB) {
    const cached = await indexedDBCache.get(cacheKey);
    if (cached) return cached;
  }

  // Fetch fresh data
  const data = await dedupeRequest(cacheKey, fetcher);

  // Cache the result
  if (useIndexedDB) {
    await indexedDBCache.set(cacheKey, data, indexedDBTTL);
  } else {
    localCache.set(cacheKey, data, localTTL);
  }

  return data;
}

// Initialize cleanup on page load
localCache.cleanup();
indexedDBCache.cleanup();