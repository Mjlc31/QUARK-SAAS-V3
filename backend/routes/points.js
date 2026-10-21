import express from 'express';
import { z } from 'zod';
import { supabase } from '../services/supabase.js';
import { cleanPhoneNumber, sendWhatsAppMessage } from '../services/whatsapp.js';

const router = express.Router();

export const OFFICIAL_REWARDS = [
  { id: 'limpeza_paineis', title: 'Limpeza Técnica de Painéis', points: 500, icon: 'Droplets', desc: 'Lavagem com água desmineralizada e relatório fotográfico.', value_brl: 250 },
  { id: 'desconto_fatura', title: 'Desconto de R$ 100 em Serviços', points: 300, icon: 'Tag', desc: 'Abatimento direto na contratação de manutenções ou reparos.', value_brl: 100 },
  { id: 'inspecao_termografica', title: 'Inspeção Termográfica Completa', points: 800, icon: 'ShieldCheck', desc: 'Varredura com câmera térmica FLIR para identificar hotspots.', value_brl: 450 },
  { id: 'manutencao_preventiva', title: 'Manutenção Preventiva Geral', points: 1000, icon: 'Wrench', desc: 'Revisão dos inversores, aperto de torque e conexões CA/CC.', value_brl: 350 },
  { id: 'kit_quark', title: 'Kit Exclusivo Quark Energia', points: 250, icon: 'Gift', desc: 'Garrafa térmica inox personalizada + Boné oficial Quark.', value_brl: 90 },
];

// ─── 0. Clientes conhecidos e Armazenamento em Memória (Offline-First) ────────
const FALLBACK_CLIENTS = {
  'cli_luanda_001': {
    id: 'cli_luanda_001',
    name: 'Dra. Luanda Vasconcelos',
    cpf: '105.558.774-85',
    email: 'luanda.vasconcelos@email.com',
    phone: '82998765432',
    system_size_kw: 7.7,
    quark_points: 1250,
    referral_code: 'QUARK-LUAN85',
  },
  'c1234567-89ab-cdef-0123-456789abcdef': {
    id: 'c1234567-89ab-cdef-0123-456789abcdef',
    name: 'Dra. Luanda Vasconcelos',
    cpf: '123.456.789-00',
    email: 'luanda@clinicavasconcelos.med.br',
    phone: '82988881122',
    system_size_kw: 7.7,
    quark_points: 2000,
    referral_code: 'QUARK-LUAN00',
  },
  'f87a8b42-d6c1-4b47-bce4-6338b2512345': {
    id: 'f87a8b42-d6c1-4b47-bce4-6338b2512345',
    name: 'Arthur Duda',
    cpf: '105.558.774-85',
    email: 'arthurmoraesp12@gmail.com',
    phone: '82994241835',
    system_size_kw: 6.6,
    quark_points: 1000,
    referral_code: 'QUARK-ARTH85',
  },
  'd9876543-21ba-fedc-ba98-76543210fedc': {
    id: 'd9876543-21ba-fedc-ba98-76543210fedc',
    name: 'Haroldo Mendonça',
    cpf: '321.654.987-11',
    email: 'haroldo.mendonca@gmail.com',
    phone: '82991234567',
    system_size_kw: 10.5,
    quark_points: 500,
    referral_code: 'QUARK-HARO11',
  },
};

const inMemoryBalances = new Map();
const inMemoryReferrals = new Map();
const inMemoryTransactions = new Map();
const inMemoryRedemptions = new Map();

/**
 * Resolve o registro de client_portal_users através do ID primário ou auth_user_id.
 */
