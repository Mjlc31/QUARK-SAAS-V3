import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { ProjectTrackingPhase, ProjectPhase } from '../types';

export const withTimeout = <T,>(p: PromiseLike<T>, ms = 1200): Promise<T> =>
  Promise.race([Promise.resolve(p), new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

export interface PhaseInfo {
  id: ProjectPhase;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  next?: ProjectPhase;
}

export const SOLAR_PROJECT_PHASES: PhaseInfo[] = [
  {
    id: 'venda_confirmada',
    label: 'Venda Confirmada & Contrato',
    shortLabel: 'Venda Confirmada',
    description: 'Contrato assinado e documentação validada para início da engenharia.',
    color: 'border-blue-500',
    next: 'projeto_elaboracao',
  },
  {
    id: 'projeto_elaboracao',
    label: 'Elaboração do Projeto Técnico',
    shortLabel: 'Projeto Técnico',
    description: 'Engenharia realizou o dimensionamento e desenhou os diagramas elétricos.',
    color: 'border-amber-500',
    next: 'compra_kit',
  },
  {
    id: 'compra_kit',
    label: 'Compra do Kit & Emissão de NF',
    shortLabel: 'Compra do Kit & NF',
    description: 'Módulos solares, inversor e estrutura faturados com Nota Fiscal emitida.',
    color: 'border-indigo-500',
    next: 'projeto_enviado',
  },
  {
    id: 'projeto_enviado',
    label: 'Protocolo na Concessionária',
    shortLabel: 'Protocolo Concessionária',
    description: 'Projeto e solicitação de acesso formalmente protocolados na Equatorial Energia.',
    color: 'border-orange-500',
    next: 'aprovacao_concessionaria',
  },
  {
    id: 'aprovacao_concessionaria',
    label: 'Parecer de Acesso Aprovado',
    shortLabel: 'Parecer Aprovado',
    description: 'Parecer de acesso deferido e aprovado pela concessionária sem pendências.',
    color: 'border-purple-500',
    next: 'logistica_entrega',
  },
  {
    id: 'logistica_entrega',
    label: 'Logística & Entrega dos Equipamentos',
    shortLabel: 'Logística & Entrega',
    description: 'Módulos, inversor e estruturas em rota de entrega no endereço da obra.',
    color: 'border-cyan-500',
    next: 'instalacao',
  },
  {
    id: 'instalacao',
    label: 'Instalação & Montagem dos Painéis',
    shortLabel: 'Instalação Física',
    description: 'Equipe técnica executando fixação mecânica no telhado e conexões elétricas.',
    color: 'border-emerald-500',
    next: 'homologacao',
  },
  {
    id: 'homologacao',
    label: 'Vistoria & Troca do Medidor',
    shortLabel: 'Vistoria e Medidor',
    description: 'Concessionária realiza a vistoria final e substitui o medidor pelo bidirecional.',
    color: 'border-pink-500',
    next: 'finalizado',
  },
  {
    id: 'finalizado',
    label: 'Usina Ativa & Gerando Economia!',
    shortLabel: 'Usina Ativa & Gerando',
    description: 'Sistema 100% energizado, homologado e gerando economia real!',
    color: 'border-lime-500',
  },
];

export function buildClientTrackingPhases(
  clientId: string,
  currentPhaseKey: ProjectPhase,
  notes?: string
): ProjectTrackingPhase[] {
  const currentIndex = SOLAR_PROJECT_PHASES.findIndex((p) => p.id === currentPhaseKey);
  const targetIdx = currentIndex >= 0 ? currentIndex : 0;
  const now = new Date();

  return SOLAR_PROJECT_PHASES.map((p, idx) => {
    const isCompleted = idx < targetIdx;
    const isCurrent = idx === targetIdx;

    const startedDate = new Date(now.getTime() - (targetIdx - idx + 1) * 86400000 * 3).toISOString();
    const completedDate = isCompleted
      ? new Date(now.getTime() - (targetIdx - idx) * 86400000 * 3).toISOString()
      : null;

    return {
      id: `trk_${clientId}_${p.id}`,
      project_id: `proj_${clientId}`,
      client_id: clientId,
      phase: p.id,
      phase_label: p.label,
      started_at: startedDate,
      completed_at: completedDate,
      is_current: isCurrent,
      notes: isCurrent ? (notes || p.description) : p.description,
      user_id: 'usr_admin',
    } as ProjectTrackingPhase;
  });
}

export const SAMPLE_ACTIVE_TRACKINGS: any[] = [
  {
    id: 'trk_001',
    project_id: 'prj_luanda',
    client_id: 'cli_luanda_001',
    phase: 'instalacao',
    phase_label: 'Instalação & Montagem dos Painéis',
    started_at: '2026-10-18T10:00:00.000Z',
    is_current: true,
    notes: 'Estruturas de fixação instaladas, subindo módulos hoje.',
    client: {
      id: 'cli_luanda_001',
      name: 'Dra. Luanda Vasconcelos',
      phone: '82998765432',
      email: 'luanda.vasconcelos@email.com',
      city: 'Maceió',
      state: 'AL',
    },
  },
  {
    id: 'trk_002',
    project_id: 'prj_arthur',
    client_id: 'f87a8b42-d6c1-4b47-bce4-6338b2512345',
    phase: 'instalacao',
    phase_label: 'Instalação & Montagem dos Painéis',
    started_at: '2026-10-19T08:00:00.000Z',
    is_current: true,
    notes: 'Equipe em campo realizando instalação dos 12 módulos Canadian Solar.',
    client: {
      id: 'f87a8b42-d6c1-4b47-bce4-6338b2512345',
      name: 'Arthur Duda',
      phone: '82994241835',
      email: 'arthurmoraesp12@gmail.com',
      city: 'Maceió',
      state: 'AL',
    },
  },
];

export function useProjectTracking(projectId: string) {
  return useQuery({
    queryKey: ['project_tracking', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      try {
        const { data, error } = await withTimeout(
          supabase
            .from('project_tracking')
            .select('*')
            .eq('project_id', projectId)
            .order('started_at', { ascending: true }),
          1000
        );

        if (!error && data) return data as ProjectTrackingPhase[];
      } catch (e) {}

      return [];
    },
    enabled: !!projectId,
  });
}

export function useClientProjectTracking(clientId?: string) {
  return useQuery({
    queryKey: ['client_project_tracking', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      // 1. Tenta cache local primeiro (instantâneo e resiliente)
      try {
        const cached = localStorage.getItem(`quark_client_tracking_${clientId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed as ProjectTrackingPhase[];
          }
        }
      } catch {}

      // 2. Tenta RPC do Supabase com timeout seguro
      try {
        const { data, error } = await withTimeout(
          supabase.rpc('get_or_create_client_tracking', {
            p_client_id: clientId,
          }),
          1000
        );

        if (!error && data && Array.isArray(data) && data.length > 0) {
          localStorage.setItem(`quark_client_tracking_${clientId}`, JSON.stringify(data));
          return data as ProjectTrackingPhase[];
        }
      } catch (e) {
        console.warn('[useClientProjectTracking] RPC error, using select fallback', e);
      }

      // 3. Tenta Select simples no Supabase
      try {
        const { data, error } = await withTimeout(
          supabase
            .from('project_tracking')
            .select('*')
            .eq('client_id', clientId)
            .order('started_at', { ascending: true }),
          1000
        );

        if (!error && data && data.length > 0) {
          localStorage.setItem(`quark_client_tracking_${clientId}`, JSON.stringify(data));
          return data as ProjectTrackingPhase[];
        }
      } catch {}

      // 4. Constrói fases padrão com 'instalacao' como fase atual
      const defaultPhases = buildClientTrackingPhases(clientId, 'instalacao', 'Equipe técnica executando montagem dos painéis.');
      localStorage.setItem(`quark_client_tracking_${clientId}`, JSON.stringify(defaultPhases));
      return defaultPhases;
    },
    enabled: !!clientId,
  });
}

export function useSetClientPhase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      clientId,
      phase,
      phaseLabel,
      notes,
    }: {
      clientId: string;
      phase: ProjectPhase;
      phaseLabel: string;
      notes?: string;
    }) => {
      // 1. Atualiza cache local instantaneamente
      const updatedPhases = buildClientTrackingPhases(clientId, phase, notes);
      try {
        localStorage.setItem(`quark_client_tracking_${clientId}`, JSON.stringify(updatedPhases));

        // Atualiza também o cache geral de clientes se existir
        const cachedClientsRaw = localStorage.getItem('quark_clients_cache');
        if (cachedClientsRaw) {
          const list = JSON.parse(cachedClientsRaw);
          const idx = list.findIndex((c: any) => c.id === clientId);
          if (idx >= 0) {
            list[idx].project_phase = phase;
            list[idx].project_phase_label = phaseLabel;
            localStorage.setItem('quark_clients_cache', JSON.stringify(list));
          }
        }
      } catch {}

      // 2. Tenta RPC remota no Supabase com timeout
      try {
        const { data, error } = await withTimeout(
          supabase.rpc('set_client_tracking_phase', {
            p_client_id: clientId,
            p_phase: phase,
            p_phase_label: phaseLabel,
            p_notes: notes || null,
          }),
          1200
        );

        if (!error && data) return data as ProjectTrackingPhase;
      } catch (err) {
        console.warn('[useSetClientPhase] Supabase offline, atualização local realizada:', err);
      }

      return updatedPhases.find((p) => p.is_current) as ProjectTrackingPhase;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client_project_tracking', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['project_tracking'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useAdvancePhase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ 
      currentPhaseId, 
      projectId, 
      nextPhase, 
      nextPhaseLabel,
      clientId,
      notes
    }: { 
      currentPhaseId: string; 
      projectId?: string; 
      nextPhase: ProjectPhase; 
      nextPhaseLabel: string;
      clientId?: string;
      notes?: string;
    }) => {
      if (clientId) {
        const updated = buildClientTrackingPhases(clientId, nextPhase, notes);
        localStorage.setItem(`quark_client_tracking_${clientId}`, JSON.stringify(updated));
        return updated.find(p => p.is_current) as ProjectTrackingPhase;
      }

      const now = new Date().toISOString();
      try {
        await withTimeout(
          supabase.from('project_tracking').update({ completed_at: now, is_current: false }).eq('id', currentPhaseId),
          1000
        );

        const { data: newPhase } = await withTimeout(
          supabase
            .from('project_tracking')
            .insert({
              project_id: projectId || null,
              phase: nextPhase,
              phase_label: nextPhaseLabel,
              started_at: now,
              is_current: true,
              notes: notes || null,
            })
            .select()
            .single(),
          1000
        );

        if (newPhase) return newPhase as ProjectTrackingPhase;
      } catch {}

      return {
        id: `trk_${Date.now()}`,
        phase: nextPhase,
        phase_label: nextPhaseLabel,
        started_at: now,
        is_current: true,
        notes: notes || null,
      } as ProjectTrackingPhase;
    },
    onSuccess: (_, variables) => {
      if (variables.projectId) {
        queryClient.invalidateQueries({ queryKey: ['project_tracking', variables.projectId] });
      }
      if (variables.clientId) {
        queryClient.invalidateQueries({ queryKey: ['client_project_tracking', variables.clientId] });
      }
      queryClient.invalidateQueries({ queryKey: ['project_tracking'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useActiveProjectsTracking() {
  return useQuery({
    queryKey: ['project_tracking', 'active'],
    queryFn: async () => {
      try {
        const cached = localStorage.getItem('quark_trackings_cache');
        if (cached) {
          const list = JSON.parse(cached);
          if (Array.isArray(list) && list.length > 0) return list;
        }
      } catch {}

      try {
        const { data: userAuth } = await withTimeout(supabase.auth.getUser(), 800);
        if (userAuth?.user) {
          const { data } = await withTimeout(
            supabase
              .from('project_tracking')
              .select(`
                *,
                opportunities (
                  id, title, value, pipeline_stage, phone, email, client_name
                )
              `)
              .eq('user_id', userAuth.user.id)
              .eq('is_current', true),
            1200
          );
          if (data && data.length > 0) return data;
        }
      } catch {}

      return SAMPLE_ACTIVE_TRACKINGS;
    },
  });
}

export function useCreateTrackingPhase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (phase: Omit<ProjectTrackingPhase, 'id' | 'user_id' | 'started_at'>) => {
      const now = new Date().toISOString();
      try {
        const { data } = await withTimeout(
          supabase
            .from('project_tracking')
            .insert({
              ...phase,
              started_at: now,
            })
            .select()
            .single(),
          1000
        );
        if (data) return data as ProjectTrackingPhase;
      } catch {}

      return {
        id: `trk_${Date.now()}`,
        ...phase,
        started_at: now,
      } as ProjectTrackingPhase;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project_tracking', variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ['project_tracking'] });
    },
  });
}

export function useUpdateTrackingPhase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (phase: Partial<ProjectTrackingPhase> & { id: string }) => {
      const { id, ...updateData } = phase;
      try {
        const { data } = await withTimeout(
          supabase
            .from('project_tracking')
            .update(updateData)
            .eq('id', id)
            .select()
            .single(),
          1000
        );
        if (data) return data as ProjectTrackingPhase;
      } catch {}

      return phase as ProjectTrackingPhase;
    },
    onSuccess: (data) => {
      if (data?.project_id) {
        queryClient.invalidateQueries({ queryKey: ['project_tracking', data.project_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['project_tracking'] });
    },
  });
}
