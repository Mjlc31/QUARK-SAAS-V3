import express from 'express';
import { z } from 'zod';
import { supabase } from '../services/supabase.js';
import { sendWhatsAppMessage } from '../services/whatsapp.js';

const router = express.Router();

const isUuid = (val) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

const createTicketSchema = z.object({
  subject: z.string().min(2, 'O assunto deve ter pelo menos 2 caracteres'),
  description: z.string().optional().default(''),
  category: z.string().optional().default('outros'),
  priority: z.string().optional().default('normal'),
  client_id: z.string().optional().nullable(),
  client_name: z.string().optional().nullable(),
  client_email: z.string().optional().nullable(),
  client_phone: z.string().optional().nullable(),
  user_id: z.string().optional().nullable(),
});

// GET /api/tickets - Lista todos os chamados
router.get('/', async (req, res) => {
  try {
    const { status, category, priority, limit = 50 } = req.query;

    let query = supabase
      .from('support_tickets')
      .select(`
        *,
        client:client_portal_users(id, name, email, phone)
      `)
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (status && status !== 'todos') {
      query = query.eq('status', status);
    }
    if (category && category !== 'todos') {
      query = query.eq('category', category);
    }
    if (priority && priority !== 'todos') {
      query = query.eq('priority', priority);
    }

    const { data, error } = await query;
    if (error) throw error;

    const tickets = (data || []).map((row) => ({
      ...row,
      client_name: row.client?.name || row.client_name || 'Cliente Sem Nome',
      client_email: row.client?.email,
      client_phone: row.client?.phone,
    }));

    res.json({ success: true, tickets });
  } catch (error) {
    console.error('[TICKETS] Erro ao listar chamados:', error);
    res.status(500).json({ success: false, error: 'Erro ao listar chamados', details: error.message });
  }
});

// GET /api/tickets/:id - Detalhes do chamado e mensagens
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: ticket, error: ticketErr } = await supabase
      .from('support_tickets')
      .select(`
        *,
        client:client_portal_users(id, name, email, phone)
      `)
      .eq('id', id)
      .maybeSingle();

    if (ticketErr) throw ticketErr;
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Chamado não encontrado' });
    }

    const { data: messages, error: msgErr } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true });

    if (msgErr) throw msgErr;

    res.json({
      success: true,
      ticket: {
        ...ticket,
        client_name: ticket.client?.name || 'Cliente',
        client_phone: ticket.client?.phone,
      },
      messages: messages || [],
    });
  } catch (error) {
    console.error('[TICKETS] Erro ao carregar chamado:', error);
    res.status(500).json({ success: false, error: 'Erro ao carregar chamado', details: error.message });
  }
});

// POST /api/tickets - Criar novo chamado
router.post('/', async (req, res) => {
  try {
    const parsed = createTicketSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        issues: parsed.error.issues,
      });
    }

    const {
      subject,
      description,
      category,
      priority,
      client_id,
      client_name,
      client_email,
      client_phone,
      user_id,
    } = parsed.data;

    let resolvedClientId = client_id;

    // Se não passou client_id mas passou email/nome, busca ou cria cliente no portal
    if (!resolvedClientId && client_email) {
      const { data: existingClient } = await supabase
        .from('client_portal_users')
        .select('id, phone')
        .eq('email', client_email.toLowerCase())
        .maybeSingle();

      if (existingClient) {
        resolvedClientId = existingClient.id;
      } else {
        const { data: newClient } = await supabase
          .from('client_portal_users')
          .insert({
            name: client_name || 'Cliente Portal',
            email: client_email.toLowerCase(),
            phone: client_phone || null,
            is_active: true,
          })
          .select('id')
          .single();
        if (newClient) resolvedClientId = newClient.id;
      }
    }

    // Cria o ticket
    const now = new Date().toISOString();
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        subject,
        description: description || null,
        category,
        priority,
        status: 'aberto',
        client_id: isUuid(resolvedClientId) ? resolvedClientId : null,
        user_id: isUuid(user_id) ? user_id : null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (ticketError) throw ticketError;

    // Cria a primeira mensagem se houver descrição
    if (description) {
      await supabase.from('ticket_messages').insert({
        ticket_id: ticket.id,
        sender_type: 'client',
        message: description,
        created_at: now,
      });
    }

    // Notificação via WhatsApp ao cliente se houver telefone cadastrado
    const targetPhone = client_phone;
    if (targetPhone) {
      const shortId = ticket.id.substring(0, 8).toUpperCase();
      const whatsappText = `Olá, ${client_name || 'Cliente'}! ⚡\n\nRecebemos o seu chamado técnico *#${shortId}*:\n📌 *Assunto:* ${subject}\n\nNossa equipe de suporte da Quark Energia já foi notificada e entrará em contato em breve.`;
      
      sendWhatsAppMessage(targetPhone, whatsappText, {
        chatName: client_name,
        io: req.app.get('io'),
      }).catch((err) => console.warn('[TICKETS] Falha no WhatsApp pós-criação:', err.message));
    }

    // Emite evento Socket.IO para o painel de atendentes
    const io = req.app.get('io');
    if (io) {
      io.emit('ticket:created', ticket);
    }

    res.status(201).json({
      success: true,
      ticket,
      message: 'Chamado aberto com sucesso',
    });
  } catch (error) {
    console.error('[TICKETS] Erro ao criar chamado:', error);
    res.status(500).json({ success: false, error: 'Erro ao registrar chamado', details: error.message });
  }
});

