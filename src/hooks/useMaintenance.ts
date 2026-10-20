import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { MaintenanceService, MaintenanceStats } from '../types';

const withTimeout = <T,>(p: Promise<T>, ms = 1200): Promise<T> =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

export const SAMPLE_MAINTENANCE_SERVICES: MaintenanceService[] = [
  {
    id: 'maint_001',
    user_id: 'usr_admin',
    client_id: 'cli_luanda_001',
    client_name: 'Dra. Luanda Vasconcelos',
    service_type: 'limpeza',
    status: 'agendado',
    scheduled_date: '2026-10-25',
    price: 350,
    cost: 110,
    technician: 'Carlos Silva',
    notes: 'Origem: Portal do Cliente - Limpeza periódica de 14 módulos Canadian Solar.',
    before_photos: [],
    after_photos: [],
    created_at: '2026-10-18T10:00:00.000Z',
    updated_at: '2026-10-18T10:00:00.000Z',
  },
  {
    id: 'maint_002',
    user_id: 'usr_admin',
    client_id: 'cli_clinica_002',
    client_name: 'Clínica Médica Santa Tereza',
    service_type: 'manutencao',
    status: 'pendente',
    scheduled_date: '2026-10-28',
    price: 450,
    cost: 130,
    technician: 'Anderson Alves',
    notes: 'Resgate de Pontos Quark - Revisão das caixas CC/CA e reaperto de barramentos.',
    before_photos: [],
    after_photos: [],
    created_at: '2026-10-19T14:20:00.000Z',
    updated_at: '2026-10-19T14:20:00.000Z',
  },
  {
    id: 'maint_003',
    user_id: 'usr_admin',
    client_id: 'cli_elitech_003',
    client_name: 'Academia Elitech Fit',
    service_type: 'inspecao',
    status: 'em_campo',
    scheduled_date: '2026-10-20',
    price: 800,
    cost: 250,
    technician: 'Rodrigo Engenheiro',
    notes: 'Origem: Portal - Inspeção termográfica por câmera FLIR para conformidade de seguro predial.',
    before_photos: [],
    after_photos: [],
    created_at: '2026-10-15T09:00:00.000Z',
    updated_at: '2026-10-20T08:30:00.000Z',
  },
  {
    id: 'maint_004',
    user_id: 'usr_admin',
    client_id: 'cli_haroldo_004',
    client_name: 'Haroldo Mendonça',
    service_type: 'reparo',
    status: 'concluido',
    scheduled_date: '2026-10-10',
    completed_date: '2026-10-10',
    price: 650,
    cost: 180,
    technician: 'Carlos Silva',
    notes: 'Troca de 2 conectores MC4 e calibração de string.',
    before_photos: [],
    after_photos: [],
    created_at: '2026-10-08T11:00:00.000Z',
    updated_at: '2026-10-10T16:00:00.000Z',
  }
];

export function useMaintenance() {
  return useQuery({
    queryKey: ['maintenance_services'],
    queryFn: async () => {
      try {
        const { data: userAuth } = await withTimeout(Promise.resolve(supabase.auth.getUser()), 1000);
        const userId = userAuth?.user?.id;

        let query = supabase
          .from('maintenance_services')
          .select('*')
          .order('created_at', { ascending: false });

        if (userId) {
          query = query.or(`user_id.eq.${userId},user_id.is.null`);
        }

        const { data, error } = await withTimeout(Promise.resolve(query), 1200);

        if (!error && data && data.length > 0) {
          localStorage.setItem('quark_maintenance_cache', JSON.stringify(data));
          return data as MaintenanceService[];
        }
      } catch (err) {
        console.warn('[useMaintenance] Fallback para cache local offline:', err);
      }

      const cached = localStorage.getItem('quark_maintenance_cache');
      if (cached) {
        try {
          return JSON.parse(cached) as MaintenanceService[];
        } catch {}
      }

      localStorage.setItem('quark_maintenance_cache', JSON.stringify(SAMPLE_MAINTENANCE_SERVICES));
      return SAMPLE_MAINTENANCE_SERVICES;
    },
  });
}

