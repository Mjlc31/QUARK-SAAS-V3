import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { ClientPortalUser } from '../types';

export type ClientData = ClientPortalUser;

/** Sanitiza valores numéricos tratando '0', strings com vírgula e evitando NaN */
const sanitizeNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v);
  return Number.isFinite(n) ? n : null;
};

const withTimeout = <T,>(p: Promise<T>, ms = 1500): Promise<T> =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

export const SAMPLE_CLIENTS: ClientData[] = [
  {
    id: "cli_luanda_001",
    name: "Dra. Luanda Vasconcelos",
    email: "luanda.vasconcelos@email.com",
    phone: "82998765432",
    cpf: "105.558.774-85",
    birth_date: "1988-06-14",
    city: "Maceió",
    state: "AL",
    address: "Av. Álvaro Otacílio, 3400 - Ponta Verde",
    cep: "57035-180",
    utility_company: "Equatorial",
    utility_account: "010928374",
    system_size_kw: 7.7,
    install_date: "2026-03-15",
    monthly_avg_kwh: 1050,
    notes: "Sistema homologado com 14 módulos Canadian Solar e Inversor Deye 8kW.",
    is_active: true,
    auth_user_id: "auth_usr_luanda",
    quark_points: 1250,
    referral_code: "QUARK-LUAN85",
    created_at: "2026-01-10T10:00:00.000Z",
    deleted_at: null,
  },
  {
    id: "cli_clinica_002",
    name: "Clínica Médica Santa Tereza",
    email: "financeiro@santatereza.med.br",
    phone: "82991122334",
    cpf: "55.138.256/0001-51",
    city: "Maceió",
    state: "AL",
    address: "Rua Deputado José Lages, 720 - Ponta Verde",
    cep: "57035-330",
    utility_company: "Equatorial",
    utility_account: "029837461",
    system_size_kw: 14.63,
    install_date: "2025-11-20",
    monthly_avg_kwh: 2200,
    notes: "Usinas com bifaciais e monitoramento contínuo.",
    is_active: true,
    auth_user_id: "auth_usr_medica",
    quark_points: 3400,
    referral_code: "QUARK-CLIN51",
    created_at: "2025-10-15T14:30:00.000Z",
    deleted_at: null,
  },
  {
    id: "cli_elitech_003",
    name: "Academia Elitech Fit",
    email: "contato@elitechfit.com.br",
    phone: "82987654321",
    cpf: "98.765.432/0001-11",
    city: "Maceió",
    state: "AL",
    address: "Av. Menino Marcelo, 1850 - Serraria",
    cep: "57046-000",
    utility_company: "Equatorial",
    utility_account: "038475920",
    system_size_kw: 18.2,
    install_date: "2026-02-18",
    monthly_avg_kwh: 2900,
    notes: "Contrato firmado com economia estimada de 88% na conta de energia.",
    is_active: true,
    auth_user_id: "auth_usr_elitech",
    quark_points: 4500,
    referral_code: "QUARK-ELIT11",
    created_at: "2025-12-05T09:15:00.000Z",
    deleted_at: null,
  },
  {
    id: "cli_haroldo_004",
    name: "Haroldo Mendonça",
    email: "haroldo.mendonca@agro.com.br",
    phone: "82996655443",
    cpf: "084.960.164-98",
    birth_date: "1975-04-22",
    city: "Arapiraca",
    state: "AL",
    address: "Rodovia AL-110, Km 4 - Zona Rural",
    cep: "57312-000",
    utility_company: "Equatorial",
    utility_account: "049382710",
    system_size_kw: 5.5,
    install_date: "2025-08-05",
    monthly_avg_kwh: 750,
    notes: "Sistema solo para irrigação sustentável.",
    is_active: true,
    quark_points: 800,
    referral_code: "QUARK-HARO98",
    created_at: "2025-07-20T16:00:00.000Z",
    deleted_at: null,
  },
  {
    id: "cli_posto_005",
    name: "Posto & Conveniência Maceió",
    email: "gerencia@postomaceio.com.br",
    phone: "82994433221",
    cpf: "12.345.678/0001-90",
    city: "Maceió",
    state: "AL",
    address: "Av. Fernandes Lima, 2900 - Farol",
    cep: "57055-000",
    utility_company: "Equatorial",
    utility_account: "058392019",
    system_size_kw: 22.5,
    install_date: "2026-01-10",
    monthly_avg_kwh: 3800,
    notes: "Subestação própria com inversores trifásicos 380V.",
    is_active: true,
    quark_points: 6200,
    referral_code: "QUARK-POST90",
    created_at: "2025-11-01T11:45:00.000Z",
    deleted_at: null,
  }
];

