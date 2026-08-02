/**
 * Safe LocalStorage Utility for BAZINO PRO
 * Handles iOS Private Browsing, restricted storage quota, and corrupted JSON.
 */

export function safeGetStorage<T>(key: string, fallbackValue: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return fallbackValue;
    }
    const item = window.localStorage.getItem(key);
    if (!item) return fallbackValue;
    return JSON.parse(item) as T;
  } catch (error) {
    console.warn(`[BAZINO Storage Warning] Failed to read key "${key}" from localStorage:`, error);
    return fallbackValue;
  }
}

export function safeSetStorage<T>(key: string, value: T): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`[BAZINO Storage Warning] Failed to write key "${key}" to localStorage:`, error);
    return false;
  }
}

export function safeRemoveStorage(key: string): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
      return true;
    }
  } catch (error) {
    console.warn(`[BAZINO Storage Warning] Failed to remove key "${key}":`, error);
  }
  return false;
}
