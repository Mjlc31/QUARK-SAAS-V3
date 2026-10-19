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

export function useClients(options?: { includeDeleted?: boolean }) {
  const includeDeleted = options?.includeDeleted ?? false;

  return useQuery({
    queryKey: ['clients', { includeDeleted }],
    queryFn: async () => {
      let query = supabase
        .from('client_portal_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (!includeDeleted) {
        query = query.is('deleted_at', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ClientData[];
    },
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (client: Partial<ClientData>) => {
      const { data: userAuth } = await supabase.auth.getUser();
      const currentUserId = userAuth?.user?.id || null;

      const payload = {
        user_id: currentUserId,
        name: client.name?.trim() || 'Cliente sem nome',
        email: client.email?.trim() || '',
        phone: client.phone?.trim() || null,
        cpf: client.cpf?.trim() || null,
        birth_date: client.birth_date ? client.birth_date : null,
        city: client.city?.trim() || null,
        state: client.state?.trim() || null,
        address: client.address?.trim() || null,
        cep: client.cep?.trim() || null,
        utility_company: client.utility_company?.trim() || null,
        utility_account: client.utility_account?.trim() || null,
        system_size_kw: sanitizeNumber(client.system_size_kw),
        install_date: client.install_date ? client.install_date : null,
        monthly_avg_kwh: sanitizeNumber(client.monthly_avg_kwh),
        notes: client.notes?.trim() || null,
        is_active: true,
      };

      // Create portal user
      const { data, error } = await supabase
        .from('client_portal_users')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      // Sync with client_intelligence if system size or install date provided
      if (data.install_date || data.system_size_kw || data.utility_account) {
        try {
          await supabase.from('client_intelligence').insert({
            user_id: currentUserId,
            client_id: data.id,
            client_name: data.name,
            install_start_date: data.install_date,
            system_size_kw: data.system_size_kw,
            utility_account: data.utility_account,
            monthly_generation_kwh: data.monthly_avg_kwh,
            is_active: true,
          });
        } catch (intelErr) {
          console.warn('[useCreateClient] Erro ao sincronizar client_intelligence:', intelErr);
        }
      }

      return data as ClientData;
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

      const { data, error } = await supabase
        .from('client_portal_users')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Upsert / sync client_intelligence
      try {
        const { data: existingIntel } = await supabase
          .from('client_intelligence')
          .select('id')
          .eq('client_id', id)
          .maybeSingle();

        if (existingIntel) {
          await supabase
            .from('client_intelligence')
            .update({
              client_name: payload.name ?? data.name,
              system_size_kw: payload.system_size_kw ?? data.system_size_kw,
              install_start_date: payload.install_date ?? data.install_date,
              utility_account: payload.utility_account ?? data.utility_account,
              monthly_generation_kwh: payload.monthly_avg_kwh ?? data.monthly_avg_kwh,
            })
            .eq('client_id', id);
        } else if (data.system_size_kw || data.utility_account || data.install_date) {
          const { data: userAuth } = await supabase.auth.getUser();
          await supabase.from('client_intelligence').insert({
            user_id: userAuth?.user?.id || null,
            client_id: id,
            client_name: data.name,
            install_start_date: data.install_date,
            system_size_kw: data.system_size_kw,
            utility_account: data.utility_account,
            monthly_generation_kwh: data.monthly_avg_kwh,
            is_active: true,
          });
        }
      } catch (e) {
        console.warn('[useUpdateClient] Erro ao sincronizar inteligência:', e);
      }

      return data as ClientData;
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
      const { error } = await supabase
        .from('client_portal_users')
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq('id', id);
      if (error) throw error;
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
      const { error } = await supabase
        .from('client_portal_users')
        .update({ deleted_at: null, is_active: true })
        .eq('id', id);
      if (error) throw error;
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
      // 1. Desacoplar ou remover registros dependentes para evitar violações de FK
      try {
        await supabase.from('client_intelligence').delete().eq('client_id', id);
        await supabase.from('project_tracking').delete().eq('client_id', id);
        await supabase.from('maintenance_services').delete().eq('client_id', id);
        await supabase.from('support_tickets').delete().eq('client_id', id);
      } catch (depErr) {
        console.warn('[useHardDeleteClient] Aviso ao limpar dependências:', depErr);
      }

      // 2. Excluir o cliente definitivamente
      const { error } = await supabase
        .from('client_portal_users')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client_intelligence'] });
    },
  });
}
