import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Lead } from '../types';

export function useLeads() {
  return useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data as Lead[];
    },
  });
}
