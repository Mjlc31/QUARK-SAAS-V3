import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { MaintenanceService, MaintenanceStats } from '../types';

export function useMaintenance() {
  return useQuery({
    queryKey: ['maintenance_services'],
    queryFn: async () => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('maintenance_services')
        .select('*')
        .eq('user_id', userAuth.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data as MaintenanceService[];
    },
  });
}

export function useMaintenanceStats() {
  return useQuery({
    queryKey: ['maintenance_stats'],
    queryFn: async () => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('maintenance_services')
        .select('*')
        .eq('user_id', userAuth.user.id);

      if (error) {
        throw error;
      }

      const services = data as MaintenanceService[];
      
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      let totalServices = services.length;
      let completedThisMonth = 0;
      let revenueThisMonth = 0;
      let profitThisMonth = 0;
      let monthlyGoal = 10000;
      
      services.forEach(service => {
        if (service.status === 'concluido' && service.completed_date) {
          const completedDate = new Date(service.completed_date);
          if (completedDate >= startOfMonth) {
            completedThisMonth++;
            revenueThisMonth += Number(service.price) || 0;
            profitThisMonth += (Number(service.price) || 0) - (Number(service.cost) || 0);
          }
        }
      });

      const avgProfitPerService = revenueThisMonth > 0 ? (profitThisMonth / revenueThisMonth) * 100 : 0;

      return {
        totalServices,
        completedThisMonth,
        revenueThisMonth,
        profitThisMonth,
        monthlyGoal,
        avgProfitPerService,
      } as MaintenanceStats;
    },
  });
}

export function useCreateMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (service: Partial<MaintenanceService>) => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('maintenance_services')
        .insert({
          ...service,
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
      queryClient.invalidateQueries({ queryKey: ['maintenance_services'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance_stats'] });
    },
  });
}

export function useUpdateMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...service }: Partial<MaintenanceService> & { id: string }) => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('maintenance_services')
        .update({
          ...service,
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
      queryClient.invalidateQueries({ queryKey: ['maintenance_services'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance_stats'] });
    },
  });
}

export function useDeleteMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const { error } = await supabase
        .from('maintenance_services')
        .delete()
        .eq('id', id)
        .eq('user_id', userAuth.user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_services'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance_stats'] });
    },
  });
}
