import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { ProposalData } from '../components/proposal/types';

export function useProposals() {
  const queryClient = useQueryClient();

  // Buscar todas as propostas do usuário logado
  const proposalsQuery = useQuery({
    queryKey: ['proposals'],
    queryFn: async () => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('user_id', userAuth.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Mapear dados do banco para o tipo do frontend
      return (data as any[]).map(row => ({
        id: row.id,
        clientName: row.client_name,
        city: row.city,
        phone: row.phone,
        systemSizeKw: row.system_size_kw,
        finalPrice: row.final_price,
        status: row.status,
        ...row.data, // Todos os outros campos estão no JSONB data
        blocks: row.blocks,
        theme: row.theme,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })) as ProposalData[];
    },
  });

  // Salvar/Atualizar proposta
  const saveProposal = useMutation({
    mutationFn: async (proposal: ProposalData) => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const {
        id,
        clientName,
        city,
        phone,
        systemSizeKw,
        finalPrice,
        status,
        blocks,
        theme,
        createdAt,
        updatedAt,
        ...restData
      } = proposal;

      const payload = {
        user_id: userAuth.user.id,
        client_name: clientName,
        city,
        phone,
        system_size_kw: systemSizeKw,
        final_price: finalPrice,
        status: status || 'draft',
        data: restData,
        blocks,
        theme,
        updated_at: new Date().toISOString(),
      };

      if (id) {
        // Update
        const { data, error } = await supabase
          .from('proposals')
          .update(payload)
          .eq('id', id)
          .eq('user_id', userAuth.user.id) // garante segurança extra
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        // Insert
        const { data, error } = await supabase
          .from('proposals')
          .insert({
            ...payload,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });

  // Deletar proposta
  const deleteProposal = useMutation({
    mutationFn: async (id: string) => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const { error } = await supabase
        .from('proposals')
        .delete()
        .eq('id', id)
        .eq('user_id', userAuth.user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });

  return {
    proposals: proposalsQuery.data || [],
    isLoading: proposalsQuery.isLoading,
    isError: proposalsQuery.isError,
    error: proposalsQuery.error,
    saveProposal,
    deleteProposal,
  };
}
