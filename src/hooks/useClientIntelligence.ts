import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { ClientIntelligenceRecord, UtilityInvoice } from '../types';

const withTimeout = <T,>(p: Promise<T>, ms = 1200): Promise<T> =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

const STORAGE_KEY_INTELLIGENCE = 'quark_intelligence_records';
const STORAGE_KEY_INVOICES = 'quark_utility_invoices';

export const SAMPLE_INTELLIGENCE_RECORDS: ClientIntelligenceRecord[] = [
  {
    id: 'intel-1',
    user_id: 'default-user',
    client_name: 'Dra. Luanda Vasconcelos',
    system_size_kw: 7.7,
    install_start_date: '2025-11-10',
    install_end_date: '2025-11-25',
    last_maintenance_date: '2026-05-15',
    next_maintenance_date: '2026-11-15',
    total_savings_brl: 12450,
    monthly_generation_kwh: 980,
    utility_account: 'UC 10849204 - Equatorial AL',
    utility_login: { cpf: '105.558.774-85', birth_date: '1985-04-12' },
    installed_by: 'quark',
    is_active: true,
    created_at: '2025-11-01T10:00:00Z',
    updated_at: '2026-10-15T12:00:00Z'
  },
  {
    id: 'intel-2',
    user_id: 'default-user',
    client_name: 'Clínica Médica Santa Tereza',
    system_size_kw: 14.6,
    install_start_date: '2025-08-01',
    install_end_date: '2025-08-20',
    last_maintenance_date: '2026-02-10',
    next_maintenance_date: '2026-08-10',
    total_savings_brl: 28900,
    monthly_generation_kwh: 1850,
    utility_account: 'UC 9382103 - Equatorial AL',
    utility_login: { cpf: '04.819.301/0001-44' },
    installed_by: 'quark',
    is_active: true,
    created_at: '2025-07-15T10:00:00Z',
    updated_at: '2026-10-15T12:00:00Z'
  },
  {
    id: 'intel-3',
    user_id: 'default-user',
    client_name: 'Academia Elitech Fit',
    system_size_kw: 22.0,
    install_start_date: '2026-01-10',
    install_end_date: '2026-01-28',
    last_maintenance_date: '2026-07-20',
    next_maintenance_date: '2027-01-20',
    total_savings_brl: 34100,
    monthly_generation_kwh: 2750,
    utility_account: 'UC 7748192 - Equatorial AL',
    utility_login: { cpf: '18.992.404/0001-12' },
    installed_by: 'quark',
    is_active: true,
    created_at: '2025-12-20T10:00:00Z',
    updated_at: '2026-10-15T12:00:00Z'
  },
  {
    id: 'intel-4',
    user_id: 'default-user',
    client_name: 'Posto Maceió & Conveniência',
    system_size_kw: 35.5,
    install_start_date: '2025-05-15',
    install_end_date: '2025-06-05',
    last_maintenance_date: '2026-06-01',
    next_maintenance_date: '2026-12-01',
    total_savings_brl: 58400,
    monthly_generation_kwh: 4500,
    utility_account: 'UC 4482910 - Equatorial AL',
    utility_login: { cpf: '01.234.567/0001-89' },
    installed_by: 'quark',
    is_active: true,
    created_at: '2025-04-10T10:00:00Z',
    updated_at: '2026-10-15T12:00:00Z'
  }
];

export const SAMPLE_UTILITY_INVOICES: UtilityInvoice[] = [
  {
    id: 'inv-1',
    intelligence_id: 'intel-1',
    month_ref: '09/2026',
    consumption_kwh: 920,
    generation_kwh: 980,
    amount_brl: 115.40,
    savings_brl: 864.60,
    pdf_url: '/mock/fatura-09-2026-luanda.pdf',
    status: 'aprovado',
    captured_at: '2026-10-05T08:30:00Z'
  },
  {
    id: 'inv-2',
    intelligence_id: 'intel-2',
    month_ref: '09/2026',
    consumption_kwh: 2150,
    generation_kwh: 1850,
    amount_brl: 450.80,
    savings_brl: 1750.20,
    pdf_url: '/mock/fatura-09-2026-santa-tereza.pdf',
    status: 'aprovado',
    captured_at: '2026-10-06T09:15:00Z'
  },
  {
    id: 'inv-3',
    intelligence_id: 'intel-3',
    month_ref: '09/2026',
    consumption_kwh: 2890,
    generation_kwh: 2750,
    amount_brl: 320.10,
    savings_brl: 2610.90,
    pdf_url: '/mock/fatura-09-2026-elitech.pdf',
    status: 'aprovado',
    captured_at: '2026-10-07T11:45:00Z'
  },
  {
    id: 'inv-4',
    intelligence_id: 'intel-4',
    month_ref: '09/2026',
    consumption_kwh: 4800,
    generation_kwh: 4500,
    amount_brl: 580.00,
    savings_brl: 4220.00,
    pdf_url: '/mock/fatura-09-2026-posto.pdf',
    status: 'aprovado',
    captured_at: '2026-10-08T14:20:00Z'
  }
];

