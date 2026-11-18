import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO DO SUPABASE ---
const envUrl = import.meta.env?.VITE_SUPABASE_URL;
const envKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

const FALLBACK_URL = 'https://sumydaewtszecrvdgoku.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1bXlkYWV3dHN6ZWNydmRnb2t1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NDgxNTQsImV4cCI6MjA4NDQyNDE1NH0.2eP2iBsyq6q-zuhaL0zVFgjSmxkJgfZC8qbx5Q9QTso';

const isJwtKey = (k?: string) => typeof k === 'string' && k.startsWith('eyJ');
export const finalUrl = (envUrl && envUrl.length > 5) ? envUrl : FALLBACK_URL;
export const finalKey = (envKey && isJwtKey(envKey)) ? envKey : FALLBACK_KEY;

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
export const safeStorage = {
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

/**
 * Fetch resiliente com auto-recuperação de sessão:
 * Se qualquer chamada retornar 401 Unauthorized por causa de token expirado ou inválido,
 * remove o token corrompido do armazenamento e reexecuta imediatamente com a chave anônima (anon).
 */
const authRecoveryFetch: typeof fetch = async (input, init) => {
  const res = await fetch(input, init);
  if (res.status === 401 || res.status === 400) {
    try {
      const clone = res.clone();
      const text = await clone.text();
      const isAuthProblem =
        text.includes('JWT expired') ||
        text.includes('invalid JWT') ||
        text.includes('PGRST301') ||
        text.includes('Refresh Token Not Found') ||
        text.includes('invalid_grant');

      if (isAuthProblem) {
        console.warn('⚠️ [Supabase] Sessão expirada ou token inválido detectado. Recuperando com credenciais anônimas limpas...');
        try {
          safeStorage.removeItem('quark-auth-token');
          safeStorage.removeItem('sb-sumydaewtszecrvdgoku-auth-token');
        } catch (_) {}

        if (init?.headers) {
          const headers = new Headers(init.headers);
          headers.set('apikey', finalKey);
          headers.set('Authorization', `Bearer ${finalKey}`);
          return fetch(input, { ...init, headers });
        }
      }
    } catch (_) {}
  }
  return res;
};

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: safeStorage,
    flowType: 'implicit',
    storageKey: 'quark-auth-token',
    // Previne deadlock com Web Locks API (navigator.locks) comum em SPA/Vite
    lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
      return await fn();
    },
  },
  global: {
    fetch: authRecoveryFetch,
  },
});

/** Cliente puro sem autenticação de usuário (sempre anônimo e imune a tokens corrompidos) */
export const supabaseAnon = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

if (typeof window !== 'undefined') {
  (window as any).supabase = supabase;
  (window as any).supabaseAnon = supabaseAnon;
}