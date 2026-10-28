import { useEffect } from 'react';
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

const withTimeout = <T,>(p: Promise<T>, ms = 2500): Promise<T> =>
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
    contract_value: 28500,
    system_cost: 28500,
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
    contract_value: 42000,
    system_cost: 42000,
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
    contract_value: 58000,
    system_cost: 58000,
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
    contract_value: 21000,
    system_cost: 21000,
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
    contract_value: 75000,
    system_cost: 75000,
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

/** Helper para extrair apenas dígitos */
const onlyDigits = (str?: string | null): string => (typeof str === 'string' ? str.replace(/\D/g, '') : '');

const KNOWN_MOCK_CLIENT_IDS = new Set(['cli_luanda_001', 'cli_clinica_002']);

/** Mescla clientes remotos e em cache local sem jamais perder cadastros recentes */
function mergeClientsList(remote: ClientData[], cached: ClientData[], includeDeleted: boolean): ClientData[] {
  const map = new Map<string, ClientData>();

  // 1. Prioridade absoluta para dados remotos oficiais do banco
  for (const c of remote) {
    if (c && c.id) {
      map.set(c.id, c);
    }
  }

  // 2. Preserva todos os clientes locais cadastrados pelo usuário sem perder dados
  for (const c of cached) {
    if (!c || !c.id) continue;
    // Ignora apenas mocks clássicos de demonstração
    if (KNOWN_MOCK_CLIENT_IDS.has(c.id) || c.id.startsWith('sample_')) continue;

    if (!map.has(c.id)) {
      // Verifica se há correspondência por CPF limpo ou email idêntico para não duplicar
      const cCpfDigits = onlyDigits(c.cpf);
      const cEmail = c.email?.trim().toLowerCase();
      const existingMatch = Array.from(map.values()).find(r => {
        if (cCpfDigits && cCpfDigits.length >= 11 && onlyDigits(r.cpf) === cCpfDigits) return true;
        if (cEmail && r.email?.trim().toLowerCase() === cEmail) return true;
        return false;
      });

      // Se não existe correspondente remoto, preserva o cliente localmente
      if (!existingMatch) {
        map.set(c.id, c);
      }
    }
  }

  let list = Array.from(map.values());
  if (!includeDeleted) {
    list = list.filter(c => !c.deleted_at);
  }
  return list;
}