export function useClients(options?: { includeDeleted?: boolean }) {
  const includeDeleted = options?.includeDeleted ?? false;

  return useQuery({
    queryKey: ['clients', { includeDeleted }],
    queryFn: async () => {
      try {
        let query = supabase
          .from('client_portal_users')
          .select('*')
          .order('created_at', { ascending: false });

        if (!includeDeleted) {
          query = query.is('deleted_at', null);
        }

        const { data, error } = await withTimeout(Promise.resolve(query), 1500);
        if (!error && data && data.length > 0) {
          localStorage.setItem('quark_clients_cache', JSON.stringify(data));
          return data as ClientData[];
        }
      } catch (err) {
        console.warn('[useClients] Fallback para cache local offline:', err);
      }

      // Fallback para cache local / amostras
      const cached = localStorage.getItem('quark_clients_cache');
      let clients: ClientData[] = cached ? JSON.parse(cached) : SAMPLE_CLIENTS;
      if (!cached) {
        localStorage.setItem('quark_clients_cache', JSON.stringify(SAMPLE_CLIENTS));
      }

      if (!includeDeleted) {
        clients = clients.filter(c => !c.deleted_at);
      }
      return clients;
    },
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (client: Partial<ClientData>) => {
      let currentUserId: string | null = null;
      try {
        const { data: userAuth } = await withTimeout(Promise.resolve(supabase.auth.getUser()), 1000);
        currentUserId = userAuth?.user?.id || null;
      } catch {}

      const payload = {
        user_id: currentUserId,
        name: client.name?.trim() || 'Cliente sem nome',
        email: client.email?.trim() || '',
        phone: client.phone?.trim() || null,
        cpf: client.cpf?.trim() || null,
        birth_date: client.birth_date ? client.birth_date : null,
        city: client.city?.trim() || 'Maceió',
        state: client.state?.trim() || 'AL',
        address: client.address?.trim() || null,
        cep: client.cep?.trim() || null,
        utility_company: client.utility_company?.trim() || 'Equatorial',
        utility_account: client.utility_account?.trim() || null,
        system_size_kw: sanitizeNumber(client.system_size_kw),
        install_date: client.install_date ? client.install_date : null,
        monthly_avg_kwh: sanitizeNumber(client.monthly_avg_kwh),
        notes: client.notes?.trim() || null,
        is_active: true,
      };

      const newClient: ClientData = {
        id: `cli_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        ...payload,
        created_at: new Date().toISOString(),
        deleted_at: null,
      } as ClientData;

      // Persist in local storage immediately
      const cached = localStorage.getItem('quark_clients_cache');
      const list: ClientData[] = cached ? JSON.parse(cached) : [...SAMPLE_CLIENTS];
      list.unshift(newClient);
      localStorage.setItem('quark_clients_cache', JSON.stringify(list));

      // Attempt remote Supabase insert with timeout
      try {
        const { data, error } = await withTimeout(
          Promise.resolve(supabase.from('client_portal_users').insert(payload).select().single()),
          1500
        );
        if (!error && data) {
          return data as ClientData;
        }
      } catch (e) {
        console.warn('[useCreateClient] Salvo localmente em cache offline:', e);
      }

      return newClient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client_intelligence'] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ClientData> & { id: string }) => {
      const payload: Record<string, any> = {};

      if (updates.name !== undefined) payload.name = updates.name.trim();
      if (updates.email !== undefined) payload.email = updates.email.trim();
      if (updates.phone !== undefined) payload.phone = updates.phone ? updates.phone.trim() : null;
      if (updates.cpf !== undefined) payload.cpf = updates.cpf ? updates.cpf.trim() : null;
      if (updates.birth_date !== undefined) payload.birth_date = updates.birth_date ? updates.birth_date : null;
      if (updates.city !== undefined) payload.city = updates.city ? updates.city.trim() : null;
      if (updates.state !== undefined) payload.state = updates.state ? updates.state.trim() : null;
      if (updates.address !== undefined) payload.address = updates.address ? updates.address.trim() : null;
      if (updates.cep !== undefined) payload.cep = updates.cep ? updates.cep.trim() : null;
      if (updates.utility_company !== undefined) payload.utility_company = updates.utility_company ? updates.utility_company.trim() : null;
      if (updates.utility_account !== undefined) payload.utility_account = updates.utility_account ? updates.utility_account.trim() : null;
      if (updates.system_size_kw !== undefined) payload.system_size_kw = sanitizeNumber(updates.system_size_kw);
      if (updates.install_date !== undefined) payload.install_date = updates.install_date ? updates.install_date : null;
      if (updates.monthly_avg_kwh !== undefined) payload.monthly_avg_kwh = sanitizeNumber(updates.monthly_avg_kwh);
      if (updates.notes !== undefined) payload.notes = updates.notes ? updates.notes.trim() : null;
      if (updates.is_active !== undefined) payload.is_active = updates.is_active;

      // Update local storage cache immediately
      const cached = localStorage.getItem('quark_clients_cache');
      const list: ClientData[] = cached ? JSON.parse(cached) : [...SAMPLE_CLIENTS];
      const idx = list.findIndex(c => c.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...payload };
        localStorage.setItem('quark_clients_cache', JSON.stringify(list));
      }

      try {
        const { data, error } = await withTimeout(
          Promise.resolve(supabase.from('client_portal_users').update(payload).eq('id', id).select().single()),
          1500
        );
        if (!error && data) return data as ClientData;
      } catch (e) {
        console.warn('[useUpdateClient] Atualizado localmente no cache offline:', e);
      }

      return (list[idx] || { id, ...payload }) as ClientData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client_intelligence'] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const cached = localStorage.getItem('quark_clients_cache');
      const list: ClientData[] = cached ? JSON.parse(cached) : [...SAMPLE_CLIENTS];
      const idx = list.findIndex(c => c.id === id);
      if (idx !== -1) {
        list[idx].deleted_at = new Date().toISOString();
        list[idx].is_active = false;
        localStorage.setItem('quark_clients_cache', JSON.stringify(list));
      }

      try {
        await withTimeout(
          Promise.resolve(supabase.from('client_portal_users').update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', id)),
          1500
        );
      } catch (e) {}

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useRestoreClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const cached = localStorage.getItem('quark_clients_cache');
      const list: ClientData[] = cached ? JSON.parse(cached) : [...SAMPLE_CLIENTS];
      const idx = list.findIndex(c => c.id === id);
      if (idx !== -1) {
        list[idx].deleted_at = null;
        list[idx].is_active = true;
        localStorage.setItem('quark_clients_cache', JSON.stringify(list));
      }

      try {
        await withTimeout(
          Promise.resolve(supabase.from('client_portal_users').update({ deleted_at: null, is_active: true }).eq('id', id)),
          1500
        );
      } catch (e) {}

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useHardDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const cached = localStorage.getItem('quark_clients_cache');
      const list: ClientData[] = cached ? JSON.parse(cached) : [...SAMPLE_CLIENTS];
      const filtered = list.filter(c => c.id !== id);
      localStorage.setItem('quark_clients_cache', JSON.stringify(filtered));

      try {
        await withTimeout(
          Promise.resolve(supabase.from('client_portal_users').delete().eq('id', id)),
          1500
        );
      } catch (e) {}

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client_intelligence'] });
    },
  });
}
