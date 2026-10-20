import { useQuery } from '@tanstack/react-query';
import { storageService } from '../services/storageService';
import { Lead } from '../types';

export function useLeads() {
  return useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const data = await storageService.getLeads();
      return (data || []) as Lead[];
    },
  });
}
