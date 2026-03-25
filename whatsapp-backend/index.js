require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');
const spinAgent = require('./spinAgent');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const axios = require('axios');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// ─── Express + Socket.io ───────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

// ─── Evolution Go Config ───────────────────────────────────────────────────
const EVOLUTION_API_URL = 'http://localhost:8080';
const EVOLUTION_API_KEY = 'quark_senha_secreta_123';
const INSTANCE_NAME = 'quark';

const evoClient = axios.create({
    baseURL: EVOLUTION_API_URL,
    headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
    }
});

// ─── State ────────────────────────────────────────────────────────────────
let qrCodeData = null;
let clientReady = false;
let agentEnabled = false;
const activeContacts = new Set();

// ─── Persistência de Bot Status ───────────────────────────────────────────
async function saveBotStatus(contactId, status) {
    if (!supabase) return;
    try {
        const id = contactId.replace('@s.whatsapp.net', '').replace('@c.us', '');
        const { data: lead } = await supabase.from('leads').select('data').eq('id', id).single();
        if (lead) {
            const newData = { ...lead.data, bot_status: status };
            await supabase.from('leads').update({ data: newData }).eq('id', id);
        }
    } catch (err) {
        console.error('Erro ao salvar bot_status:', err.message);
    }
}

async function loadBotStates() {
    if (!supabase) return;
    try {
        const { data: leads } = await supabase.from('leads').select('id, data');
        if (leads) {
            leads.forEach(lead => {
                const status = lead.data?.bot_status;
                if (!status) return;
                const chatId = lead.id + '@s.whatsapp.net';
                if (status === 'active') { activeContacts.add(chatId); spinAgent.resumeContact(chatId); }
                else if (status === 'paused') { activeContacts.add(chatId); spinAgent.pauseContact(chatId); }
            });
        }
    } catch (err) { /* Supabase opcional */ }
}
loadBotStates();

// ─── Envio de mensagem via Evolution Go ──────────────────────────────────
async function sendWhatsAppMessage(number, text) {
    try {
        let num = number
            .replace('@s.whatsapp.net', '')
            .replace('@c.us', '')
            .replace(/\D/g, '');
        await evoClient.post(`/message/sendText`, {
            instanceName: INSTANCE_NAME,
            number: num,
            text
        });
        return true;
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error?.response?.data || error.message);
        return false;
    }
}

// ─── Polling para buscar QR code (Evolution Go não faz push automático) ──
let qrPollingInterval = null;

async function startQRPolling() {
    if (qrPollingInterval) clearInterval(qrPollingInterval);
    console.log('⏳ Iniciando polling de QR Code...');
    
    qrPollingInterval = setInterval(async () => {
        if (clientReady) {
            clearInterval(qrPollingInterval);
            qrPollingInterval = null;
            return;
        }
        try {
            // Tenta buscar o QR code da instância
            const { data } = await evoClient.get(`/instance/${INSTANCE_NAME}/qrcode`);
            if (data?.base64 && data.base64 !== qrCodeData) {
                qrCodeData = data.base64;
                // Garante que começa com data:image/
                const qrToSend = qrCodeData.startsWith('data:') ? qrCodeData : `data:image/png;base64,${qrCodeData}`;
                io.emit('whatsapp_qr', qrToSend);
                console.log('📱 QR Code atualizado e emitido para o frontend.');
            }

            // Verifica se conectou
            const { data: status } = await evoClient.get(`/instance/${INSTANCE_NAME}/status`);
            if (status?.status === 'connected' || status?.connected === true) {
                console.log('✅ WhatsApp CONECTADO via Evolution Go!');
                clientReady = true;
                qrCodeData = null;
                io.emit('whatsapp_ready');
                clearInterval(qrPollingInterval);
                qrPollingInterval = null;
            }
        } catch (e) {
            // Silencioso — a instância pode estar inicializando
        }
    }, 3000);
}

