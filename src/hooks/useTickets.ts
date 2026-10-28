import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { SupportTicket, TicketMessage, TicketStatus } from '../types';

const withTimeout = <T,>(p: Promise<T>, ms = 2500): Promise<T> =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

const STORAGE_KEY_TICKETS = 'quark_support_tickets';
const STORAGE_KEY_MESSAGES = 'quark_ticket_messages';

export const SAMPLE_TICKETS: SupportTicket[] = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    client_id: 'cli_luanda_001',
    client_name: 'Dra. Luanda Vasconcelos',
    subject: 'Agendamento de limpeza semestral',
    description: 'Gostaria de agendar a limpeza técnica com água desmineralizada nos meus 14 painéis fotovoltaicos.',
    category: 'limpeza',
    priority: 'normal',
    status: 'em_andamento',
    created_at: '2026-10-18T10:30:00Z',
    updated_at: '2026-10-19T14:20:00Z'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    client_id: 'cli_clinica_002',
    client_name: 'Clínica Médica Santa Tereza',
    subject: 'Dúvida sobre compensação de créditos Equatorial',
    description: 'A fatura deste mês veio com taxa mínima mas gostaríamos de conferir o saldo acumulado de créditos.',
    category: 'financeiro',
    priority: 'alta',
    status: 'aberto',
    created_at: '2026-10-20T08:15:00Z',
    updated_at: '2026-10-20T08:15:00Z'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000003',
    client_id: 'cli_elitech_003',
    client_name: 'Academia Elitech Fit',
    subject: 'Revisão do inversor Deye 15kW',
    description: 'Aplicativo Solarman apresentou aviso de grid overvoltage no início da tarde.',
    category: 'manutencao',
    priority: 'urgente',
    status: 'aberto',
    created_at: '2026-10-20T11:00:00Z',
    updated_at: '2026-10-20T11:00:00Z'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000004',
    client_id: 'cli_haroldo_004',
    client_name: 'Haroldo Mendonça',
    subject: 'Status da vistoria técnica da Equatorial',
    description: 'O técnico da Equatorial já veio fazer a troca do medidor bidirecional?',
    category: 'homologacao',
    priority: 'normal',
    status: 'resolvido',
    resolved_at: '2026-10-17T16:00:00Z',
    created_at: '2026-10-15T09:00:00Z',
    updated_at: '2026-10-17T16:00:00Z'
  }
];

export const SAMPLE_TICKET_MESSAGES: Record<string, TicketMessage[]> = {
  'b0000000-0000-0000-0000-000000000001': [
    {
      id: 'c0000000-0000-0000-0000-000000000001',
      ticket_id: 'b0000000-0000-0000-0000-000000000001',
      sender_type: 'client',
      message: 'Olá equipe Quark, gostaria de solicitar a limpeza técnica dos meus painéis.',
      attachments: [],
      created_at: '2026-10-18T10:30:00Z'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000002',
      ticket_id: 'b0000000-0000-0000-0000-000000000001',
      sender_type: 'operator',
      message: 'Olá Dra. Luanda! Já localizamos seu cadastro de 7.7 kWp. Podemos agendar para esta sexta-feira às 09:00?',
      attachments: [],
      created_at: '2026-10-18T11:15:00Z'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000003',
      ticket_id: 'b0000000-0000-0000-0000-000000000001',
      sender_type: 'client',
      message: 'Perfeito! Sexta às 09:00 fica ótimo para mim.',
      attachments: [],
      created_at: '2026-10-18T11:45:00Z'
    }
  ],
  'b0000000-0000-0000-0000-000000000002': [
    {
      id: 'c0000000-0000-0000-0000-000000000004',
      ticket_id: 'b0000000-0000-0000-0000-000000000002',
      sender_type: 'client',
      message: 'Bom dia, gostaria de verificar o extrato detalhado de compensação de créditos na Equatorial.',
      attachments: [],
      created_at: '2026-10-20T08:15:00Z'
    }
  ],
  'b0000000-0000-0000-0000-000000000003': [
    {
      id: 'c0000000-0000-0000-0000-000000000005',
      ticket_id: 'b0000000-0000-0000-0000-000000000003',
      sender_type: 'client',
      message: 'Apareceu código de falha W03 (Overvoltage) no inversor.',
      attachments: [],
      created_at: '2026-10-20T11:00:00Z'
    }
  ],
  'b0000000-0000-0000-0000-000000000004': [
    {
      id: 'c0000000-0000-0000-0000-000000000006',
      ticket_id: 'b0000000-0000-0000-0000-000000000004',
      sender_type: 'client',
      message: 'Vistoria foi finalizada hoje pela concessionária.',
      attachments: [],
      created_at: '2026-10-17T15:30:00Z'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000007',
      ticket_id: 'b0000000-0000-0000-0000-000000000004',
      sender_type: 'operator',
      message: 'Confirmado! Medidor bidirecional ativado e sistema operando em 100%.',
      attachments: [],
      created_at: '2026-10-17T16:00:00Z'
    }
  ]
};

const getStoredTickets = (): SupportTicket[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TICKETS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(SAMPLE_TICKETS));
  return SAMPLE_TICKETS;
};

