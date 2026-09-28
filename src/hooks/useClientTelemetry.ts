import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { usePortal } from '../contexts/PortalContext';

export interface ClientIntelligence {
  id: string;
  client_name: string;
  install_start_date: string;
  system_size_kw: number;
  last_maintenance_date: string;
  next_maintenance_date: string;
  total_savings_brl: number;
  monthly_generation_kwh: number;
}

export function useClientTelemetry() {
  const { client } = usePortal();
  
  return useQuery({
    queryKey: ['telemetry', client?.id],
    queryFn: async () => {
      if (!client?.id) return null;

      const { data, error } = await supabase
        .from('client_intelligence')
        .select('*')
        .eq('client_id', client.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data as ClientIntelligence | null;
    },
    enabled: !!client?.id,
  });
}