// ─── Inicializa ou Reconecta a Instância ─────────────────────────────────
async function initInstance() {
    try {
        console.log('🔄 Inicializando instância Evolution Go...');

        // 1. Tenta verificar se a instância já existe pelo status
        try {
            const { data: status } = await evoClient.get(`/instance/${INSTANCE_NAME}/status`);
            if (status?.status === 'connected' || status?.connected === true) {
                console.log('✅ Instância já conectada!');
                clientReady = true;
                io.emit('whatsapp_ready');
                return;
            }
        } catch (e) {
            // Instância não existe ainda — vamos criar
        }

        // 2. Cria a instância
        try {
            await evoClient.post('/instance/create', { instanceName: INSTANCE_NAME });
            console.log(`🆕 Instância "${INSTANCE_NAME}" criada.`);
        } catch (createErr) {
            // Já existe ou outro erro — não é crítico, seguimos
            const msg = createErr?.response?.data?.message || createErr.message;
            console.log(`⚠️  Create: ${msg}`);
        }

        // 3. Começa polling para buscar o QR
        await startQRPolling();

    } catch (err) {
        console.error('Erro ao iniciar instância:', err?.response?.data || err.message);
    }
}

// ─── REST Endpoints ──────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
    let evoStatus = 'disconnected';
    try {
        const { data } = await evoClient.get(`/instance/${INSTANCE_NAME}/status`);
        evoStatus = (data?.status === 'connected' || data?.connected) ? 'connected' : 'waiting';
    } catch (e) {}
    res.json({ status: 'ok', whatsapp: evoStatus, hasQR: !!qrCodeData });
});

app.get('/status', (req, res) => {
    res.json({ whatsapp: clientReady, agent: agentEnabled, qr: !!qrCodeData });
});

app.post('/whatsapp/connect', async (req, res) => {
    clientReady = false;
    qrCodeData = null;
    await initInstance();
    res.json({ status: 'connecting' });
});

