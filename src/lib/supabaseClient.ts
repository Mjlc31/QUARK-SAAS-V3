import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO DO SUPABASE ---
const envUrl = import.meta.env?.VITE_SUPABASE_URL;
const envKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

const FALLBACK_URL = 'https://sumydaewtszecrvdgoku.supabase.co';
const FALLBACK_KEY = 'sb_publishable_YSHgrXjsvOroxDokhAZavg_GBQY8Hha';

const finalUrl = (envUrl && envUrl.length > 5) ? envUrl : FALLBACK_URL;
const finalKey = (envKey && envKey.length > 5) ? envKey : FALLBACK_KEY;

// Detect localStorage availability (some mobile browsers in private mode block it)
const isLocalStorageAvailable = (() => {
  try {
    const key = '__supabase_test__';
    localStorage.setItem(key, 'ok');
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
})();

// In-memory fallback storage for when localStorage is unavailable
const memoryStorage: Record<string, string> = {};
const safeStorage = {
  getItem: (key: string) => {
    if (isLocalStorageAvailable) return localStorage.getItem(key);
    return memoryStorage[key] ?? null;
  },
  setItem: (key: string, value: string) => {
    if (isLocalStorageAvailable) localStorage.setItem(key, value);
    memoryStorage[key] = value;
  },
  removeItem: (key: string) => {
    if (isLocalStorageAvailable) localStorage.removeItem(key);
    delete memoryStorage[key];
  },
};

// Diagnostic Logging
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
console.log(
  `%c⚡ SUPABASE: ${finalUrl === FALLBACK_URL ? 'Fallback' : 'Env'} | ${isMobile ? '📱 Mobile' : '🖥️ Desktop'} | Storage: ${isLocalStorageAvailable ? '✅' : '⚠️ Memory'}`,
  'background: #84cc16; color: black; padding: 2px 6px; border-radius: 4px; font-weight: bold;'
);

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: safeStorage,
    flowType: 'implicit',
    storageKey: 'quark-auth-token',
  }
});