import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO DO SUPABASE ---
const YOUR_PROJECT_URL = 'https://sumydaewtszecrvdgoku.supabase.co';
const YOUR_ANON_KEY = 'sb_publishable_YSHgrXjsvOroxDokhAZavg_GBQY8Hha';

// Acessamos via import.meta.env com verificação de segurança (optional chaining)
// para evitar erros caso o objeto env não esteja definido no ambiente atual.
const envUrl = import.meta.env?.VITE_SUPABASE_URL;
const envKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

const finalUrl = (envUrl && envUrl.length > 5) ? envUrl : YOUR_PROJECT_URL;
const finalKey = (envKey && envKey.length > 5) ? envKey : YOUR_ANON_KEY;

// Validação de Segurança no Console
if (finalKey === YOUR_ANON_KEY && !finalKey.startsWith('ey') && !finalKey.startsWith('sb_')) {
  console.warn('%c⚠️ ALERTA SUPABASE:', 'background: yellow; color: black; font-size: 14px; font-weight: bold;');
  console.warn('A chave API fornecida não parece ter um formato padrão (nem JWT "ey...", nem Publishable "sb_...").');
  console.warn('Verifique em: Supabase Dashboard > Project Settings > API');
} else {
  console.log('%c⚡ SUPABASE CONNECTED', 'background: #a3e635; color: black; font-size: 12px; font-weight: bold; padding: 2px 6px; border-radius: 4px;');
}

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});