const getStoredMessages = (ticketId: string): TicketMessage[] => {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_MESSAGES}_${ticketId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  const defaultList = SAMPLE_TICKET_MESSAGES[ticketId] || [];
  localStorage.setItem(`${STORAGE_KEY_MESSAGES}_${ticketId}`, JSON.stringify(defaultList));
  return defaultList;
};

export function useTickets() {
  return useQuery({
    queryKey: ['support_tickets'],
    placeholderData: () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_TICKETS);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
      return undefined;
    },
    queryFn: async () => {
      try {
        const { data, error } = await withTimeout(
          Promise.resolve(
            supabase
              .from('support_tickets')
              .select(`
                *,
                client:client_portal_users(name)
              `)
              .order('created_at', { ascending: false })
          ),
          8000
        );

        if (error) throw error;

        if (data && data.length > 0) {
          const formatted = (data as any[]).map(row => ({
            ...row,
            client_name: row.client?.name,
          })) as SupportTicket[];
          localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(formatted));
          return formatted;
        }
        return getStoredTickets();
      } catch {
        return getStoredTickets();
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useTicketMessages(ticketId: string) {
  return useQuery({
    queryKey: ['ticket_messages', ticketId],
    queryFn: async () => {
      if (!ticketId) return [];

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketId);
      if (!isUuid) {
        return getStoredMessages(ticketId);
      }

      try {
        const { data, error } = await withTimeout(
          Promise.resolve(
            supabase
              .from('ticket_messages')
              .select('*')
              .eq('ticket_id', ticketId)
              .order('created_at', { ascending: true })
          ),
          8000
        );

        if (error) throw error;
        if (data && data.length > 0) {
          localStorage.setItem(`${STORAGE_KEY_MESSAGES}_${ticketId}`, JSON.stringify(data));
          return data as TicketMessage[];
        }
        return getStoredMessages(ticketId);
      } catch {
        return getStoredMessages(ticketId);
      }
    },
    enabled: !!ticketId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticket: Partial<SupportTicket>) => {
      const ticketId = (ticket.id && ticket.id.length === 36) ? ticket.id : crypto.randomUUID();
      const validClientId = (ticket.client_id && ticket.client_id.length === 36 && !ticket.client_id.includes('offline')) ? ticket.client_id : null;

      const newTicket: SupportTicket = {
        id: ticketId,
        client_id: validClientId || (ticket.client_id || 'client-offline'),
        client_name: ticket.client_name || 'Cliente Quark',
        subject: ticket.subject || 'Novo Chamado',
        description: ticket.description || '',
        category: ticket.category || 'outros',
        priority: ticket.priority || 'normal',
        status: 'aberto',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...ticket,
      };

      const stored = getStoredTickets();
      localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify([newTicket, ...stored]));

      try {
        const dbPayload = {
          id: ticketId,
          client_id: validClientId,
          client_name: newTicket.client_name,
          subject: newTicket.subject,
          description: newTicket.description,
          category: newTicket.category,
          priority: newTicket.priority,
          status: newTicket.status,
          created_at: newTicket.created_at,
          updated_at: newTicket.updated_at,
        };
        await withTimeout(
          Promise.resolve(supabase.from('support_tickets').insert(dbPayload)),
          8000
        );
      } catch (err) {
        console.warn('[useCreateTicket] Fallback offline:', err);
      }
      return newTicket;
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
      const stored = getStoredTickets();
      const updated = stored.map(t => {
        if (t.id === id) {
          return {
            ...t,
            status,
            updated_at: new Date().toISOString(),
            resolved_at: status === 'resolvido' || status === 'fechado' ? new Date().toISOString() : t.resolved_at
          };
        }
        return t;
      });
      localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(updated));

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        try {
          const payload: Partial<SupportTicket> = {
            status,
            updated_at: new Date().toISOString(),
          };
          if (status === 'resolvido' || status === 'fechado') {
            payload.resolved_at = new Date().toISOString();
          }

          await withTimeout(
            Promise.resolve(supabase.from('support_tickets').update(payload).eq('id', id)),
            3000
          );
        } catch {
          // offline fallback
        }
      }
      return updated.find(t => t.id === id);
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
      const ticketId = message.ticket_id || '';
      const msgId = (message.id && message.id.length === 36) ? message.id : crypto.randomUUID();
      const newMsg: TicketMessage = {
        id: msgId,
        ticket_id: ticketId,
        sender_type: message.sender_type || 'operator',
        message: message.message || '',
        attachments: message.attachments || [],
        created_at: new Date().toISOString(),
      };

      if (ticketId) {
        const msgs = getStoredMessages(ticketId);
        localStorage.setItem(`${STORAGE_KEY_MESSAGES}_${ticketId}`, JSON.stringify([...msgs, newMsg]));
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketId);
      if (isUuid) {
        try {
          await withTimeout(
            Promise.resolve(supabase.from('ticket_messages').insert(newMsg)),
            4000
          );
        } catch (err) {
          console.warn('[useAddTicketMessage] Fallback offline:', err);
        }
      }
      return newMsg;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket_messages', variables.ticket_id] });
    },
  });
}