async function resolveClientUser(clientId) {
  if (!clientId) return null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId);

  try {
    let query = supabase.from('client_portal_users').select('*');
    if (isUuid) {
      query = query.or(`id.eq.${clientId},auth_user_id.eq.${clientId}`);
    } else {
      query = query.eq('id', clientId);
    }

    const { data, error } = await query.maybeSingle();
    if (data) return data;
  } catch (err) {
    // offline
  }

  // Fallback para clientes conhecidos
  if (FALLBACK_CLIENTS[clientId]) {
    const base = { ...FALLBACK_CLIENTS[clientId] };
    if (inMemoryBalances.has(clientId)) {
      base.quark_points = inMemoryBalances.get(clientId);
    }
    return base;
  }

  // Gera perfil sintético se não encontrado
  const cleanCode = 'QUARK-' + String(clientId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
  const balance = inMemoryBalances.get(clientId) ?? 1000;
  return {
    id: clientId,
    name: 'Cliente Quark',
    phone: '82999990000',
    quark_points: balance,
    referral_code: cleanCode,
  };
}

// ─── 1. GET /rewards - Catálogo de Recompensas ─────────────────────────────
router.get(['/rewards', '/api/portal/points/rewards'], (req, res) => {
  res.json({
    success: true,
    rewards: OFFICIAL_REWARDS,
  });
});

// ─── 2. GET /:clientId - Saldo, Código, Indicações, Transações e Resgates ────
router.get(['/:clientId', '/api/portal/points/:clientId'], async (req, res) => {
  try {
    const { clientId } = req.params;
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'clientId é obrigatório' });
    }

    const client = await resolveClientUser(clientId);
    if (!client) {
      const fallbackCode = 'QUARK-' + String(clientId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
      return res.json({
        success: true,
        balance: 0,
        referral_code: fallbackCode,
        referrals: [],
        transactions: [],
        redemptions: [],
      });
    }

    const actualClientId = client.id;
    let referralCode = client.referral_code;

    // Se referral_code estiver vazio, gera um baseado no id (QUARK- + id[0..5].toUpperCase())
    if (!referralCode) {
      const rawCode = String(actualClientId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
      referralCode = `QUARK-${rawCode}`;
      // Persiste no banco de dados
      await supabase
        .from('client_portal_users')
        .update({ referral_code: referralCode })
        .eq('id', actualClientId);
    }

    // 1. Busca indicações
    const { data: referrals, error: refError } = await supabase
      .from('client_referrals')
      .select('*')
      .eq('referrer_client_id', actualClientId)
      .order('created_at', { ascending: false });

    if (refError) {
      console.warn('[POINTS] Erro ao buscar client_referrals:', refError.message);
    }

    // 2. Busca extrato de transações
    const { data: transactions, error: transError } = await supabase
      .from('quark_points_transactions')
      .select('*')
      .eq('client_id', actualClientId)
      .order('created_at', { ascending: false });

    if (transError) {
      console.warn('[POINTS] Erro ao buscar quark_points_transactions:', transError.message);
    }

    // 3. Busca resgates
    const { data: redemptions, error: redError } = await supabase
      .from('quark_points_redemptions')
      .select('*')
      .eq('client_id', actualClientId)
      .order('created_at', { ascending: false });

    if (redError) {
      console.warn('[POINTS] Erro ao buscar quark_points_redemptions:', redError.message);
    }

    // Mescla com cache em memória (offline-first)
    const memoryRefs = inMemoryReferrals.get(actualClientId) || [];
    const memoryTrans = inMemoryTransactions.get(actualClientId) || [];
    const memoryReds = inMemoryRedemptions.get(actualClientId) || [];

    const finalReferrals = [...memoryRefs, ...(referrals || [])];
    const finalTransactions = [...memoryTrans, ...(transactions || [])];
    const finalRedemptions = [...memoryReds, ...(redemptions || [])];

    res.json({
      success: true,
      balance: inMemoryBalances.get(actualClientId) ?? (client.quark_points || 0),
      referral_code: referralCode,
      referrals: finalReferrals,
      transactions: finalTransactions,
      redemptions: finalRedemptions,
    });
  } catch (error) {
    console.error('[POINTS] Erro ao buscar dados de pontos:', error);
    res.status(500).json({ success: false, error: 'Erro ao carregar pontos do cliente', details: error.message });
  }
});

