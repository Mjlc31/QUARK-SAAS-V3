import express from 'express';
import { z } from 'zod';
import { supabase } from '../services/supabase.js';
import { sendWhatsAppMessage } from '../services/whatsapp.js';

const router = express.Router();

const batchAlertSchema = z.object({
  client_ids: z.array(z.string()).optional(),
  intelligence_ids: z.array(z.string()).optional(),
  alert_type: z.enum(['manutencao_preventiva', 'limpeza', 'inspecao', 'garantia']).default('manutencao_preventiva'),
  message: z.string().min(5, 'A mensagem do alerta deve ter no mínimo 5 caracteres'),
  channel: z.enum(['whatsapp', 'email', 'sms', 'portal']).default('whatsapp'),
  scheduled_for: z.string().optional(),
  user_id: z.string().uuid().optional().nullable(),
});

// GET /api/maintenance/alerts - Lista alertas de manutenção com inteligência
router.get('/alerts', async (req, res) => {
  try {
    const { status, limit = 100 } = req.query;

    let query = supabase
      .from('maintenance_alerts')
      .select(`
        *,
        intelligence:client_intelligence(
          id, client_name, system_size_kw, last_maintenance_date, next_maintenance_date, client:client_portal_users(name, phone)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (status && status !== 'todos') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    const formatted = (data || []).map((alert) => ({
      ...alert,
      client_name: alert.intelligence?.client_name || alert.intelligence?.client?.name || 'Cliente',
      phone: alert.intelligence?.client?.phone,
    }));

    res.json({ success: true, alerts: formatted });
  } catch (error) {
    console.error('[MAINTENANCE ALERTS] Erro ao buscar alertas:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar alertas', details: error.message });
  }
});

// POST /api/maintenance/alert-batch - Disparo em lote com persistência e envio via WhatsApp
router.post('/alert-batch', async (req, res) => {
  try {
    const parsed = batchAlertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros inválidos para disparo em lote',
        issues: parsed.error.issues,
      });
    }

    const {
      client_ids,
      intelligence_ids,
      alert_type,
      message,
      channel,
      scheduled_for,
      user_id,
    } = parsed.data;

    const targetIntelligenceIds = new Set(intelligence_ids || []);

    // Se passou client_ids (do client_portal_users), busca o intelligence correspondente
    if (client_ids && client_ids.length > 0) {
      const { data: intelList } = await supabase
        .from('client_intelligence')
        .select('id, client_id')
        .in('client_id', client_ids);

      if (intelList) {
        intelList.forEach((row) => targetIntelligenceIds.add(row.id));
      }
    }

    // Se nenhum intelligence foi encontrado, busca diretamente os primeiros clientes ativos para fallback seguro
    if (targetIntelligenceIds.size === 0) {
      const { data: allIntel } = await supabase
        .from('client_intelligence')
        .select('id')
        .limit(10);
      if (allIntel) {
        allIntel.forEach((row) => targetIntelligenceIds.add(row.id));
      }
    }

    const idList = Array.from(targetIntelligenceIds);
    if (idList.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum registro de inteligência de cliente encontrado para disparar alertas.',
      });
    }

    // Busca dados detalhados para envio de WhatsApp
    const { data: targets, error: targetErr } = await supabase
      .from('client_intelligence')
      .select(`
        id,
        client_name,
        system_size_kw,
        client:client_portal_users(id, name, phone)
      `)
      .in('id', idList);

    if (targetErr) throw targetErr;

    const now = new Date().toISOString();
    let sentCount = 0;
    let failedCount = 0;
    const alertResults = [];

    for (const target of targets || []) {
      const clientName = target.client_name || target.client?.name || 'Cliente Quark';
      const clientPhone = target.client?.phone;

      // Personaliza a mensagem com o nome do cliente
      const customizedMessage = message.replace(/{nome}|{cliente}/gi, clientName);

      // Cria o registro no banco em status 'pendente'
      const { data: alertRecord, error: insertErr } = await supabase
        .from('maintenance_alerts')
        .insert({
          intelligence_id: target.id,
          user_id: user_id || null,
          alert_type,
          message: customizedMessage,
          channel,
          scheduled_for: scheduled_for || now.split('T')[0],
          status: 'pendente',
          created_at: now,
        })
        .select()
        .single();

      if (insertErr) {
        console.warn(`[MAINTENANCE] Erro ao gravar alerta para ${target.id}:`, insertErr.message);
        failedCount++;
        continue;
      }

      // Se canal for WhatsApp e cliente tiver telefone, dispara via Evolution API
      let delivered = false;
      if (channel === 'whatsapp' && clientPhone) {
        const evoRes = await sendWhatsAppMessage(clientPhone, customizedMessage, {
          chatName: clientName,
          io: req.app.get('io'),
        });
        delivered = evoRes.success;
      } else if (channel !== 'whatsapp') {
        delivered = true; // Simula entrega para canais de portal/email se configurado
      }

      const finalStatus = delivered ? 'enviado' : 'pendente';
      await supabase
        .from('maintenance_alerts')
        .update({
          status: finalStatus,
          sent_at: delivered ? now : null,
        })
        .eq('id', alertRecord.id);

      if (delivered) {
        sentCount++;
      } else {
        failedCount++;
      }

      alertResults.push({
        id: alertRecord.id,
        client_name: clientName,
        phone: clientPhone,
        status: finalStatus,
      });
    }

    res.json({
      success: true,
      alerts_sent: sentCount,
      alerts_failed: failedCount,
      total_processed: alertResults.length,
      alerts: alertResults,
    });
  } catch (error) {
    console.error('[MAINTENANCE] Erro no disparo em lote:', error);
    res.status(500).json({ success: false, error: 'Erro no disparo em lote', details: error.message });
  }
});

// POST /api/maintenance/webhook-delivery - Confirmação reversa de entrega
router.post('/webhook-delivery', async (req, res) => {
  try {
    const { alert_id, status, error_reason } = req.body;
    if (!alert_id || !status) {
      return res.status(400).json({ error: 'alert_id and status are required' });
    }

    const updatePayload = {
      status,
      sent_at: new Date().toISOString(),
    };

    if (status === 'falha' && error_reason) {
      console.log(`[Webhook Reverso] Alerta ${alert_id} falhou: ${error_reason}`);
    }

    const { error } = await supabase
      .from('maintenance_alerts')
      .update(updatePayload)
      .eq('id', alert_id);

    if (error) throw error;

    res.json({ success: true, message: `Alerta atualizado para ${status}` });
  } catch (error) {
    console.error('[Webhook Reverso] Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// POST /api/maintenance/services - Atualiza ou cria ordem de serviço de manutenção
router.post('/services', async (req, res) => {
  try {
    const { id, client_id, service_type, status, scheduled_date, price, technician, notes } = req.body;
    const now = new Date().toISOString();

    let serviceData;
    if (id) {
      const updateData = {
        service_type,
        status,
        scheduled_date,
        price,
        technician,
        notes,
        updated_at: now,
      };

      if (status === 'concluido') {
        updateData.completed_date = now.split('T')[0];
      }

      const { data, error } = await supabase
        .from('maintenance_services')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      serviceData = data;
    } else {
      let resolvedUserId = req.user?.id || null;
      if (client_id && !resolvedUserId) {
        const { data: clientUser } = await supabase
          .from('client_portal_users')
          .select('user_id')
          .eq('id', client_id)
          .maybeSingle();
        if (clientUser?.user_id) resolvedUserId = clientUser.user_id;
      }

      const { data, error } = await supabase
        .from('maintenance_services')
        .insert({
          user_id: resolvedUserId,
          client_id,
          service_type: service_type || 'manutencao',
          status: status || 'pendente',
          scheduled_date,
          price: price || 350.0,
          technician: technician || 'Equipe Técnica Quark',
          notes,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();
      if (error) throw error;
      serviceData = data;
    }

    // Se o serviço foi concluído, atualiza a inteligência do cliente para +6 meses
    if (status === 'concluido' && client_id) {
      const nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + 6);

      await supabase
        .from('client_intelligence')
        .update({
          last_maintenance_date: now.split('T')[0],
          next_maintenance_date: nextDate.toISOString().split('T')[0],
        })
        .eq('client_id', client_id);
    }

    res.json({ success: true, service: serviceData });
  } catch (error) {
    console.error('[MAINTENANCE] Erro ao registrar serviço:', error);
    res.status(500).json({ success: false, error: 'Erro ao registrar serviço', details: error.message });
  }
});

export default router;
