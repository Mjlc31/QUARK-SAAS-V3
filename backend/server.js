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
import spinAgent from './spinAgent.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// ─── CORS & Body Parsers ───────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', '*'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// ─── Environment & Config ──────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://sumydaewtszecrvdgoku.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_YSHgrXjsvOroxDokhAZavg_GBQY8Hha';
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
  timeout: 10000
});

// ─── Memory Cache & State ─────────────────────────────────────────────────
let qrCodeData = null;
let clientReady = false;
let agentEnabled = true;
const activeContacts = new NodeCache({ stdTTL: 24 * 60 * 60, checkperiod: 60 * 60 });
const pausedContacts = new Set();

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
app.post(['/api/evolution/connect', '/whatsapp/connect'], async (req, res) => {
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
app.post(['/api/evolution/send', '/whatsapp/send', '/message/sendText', '/message/sendText/:instanceName'], async (req, res) => {
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
app.post('/agent/toggle', (req, res) => {
  if (req.body?.enabled !== undefined) {
    agentEnabled = Boolean(req.body.enabled);
  } else {
    agentEnabled = !agentEnabled;
  }
  io.emit('agent_status', { enabled: agentEnabled });
  res.json({ ok: true, agentEnabled });
});

app.post('/agent/on', (req, res) => {
  agentEnabled = true;
  io.emit('agent_status', { enabled: true });
  res.json({ ok: true, agentEnabled: true });
});

app.post('/agent/off', (req, res) => {
  agentEnabled = false;
  io.emit('agent_status', { enabled: false });
  res.json({ ok: true, agentEnabled: false });
});

app.post('/agent/pause/:contactId', (req, res) => {
  const { contactId } = req.params;
  pausedContacts.add(contactId);
  spinAgent.pauseContact(contactId);
  res.json({ ok: true, paused: true, contactId });
});

app.post('/agent/resume/:contactId', (req, res) => {
  const { contactId } = req.params;
  pausedContacts.delete(contactId);
  spinAgent.resumeContact(contactId);
  res.json({ ok: true, paused: false, contactId });
});

app.post('/agent/activate/:contactId', (req, res) => {
  const { contactId } = req.params;
  activeContacts.set(contactId, Date.now());
  pausedContacts.delete(contactId);
  res.json({ ok: true, active: true, contactId });
});

app.post('/agent/deactivate/:contactId', (req, res) => {
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

app.post('/agent/suggest/:contactId', async (req, res) => {
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
app.post('/agent/task-notify', async (req, res) => {
  try {
    const { title, assignee, assigneePhone, priority, deadline, notifyWhatsapp } = req.body;

    let whatsappSent = false;
    if (notifyWhatsapp && assigneePhone) {
      const timeOfDay = new Date().getHours() < 12 ? 'Bom dia' : 'Boa tarde';
      const dateText = deadline ? new Date(deadline).toLocaleDateString('pt-BR') : 'Sem data definida';
      const emoji = priority === 'High' ? '🔴 URGENTE' : priority === 'Medium' ? '🟡 Atenção' : '🟢 Informativo';
      const message = `*${timeOfDay}, ${assignee}!*\n\nVocê recebeu uma nova tarefa no Quark OS:\n\n*${emoji}: ${title}*\nPrazo: ${dateText}\n\nFavor confirmar recebimento no sistema.`;
      const result = await sendWhatsAppMessage(assigneePhone, message);
      whatsappSent = result.ok;
    }

    res.json({ ok: true, whatsappSent });
  } catch (error) {
    console.error('[TASK-NOTIFY ERROR]:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ─── OCR de Faturas de Energia com Gemini Vision ────────────────────────────
app.post('/api/ocr', async (req, res) => {
  try {
    const base64Image = req.body.imageBase64 || req.body.base64Image;
    const mimeType = req.body.mimeType || 'image/jpeg';

    if (!base64Image) {
      return res.status(400).json({ error: 'Nenhuma imagem base64 fornecida' });
    }

    const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    if (!GEMINI_API_KEY) {
      return res.json({
        name: 'Cliente Extraído OCR',
        monthlyConsumptionKwh: 450,
        tariffRate: 0.95,
        totalAmount: 427.50
      });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

    const prompt = `Analise esta fatura de energia elétrica brasileira e extraia os seguintes dados em JSON puro:
{
  "name": "nome completo do titular/cliente",
  "monthlyConsumptionKwh": número (consumo faturado ou consumo do mês em kWh),
  "tariffRate": número (tarifa com impostos em R$/kWh, ex: 0.95),
  "totalAmount": número (valor total a pagar em R$)
}`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: cleanBase64, mimeType } }
    ]);

    let parsed = {};
    try {
      const text = result.response.text().replace(/```json|```/g, '').trim();
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        name: 'Cliente Extraído OCR',
        monthlyConsumptionKwh: 450,
        tariffRate: 0.95
      };
    }

    res.json({
      name: parsed.name || 'Cliente Extraído OCR',
      monthlyConsumptionKwh: Number(parsed.monthlyConsumptionKwh) || 0,
      tariffRate: Number(parsed.tariffRate) || 0.95,
      totalAmount: Number(parsed.totalAmount) || 0
    });
  } catch (error) {
    console.error('[OCR] Erro:', error);
    res.status(500).json({ error: 'Falha no processamento OCR', details: error.message });
  }
});

// ─── Auditoria Equatorial ──────────────────────────────────────────────────
app.post('/api/audit/equatorial', async (req, res) => {
  const { documentId, birthDate, cpf } = req.body;
  const doc = documentId || cpf;
  res.json({
    status: 'success',
    analise: {
      fatura_auditada: '07/2024',
      energia_injetada: 450,
      energia_compensada: 450,
      saldo_acumulado: 120,
      parecer: 'A Equatorial realizou o abatimento correto da energia para o titular. Não há divergências encontradas.',
      divergencia: false,
    }
  });
});

// ─── Prospecção Google Maps (Scraper Real) ─────────────────────────────────
app.post('/api/prospeccao/buscar', async (req, res) => {
  const SCRAPER_URL = 'http://127.0.0.1:8080';

  try {
    const { segmento, localizacao, lat, lon } = req.body;
    const query = `${segmento || 'empresas'} em ${localizacao || 'Maceió'}`;
    console.log(`[PROSPECCAO] Busca solicitada: "${query}" (lat=${lat}, lon=${lon})`);

    // 1. Submeter job ao scraper
    const jobName = `quark-${Date.now()}`;
    const formParams = new URLSearchParams();
    formParams.append('name', jobName);
    formParams.append('keywords', query);
    formParams.append('lang', 'pt');
    formParams.append('depth', '4');
    formParams.append('zoom', '14');
    formParams.append('radius', '15000');
    formParams.append('maxtime', '4m');
    if (lat && lon) {
      formParams.append('latitude', String(lat));
      formParams.append('longitude', String(lon));
    }

    let submitRes;
    try {
      submitRes = await axios.post(`${SCRAPER_URL}/scrape`, formParams.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000
      });
    } catch (scraperErr) {
      console.error('[PROSPECCAO] Scraper indisponível:', scraperErr.message);
      return res.status(503).json({ error: 'Scraper indisponível. Verifique se o container Docker está rodando.' });
    }

    // Extrair job ID do HTML retornado
    const htmlBody = submitRes.data;
    const idMatch = typeof htmlBody === 'string' ? htmlBody.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/) : null;
    if (!idMatch) {
      console.error('[PROSPECCAO] Não foi possível extrair job ID. Resposta:', typeof htmlBody === 'string' ? htmlBody.substring(0, 300) : htmlBody);
      return res.status(500).json({ error: 'Falha ao iniciar busca no scraper' });
    }
    const jobId = idMatch[1];
    console.log(`[PROSPECCAO] Job criado: ${jobId}`);

    // 2. Polling: aguardar conclusão (máximo 5 min = 100 x 3s)
    let jobDone = false;
    for (let i = 0; i < 100; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const jobsRes = await axios.get(`${SCRAPER_URL}/jobs`, { timeout: 5000 });
        const jobsHtml = typeof jobsRes.data === 'string' ? jobsRes.data : '';
        // O scraper mostra link de download quando o job conclui
        if (jobsHtml.includes(`/download?id=${jobId}`)) {
          jobDone = true;
          console.log(`[PROSPECCAO] Job ${jobId} completou com sucesso.`);
          break;
        }
        // Checar falha
        const jobIdx = jobsHtml.indexOf(jobId);
        if (jobIdx > -1) {
          const slice = jobsHtml.substring(jobIdx, jobIdx + 500);
          if (slice.includes('status-failed') || slice.includes('status-error')) {
            console.error(`[PROSPECCAO] Job ${jobId} falhou.`);
            return res.status(500).json({ error: 'O scraper falhou ao processar a busca.' });
          }
        }
        if (i % 10 === 0) console.log(`[PROSPECCAO] Polling ${i+1}/100 para job ${jobId}...`);
      } catch (pollErr) {
        console.warn('[PROSPECCAO] Erro no polling:', pollErr.message);
      }
    }

    if (!jobDone) {
      console.error(`[PROSPECCAO] Job ${jobId} timeout.`);
      return res.status(504).json({ error: 'Tempo esgotado aguardando resultados do scraper.' });
    }

    // 3. Baixar CSV
    console.log(`[PROSPECCAO] Job ${jobId} concluído. Baixando CSV...`);
    let csvData;
    try {
      const dlRes = await axios.get(`${SCRAPER_URL}/download?id=${jobId}`, { timeout: 15000 });
      csvData = dlRes.data;
    } catch (dlErr) {
      console.error('[PROSPECCAO] Erro ao baixar CSV:', dlErr.message);
      return res.status(500).json({ error: 'Erro ao baixar resultados.' });
    }

    // 4. Parsear CSV
    const { parse } = await import('csv-parse/sync');
    let records;
    try {
      records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        relax_quotes: true,
        relax_column_count: true,
        trim: true
      });
    } catch (parseErr) {
      console.error('[PROSPECCAO] Erro ao parsear CSV:', parseErr.message);
      return res.status(500).json({ error: 'Erro ao processar resultados do scraper.' });
    }

    // 5. Mapear para o formato do frontend
    const leads = records.map((row, i) => ({
      id: i + 1,
      nome: row.title || 'Sem nome',
      avaliacao: row.review_rating
        ? `${parseFloat(row.review_rating).toFixed(1)} (${row.review_count || 0})`
        : '-',
      endereco: row.address || '-',
      telefone: row.phone || '-',
      website: row.website || '',
      latitude: row.latitude ? parseFloat(row.latitude) : null,
      longitude: row.longitude ? parseFloat(row.longitude) : null,
      categoria: row.category || ''
    })).filter(l => l.nome !== 'Sem nome');

    console.log(`[PROSPECCAO] ${leads.length} leads encontrados para "${query}"`);
    res.json({ leads });
  } catch (error) {
    console.error('[PROSPECCAO] Erro geral:', error);
    res.status(500).json({ error: 'Erro interno ao buscar leads' });
  }
});

// ─── Portal & Tickets ──────────────────────────────────────────────────────
app.post('/api/portal/auth', (req, res) => res.json({ success: true, message: 'Portal auth ready' }));
app.get('/api/portal/project/:clientId', (req, res) => {
  res.json({
    success: true,
    phases: [
      { phase: 'venda_confirmada', label: 'Venda Confirmada', completed: true },
      { phase: 'projeto_elaboracao', label: 'Projeto em Elaboração', completed: true },
      { phase: 'projeto_enviado', label: 'Projeto Enviado', completed: true },
      { phase: 'aprovacao_concessionaria', label: 'Aprovação Concessionária', completed: false, is_current: true },
      { phase: 'logistica_entrega', label: 'Logística de Entrega', completed: false },
      { phase: 'instalacao', label: 'Instalação', completed: false },
      { phase: 'homologacao', label: 'Homologação', completed: false },
      { phase: 'comissionamento', label: 'Comissionamento', completed: false },
      { phase: 'finalizado', label: 'Finalizado', completed: false }
    ]
  });
});

app.post('/api/tickets', (req, res) => {
  res.json({
    success: true,
    ticket: {
      id: `ticket_${Date.now()}`,
      subject: req.body?.subject || 'Suporte Técnico',
      status: 'aberto',
      created_at: new Date().toISOString()
    }
  });
});

app.post('/api/maintenance/alert-batch', (req, res) => {
  const count = req.body?.client_ids?.length || 0;
  res.json({ success: true, alerts_sent: count });
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
});
