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
      try {
        const sessionPromise = Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 800))
        ]);
        const { data: { session } } = await sessionPromise;
        if (!session?.user?.id) return null;

        const isPartnerAdmin = 
          session.user.email === 'arthurmoraesp12@gmail.com' || 
          session.user.email === 'ctt.andersonalves@gmail.com' ||
          session.user.user_metadata?.role === 'Admin';

        const rpcPromise = Promise.race([
          Promise.resolve(supabase.rpc('get_financial_dre_summary', {
            p_user_id: isPartnerAdmin ? null : session.user.id,
            p_start_date: startDate || null,
            p_end_date: endDate || null
          })),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 1200))
        ]);
        const { data, error } = await rpcPromise;

        if (error) {
          // Se a função não existir (ainda não rodou o SQL), devolve null para fazermos o fallback no client
          return null;
        }
        return data;
      } catch {
        // Fallback gracioso para cálculo client-side quando offline ou timeout
        return null;
      }
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}
