import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import axios from 'axios';
import NodeCache from 'node-cache';
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';
import { insertTaskIntoCalendar } from './googleCalendar.js';
import spinAgent from './spinAgent.js';
import ticketsRouter from './routes/tickets.js';
import maintenanceRouter from './routes/maintenance.js';
import trackingRouter from './routes/tracking.js';
import pointsRouter from './routes/points.js';
import telemetryRouter from './routes/telemetry.js';
import ocrRouter from './routes/ocr.js';
import prospectingRouter from './routes/prospecting.js';
import clientsRouter from './routes/clients.js';
import opportunitiesRouter from './routes/opportunities.js';
import proposalsRouter from './routes/proposals.js';
import socialRouter, { initSocialCronWorker } from './routes/social.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// ─── CORS & Body Parsers ───────────────────────────────────────────────────
const allowedOrigins = [
  'https://app.quarkenergia.com.br',
  'https://quarkenergia.com.br',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return true;
  }
  return false;
};

app.use(cors({
  origin: function (origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir arquivos de mídia e uploads estáticos
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
    methods: ['GET', 'POST'],
    credentials: true
  }
});
app.set('io', io);

// ─── Environment & Config ──────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://sumydaewtszecrvdgoku.supabase.co';
// SECURITY FIX: Using Service Role Key instead of anon/publishable key to bypass RLS in backend
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || 'sb_publishable_YSHgrXjsvOroxDokhAZavg_GBQY8Hha';
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8082';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'quark_senha_secreta_123';
const INSTANCE_NAME = 'quark';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_AI_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const evoClient = axios.create({
  baseURL: EVOLUTION_API_URL,
  headers: {
    'apikey': EVOLUTION_API_KEY,
    'Content-Type': 'application/json'
  },
  timeout: 2500
});

// ─── Memory Cache & State ─────────────────────────────────────────────────
let qrCodeData = null;
let clientReady = false;
let agentEnabled = true;
const activeContacts = new NodeCache({ stdTTL: 24 * 60 * 60, checkperiod: 60 * 60 });
const pausedContacts = new Set();

// ─── Authentication Middleware ───────────────────────────────────────────────
const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.headers['x-api-key'] || req.query.token;
  
  if (!token) {
    if (process.env.NODE_ENV !== 'production' || req.ip === '127.0.0.1' || req.ip === '::1' || req.headers.host?.includes('localhost')) {
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  // Se for a chave anônima ou token local, aceita para operações do frontend interno
  if (token === process.env.VITE_SUPABASE_ANON_KEY || token === 'offline-token') {
    return next();
  }

  // Validação real do JWT via Supabase
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) {
      req.user = user;
      return next();
    }
  } catch (_) {}

  if (process.env.NODE_ENV !== 'production' || req.headers.host?.includes('localhost')) {
    return next();
  }
  
  return res.status(401).json({ error: 'Unauthorized: Invalid token' });
};

// ─── Helper Functions ──────────────────────────────────────────────────────
function cleanPhoneNumber(number) {
  if (!number) return '';
  let cleaned = String(number).replace(/\D/g, '');
  if (cleaned.length === 10 || cleaned.length === 11) {
    if (!cleaned.startsWith('55')) cleaned = '55' + cleaned;
  }
  return cleaned;
}

function formatJid(phone) {
  const cleaned = cleanPhoneNumber(phone);
  return cleaned ? `${cleaned}@s.whatsapp.net` : phone;
}

async function sendWhatsAppMessage(number, text) {
  try {
    const cleanPhone = cleanPhoneNumber(number);
    const jid = formatJid(cleanPhone);
    console.log(`[EVOLUTION] Enviando mensagem para ${cleanPhone}...`);

    const res = await evoClient.post(`/message/sendText/${INSTANCE_NAME}`, {
      number: cleanPhone,
      text: text
    });

    console.log(`[EVOLUTION] Mensagem enviada com sucesso para ${cleanPhone}`);
    return { ok: true, data: res.data };
  } catch (err) {
    console.error(`[EVOLUTION] Erro ao enviar mensagem para ${number}:`, JSON.stringify(err.response?.data || err.message));
    return { ok: false, error: err.message };
  }
}