// ─── 3. POST /:clientId/refer - Enviar Nova Indicação ────────────────────────
const referValidationSchema = z.object({
  referred_name: z.string().min(2, 'Nome do indicado deve ter pelo menos 2 caracteres'),
  referred_phone: z.string().min(8, 'Telefone do indicado é obrigatório'),
  referred_city: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

router.post(['/:clientId/refer', '/api/portal/points/:clientId/refer'], async (req, res) => {
  try {
    const { clientId } = req.params;
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'clientId é obrigatório' });
    }

    const parseResult = referValidationSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Dados de indicação inválidos',
        issues: parseResult.error.format(),
      });
    }

    const { referred_name, referred_phone, referred_city, notes } = parseResult.data;
    const clientUser = await resolveClientUser(clientId);

    if (!clientUser) {
      return res.status(404).json({ success: false, error: 'Cliente indicador não encontrado' });
    }

    const actualClientId = clientUser.id;
    const cleanReferredPhone = cleanPhoneNumber(referred_phone);
    const nowIso = new Date().toISOString();
    const leadId = `lead_ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Cria lead correspondente em `leads`
    const leadPayload = {
      id: leadId,
      data: {
        name: `Indicação: ${referred_name}`,
        phone: cleanReferredPhone,
        city: referred_city || '',
        origin: 'indicacao_portal',
        status: 'Novo',
        referrer_client_id: actualClientId,
        referrer_name: clientUser.name,
        referrer_phone: clientUser.phone,
        notes: `Indicação realizada pelo cliente ${clientUser.name} (${clientUser.phone || clientUser.email || actualClientId}). ${notes || ''}`.trim(),
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      user_id: clientUser.user_id || null,
      created_at: nowIso,
      updated_at: nowIso,
    };

    const { error: leadError } = await supabase.from('leads').insert(leadPayload);
    if (leadError) {
      console.warn('[POINTS] Aviso ao criar lead de indicação:', leadError.message);
    }

    // 2. Insere registro em `client_referrals`
    const referralRecord = {
      referrer_client_id: actualClientId,
      user_id: clientUser.user_id || null,
      referred_name: referred_name.trim(),
      referred_phone: cleanReferredPhone,
      referred_city: referred_city ? referred_city.trim() : null,
      status: 'indicado',
      reward_points: 1000,
      points_credited: false,
      lead_id: leadId,
      notes: notes ? notes.trim() : null,
      created_at: nowIso,
      updated_at: nowIso,
    };

    let referral = null;
    try {
      const { data, error: refError } = await supabase
        .from('client_referrals')
        .insert(referralRecord)
        .select()
        .single();
      if (!refError && data) referral = data;
    } catch (e) {
      console.warn('[POINTS] Supabase offline, armazenando indicação em cache:', e.message);
    }

    if (!referral) {
      referral = { ...referralRecord, id: `ref_${Date.now()}` };
    }

    // Salva em cache de memória
    const existingRefs = inMemoryReferrals.get(actualClientId) || [];
    inMemoryReferrals.set(actualClientId, [referral, ...existingRefs]);

    // 3. Envia WhatsApp de confirmação para o cliente indicador
    if (clientUser.phone) {
      const whatsappText = `Recebemos sua indicação de ${referred_name.trim()}! Assim que o projeto for instalado, seus 1.000 pontos serão creditados!`;
      sendWhatsAppMessage(clientUser.phone, whatsappText, {
        chatName: clientUser.name,
        io: req.app.get('io'),
        userId: clientUser.user_id,
      }).catch((err) => console.warn('[POINTS] Falha no WhatsApp de indicação:', err.message));
    }

    // 4. Emite Socket.IO 'referral:created'
    const io = req.app.get('io');
    if (io) {
      io.emit('referral:created', {
        clientId: actualClientId,
        referral: referral || referralRecord,
      });
    }

    res.json({
      success: true,
      referral: referral || referralRecord,
    });
  } catch (error) {
    console.error('[POINTS] Erro ao processar indicação:', error);
    res.status(500).json({ success: false, error: 'Erro interno ao processar indicação', details: error.message });
  }
});

// ─── 4. POST /:clientId/redeem - Resgate de Pontos ───────────────────────────
const redeemValidationSchema = z.object({
  reward_id: z.string().min(1, 'ID do benefício é obrigatório'),
  reward_title: z.string().min(1, 'Título do benefício é obrigatório'),
  points_spent: z.coerce.number().int().positive('Quantidade de pontos deve ser maior que zero'),
  notes: z.string().optional().nullable(),
});

router.post(['/:clientId/redeem', '/api/portal/points/:clientId/redeem'], async (req, res) => {
  try {
    const { clientId } = req.params;
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'clientId é obrigatório' });
    }

    const parseResult = redeemValidationSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Dados de resgate inválidos',
        issues: parseResult.error.format(),
      });
    }

    const { reward_id, reward_title, points_spent, notes } = parseResult.data;
    const clientUser = await resolveClientUser(clientId);

    if (!clientUser) {
      return res.status(404).json({ success: false, error: 'Cliente não encontrado' });
    }

    const actualClientId = clientUser.id;

    let newBalance = clientUser.quark_points - points_spent;
    let redemptionId = `red_${Date.now()}`;

    try {
      // Executa a função RPC no Supabase com lock atômico se disponível
      const { data: rpcResult, error: rpcError } = await supabase.rpc('redeem_quark_points', {
        p_client_id: actualClientId,
        p_reward_id: reward_id,
        p_reward_title: reward_title,
        p_points_spent: points_spent,
        p_notes: notes || null,
      });

      if (!rpcError && rpcResult) {
        newBalance = rpcResult.new_balance ?? newBalance;
        redemptionId = rpcResult.redemption_id ?? redemptionId;
      }
    } catch (rpcErr) {
      console.warn('[POINTS] Supabase offline, processando resgate em cache de memória:', rpcErr.message);
    }

    // Persiste atualização em memória
    inMemoryBalances.set(actualClientId, newBalance);
    const existingTrans = inMemoryTransactions.get(actualClientId) || [];
    inMemoryTransactions.set(actualClientId, [
      {
        id: `tx_${Date.now()}`,
        client_id: actualClientId,
        type: 'debito',
        points: points_spent,
        description: `Resgate: ${reward_title}`,
        created_at: new Date().toISOString(),
      },
      ...existingTrans,
    ]);

    const existingReds = inMemoryRedemptions.get(actualClientId) || [];
    inMemoryRedemptions.set(actualClientId, [
      {
        id: redemptionId,
        client_id: actualClientId,
        reward_id,
        reward_title,
        points_spent,
        status: 'solicitado',
        notes: notes || null,
        created_at: new Date().toISOString(),
      },
      ...existingReds,
    ]);

    // Se for serviço, notifica o cliente via WhatsApp confirmando o agendamento
    const isService = /limpeza|manuten|inspe|reparo|tecnica/i.test(`${reward_id} ${reward_title}`);
    if (clientUser.phone) {
      let clientMsg;
      if (isService) {
        clientMsg = `Olá, ${clientUser.name}! 🎉\n\nRecebemos seu resgate do benefício *${reward_title}* utilizando ${points_spent} Quark Points!\n\nNossa equipe técnica entrará em contato para agendar o serviço no seu endereço. Saldo atual: *${newBalance} pontos*.`;
      } else {
        clientMsg = `Olá, ${clientUser.name}! 🎉\n\nRecebemos seu resgate de *${reward_title}* utilizando ${points_spent} Quark Points! Saldo atual: *${newBalance} pontos*.`;
      }

      sendWhatsAppMessage(clientUser.phone, clientMsg, {
        chatName: clientUser.name,
        io: req.app.get('io'),
        userId: clientUser.user_id,
      }).catch((err) => console.warn('[POINTS] Falha no WhatsApp de resgate:', err.message));
    }

    // Emite evento Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('points:redeemed', {
        clientId: actualClientId,
        reward_id,
        reward_title,
        points_spent,
        new_balance: newBalance,
        redemption_id: redemptionId,
      });
    }

    res.json({
      success: true,
      new_balance: newBalance,
      redemption_id: redemptionId,
    });
  } catch (error) {
    console.error('[POINTS] Erro ao resgatar pontos:', error);
    res.status(500).json({ success: false, error: 'Erro interno ao processar resgate', details: error.message });
  }
});

export default router;
