import { supabase } from './supabaseClient';

const BACKEND_URL: string = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const urlOf = (input: RequestInfo | URL) =>
  typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

/** Rotas do backend Express que exigem sessão (as /api/public/* são abertas por token). */
export function isProtectedBackendUrl(url: string) {
  const path = url.startsWith(BACKEND_URL) ? url.slice(BACKEND_URL.length) : url;
  if (!path.startsWith('/api/') && !path.startsWith('/agent/')) return false;
  return !path.startsWith('/api/public/') && !path.startsWith('/api/img');
}

// shortcut: intercepta o fetch global em vez de trocar ~60 chamadas espalhadas;
// substituir por um apiFetch() quando as chamadas ao backend forem consolidadas num service.
export function installAuthFetch() {
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!isProtectedBackendUrl(urlOf(input))) return nativeFetch(input, init);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return nativeFetch(input, init);

    // Sobrescreve inclusive o "Bearer <anon key>" que algumas telas ainda mandam
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    headers.set('Authorization', `Bearer ${token}`);
    return nativeFetch(input, { ...init, headers });
  };
}