export function useMaintenanceStats() {
  return useQuery({
    queryKey: ['maintenance_stats'],
    queryFn: async () => {
      let services: MaintenanceService[] = [];
      try {
        const cached = localStorage.getItem('quark_maintenance_cache');
        if (cached) {
          services = JSON.parse(cached);
        } else {
          services = SAMPLE_MAINTENANCE_SERVICES;
        }
      } catch {
        services = SAMPLE_MAINTENANCE_SERVICES;
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      let totalServices = services.length;
      let completedThisMonth = 0;
      let revenueThisMonth = 0;
      let profitThisMonth = 0;
      let monthlyGoal = 10000;

      services.forEach((service) => {
        if (service.status === 'concluido') {
          completedThisMonth++;
          revenueThisMonth += Number(service.price) || 0;
          profitThisMonth += (Number(service.price) || 0) - (Number(service.cost) || 0);
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
      let currentUserId = 'usr_offline';
      try {
        const { data: userAuth } = await withTimeout(Promise.resolve(supabase.auth.getUser()), 800);
        if (userAuth?.user?.id) currentUserId = userAuth.user.id;
      } catch {}

      const newRecord: MaintenanceService = {
        id: `maint_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        user_id: currentUserId,
        client_id: service.client_id,
        client_name: service.client_name || 'Cliente Avulso',
        service_type: service.service_type || 'manutencao',
        status: service.status || 'pendente',
        scheduled_date: service.scheduled_date,
        completed_date: service.completed_date,
        price: Number(service.price) || 0,
        cost: Number(service.cost) || 0,
        technician: service.technician || '',
        notes: service.notes || '',
        before_photos: service.before_photos || [],
        after_photos: service.after_photos || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Persist locally
      const cached = localStorage.getItem('quark_maintenance_cache');
      const list: MaintenanceService[] = cached ? JSON.parse(cached) : [...SAMPLE_MAINTENANCE_SERVICES];
      list.unshift(newRecord);
      localStorage.setItem('quark_maintenance_cache', JSON.stringify(list));

      try {
        await withTimeout(
          Promise.resolve(
            supabase.from('maintenance_services').insert({
              ...service,
              user_id: currentUserId,
              created_at: newRecord.created_at,
              updated_at: newRecord.updated_at,
            })
          ),
          1200
        );
      } catch (e) {
        console.warn('[useCreateMaintenance] Salvo em cache local offline:', e);
      }

      return newRecord;
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
      const cached = localStorage.getItem('quark_maintenance_cache');
      const list: MaintenanceService[] = cached ? JSON.parse(cached) : [...SAMPLE_MAINTENANCE_SERVICES];
      const idx = list.findIndex((s) => s.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...service, updated_at: new Date().toISOString() };
        localStorage.setItem('quark_maintenance_cache', JSON.stringify(list));
      }

      try {
        await withTimeout(
          Promise.resolve(
            supabase
              .from('maintenance_services')
              .update({
                ...service,
                updated_at: new Date().toISOString(),
              })
              .eq('id', id)
          ),
          1200
        );
      } catch (e) {
        console.warn('[useUpdateMaintenance] Atualizado localmente offline:', e);
      }

      return list[idx] || service;
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
      const cached = localStorage.getItem('quark_maintenance_cache');
      const list: MaintenanceService[] = cached ? JSON.parse(cached) : [...SAMPLE_MAINTENANCE_SERVICES];
      const filtered = list.filter((s) => s.id !== id);
      localStorage.setItem('quark_maintenance_cache', JSON.stringify(filtered));

      try {
        await withTimeout(
          Promise.resolve(
            supabase
              .from('maintenance_services')
              .update({ deleted_at: new Date().toISOString() })
              .eq('id', id)
          ),
          1200
        );
      } catch (e) {}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_services'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance_stats'] });
    },
  });
}