app.post('/disconnect', async (req, res) => {
    try {
        if (qrPollingInterval) { clearInterval(qrPollingInterval); qrPollingInterval = null; }
        await evoClient.delete(`/instance/${INSTANCE_NAME}`);
        clientReady = false;
        qrCodeData = null;
        io.emit('whatsapp_disconnected', { reason: 'Manual logout' });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/agent/toggle', (req, res) => {
    agentEnabled = !agentEnabled;
    io.emit('agent_status', { enabled: agentEnabled });
    console.log(`🤖 Agente IA ${agentEnabled ? 'LIGADO ✅' : 'DESLIGADO 🔴'}`);
    res.json({ agent: agentEnabled });
});

app.post('/agent/on', (req, res) => { agentEnabled = true; io.emit('agent_status', { enabled: true }); res.json({ agent: true }); });
app.post('/agent/off', (req, res) => { agentEnabled = false; io.emit('agent_status', { enabled: false }); res.json({ agent: false }); });

app.post('/agent/pause/:contactId', (req, res) => {
    const id = decodeURIComponent(req.params.contactId);
    spinAgent.pauseContact(id); saveBotStatus(id, 'paused');
    io.emit('contact_paused', { contactId: id, paused: true });
    res.json({ ok: true, paused: true });
});

app.post('/agent/resume/:contactId', (req, res) => {
    const id = decodeURIComponent(req.params.contactId);
    spinAgent.resumeContact(id); saveBotStatus(id, 'active');
    io.emit('contact_paused', { contactId: id, paused: false });
    res.json({ ok: true, paused: false });
});

app.post('/agent/activate/:contactId', (req, res) => {
    const id = decodeURIComponent(req.params.contactId);
    activeContacts.add(id); spinAgent.resumeContact(id); saveBotStatus(id, 'active');
    io.emit('contact_activated', { contactId: id, active: true });
    res.json({ ok: true, active: true });
});

app.post('/agent/deactivate/:contactId', (req, res) => {
    const id = decodeURIComponent(req.params.contactId);
    activeContacts.delete(id); saveBotStatus(id, null);
    io.emit('contact_activated', { contactId: id, active: false });
    res.json({ ok: true, active: false });
});

app.get('/agent/stats', (req, res) => res.json(spinAgent.getStats()));
app.get('/pricing', (req, res) => res.json({ ok: true, pricing: spinAgent.getPriceTable() }));

app.post('/agent/suggest/:contactId', async (req, res) => {
    try {
        const { messages } = req.body;
        const suggestion = await spinAgent.generateSuggestionForHuman(messages);
        res.json({ ok: true, suggestion });
    } catch (err) { res.status(500).json({ error: 'Falha ao gerar sugestão' }); }
});

app.get('/agent/context/:contactId', (req, res) => {
    const id = decodeURIComponent(req.params.contactId);
    res.json({ ok: true, context: spinAgent.getContactContext(id) || null });
});

// ─── Evolution Go WEBHOOK ────────────────────────────────────────────────
app.post('/webhook/evolution', async (req, res) => {
    try {
        const payload = req.body;
        const event = payload.event || payload.type;
        const data = payload.data || payload;

        console.log(`🔔 Webhook recebido: ${event}`);

        // Evento de conexão/QR
        if (event === 'CONNECTION_UPDATE' || event === 'connection.update') {
            const state = data?.state || data?.status;
            const base64 = data?.base64 || data?.qr;

            if (state === 'open' || state === 'connected') {
                console.log('✅ Evolution: WhatsApp CONECTADO!');
                clientReady = true; qrCodeData = null;
                if (qrPollingInterval) { clearInterval(qrPollingInterval); qrPollingInterval = null; }
                io.emit('whatsapp_ready');
            } else if (base64) {
                qrCodeData = base64;
                const qrToSend = qrCodeData.startsWith('data:') ? qrCodeData : `data:image/png;base64,${qrCodeData}`;
                io.emit('whatsapp_qr', qrToSend);
                console.log('📱 QR Code recebido via webhook.');
            } else if (state === 'close' || state === 'disconnected') {
                clientReady = false; qrCodeData = null;
                io.emit('whatsapp_disconnected', { reason: data?.statusReason });
            }
        }

        // Evento de mensagem
        if (event === 'MESSAGES_UPSERT' || event === 'messages.upsert') {
            const msg = data?.messages?.[0] || data?.message || data;
            if (!msg) return res.status(200).send('Ignored');

            const key = msg.key || msg;
            const remoteJid = key.remoteJid || msg.from || msg.chatId;
            if (!remoteJid) return res.status(200).send('No JID');

            const fromMe = key.fromMe || msg.fromMe || false;
            const isGroup = remoteJid.includes('@g.us');
            const senderName = msg.pushName || msg.chatName || remoteJid.split('@')[0];

            let finalBody = '';
            const msgContent = msg.message || msg;
            if (msgContent?.conversation) finalBody = msgContent.conversation;
            else if (msgContent?.extendedTextMessage?.text) finalBody = msgContent.extendedTextMessage.text;
            else if (msgContent?.imageMessage) finalBody = `📸 [Imagem] ${msgContent.imageMessage.caption || ''}`;
            else if (msgContent?.videoMessage) finalBody = `🎥 [Vídeo] ${msgContent.videoMessage.caption || ''}`;
            else if (msgContent?.audioMessage) finalBody = `🎵 [Mensagem de Voz]`;
            else if (typeof msg.body === 'string') finalBody = msg.body;
            else finalBody = '📄 [Mídia/Arquivo]';

            const messageData = {
                id: key.id || msg.id,
                body: finalBody,
                from_user: fromMe ? 'me' : remoteJid,
                to_user: fromMe ? remoteJid : 'me',
                chat_id: remoteJid,
                from_me: fromMe,
                timestamp: msg.messageTimestamp || Math.floor(Date.now() / 1000),
                chat_name: senderName,
                is_group: isGroup,
            };

            io.emit('whatsapp_message', {
                ...messageData,
                chatId: messageData.chat_id,
                fromMe: messageData.from_me,
                chatName: messageData.chat_name,
                isGroup: messageData.is_group,
            });

            supabase?.from('whatsapp_messages').insert([messageData]).then(({ error }) => {
                if (error && error.code !== '42P01') console.warn('Supabase insert error:', error.message);
            });

            if (!fromMe && !isGroup && agentEnabled && activeContacts.has(remoteJid)) {
                if (!spinAgent.isContactPaused(remoteJid)) {
                    if (msgContent?.imageMessage || msgContent?.audioMessage || msgContent?.videoMessage) {
                        await sendWhatsAppMessage(remoteJid, 'Desculpe, como sou o assistente virtual da Quark, ainda não consigo ver imagens ou ouvir áudios 😅. Poderia me enviar por escrito?');
                    } else {
                        try {
                            const aiReply = await spinAgent.generateReply(remoteJid, senderName, finalBody);
                            if (aiReply) {
                                await sendWhatsAppMessage(remoteJid, aiReply);
                                console.log(`🤖 SPIN reply enviado para ${senderName}`);
                            }
                        } catch (err) { console.error('SPIN Agent error:', err.message); }
                    }
                }
            }
        }

        res.status(200).send('OK');
    } catch (err) {
        console.error('Webhook error:', err);
        res.status(500).send('Error');
    }
});

// ─── Socket.io ────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log(`📡 Dashboard connected: ${socket.id}`);
    socket.emit('agent_status', { enabled: agentEnabled });
    socket.emit('active_contacts_sync', { contacts: Array.from(activeContacts) });

    if (clientReady) {
        socket.emit('whatsapp_ready');
    } else if (qrCodeData) {
        const qrToSend = qrCodeData.startsWith('data:') ? qrCodeData : `data:image/png;base64,${qrCodeData}`;
        socket.emit('whatsapp_qr', qrToSend);
    } else {
        // Auto-inicia a conexão ao abrir o dashboard
        initInstance();
    }

    socket.on('generate_qr', async () => {
        clientReady = false;
        qrCodeData = null;
        await initInstance();
    });

    socket.on('send_message', async ({ number, message }) => {
        if (!clientReady) return socket.emit('whatsapp_error', { message: 'WhatsApp não conectado.' });
        const success = await sendWhatsAppMessage(number, message);
        if (!success) socket.emit('whatsapp_error', { message: 'Falha ao enviar mensagem.' });
    });

    socket.on('disconnect', () => console.log(`📡 Dashboard disconnected: ${socket.id}`));
});

