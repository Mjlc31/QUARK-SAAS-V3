/**
 * Epoch de cache da Quark SaaS.
 * Ao alterar esta constante, qualquer cache antigo de navegadores de usuários
 * (com leads duplicados ou dados obsoletos de carteira) é purgado instantaneamente.
 */
export const QUARK_CACHE_EPOCH = 'v4.2-clean-crm-20261101';

export function runCacheMaintenance() {
  if (typeof window === 'undefined') return;
  try {
    const currentEpoch = localStorage.getItem('quark_cache_epoch');
    if (currentEpoch !== QUARK_CACHE_EPOCH) {
      console.log(`[CacheEpoch] Migrando cache para ${QUARK_CACHE_EPOCH}`);
      
      const staleKeys = [
        'quark_dashboard_crm_cache',
        'quark_dashboard_crm_cache_v3',
        'quark_crm_cached_opps',
        'quark_crm_kanban',
        'quark_live_crm_kanban',
        'quark_leads',
        'quark_opportunities',
      ];
      staleKeys.forEach(k => {
        try { localStorage.removeItem(k); } catch (_) {}
      });

      // Purga chaves legadas do live.ts e dashboard
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('quark_live_') || k.startsWith('quark_dashboard_') || k.startsWith('quark_crm_'))) {
          try { localStorage.removeItem(k); } catch (_) {}
        }
      }

      localStorage.setItem('quark_cache_epoch', QUARK_CACHE_EPOCH);
    }
  } catch (_) {}
}

// Executa imediatamente na importação
runCacheMaintenance();