// ─── Rotas de Health Check & Status ─────────────────────────────────────────
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'Quark SaaS Unified Backend Engine',
    port: PORT,
    evolutionUrl: EVOLUTION_API_URL,
    whatsappConnected: clientReady,
    agentEnabled
  });
});

app.get(['/api/status', '/status'], async (req, res) => {
  let evoStatus = 'disconnected';
  try {
    const evoRes = await evoClient.get(`/instance/connectionState/${INSTANCE_NAME}`);
    evoStatus = evoRes.data?.instance?.state || 'disconnected';
    if (evoStatus === 'open') clientReady = true;
  } catch {
    evoStatus = 'disconnected';
  }

  res.json({
    ok: true,
    whatsappConnected: clientReady,
    evolutionState: evoStatus,
    agentEnabled,
    activeContacts: activeContacts.keys().length,
    qrReady: !!qrCodeData
  });
});

// ─── Rotas da Evolution API ────────────────────────────────────────────────

// 1. Checagem de Conexão
app.get(['/api/evolution/status', '/instance/connectionState', '/instance/connectionState/:instanceName'], async (req, res) => {
  const instance = req.params.instanceName || INSTANCE_NAME;
  try {
    const evoRes = await evoClient.get(`/instance/connectionState/${instance}`);
    const state = evoRes.data?.instance?.state || 'disconnected';
    if (state === 'open') clientReady = true;
    res.json(evoRes.data);
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(200).json({ instance: { state: 'close', status: 'not_created' } });
    }
    res.status(200).json({ instance: { state: 'close', error: err.message } });
  }
});

// 2. Conectar / Obter QR Code
app.post(['/api/evolution/connect', '/whatsapp/connect'], requireAuth, async (req, res) => {
  try {
    const instance = req.body?.instanceName || INSTANCE_NAME;
    console.log(`[EVOLUTION] Solicitando conexão para instância: ${instance}...`);

    // Tentar conectar instância existente
    let connectRes;
    try {
      connectRes = await evoClient.get(`/instance/connect/${instance}`);
      if (connectRes.data?.instance?.state === 'open') {
        clientReady = true;
        return res.json({ instance: { state: 'open' } });
      }
      const base64 = connectRes.data?.base64 || connectRes.data?.qrcode?.base64;
      if (base64) {
        qrCodeData = base64;
        return res.json({ base64, qrcode: { base64 } });
      }
    } catch (e) {
      // Se deu 404, precisamos criar a instância
      console.log(`[EVOLUTION] Instância não existe. Criando ${instance}...`);
    }

    // Criar instância se não existir
    const createRes = await evoClient.post('/instance/create', {
      instanceName: instance,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
      webhook: `http://192.168.0.149:${PORT}/api/evolution/webhook`,
      webhookByEvents: true,
      events: [
        'MESSAGES_UPSERT',
        'CONNECTION_UPDATE',
        'QRCODE_UPDATED'
      ]
    });

    const createData = createRes.data;
    const base64 = createData?.qrcode?.base64 || createData?.base64;
    if (base64) qrCodeData = base64;

    res.json(createData);
  } catch (error) {
    console.error('[EVOLUTION] Erro ao conectar instância:', error.response?.data || error.message);
    res.status(500).json({ error: 'Falha ao conectar à Evolution API', details: error.message });
  }
});

// 3. Enviar Mensagem via Evolution + Gravar no Supabase
app.post(['/api/evolution/send', '/whatsapp/send', '/message/sendText', '/message/sendText/:instanceName'], requireAuth, async (req, res) => {
  try {
    const phone = req.body.phone || req.body.number;
    const message = req.body.message || req.body.text || req.body.textMessage?.text;
    const chatName = req.body.chatName || req.body.name;

    if (!phone || !message) {
      return res.status(400).json({ error: 'Campos phone/number e message/text são obrigatórios' });
    }

    const cleanPhone = cleanPhoneNumber(phone);
    const chatId = formatJid(cleanPhone);

    // 1. Tentar disparo via Evolution API
    const evoResult = await sendWhatsAppMessage(cleanPhone, message);

    // 2. Gravar no Supabase com integridade
    const messageRecord = {
      id: crypto.randomUUID(),
      chat_id: chatId,
      chat_name: chatName || cleanPhone,
      from_user: 'me',
      to_user: chatId,
      from_me: true,
      body: message,
      is_group: false,
      timestamp: Math.floor(Date.now() / 1000)
    };

    const { error: dbError } = await supabase.from('whatsapp_messages').insert([messageRecord]);
    if (dbError) {
      console.warn('[SUPABASE] Aviso ao salvar mensagem enviada:', dbError.message);
    }

    // 3. Emitir via Socket.IO para sincronização instantânea
    io.emit('whatsapp_message', messageRecord);

    res.json({
      success: true,
      sentViaEvolution: evoResult.ok,
      message: messageRecord
    });
  } catch (error) {
    console.error('[EVOLUTION] Erro no envio:', error);
    res.status(500).json({ error: 'Erro interno ao enviar mensagem' });
  }
});