// ─── Tarefas e Google Agenda ──────────────────────────────────────────────
app.post('/agent/task-notify', async (req, res) => {
    const { title, assignee, assigneePhone, priority, deadline, notifyWhatsapp, insertCalendar } = req.body;

    let whatsappSent = false;
    if (notifyWhatsapp && clientReady && assigneePhone) {
        const timeOfDay = new Date().getHours() < 12 ? 'Bom dia' : 'Boa tarde';
        const dateText = deadline ? new Date(deadline).toLocaleDateString('pt-BR') : 'Sem data definida';
        const emoji = priority === 'High' ? '🔴 URGENTE' : priority === 'Medium' ? '🟡 Atenção' : '🟢 Informativo';
        const message = `*${timeOfDay}, ${assignee}!*\n\nVocê recebeu uma nova tarefa no Quark OS:\n\n*${emoji}: ${title}*\nPrazo: ${dateText}\n\nFavor confirmar recebimento no sistema.`;
        whatsappSent = await sendWhatsAppMessage(assigneePhone, message);
    }

    let calendarSuccess = false;
    let calendarError = 'Arquivo google-credentials.json não encontrado';
    if (insertCalendar !== false) {
        try {
            const credPath = path.join(__dirname, 'google-credentials.json');
            if (fs.existsSync(credPath)) {
                const auth = new google.auth.GoogleAuth({ keyFile: credPath, scopes: ['https://www.googleapis.com/auth/calendar.events'] });
                const calendarAuth = await auth.getClient();
                const calendar = google.calendar({ version: 'v3', auth: calendarAuth });
                const eventDate = deadline ? new Date(deadline) : new Date();
                const dateStr = eventDate.toISOString().split('T')[0];
                await calendar.events.insert({
                    calendarId: 'vendas.quarkenergia@gmail.com',
                    resource: {
                        summary: `[QUARK] ${title} - ${assignee}`,
                        description: `Tarefa gerada pelo Quark OS\nPrioridade: ${priority}\nResponsável: ${assignee}`,
                        start: { date: dateStr }, end: { date: dateStr },
                    },
                });
                calendarSuccess = true; calendarError = null;
            }
        } catch (err) { calendarError = err.message; }
    }

    res.json({ ok: true, whatsappSent, calendarSuccess, calendarError });
});

// ─── Start Server ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
    console.log(`\n🚀 Quark WhatsApp Backend running on http://localhost:${PORT}\n`);
    await spinAgent.syncProductSheet();
    cron.schedule('0 0 */3 * *', async () => {
        console.log('📅 Cron: sincronizando tabela de preços...');
        await spinAgent.syncProductSheet();
    });
});