export function useClients(options?: { includeDeleted?: boolean }) {
  const includeDeleted = options?.includeDeleted ?? false;
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleClientUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    };
    window.addEventListener('quark_client_updated', handleClientUpdated);
    return () => window.removeEventListener('quark_client_updated', handleClientUpdated);
  }, [queryClient]);

  return useQuery({
    queryKey: ['clients', { includeDeleted }],
    placeholderData: () => {
      try {
        const cachedRaw = localStorage.getItem('quark_clients_cache');
        if (cachedRaw) {
          const parsed: ClientData[] = JSON.parse(cachedRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.filter((c) => includeDeleted || !c.deleted_at);
          }
        }
      } catch (_) {}
      return undefined;
    },
    staleTime: 5_000,
    queryFn: async () => {
      let remoteClients: ClientData[] | null = null;

      // 1. Tenta buscar direto no Supabase
      try {
        let query = supabase
          .from('client_portal_users')
          .select('*')
          .order('created_at', { ascending: false });

        if (!includeDeleted) {
          query = query.is('deleted_at', null);
        }

        const { data, error } = await withTimeout(Promise.resolve(query), 2500);
        if (!error && Array.isArray(data) && data.length > 0) {
          remoteClients = data as ClientData[];
        }
      } catch (err) {
        console.warn('[useClients] Supabase query falhou ou demorou:', err);
      }

      // 2. Se o Supabase falhou, tenta a rota de backend proxy /api/clients
      if (!remoteClients) {
        try {
          const res = await withTimeout(
            fetch(`/api/clients${includeDeleted ? '?includeDeleted=true' : ''}`),
            2000
          );
          if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.clients) && json.clients.length > 0) {
              remoteClients = json.clients as ClientData[];
            }
          }
        } catch (_) {}
      }

      // 3. Lê o cache local
      const cachedRaw = localStorage.getItem('quark_clients_cache');
      let cachedClients: ClientData[] = [];
      try {
        if (cachedRaw) cachedClients = JSON.parse(cachedRaw);
      } catch (_) {}

      if (remoteClients) {
        // MESCLA sem destruir clientes locais recém-criados
        const merged = mergeClientsList(remoteClients, cachedClients, includeDeleted);
        try {
          localStorage.setItem('quark_clients_cache', JSON.stringify(merged));
        } catch (_) {}
        return merged;
      }

      // Se ambos falharam (offline) e cache está vazio, usa amostras apenas como fallback de emergência
      if (!cachedRaw || cachedClients.length === 0) {
        return SAMPLE_CLIENTS.filter(c => includeDeleted || !c.deleted_at);
      }

      return cachedClients.filter(c => includeDeleted || !c.deleted_at);
    },
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (client: Partial<ClientData>) => {
      let currentUserId: string | null = null;
      try {
        const { data: userAuth } = await withTimeout(Promise.resolve(supabase.auth.getUser()), 1500);
        currentUserId = userAuth?.user?.id || null;
      } catch {}

      const cleanCpf = client.cpf?.trim() || null;
      const cpfDigits = cleanCpf ? onlyDigits(cleanCpf) : null;
      const formattedCpf = cpfDigits && cpfDigits.length >= 11 ? cpfDigits : cleanCpf;
      const cleanEmail = client.email?.trim() ? client.email.trim().toLowerCase() : null;

      const payload: Record<string, any> = {
        name: client.name?.trim() || 'Cliente sem nome',
        email: cleanEmail,
        phone: client.phone?.trim() || null,
        cpf: formattedCpf,
        birth_date: client.birth_date && client.birth_date.trim() ? client.birth_date.trim() : null,
        city: client.city?.trim() || 'Maceió',
        state: client.state?.trim() || 'AL',
        address: client.address?.trim() || null,
        cep: client.cep?.trim() || null,
        utility_company: client.utility_company?.trim() || 'Equatorial',
        utility_account: client.utility_account?.trim() || null,
        system_size_kw: sanitizeNumber(client.system_size_kw),
        contract_value: sanitizeNumber(client.contract_value ?? client.system_cost),
        system_cost: sanitizeNumber(client.contract_value ?? client.system_cost),
        install_date: client.install_date && client.install_date.trim() ? client.install_date.trim() : null,
        monthly_avg_kwh: sanitizeNumber(client.monthly_avg_kwh),
        notes: client.notes?.trim() || null,
        is_active: true,
      };

      // Apenas adiciona user_id se autenticado, caso contrário deixa o default do PostgreSQL agir
      if (currentUserId) {
        payload.user_id = currentUserId;
      }

      const isUuid = (val?: string | null): val is string =>
        typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
      const targetId = (client.id && isUuid(client.id))
        ? client.id
        : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined);

      const defaultAdminUserId = '7dacc88f-9ebd-4710-a1be-0647841db24a';
      payload.user_id = currentUserId || defaultAdminUserId;
      if (targetId) payload.id = targetId;

      let savedClient: ClientData = {
        id: targetId || `cli_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ...payload,
        created_at: new Date().toISOString(),
        deleted_at: null,
      } as ClientData;

      // 1. Tenta persistência primária DIRETA no Supabase Cloud (0 dependência de Docker ou backend local)
      try {
        let existingId: string | null = null;
        if (formattedCpf) {
          const { data: existing } = await supabase
            .from('client_portal_users')
            .select('id')
            .eq('cpf', formattedCpf)
            .maybeSingle();
          if (existing?.id) existingId = existing.id;
        }

        if (!existingId && cleanEmail) {
          const { data: existing } = await supabase
            .from('client_portal_users')
            .select('id')
            .eq('email', cleanEmail)
            .maybeSingle();
          if (existing?.id) existingId = existing.id;
        }

        if (existingId) {
          const { data: updated, error: updErr } = await supabase
            .from('client_portal_users')
            .update(payload)
            .eq('id', existingId)
            .select()
            .single();
          if (!updErr && updated) {
            savedClient = updated as ClientData;
          }
        } else {
          const { data: inserted, error: insErr } = await supabase
            .from('client_portal_users')
            .insert(payload)
            .select()
            .single();
          if (!insErr && inserted) {
            savedClient = inserted as ClientData;
          }
        }
      } catch (sbErr) {
        console.warn('[useCreateClient] Supabase direto falhou, usando fallback resiliente:', sbErr);
      }

      // 2. Grava no cache local imediatamente com o ID definitivo do banco
      try {
        const cached = localStorage.getItem('quark_clients_cache');
        const list: ClientData[] = cached ? JSON.parse(cached) : [];
        const existingIdx = list.findIndex(c => 
          c.id === savedClient.id ||
          (formattedCpf && onlyDigits(c.cpf) === cpfDigits) ||
          (cleanEmail && c.email?.toLowerCase() === cleanEmail)
        );
        if (existingIdx !== -1) {
          list[existingIdx] = { ...list[existingIdx], ...savedClient, deleted_at: null, is_active: true };
          savedClient = list[existingIdx];
        } else {
          list.unshift(savedClient);
        }
        localStorage.setItem('quark_clients_cache', JSON.stringify(list));
      } catch (err) {
        console.warn('[useCreateClient] Erro ao gravar cache local:', err);
      }

      // 3. Sincroniza em background com o servidor backend (não bloqueia UI)
      try {
        fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(savedClient),
        }).catch(() => {});
      } catch (_) {}

      return savedClient;
    },
    onSuccess: (saved) => {
      // 1. Sincroniza com CRM no Supabase (coluna Ganho)
      const contractAmount = saved.contract_value || saved.system_cost || (saved.system_size_kw ? Math.round(saved.system_size_kw * 3800) : 0);
      try {
        if (contractAmount > 0 || saved.name) {
          Promise.resolve(
            supabase.from('opportunities').upsert({
              title: saved.name,
              status: 'Ganho',
              amount: contractAmount,
              phone: saved.phone || null,
              email: saved.email || null,
              cpf_cnpj: saved.cpf || null,
              city: saved.city || 'Maceió',
              notes: `Cliente cadastrado no Catálogo (${saved.system_size_kw || 0} kWp). CPF: ${saved.cpf || 'Não informado'}.`,
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' })
          ).catch(() => {});
        }
      } catch (_) {}

      // 2. Sincroniza com o Financeiro no localStorage
      try {
        const txDate = saved.install_date || new Date().toISOString().split('T')[0];
        const txId = `tx_cli_${saved.id}`;
        const txPayload = {
          id: txId,
          description: `Contrato Solar — ${saved.name}`,
          type: 'receita',
          category: saved.system_size_kw && saved.system_size_kw > 10 ? 'instalacao_comercial' : 'instalacao_residencial',
          amount: contractAmount,
          date: txDate,
          note: `Contrato originado do Catálogo de Clientes (CPF: ${saved.cpf || 'N/A'}, Potência: ${saved.system_size_kw || 0} kWp)`
        };
        const finRaw = localStorage.getItem('quark_financial_transactions');
        const finList: any[] = finRaw ? JSON.parse(finRaw) : [];
        const fIdx = finList.findIndex(t => t.id === txId || (t.description === txPayload.description && t.date === txDate));
        if (fIdx !== -1) {
          finList[fIdx] = { ...finList[fIdx], ...txPayload };
        } else {
          finList.unshift(txPayload);
        }
        localStorage.setItem('quark_financial_transactions', JSON.stringify(finList));
      } catch (_) {}

      // Atualiza o estado em memória imediatamente
      queryClient.setQueryData(['clients', { includeDeleted: false }], (old: ClientData[] | undefined) => {
        if (!old) return [saved];
        const exists = old.some(c => c.id === saved.id || (saved.cpf && onlyDigits(c.cpf) === onlyDigits(saved.cpf)));
        if (exists) {
          return old.map(c => (c.id === saved.id || (saved.cpf && onlyDigits(c.cpf) === onlyDigits(saved.cpf)) ? saved : c));
        }
        return [saved, ...old];
      });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client_intelligence'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['financial_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial_dre_summary'] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ClientData> & { id: string }) => {
      const payload: Record<string, any> = {};

      if (updates.name !== undefined) payload.name = updates.name.trim();
      if (updates.email !== undefined) payload.email = updates.email?.trim() ? updates.email.trim().toLowerCase() : null;
      if (updates.phone !== undefined) payload.phone = updates.phone?.trim() ? updates.phone.trim() : null;
      if (updates.cpf !== undefined) {
        const digits = onlyDigits(updates.cpf);
        payload.cpf = digits && digits.length >= 11 ? digits : (updates.cpf?.trim() || null);
      }
      if (updates.birth_date !== undefined) payload.birth_date = updates.birth_date?.trim() ? updates.birth_date.trim() : null;
      if (updates.city !== undefined) payload.city = updates.city?.trim() ? updates.city.trim() : null;
      if (updates.state !== undefined) payload.state = updates.state?.trim() ? updates.state.trim() : null;
      if (updates.address !== undefined) payload.address = updates.address?.trim() ? updates.address.trim() : null;
      if (updates.cep !== undefined) payload.cep = updates.cep?.trim() ? updates.cep.trim() : null;
      if (updates.utility_company !== undefined) payload.utility_company = updates.utility_company?.trim() ? updates.utility_company.trim() : null;
      if (updates.utility_account !== undefined) payload.utility_account = updates.utility_account?.trim() ? updates.utility_account.trim() : null;
      if (updates.system_size_kw !== undefined) payload.system_size_kw = sanitizeNumber(updates.system_size_kw);
      if (updates.contract_value !== undefined || updates.system_cost !== undefined) {
        const cVal = sanitizeNumber(updates.contract_value ?? updates.system_cost);
        payload.contract_value = cVal;
        payload.system_cost = cVal;
      }
      if (updates.install_date !== undefined) payload.install_date = updates.install_date?.trim() ? updates.install_date.trim() : null;
      if (updates.monthly_avg_kwh !== undefined) payload.monthly_avg_kwh = sanitizeNumber(updates.monthly_avg_kwh);
      if (updates.notes !== undefined) payload.notes = updates.notes?.trim() ? updates.notes.trim() : null;
      if (updates.is_active !== undefined) payload.is_active = updates.is_active;

      // Atualiza no cache local imediatamente
      try {
        const cached = localStorage.getItem('quark_clients_cache');
        const list: ClientData[] = cached ? JSON.parse(cached) : [];
        const idx = list.findIndex(c => c.id === id);
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...payload };
          localStorage.setItem('quark_clients_cache', JSON.stringify(list));
        }
      } catch (_) {}

      // Tenta via backend API
      try {
        const res = await withTimeout(
          fetch(`/api/clients/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }),
          2000
        );
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.client) return json.client as ClientData;
        }
      } catch (_) {}

      // Fallback direto Supabase
      try {
        const { data, error } = await withTimeout(
          Promise.resolve(supabase.from('client_portal_users').update(payload).eq('id', id).select().single()),
          2000
        ).catch(() => ({ data: null, error: true }));
        if (!error && data) return data as ClientData;
      } catch (e) {
        console.warn('[useUpdateClient] Atualizado localmente no cache offline:', e);
      }

      return { id, ...payload } as ClientData;
    },
    onSuccess: (updated) => {
      // Atualiza também CRM e Financeiro caso valor ou nome tenham mudado
      if (updated.contract_value || updated.system_cost) {
        const contractAmount = updated.contract_value || updated.system_cost || 0;
        try {
          if (updated.opportunity_id) {
            Promise.resolve(
              supabase.from('opportunities').update({
                amount: contractAmount,
                ...(updated.name ? { title: updated.name } : {}),
                updated_at: new Date().toISOString()
              }).eq('id', updated.opportunity_id)
            ).catch(() => {});
          }
        } catch (_) {}

        try {
          const finRaw = localStorage.getItem('quark_financial_transactions');
          if (finRaw) {
            const finList: any[] = JSON.parse(finRaw);
            const txId = `tx_cli_${updated.id}`;
            const fIdx = finList.findIndex(t => t.id === txId);
            if (fIdx !== -1) {
              finList[fIdx].amount = contractAmount;
              if (updated.name) finList[fIdx].description = `Contrato Solar — ${updated.name}`;
              localStorage.setItem('quark_financial_transactions', JSON.stringify(finList));
            }
          }
        } catch (_) {}
      }

      queryClient.setQueryData(['clients', { includeDeleted: false }], (old: ClientData[] | undefined) => {
        if (!old) return [updated];
        return old.map(c => (c.id === updated.id ? { ...c, ...updated } : c));
      });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client_intelligence'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['financial_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial_dre_summary'] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        const cached = localStorage.getItem('quark_clients_cache');
        const list: ClientData[] = cached ? JSON.parse(cached) : [];
        const idx = list.findIndex(c => c.id === id);
        if (idx !== -1) {
          list[idx].deleted_at = new Date().toISOString();
          list[idx].is_active = false;
          localStorage.setItem('quark_clients_cache', JSON.stringify(list));
        }
      } catch (_) {}

      // Tenta via backend API
      try {
        await withTimeout(fetch(`/api/clients/${id}`, { method: 'DELETE' }), 5000);
      } catch (_) {
        // Fallback Supabase
        try {
          await withTimeout(
            Promise.resolve(supabase.from('client_portal_users').update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', id)),
            5000
          );
        } catch (_) {}
      }

      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData(['clients', { includeDeleted: false }], (old: ClientData[] | undefined) => {
        if (!old) return [];
        return old.filter(c => c.id !== id);
      });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useRestoreClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        const cached = localStorage.getItem('quark_clients_cache');
        const list: ClientData[] = cached ? JSON.parse(cached) : [];
        const idx = list.findIndex(c => c.id === id);
        if (idx !== -1) {
          list[idx].deleted_at = null;
          list[idx].is_active = true;
          localStorage.setItem('quark_clients_cache', JSON.stringify(list));
        }
      } catch (_) {}

      try {
        await withTimeout(
          fetch(`/api/clients/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deleted_at: null, is_active: true }),
          }),
          5000
        );
      } catch (_) {
        try {
          await withTimeout(
            Promise.resolve(supabase.from('client_portal_users').update({ deleted_at: null, is_active: true }).eq('id', id)),
            5000
          );
        } catch (_) {}
      }

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
      try {
        const cached = localStorage.getItem('quark_clients_cache');
        const list: ClientData[] = cached ? JSON.parse(cached) : [];
        const filtered = list.filter(c => c.id !== id);
        localStorage.setItem('quark_clients_cache', JSON.stringify(filtered));
      } catch (_) {}

      try {
        await withTimeout(fetch(`/api/clients/${id}?hard=true`, { method: 'DELETE' }), 5000);
      } catch (_) {
        try {
          await withTimeout(
            Promise.resolve(supabase.from('client_portal_users').delete().eq('id', id)),
            5000
          );
        } catch (_) {}
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client_intelligence'] });
    },
  });
}
