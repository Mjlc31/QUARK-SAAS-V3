import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { SupportTicket, TicketMessage, TicketStatus } from '../types';

export function useTickets() {
  return useQuery({
    queryKey: ['support_tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          client:client_portal_users(name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data as any[]).map(row => ({
        ...row,
        client_name: row.client?.name,
      })) as SupportTicket[];
    },
  });
}

export function useTicketMessages(ticketId: string) {
  return useQuery({
    queryKey: ['ticket_messages', ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      return data as TicketMessage[];
    },
    enabled: !!ticketId,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticket: Partial<SupportTicket>) => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          ...ticket,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support_tickets'] });
    },
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TicketStatus }) => {
      const payload: Partial<SupportTicket> = {
        status,
        updated_at: new Date().toISOString(),
      };
      
      if (status === 'resolvido' || status === 'fechado') {
        payload.resolved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('support_tickets')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support_tickets'] });
    },
  });
}

export function useAddTicketMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: Partial<TicketMessage>) => {
      const { data, error } = await supabase
        .from('ticket_messages')
        .insert({
          ...message,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket_messages', variables.ticket_id] });
    },
  });
}
