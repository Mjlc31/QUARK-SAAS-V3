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
      return newPhase as ProjectTrackingPhase;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project_tracking', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project_tracking'] });
    },
  });
}