// 4. Logout / Desconectar
app.all(['/api/evolution/logout', '/disconnect', '/instance/logout', '/instance/logout/:instanceName'], async (req, res) => {
  const instance = req.params.instanceName || INSTANCE_NAME;
  try {
    await evoClient.delete(`/instance/logout/${instance}`);
    clientReady = false;
    qrCodeData = null;
    io.emit('whatsapp_disconnected', { reason: 'User requested logout' });
    res.json({ success: true, message: 'Instância desconectada com sucesso' });
  } catch (err) {
    console.error('[EVOLUTION] Erro no logout:', err.response?.data || err.message);
    res.status(500).json({ error: 'Falha ao desconectar instância' });
  }
});

// ─── Webhook Receptor da Evolution API ──────────────────────────────────────
app.post(['/api/evolution/webhook', '/webhook/evolution'], async (req, res) => {
  // Sempre responde 200 rápido para a Evolution API não travar nem retentar em loop
  res.status(200).send('OK');

  try {
    const payload = req.body;
    const event = payload.event || payload.type;
    const data = payload.data || payload;

    console.log(`[EVOLUTION WEBHOOK] Evento: ${event}`);

    // Evento de conexão
    if (event === 'CONNECTION_UPDATE' || event === 'connection.update') {
      const state = data?.state || data?.status;
      if (state === 'open' || state === 'connected') {
        console.log('✅ Evolution: WhatsApp CONECTADO!');
        clientReady = true;
        qrCodeData = null;
        io.emit('whatsapp_ready');
      } else if (state === 'close' || state === 'disconnected') {
        clientReady = false;
        qrCodeData = null;
        io.emit('whatsapp_disconnected');
      }
      return;
    }

    // Evento de QR Code
    if (event === 'QRCODE_UPDATED' || event === 'qrcode.updated') {
      const base64 = data?.base64 || data?.qrcode?.base64;
      if (base64) {
        qrCodeData = base64;
        io.emit('whatsapp_qr', base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`);
      }
      return;
    }

    // Evento de Mensagens
    if (event === 'MESSAGES_UPSERT' || event === 'messages.upsert') {
      const rawMessages = Array.isArray(data?.messages) ? data.messages : (data?.message ? [data] : (Array.isArray(data) ? data : [data]));

      for (const msg of rawMessages) {
        if (!msg) continue;
        if (msg.messageType === 'protocolMessage') continue;

        const key = msg.key || {};
        const remoteJid = key.remoteJid || msg.from || msg.chatId;
        if (!remoteJid) continue;

        const fromMe = key.fromMe ?? msg.fromMe ?? false;
        const isGroup = remoteJid.includes('@g.us');
        const pushName = msg.pushName || msg.chatName || remoteJid.split('@')[0];

        // Extrair texto de qualquer tipo de mensagem Baileys
        let body = '';
        const content = msg.message || msg;
        if (content.conversation) body = content.conversation;
        else if (content.extendedTextMessage?.text) body = content.extendedTextMessage.text;
        else if (content.imageMessage) body = `📸 [Imagem] ${content.imageMessage.caption || ''}`;
        else if (content.videoMessage) body = `🎥 [Vídeo] ${content.videoMessage.caption || ''}`;
        else if (content.audioMessage) body = '🎵 [Mensagem de Voz]';
        else if (content.documentMessage) body = `📄 [Documento: ${content.documentMessage.fileName || 'Arquivo'}]`;
        else if (typeof content.body === 'string') body = content.body;
        else body = '[Mídia/Mensagem]';

        console.log(`[MSG RECEBIDA] ${pushName} (${remoteJid}): ${body}`);

        const messageData = {
          id: key.id || crypto.randomUUID(),
          chat_id: remoteJid,
          chat_name: pushName,
          from_user: fromMe ? 'me' : remoteJid,
          to_user: fromMe ? remoteJid : 'me',
          from_me: fromMe,
          body: body,
          is_group: isGroup,
          timestamp: msg.messageTimestamp ? Number(msg.messageTimestamp) : Math.floor(Date.now() / 1000)
        };

        // Salvar no Supabase
        const { error: insertErr } = await supabase.from('whatsapp_messages').insert([messageData]);
        if (insertErr) {
          console.warn('[SUPABASE] Erro ao persistir mensagem recebida:', insertErr.message);
        }

        // Emitir no Socket.IO
        io.emit('whatsapp_message', messageData);

        // Agente IA Gemini SPIN Selling (apenas para mensagens recebidas de clientes)
        if (!fromMe && !isGroup && agentEnabled && !pausedContacts.has(remoteJid)) {
          activeContacts.set(remoteJid, Date.now());
          try {
            console.log(`[IA AGENT] Processando resposta para ${pushName}...`);
            const aiReply = await spinAgent.generateReply(remoteJid, pushName, body);
            if (aiReply) {
              console.log(`[IA AGENT] Resposta gerada: "${aiReply.text}"`);
              await sendWhatsAppMessage(remoteJid.split('@')[0], aiReply.text);

              const botMessage = {
                id: crypto.randomUUID(),
                chat_id: remoteJid,
                chat_name: pushName,
                from_user: 'me',
                to_user: remoteJid,
                from_me: true,
                body: aiReply.text,
                is_group: false,
                timestamp: Math.floor(Date.now() / 1000)
              };
              await supabase.from('whatsapp_messages').insert([botMessage]);
              io.emit('whatsapp_message', botMessage);
            }
          } catch (agentErr) {
            console.error('[IA AGENT] Erro ao processar:', agentErr.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('[EVOLUTION WEBHOOK] Erro ao processar payload:', error);
  }
});

// ─── Rotas do Agente de IA (SPIN Selling) ──────────────────────────────────
app.post('/agent/toggle', requireAuth, (req, res) => {
  if (req.body?.enabled !== undefined) {
    agentEnabled = Boolean(req.body.enabled);
  } else {
    agentEnabled = !agentEnabled;
  }
  io.emit('agent_status', { enabled: agentEnabled });
  res.json({ ok: true, agentEnabled });
});

app.post('/agent/on', requireAuth, (req, res) => {
  agentEnabled = true;
  io.emit('agent_status', { enabled: true });
  res.json({ ok: true, agentEnabled: true });
});

app.post('/agent/off', requireAuth, (req, res) => {
  agentEnabled = false;
  io.emit('agent_status', { enabled: false });
  res.json({ ok: true, agentEnabled: false });
});

app.post('/agent/pause/:contactId', requireAuth, (req, res) => {
  const { contactId } = req.params;
  pausedContacts.add(contactId);
  spinAgent.pauseContact(contactId);
  res.json({ ok: true, paused: true, contactId });
});

app.post('/agent/resume/:contactId', requireAuth, (req, res) => {
  const { contactId } = req.params;
  pausedContacts.delete(contactId);
  spinAgent.resumeContact(contactId);
  res.json({ ok: true, paused: false, contactId });
});

app.post('/agent/activate/:contactId', requireAuth, (req, res) => {
  const { contactId } = req.params;
  activeContacts.set(contactId, Date.now());
  pausedContacts.delete(contactId);
  res.json({ ok: true, active: true, contactId });
});

app.post('/agent/deactivate/:contactId', requireAuth, (req, res) => {
  const { contactId } = req.params;
  activeContacts.del(contactId);
  pausedContacts.add(contactId);
  res.json({ ok: true, active: false, contactId });
});

app.get('/agent/stats', (req, res) => {
  res.json(spinAgent.getStats());
});

app.get('/pricing', (req, res) => {
  res.json({ ok: true, pricing: spinAgent.getPriceTable() });
});

app.post('/agent/suggest/:contactId', requireAuth, async (req, res) => {
  try {
    const { contactId } = req.params;
    const { messages } = req.body;
    const suggestion = await spinAgent.generateSuggestionForHuman(contactId, messages || []);
    res.json({ ok: true, suggestion });
  } catch (err) {
    console.error('Erro na sugestão IA:', err);
    res.status(500).json({ error: 'Falha ao gerar sugestão com IA' });
  }
});

app.get('/agent/context/:contactId', (req, res) => {
  const { contactId } = req.params;
  res.json(spinAgent.getContactContext(contactId));
});

// ─── Notificação de Tarefas & Google Agenda ────────────────────────────────
app.post('/agent/task-notify', requireAuth, async (req, res) => {
  try {
    const { title, assignee, assigneePhone, priority, deadline, notifyWhatsapp, insertCalendar } = req.body;

    let whatsappSent = false;
    if (notifyWhatsapp && assigneePhone) {
      const timeOfDay = new Date().getHours() < 12 ? 'Bom dia' : 'Boa tarde';
      const dateText = deadline ? new Date(deadline).toLocaleDateString('pt-BR') : 'Sem data definida';
      const emoji = priority === 'High' ? '🔴 URGENTE' : priority === 'Medium' ? '🟡 Atenção' : '🟢 Informativo';
      const message = `*${timeOfDay}, ${assignee}!*\n\nVocê recebeu uma nova tarefa no Quark OS:\n\n*${emoji}: ${title}*\nPrazo: ${dateText}\n\nFavor confirmar recebimento no sistema.`;
      const result = await sendWhatsAppMessage(assigneePhone, message);
      whatsappSent = result.ok;
    }

    let calendarInserted = false;
    if (insertCalendar) {
      calendarInserted = await insertTaskIntoCalendar({ title, assignee, priority, deadline });
    }

    res.json({ ok: true, whatsappSent, calendarInserted });
  } catch (error) {
    console.error('[TASK-NOTIFY ERROR]:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});


// ─── Rotas Modulares do Quark SaaS ─────────────────────────────────────────
app.use('/api/tickets', ticketsRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/portal', trackingRouter);
app.use('/api/portal/points', pointsRouter);
app.use('/api/portal/telemetry', telemetryRouter);
app.use('/api/ocr', ocrRouter);
app.use('/api/audit', ocrRouter);
app.use('/api/utility', ocrRouter);
app.use('/api/prospeccao', prospectingRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/opportunities', opportunitiesRouter);
app.use('/api/proposals', proposalsRouter);
app.use('/api/social', socialRouter);
app.post('/api/portal/auth', (req, res) => res.json({ success: true, message: 'Portal auth ready' }));


// ─── API DE DOCUMENTOS PÚBLICOS (Assinatura Eletrônica Certificada) ──────
const handlePublicDocument = async (req, res) => {
  try {
    const { token } = req.params;
    const { action, name, cpf, signature } = req.body || {};
    if (!token) return res.status(400).json({ ok: false, error: 'Token obrigatório' });

    const sb = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    );

    // 1. Ação: Visualizar documento
    if (action === 'view') {
      try {
        await sb.rpc('view_public_document', { p_token: token });
      } catch (e) {}

      // Retorna os dados do documento para exibição inicial
      const { data: doc } = await sb.rpc('get_public_document', { p_token: token });
      if (doc) return res.json(doc);

      const { data: signer } = await sb
        .from('document_signers')
        .select('*, document:documents(*)')
        .eq('token', token)
        .maybeSingle();

      if (signer) return res.json({ document: signer.document, signer });
      return res.json({ ok: true });
    }

    // 2. Ação: Assinar documento
    if (action === 'sign') {
      const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      const clientIp = (Array.isArray(rawIp) ? rawIp[0] : String(rawIp).split(',')[0].trim()).slice(0, 64);
      const userAgent = String(req.headers['user-agent'] || '').slice(0, 300);
      const cleanName = String(name || '').trim().slice(0, 160);
      const cleanCpf = String(cpf || '').replace(/\D/g, '');

      const { data: signData, error: signErr } = await sb.rpc('sign_public_document', {
        p_token: token,
        p_name: cleanName,
        p_cpf: cleanCpf,
        p_signature: String(signature || ''),
        p_ip: clientIp,
        p_ua: userAgent,
      });

      if (!signErr && signData?.ok) {
        return res.json({ ok: true, completed: !!signData.completed, document_id: signData.document_id, data: signData });
      }

      // Fallback: update direto caso RPC não esteja ativa
      const { error: fallbackErr } = await sb
        .from('document_signers')
        .update({
          signed_at: new Date().toISOString(),
          signed_name: cleanName,
          signature_data: signature,
          ip: clientIp,
          user_agent: userAgent,
        })
        .eq('token', token);

      if (fallbackErr) {
        return res.status(400).json({ ok: false, error: fallbackErr.message || 'Falha ao assinar' });
      }

      return res.json({ ok: true, completed: true });
    }

    // 3. Consulta / Obter documento (Default ou GET)
    const { data: doc, error } = await sb.rpc('get_public_document', { p_token: token });
    if (!error && doc) {
      return res.json(doc);
    }

    const { data: signer } = await sb
      .from('document_signers')
      .select('*, document:documents(*)')
      .eq('token', token)
      .maybeSingle();

    if (signer && signer.document) {
      return res.json({ document: signer.document, signer });
    }

    return res.status(404).json({ ok: false, error: 'Documento não encontrado' });
  } catch (error) {
    console.error('[API Documentos] Erro:', error);
    res.status(500).json({ ok: false, error: 'Erro no servidor', details: error.message });
  }
};

app.get('/api/public/document/:token', handlePublicDocument);
app.post('/api/public/document/:token', handlePublicDocument);




// ─── API DE NOTIFICAÇÃO DO FRONTEND ──────────────────────────────────────
app.post('/api/notify', (req, res) => {
  const { type, id } = req.body || {};
  if (io) {
    io.emit('quark_notification', { type, id, timestamp: Date.now() });
  }
  res.json({ ok: true, received: { type, id } });
});

// ─── PROXY DE IMAGENS DE EQUIPAMENTOS (CORS-SAFE) ─────────────────────────
app.get('/api/img', async (req, res) => {
  const targetUrl = req.query.u;
  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).send('Missing image url');
  }
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return res.status(400).send('Invalid protocol');
    }
    const response = await axios.get(targetUrl, {
      responseType: 'arraybuffer',
      timeout: 6000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      }
    });
    res.setHeader('Content-Type', response.headers['content-type'] || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(response.data);
  } catch (err) {
    console.warn('[ProxyImg] Falha ao buscar imagem:', err.message);
    res.status(502).send('Error fetching image');
  }
});

// ─── API DE PROPOSTAS PÚBLICAS ──────────────────────────────────────────────
app.post('/api/public/proposal/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { action, name } = req.body;
    
    // Configura supabase do backend (com SERVICE_ROLE para bypass RLS se necessário)
    const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);
    
    if (action === 'view') {
      await sb.from('proposals').update({ status: 'visto' }).eq('public_token', token).eq('status', 'enviada');
      return res.json({ ok: true });
    }
    
    if (action === 'accept') {
      const { data, error } = await sb.rpc("accept_public_proposal", { p_token: token, p_name: name || "Cliente" });
      if (error) throw error;
      return res.json({ ok: true });
    }
    
    res.status(400).json({ error: 'Ação inválida' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});




// ─── Iniciar Servidor ──────────────────────────────────────────────────────
server.listen(PORT, async () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Quark Unified Backend running on http://localhost:${PORT}`);
  console.log(`📱 Evolution API: ${EVOLUTION_API_URL}`);
  console.log(`🤖 SPIN Selling Gemini Agent: ATIVO`);
  console.log(`======================================================\n`);

  try {
    await spinAgent.syncProductSheet();
  } catch (e) {
    console.warn('Sincronização de planilha de preços opcional falhou:', e.message);
  }

  cron.schedule('0 0 */3 * *', async () => {
    console.log('📅 Cron: atualizando tabela de preços...');
    try { await spinAgent.syncProductSheet(); } catch {}
  });

  // Social Studio Background Worker (Reels & Posts Automáticos)
  initSocialCronWorker(io);
});
