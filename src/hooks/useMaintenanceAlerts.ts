import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { MaintenanceAlert, AlertStatus } from '../types';

export function useMaintenanceAlerts() {
  return useQuery({
    queryKey: ['maintenance_alerts'],
    queryFn: async () => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('maintenance_alerts')
        .select('*')
        .eq('user_id', userAuth.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MaintenanceAlert[];
    },
  });
}

export function usePendingAlerts() {
  return useQuery({
    queryKey: ['maintenance_alerts', 'pending'],
    queryFn: async () => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('maintenance_alerts')
        .select('*')
        .eq('user_id', userAuth.user.id)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MaintenanceAlert[];
    },
  });
}

export function useCreateAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (alert: Omit<MaintenanceAlert, 'id' | 'user_id' | 'created_at'>) => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('maintenance_alerts')
        .insert({
          ...alert,
          user_id: userAuth.user.id,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
        
      if (error) throw error;
      return data as MaintenanceAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_alerts'] });
    },
  });
}

export function useUpdateAlertStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AlertStatus }) => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('maintenance_alerts')
        .update({ status, ...(status === 'enviado' ? { sent_at: new Date().toISOString() } : {}) })
        .eq('id', id)
        .eq('user_id', userAuth.user.id)
        .select()
        .single();

      if (error) throw error;
      return data as MaintenanceAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_alerts'] });
    },
  });
}

export function useBatchCreateAlerts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (alerts: Omit<MaintenanceAlert, 'id' | 'user_id' | 'created_at'>[]) => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const now = new Date().toISOString();
      const payload = alerts.map(alert => ({
        ...alert,
        user_id: userAuth.user.id,
        created_at: now,
      }));

      const { data, error } = await supabase
        .from('maintenance_alerts')
        .insert(payload)
        .select();
        
      if (error) throw error;
      return data as MaintenanceAlert[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_alerts'] });
    },
  });
}
