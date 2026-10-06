import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { ProjectTrackingPhase, ProjectPhase } from '../types';

export function useProjectTracking(projectId: string) {
  return useQuery({
    queryKey: ['project_tracking', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('project_tracking')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userAuth.user.id)
        .order('started_at', { ascending: true });

      if (error) throw error;
      return data as ProjectTrackingPhase[];
    },
    enabled: !!projectId,
  });
}

export function useCreateTrackingPhase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (phase: Omit<ProjectTrackingPhase, 'id' | 'user_id' | 'started_at'>) => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('project_tracking')
        .insert({
          ...phase,
          user_id: userAuth.user.id,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
        
      if (error) throw error;
      return data as ProjectTrackingPhase;
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
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const { id, ...updateData } = phase;

      const { data, error } = await supabase
        .from('project_tracking')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userAuth.user.id)
        .select()
        .single();

      if (error) throw error;
      return data as ProjectTrackingPhase;
    },
    onSuccess: (data) => {
      if (data?.project_id) {
        queryClient.invalidateQueries({ queryKey: ['project_tracking', data.project_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['project_tracking'] });
    },
  });
}

export function useAdvancePhase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ currentPhaseId, projectId, nextPhase, nextPhaseLabel }: { currentPhaseId: string, projectId: string, nextPhase: ProjectPhase, nextPhaseLabel: string }) => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const userId = userAuth.user.id;
      const now = new Date().toISOString();

      // 1. Set current phase completed_at to NOW and is_current to false
      const { error: updateError } = await supabase
        .from('project_tracking')
        .update({
          completed_at: now,
          is_current: false
        })
        .eq('id', currentPhaseId)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // 2. Create the next phase as is_current true
      const { data: newPhase, error: insertError } = await supabase
        .from('project_tracking')
        .insert({
          project_id: projectId,
          user_id: userId,
          phase: nextPhase,
          phase_label: nextPhaseLabel,
          started_at: now,
          is_current: true
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 3. Automated Follow-up (Automação de Obras)
      try {
        const { data: project } = await supabase.from('opportunities').select('phone, title').eq('id', projectId).single();
        if (project && project.phone && project.phone.length > 8) {
            const message = `Olá ${project.title || 'Cliente'}! 🏗️ Sua obra acaba de avançar!\n\nNova etapa atual: *${nextPhaseLabel}*.\n\nAcompanhe os detalhes em tempo real pelo seu Portal do Cliente.`;
            
            await fetch('/api/evolution/send', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ number: project.phone, text: message })
            });
            console.log(`[Automação Obras] Notificação enviada para ${project.phone}`);
        }
      } catch (err) {
        console.error('Erro na automação de avanço de obra:', err);
      }

      return newPhase as ProjectTrackingPhase;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project_tracking', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project_tracking'] });
    },
  });
}

export function useActiveProjectsTracking() {
  return useQuery({
    queryKey: ['project_tracking', 'active'],
    queryFn: async () => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      // We join opportunities with project_tracking
      const { data, error } = await supabase
        .from('project_tracking')
        .select(`
          *,
          opportunities (
            id, title, value, pipeline_stage, phone, email, client_name
          )
        `)
        .eq('user_id', userAuth.user.id)
        .eq('is_current', true);

      if (error) throw error;
      return data;
    },
  });
}
