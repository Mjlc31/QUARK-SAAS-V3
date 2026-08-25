import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
// Assuming FinancialTransaction type exists, we can use any or add type later
import { FinancialTransaction } from '../types';

export function useFinancial() {
  return useQuery({
    queryKey: ['financial_transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        throw error;
      }

      return data as FinancialTransaction[];
    },
  });
}
