import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { FinancialTransaction } from '../types';

interface FetchParams {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export function useFinancial(params?: FetchParams) {
  const { startDate, endDate, page = 1, limit = 50 } = params || {};
  
  return useQuery({
    queryKey: ['financial_transactions', { startDate, endDate, page, limit }],
    queryFn: async () => {
      let query = supabase
        .from('financial_transactions')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .order('date', { ascending: false });

      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return { data: data as FinancialTransaction[], count };
    },
  });
}

// Otimização: RPC do DRE calculado direto no Supabase
export function useFinancialDreSummary(params?: { startDate?: string; endDate?: string }) {
  const { startDate, endDate } = params || {};
  
  return useQuery({
    queryKey: ['financial_dre_summary', { startDate, endDate }],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('get_financial_dre_summary', {
        p_user_id: session.user.id,
        p_start_date: startDate || null,
        p_end_date: endDate || null
      });

      if (error) {
        // Se a função não existir (ainda não rodou o SQL), devolve null para fazermos o fallback no client
        if (error.code === 'PGRST202') return null;
        throw error;
      }
      return data;
    },
  });
}