// POST /api/tickets/:id/messages - Adicionar mensagem a um chamado existente
router.post('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { message, sender_type = 'operator', sender_id } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Mensagem não pode ser vazia' });
    }

    // Busca o chamado e os dados do cliente
    const { data: ticket, error: ticketErr } = await supabase
      .from('support_tickets')
      .select(`
        *,
        client:client_portal_users(id, name, phone, email)
      `)
      .eq('id', id)
      .single();

    if (ticketErr || !ticket) {
      return res.status(404).json({ success: false, error: 'Chamado não encontrado' });
    }

    const now = new Date().toISOString();

    // Insere a mensagem
    const { data: newMessage, error: msgErr } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: id,
        sender_type,
        sender_id: sender_id || null,
        message: message.trim(),
        created_at: now,
      })
      .select()
      .single();

    if (msgErr) throw msgErr;

    // Atualiza updated_at do chamado
    await supabase
      .from('support_tickets')
      .update({ updated_at: now })
      .eq('id', id);

    // Se o operador respondeu, notifica o cliente via WhatsApp
    if (sender_type === 'operator' && ticket.client?.phone) {
      const shortId = ticket.id.substring(0, 8).toUpperCase();
      const whatsappText = `Olá, ${ticket.client.name || 'Cliente'}! ⚡\n\nVocê recebeu uma resposta da Quark Energia sobre o chamado *#${shortId}* (${ticket.subject}):\n\n💬 *Mensagem:* "${message.trim()}"\n\nAcesse seu portal para continuar o atendimento ou responder por aqui.`;

      sendWhatsAppMessage(ticket.client.phone, whatsappText, {
        chatName: ticket.client.name,
        io: req.app.get('io'),
      }).catch((err) => console.warn('[TICKETS] Erro ao notificar cliente via WhatsApp:', err.message));
    }

    // Emite evento Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('ticket:message', { ticket_id: id, message: newMessage });
    }

    res.status(201).json({ success: true, message: newMessage });
  } catch (error) {
    console.error('[TICKETS] Erro ao enviar mensagem no chamado:', error);
    res.status(500).json({ success: false, error: 'Erro ao enviar mensagem', details: error.message });
  }
});

// PATCH /api/tickets/:id/status - Atualizar status do chamado
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['aberto', 'em_andamento', 'aguardando_cliente', 'resolvido', 'fechado'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Status inválido. Deve ser um de: ${validStatuses.join(', ')}`,
      });
    }

    const now = new Date().toISOString();
    const updatePayload = {
      status,
      updated_at: now,
    };

    if (status === 'resolvido' || status === 'fechado') {
      updatePayload.resolved_at = now;
    }

    const { data: updatedTicket, error } = await supabase
      .from('support_tickets')
      .update(updatePayload)
      .eq('id', id)
      .select(`
        *,
        client:client_portal_users(id, name, phone)
      `)
      .single();

    if (error) throw error;

    // Notificação ao cliente se resolvido
    if ((status === 'resolvido' || status === 'fechado') && updatedTicket.client?.phone) {
      const shortId = updatedTicket.id.substring(0, 8).toUpperCase();
      const whatsappText = `Olá, ${updatedTicket.client.name || 'Cliente'}! ✅\n\nSeu chamado *#${shortId}* (${updatedTicket.subject}) foi finalizado e marcado como *Resolvido*.\n\nAgradecemos pela confiança na Quark Energia!`;

      sendWhatsAppMessage(updatedTicket.client.phone, whatsappText, {
        chatName: updatedTicket.client.name,
        io: req.app.get('io'),
      }).catch((err) => console.warn('[TICKETS] Erro ao notificar resolução via WhatsApp:', err.message));
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('ticket:updated', updatedTicket);
    }

    res.json({ success: true, ticket: updatedTicket });
  } catch (error) {
    console.error('[TICKETS] Erro ao atualizar status do chamado:', error);
    res.status(500).json({ success: false, error: 'Erro ao atualizar status', details: error.message });
  }
});

export default router;
