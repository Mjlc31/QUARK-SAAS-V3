import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO DO SUPABASE ---
// Estes valores "Hardcoded" servem apenas como fallback para demonstração.
// Em produção (Enterprise), recomendamos usar apenas as variáveis de ambiente (VITE_...)
const FALLBACK_URL = 'https://sumydaewtszecrvdgoku.supabase.co';
const FALLBACK_KEY = 'sb_publishable_YSHgrXjsvOroxDokhAZavg_GBQY8Hha';

// --- POR QUE VITE_? ---
// O Vite oculta variáveis de ambiente por segurança. 
// O prefixo 'VITE_' autoriza o envio dessas chaves para o navegador.
const envUrl = import.meta.env?.VITE_SUPABASE_URL;
const envKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

// Lógica de Prioridade: 
// 1. Tenta usar a variável do Netlify/Environment (Mais seguro)
// 2. Se não existir, usa o Fallback (Para não quebrar a demo)
const finalUrl = (envUrl && envUrl.length > 5) ? envUrl : FALLBACK_URL;
const finalKey = (envKey && envKey.length > 5) ? envKey : FALLBACK_KEY;

// Validação de Segurança no Console
if (finalKey === FALLBACK_KEY && !finalKey.startsWith('ey') && !finalKey.startsWith('sb_')) {
  console.warn('%c⚠️ ALERTA SUPABASE:', 'background: yellow; color: black; font-size: 14px; font-weight: bold;');
  console.warn('Usando chaves de fallback. Configure VITE_SUPABASE_URL no seu ambiente para produção.');
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