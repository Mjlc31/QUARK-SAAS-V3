import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO DO SUPABASE ---
// 1. Variáveis de Ambiente (Prioridade Máxima - Produção/Netlify)
// O Vite exige o prefixo VITE_ para expor variáveis ao navegador por segurança.
const envUrl = import.meta.env?.VITE_SUPABASE_URL;
const envKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

// 2. Fallback Hardcoded (Apenas para Desenvolvimento/Demo rápida)
// Se as variáveis de ambiente não forem encontradas, usamos estas chaves públicas.
const FALLBACK_URL = 'https://sumydaewtszecrvdgoku.supabase.co';
const FALLBACK_KEY = 'sb_publishable_YSHgrXjsvOroxDokhAZavg_GBQY8Hha';

// Lógica de Seleção
const finalUrl = (envUrl && envUrl.length > 5) ? envUrl : FALLBACK_URL;
const finalKey = (envKey && envKey.length > 5) ? envKey : FALLBACK_KEY;

// Diagnóstico de Conexão (Aparece no Console do Navegador)
if (finalUrl === FALLBACK_URL) {
  console.log('%c⚠️ SUPABASE: Usando chaves de Fallback (Hardcoded)', 'background: #f59e0b; color: black; padding: 2px 4px; border-radius: 2px;');
} else {
  console.log('%c⚡ SUPABASE: Conectado via Variáveis de Ambiente', 'background: #84cc16; color: black; padding: 2px 4px; border-radius: 2px;');
}

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});