const getStoredIntelligence = (): ClientIntelligenceRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_INTELLIGENCE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  localStorage.setItem(STORAGE_KEY_INTELLIGENCE, JSON.stringify(SAMPLE_INTELLIGENCE_RECORDS));
  return SAMPLE_INTELLIGENCE_RECORDS;
};

export function useClientIntelligence() {
  return useQuery({
    queryKey: ['client_intelligence'],
    queryFn: async () => {
      try {
        const userPromise = withTimeout(supabase.auth.getUser(), 4000);
        const { data: userAuth } = await userPromise;
        
        let query = supabase
          .from('client_intelligence')
          .select('*')
          .is('deleted_at', null)
          .order('client_name', { ascending: true });

        const isPartnerAdmin = 
          userAuth?.user?.email === 'arthurmoraesp12@gmail.com' || 
          userAuth?.user?.email === 'ctt.andersonalves@gmail.com' ||
          userAuth?.user?.user_metadata?.role === 'Admin';

        if (!isPartnerAdmin && userAuth?.user?.id) {
          query = query.eq('user_id', userAuth.user.id);
        }

        const { data, error } = await withTimeout(Promise.resolve(query), 8000);
        if (error) throw error;
        if (data && data.length > 0) {
          localStorage.setItem(STORAGE_KEY_INTELLIGENCE, JSON.stringify(data));
          return data as ClientIntelligenceRecord[];
        }
        return getStoredIntelligence();
      } catch {
        return getStoredIntelligence();
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateIntelligence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (record: Partial<ClientIntelligenceRecord>) => {
      const { data: userAuth } = await withTimeout(supabase.auth.getUser(), 4000).catch(() => ({ data: { user: null } }));
      const targetUserId = userAuth?.user?.id || '7dacc88f-9ebd-4710-a1be-0647841db24a';
      const targetId = crypto.randomUUID();

      const newRec: ClientIntelligenceRecord = {
        id: targetId,
        user_id: targetUserId,
        client_name: record.client_name || 'Novo Cliente',
        total_savings_brl: record.total_savings_brl || 0,
        installed_by: record.installed_by || 'quark',
        is_active: record.is_active ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...record,
      };

      const stored = getStoredIntelligence();
      localStorage.setItem(STORAGE_KEY_INTELLIGENCE, JSON.stringify([newRec, ...stored]));

      try {
        await withTimeout(
          Promise.resolve(
            supabase.from('client_intelligence').insert({ ...newRec, user_id: targetUserId })
          ),
          8000
        );
      } catch (err) {
        console.warn('[useCreateIntelligence] Erro ao sincronizar com Supabase:', err);
      }
      return newRec;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_intelligence'] });
    },
  });
}

export function useUpdateIntelligence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...record }: Partial<ClientIntelligenceRecord> & { id: string }) => {
      const stored = getStoredIntelligence();
      const updated = stored.map(item => item.id === id ? { ...item, ...record, updated_at: new Date().toISOString() } : item);
      localStorage.setItem(STORAGE_KEY_INTELLIGENCE, JSON.stringify(updated));

      try {
        await withTimeout(
          Promise.resolve(
            supabase.from('client_intelligence').update({ ...record, updated_at: new Date().toISOString() }).eq('id', id)
          ),
          8000
        );
      } catch (err) {
        console.warn('[useUpdateIntelligence] Falha ao atualizar remoto:', err);
      }
      return updated.find(item => item.id === id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_intelligence'] });
    },
  });
}

export function useDeleteIntelligence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const stored = getStoredIntelligence();
      const filtered = stored.filter(item => item.id !== id);
      localStorage.setItem(STORAGE_KEY_INTELLIGENCE, JSON.stringify(filtered));

      try {
        await withTimeout(
          Promise.resolve(
            supabase.from('client_intelligence').update({ deleted_at: new Date().toISOString() }).eq('id', id)
          ),
          8000
        );
      } catch (err) {
        console.warn('[useDeleteIntelligence] Falha ao deletar remoto:', err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_intelligence'] });
    },
  });
}

export function useUtilityInvoices(intelligenceId: string) {
  return useQuery({
    queryKey: ['utility_invoices', intelligenceId],
    queryFn: async () => {
      if (!intelligenceId) return [];
      try {
        const { data, error } = await withTimeout(
          Promise.resolve(
            supabase
              .from('utility_invoices')
              .select('*')
              .eq('intelligence_id', intelligenceId)
              .order('captured_at', { ascending: false })
          ),
          8000
        );
        if (error) throw error;
        if (data && data.length > 0) return data as UtilityInvoice[];
        return SAMPLE_UTILITY_INVOICES.filter(inv => inv.intelligence_id === intelligenceId);
      } catch {
        return SAMPLE_UTILITY_INVOICES.filter(inv => inv.intelligence_id === intelligenceId);
      }
    },
    enabled: !!intelligenceId,
    staleTime: 1000 * 60 * 5,
  });
}
