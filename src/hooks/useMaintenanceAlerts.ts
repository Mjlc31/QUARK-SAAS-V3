import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { MaintenanceAlert, AlertStatus } from '../types';

const withTimeout = <T,>(p: Promise<T>, ms = 2500): Promise<T> =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

const STORAGE_KEY_ALERTS = 'quark_maintenance_alerts';

export const SAMPLE_MAINTENANCE_ALERTS: MaintenanceAlert[] = [
  {
    id: 'alert-1',
    intelligence_id: 'intel-1',
    client_name: 'Dra. Luanda Vasconcelos',
    alert_type: 'manutencao_preventiva',
    message: 'Olá Dra. Luanda! Sua usina solar completa 6 meses de operação. Agende sua limpeza preventiva com água desmineralizada!',
    scheduled_for: '2026-10-25T10:00:00Z',
    channel: 'whatsapp',
    status: 'pendente',
    created_at: '2026-10-18T10:00:00Z',
  },
  {
    id: 'alert-2',
    intelligence_id: 'intel-2',
    client_name: 'Clínica Médica Santa Tereza',
    alert_type: 'inspecao',
    message: 'Aviso Quark: Inspeção termográfica recomendada para o sistema de 14.6 kWp.',
    scheduled_for: '2026-10-21T09:00:00Z',
    sent_at: '2026-10-20T09:00:00Z',
    channel: 'whatsapp',
    status: 'enviado',
    created_at: '2026-10-19T08:00:00Z',
  },
  {
    id: 'alert-3',
    intelligence_id: 'intel-3',
    client_name: 'Academia Elitech Fit',
    alert_type: 'limpeza',
    message: 'Notamos atenuação na geração solar estimada. Recomendamos lavagem técnica das placas.',
    scheduled_for: '2026-10-22T14:00:00Z',
    sent_at: '2026-10-19T14:00:00Z',
    channel: 'whatsapp',
    status: 'respondido',
    created_at: '2026-10-18T14:00:00Z',
  },
  {
    id: 'alert-4',
    intelligence_id: 'intel-4',
    client_name: 'Posto Maceió & Conveniência',
    alert_type: 'garantia',
    message: 'Inspeção de garantia de 1 ano dos inversores fotovoltaicos.',
    scheduled_for: '2026-10-28T11:00:00Z',
    channel: 'whatsapp',
    status: 'pendente',
    created_at: '2026-10-19T11:00:00Z',
  }
];

const getStoredAlerts = (): MaintenanceAlert[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ALERTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(SAMPLE_MAINTENANCE_ALERTS));
  return SAMPLE_MAINTENANCE_ALERTS;
};

export function useMaintenanceAlerts() {
  return useQuery({
    queryKey: ['maintenance_alerts'],
    queryFn: async () => {
      try {
        const userPromise = withTimeout(supabase.auth.getUser(), 800);
        const { data: userAuth } = await userPromise;

        let query = supabase
          .from('maintenance_alerts')
          .select('*')
          .order('created_at', { ascending: false });

        const isPartnerAdmin = 
          userAuth?.user?.email === 'arthurmoraesp12@gmail.com' || 
          userAuth?.user?.email === 'ctt.andersonalves@gmail.com' ||
          userAuth?.user?.user_metadata?.role === 'Admin';

        if (!isPartnerAdmin && userAuth?.user?.id) {
          query = query.eq('user_id', userAuth.user.id);
        }

        const { data, error } = await withTimeout(Promise.resolve(query), 1200);
        if (error) throw error;
        if (data && data.length > 0) {
          localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(data));
          return data as MaintenanceAlert[];
        }
        return getStoredAlerts();
      } catch {
        return getStoredAlerts();
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function usePendingAlerts() {
  const { data: alerts = [], ...rest } = useMaintenanceAlerts();
  return {
    ...rest,
    data: alerts.filter(a => a.status === 'pendente')
  };
}

export function useCreateAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (alert: Omit<MaintenanceAlert, 'id' | 'user_id' | 'created_at'>) => {
      const newAlert: MaintenanceAlert = {
        id: `alert-${Date.now()}`,
        created_at: new Date().toISOString(),
        ...alert,
      };

      const stored = getStoredAlerts();
      localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify([newAlert, ...stored]));

      try {
        const { data: userAuth } = await withTimeout(supabase.auth.getUser(), 600);
        await withTimeout(
          Promise.resolve(
            supabase.from('maintenance_alerts').insert({
              ...newAlert,
              user_id: userAuth?.user?.id || 'default-user',
            })
          ),
          1200
        );
      } catch {
        // offline fallback
      }
      return newAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_alerts'] });
    },
  });
}

export function useUpdateAlertStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AlertStatus }) => {
      const stored = getStoredAlerts();
      const updated = stored.map(a => a.id === id ? {
        ...a,
        status,
        ...(status === 'enviado' ? { sent_at: new Date().toISOString() } : {})
      } : a);
      localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(updated));

      try {
        await withTimeout(
          Promise.resolve(
            supabase
              .from('maintenance_alerts')
              .update({ status, ...(status === 'enviado' ? { sent_at: new Date().toISOString() } : {}) })
              .eq('id', id)
          ),
          1000
        );
      } catch {
        // offline fallback
      }
      return updated.find(a => a.id === id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_alerts'] });
    },
  });
}

export function useBatchCreateAlerts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (alerts: Omit<MaintenanceAlert, 'id' | 'user_id' | 'created_at'>[]) => {
      const now = new Date().toISOString();
      const newAlerts: MaintenanceAlert[] = alerts.map((a) => ({
        id: crypto.randomUUID(),
        created_at: now,
        ...a,
      }));

      const stored = getStoredAlerts();
      localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify([...newAlerts, ...stored]));

      try {
        const { data: userAuth } = await withTimeout(supabase.auth.getUser(), 4000);
        const payload = newAlerts.map(alert => ({
          id: alert.id,
          intelligence_id: alert.intelligence_id,
          alert_type: alert.alert_type,
          message: alert.message,
          scheduled_for: alert.scheduled_for,
          channel: alert.channel,
          status: alert.status,
          created_at: alert.created_at,
          user_id: userAuth?.user?.id || null,
        }));
        await withTimeout(Promise.resolve(supabase.from('maintenance_alerts').insert(payload)), 8000);
      } catch (err) {
        console.warn('[useBatchCreateAlerts] Fallback offline:', err);
      }
      return newAlerts;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_alerts'] });
    },
  });
}
