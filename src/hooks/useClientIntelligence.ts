import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { ClientIntelligenceRecord, UtilityInvoice } from '../types';

export function useClientIntelligence() {
  return useQuery({
    queryKey: ['client_intelligence'],
    queryFn: async () => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('client_intelligence')
        .select('*')
        .eq('user_id', userAuth.user.id)
        .order('client_name', { ascending: true });

      if (error) {
        throw error;
      }

      return data as ClientIntelligenceRecord[];
    },
  });
}

export function useCreateIntelligence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (record: Partial<ClientIntelligenceRecord>) => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('client_intelligence')
        .insert({
          ...record,
          user_id: userAuth.user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
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
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('client_intelligence')
        .update({
          ...record,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userAuth.user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
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
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const { error } = await supabase
        .from('client_intelligence')
        .delete()
        .eq('id', id)
        .eq('user_id', userAuth.user.id);
      
      if (error) throw error;
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

      const { data, error } = await supabase
        .from('utility_invoices')
        .select('*')
        .eq('intelligence_id', intelligenceId)
        .order('captured_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data as UtilityInvoice[];
    },
    enabled: !!intelligenceId,
  });
}
