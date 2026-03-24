require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');
const spinAgent = require('./spinAgent');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// ─── Express + Socket.io ───────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

// ─── Health endpoint ────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        whatsapp: clientReady ? 'connected' : 'waiting',
        hasQR: !!qrCodeData
    });
});

// ─── State ───────────────────────────────────────────────────────────────────
let qrCodeData = null;
let clientReady = false;

// 🤖 Agent toggle — starts OFF by default for safety
let agentEnabled = false;

// ✅ Per-contact opt-in: bot só responde quem você ATIVAR explicitamente
const activeContacts = new Set();

// ─── Funções de Persistência ────────────────────────────────────────────────
async function saveBotStatus(contactId, status) {
    if (!supabase) return;
    try {
        const id = contactId.replace('@c.us', '');
        // Buscar o lead atual
        const { data: lead } = await supabase.from('leads').select('data').eq('id', id).single();
        if (lead) {
            const newData = { ...lead.data, bot_status: status };
            await supabase.from('leads').update({ data: newData }).eq('id', id);
        }
    } catch (err) {
        console.error('Erro ao salvar bot_status no Supabase:', err.message);
    }
}

async function loadBotStates() {
    if (!supabase) return;
    try {
        const { data: leads } = await supabase.from('leads').select('id, data');
        if (leads) {
            let activeCount = 0;
            let pausedCount = 0;
            leads.forEach(lead => {
                const status = lead.data?.bot_status;
                if (!status) return;
                const chatId = lead.id + '@c.us';
                if (status === 'active') {
                    activeContacts.add(chatId);
                    spinAgent.resumeContact(chatId);
                    activeCount++;
                } else if (status === 'paused') {
                    activeContacts.add(chatId);
                    spinAgent.pauseContact(chatId);
                    pausedCount++;
                }
            });
            console.log(`✅ Loaded Bot States from CRM: ${activeCount} active, ${pausedCount} paused`);
        }
    } catch (err) {
        console.error('Erro ao carregar bot_status:', err.message);
    }
}

// Carregar estados no boot (ou quando ligar)
loadBotStates();

// Cache para evitar loop de auto-reply (contactId → timestamp)
const autoReplyCache = new Map();

const AUTO_REPLY_COOLDOWN_MS = 1000 * 60 * 60 * 12; // 12 horas

// ─── REST Endpoints ───────────────────────────────────────────────────────────

// Status geral
app.get('/status', (req, res) => {
    res.json({ whatsapp: clientReady, agent: agentEnabled, qr: !!qrCodeData });
});

// Liga/desliga o agente IA
app.post('/agent/toggle', (req, res) => {
    agentEnabled = !agentEnabled;
    io.emit('agent_status', { enabled: agentEnabled });
    console.log(`🤖 Agente IA ${agentEnabled ? 'LIGADO ✅' : 'DESLIGADO 🔴'}`);
    res.json({ agent: agentEnabled });
});

app.post('/agent/on', (req, res) => {
    agentEnabled = true;
    io.emit('agent_status', { enabled: true });
    console.log('🤖 Agente IA LIGADO ✅');
    res.json({ agent: true });
});

app.post('/agent/off', (req, res) => {
    agentEnabled = false;
    io.emit('agent_status', { enabled: false });
    console.log('🤖 Agente IA DESLIGADO 🔴');
    res.json({ agent: false });
});

// Desconectar WhatsApp
app.post('/disconnect', async (req, res) => {
    try {
        await client.logout();
        clientReady = false;
        qrCodeData = null;
        io.emit('whatsapp_disconnected', { reason: 'Manual logout' });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Pausar agente para um contato específico (vendedor assume)
app.post('/agent/pause/:contactId', (req, res) => {
    const id = decodeURIComponent(req.params.contactId);
    spinAgent.pauseContact(id);
    saveBotStatus(id, 'paused');
    io.emit('contact_paused', { contactId: id, paused: true });
    res.json({ ok: true, paused: true, contactId: id });
});

// Retomar agente para um contato
app.post('/agent/resume/:contactId', (req, res) => {
    const id = decodeURIComponent(req.params.contactId);
    spinAgent.resumeContact(id);
    saveBotStatus(id, 'active');
    io.emit('contact_paused', { contactId: id, paused: false });
    res.json({ ok: true, paused: false, contactId: id });
});

// Ativar agente para um contato específico (opt-in)
app.post('/agent/activate/:contactId', (req, res) => {
    const id = decodeURIComponent(req.params.contactId);
    activeContacts.add(id);
    spinAgent.resumeContact(id); // garante que não está pausado
    saveBotStatus(id, 'active');
    io.emit('contact_activated', { contactId: id, active: true });
    console.log(`✅ Agente ATIVADO para: ${id}`);
    res.json({ ok: true, active: true, contactId: id });
});

// Desativar agente para um contato
app.post('/agent/deactivate/:contactId', (req, res) => {
    const id = decodeURIComponent(req.params.contactId);
    activeContacts.delete(id);
    saveBotStatus(id, null);
    io.emit('contact_activated', { contactId: id, active: false });
    console.log(`🔴 Agente DESATIVADO para: ${id}`);
    res.json({ ok: true, active: false, contactId: id });
});

// Stats do funil de conversas
app.get('/agent/stats', (req, res) => {
    res.json(spinAgent.getStats());
});

// Tabela de preços atualizada da planilha (para o Calculator do frontend)
app.get('/pricing', (req, res) => {
    res.json({ ok: true, pricing: spinAgent.getPriceTable() });
});

// Sugestão de IA lendo o histórico real
app.post('/agent/suggest/:contactId', async (req, res) => {
    try {
        const { messages } = req.body;
        const suggestion = await spinAgent.generateSuggestionForHuman(messages);
        res.json({ ok: true, suggestion });
    } catch (err) {
        console.error('Erro na rota de suggestion:', err.message);
        res.status(500).json({ error: 'Falha ao gerar sugestão' });
    }
});

// Resgatar os dados avançados da memória do Agente (fase, valor da conta, cidade)
app.get('/agent/context/:contactId', (req, res) => {
    const id = decodeURIComponent(req.params.contactId);
    const context = spinAgent.getContactContext(id);
    if (!context) {
        return res.json({ ok: true, context: null });
    }
    res.json({ ok: true, context });
});



// ─── WhatsApp Client ─────────────────────────────────────────────────────────
console.log('🟡 Starting WhatsApp Client...');

const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'quark-energia' }),
    puppeteer: {
        // Hardened flags for Windows / Docker / CI environments
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1280,800',
            '--disable-extensions',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--no-first-run',
            '--no-zygote',
            '--deterministic-fetch',
        ],
        headless: true,
        timeout: 60000,
    },
    // Increase timeouts for slow networks
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1017491294-alpha.html',
    }
});

// ─── WhatsApp Events ─────────────────────────────────────────────────────────
client.on('qr', (qr) => {
    console.log('📲 QR RECEIVED — scan with your phone now!');
    qrCodeData = qr;
    clientReady = false;
    io.emit('whatsapp_qr', qr);
});

client.on('loading_screen', (percent, message) => {
    console.log(`⏳ Loading: ${percent}% — ${message}`);
    io.emit('whatsapp_loading', { percent, message });
});

client.on('authenticated', () => {
    console.log('🔐 Authenticated — session saved.');
    io.emit('whatsapp_authenticated');
});

client.on('auth_failure', (msg) => {
    console.error('❌ Auth failure:', msg);
    qrCodeData = null;
    clientReady = false;
    io.emit('whatsapp_auth_failure', { message: msg });
});

client.on('ready', () => {
    console.log('✅ WhatsApp Client READY — connected & operational!');
    qrCodeData = null;
    clientReady = true;
    io.emit('whatsapp_ready');
});

client.on('disconnected', (reason) => {
    console.warn('⚠️  Client disconnected:', reason);
    qrCodeData = null;
    clientReady = false;
    io.emit('whatsapp_disconnected', { reason });

    // Auto-restart after a short delay
    setTimeout(() => {
        console.log('🔄 Attempting to re-initialize WhatsApp client...');
        client.initialize().catch(err => console.error('Re-init error:', err));
    }, 5000);
});

client.on('message_create', async (msg) => {
    try {
        const chat = await msg.getChat();
        const contact = await msg.getContact();

        let finalBody = msg.body;
        if (msg.hasMedia || ['ptt', 'audio', 'image', 'video', 'document', 'vcard', 'sticker'].includes(msg.type)) {
            if (!finalBody) {
                if (msg.type === 'image') finalBody = '📸 [Imagem]';
                else if (msg.type === 'video') finalBody = '🎥 [Vídeo]';
                else if (msg.type === 'audio' || msg.type === 'ptt') finalBody = '🎵 [Mensagem de Voz]';
                else if (msg.type === 'vcard') finalBody = '📇 [Contato]';
                else if (msg.type === 'sticker') finalBody = '✨ [Figurinha]';
                else finalBody = '📄 [Documento/Arquivo]';
            } else {
                if (msg.type === 'image') finalBody = `📸 [Imagem] ${finalBody}`;
                else if (msg.type === 'video') finalBody = `🎥 [Vídeo] ${finalBody}`;
                else finalBody = `📎 [Anexo] ${finalBody}`;
            }
        }

        const messageData = {
            id: msg.id.id,
            body: finalBody,

            from_user: msg.from,
            to_user: msg.to,
            chat_id: msg.fromMe ? msg.to : msg.from,
            from_me: msg.fromMe,
            timestamp: msg.timestamp,
            chat_name: chat.name || contact.pushname || contact.number,
            is_group: chat.isGroup,
        };

        // 1. Broadcast to all connected dashboards
        io.emit('whatsapp_message', {
            id: messageData.id,
            body: messageData.body,
            from: messageData.from_user,
            to: messageData.to_user,
            chatId: messageData.chat_id,
            fromMe: messageData.from_me,
            timestamp: messageData.timestamp,
            chatName: messageData.chat_name,
            isGroup: messageData.is_group,
        });

        // 2. Persist to Supabase (fire-and-forget)
        supabase.from('whatsapp_messages').insert([messageData]).then(({ error }) => {
            if (error && error.code !== '42P01') {
                console.warn('Supabase insert error:', error.message);
            }
        });

        // 3. SPIN Selling IA — verifica: (a) agente global ON, (b) contato ativado
        if (!msg.fromMe && !chat.isGroup && agentEnabled && activeContacts.has(messageData.chat_id)) {
            // Bloco de pausa por contato (vendedor assumiu manualmente)
            if (spinAgent.isContactPaused(msg.from)) return;

            try {
                // Bloqueia mídias/áudios
                if (msg.hasMedia || msg.type === 'ptt' || msg.type === 'audio' || msg.type === 'image') {
                    await msg.reply('Desculpe, como sou o assistente virtual da equipe, ainda não consigo escutar áudios ou ver imagens 😅. \n\nPoderia me enviar por escrito por favor?');
                    return;
                }

                const contactName = contact.pushname || contact.name || contact.number;
                const aiReply = await spinAgent.generateReply(msg.from, contactName, msg.body);
                if (aiReply) {
                    await msg.reply(aiReply);
                    console.log(`🤖 SPIN reply enviado para ${contactName}`);
                }
            } catch (err) {
                console.error('SPIN Agent error:', err.message);
            }
        }
    } catch (err) {
        console.error('Error handling message:', err);
    }
});

// Initialize with error handling
client.initialize().catch(err => {
    console.error('Failed to initialize WhatsApp client:', err);
});

// ─── Socket.io Events ─────────────────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log(`📡 Dashboard connected: ${socket.id}`);

    // Sincroniza estado imediatamente para o dashboard recém-conectado
    socket.emit('agent_status', { enabled: agentEnabled });
    socket.emit('active_contacts_sync', { contacts: Array.from(activeContacts) });
    if (clientReady) {
        socket.emit('whatsapp_ready');
    } else if (qrCodeData) {
        socket.emit('whatsapp_qr', qrCodeData);
    }

    // Send message from dashboard
    socket.on('send_message', async ({ number, message }) => {
        if (!clientReady) {
            socket.emit('whatsapp_error', { message: 'WhatsApp not connected yet.' });
            return;
        }
        try {
            const formatted = number.includes('@c.us') ? number : `55${number.replace(/\D/g, '')}@c.us`;
            await client.sendMessage(formatted, message);
            console.log(`📤 Message sent to ${formatted}`);
        } catch (err) {
            console.error('Send error:', err);
            socket.emit('whatsapp_error', { message: 'Failed to send message.' });
        }
    });

    socket.on('disconnect', () => {
        console.log(`📡 Dashboard disconnected: ${socket.id}`);
    });
});

// ─── Tarefas e Integração Google Agenda ──────────────────────────────────────
app.post('/agent/task-notify', async (req, res) => {
    const { title, assignee, assigneePhone, priority, deadline, notifyWhatsapp, insertCalendar } = req.body;

    let whatsappSent = false;
    // 1. WhatsApp Notifications
    if (notifyWhatsapp && clientReady && assigneePhone) {
        const timeOfDay = new Date().getHours() < 12 ? 'Bom dia' : 'Boa tarde';
        const dateText = deadline ? new Date(deadline).toLocaleDateString('pt-BR') : 'Sem data definida';
        const emoji = priority === 'High' ? '🔴 URGENTE' : priority === 'Medium' ? '🟡 Atenção' : '🟢 Informativo';
        
        const message = `*${timeOfDay}, ${assignee}!*\n\nVocê recebeu uma nova tarefa no Quark OS:\n\n*${emoji}: ${title}*\nPrazo: ${dateText}\n\nFavor confirmar recebimento no sistema.`;
        
        try {
            const formatted = assigneePhone.includes('@c.us') ? assigneePhone : `55${assigneePhone.replace(/\D/g, '')}@c.us`;
            await client.sendMessage(formatted, message);
            console.log(`📤 Task notification sent to ${formatted}`);
            whatsappSent = true;
        } catch (err) {
            console.error('Failed to send WhatsApp task notification', err);
        }
    }

    // 2. Google Calendar Integration
    let calendarSuccess = false;
    let calendarError = 'Arquivo google-credentials.json não encontrado na pasta whatsapp-backend';
    
    if (insertCalendar !== false) {
        try {
            const credPath = path.join(__dirname, 'google-credentials.json');
            if (fs.existsSync(credPath)) {
                const auth = new google.auth.GoogleAuth({
                    keyFile: credPath,
                    scopes: ['https://www.googleapis.com/auth/calendar.events'],
                });
                const calendarAuth = await auth.getClient();
                const calendar = google.calendar({ version: 'v3', auth: calendarAuth });

                const eventDate = deadline ? new Date(deadline) : new Date();
                const dateStr = eventDate.toISOString().split('T')[0];

                const event = {
                    summary: `[QUARK] ${title} - ${assignee}`,
                    description: `Tarefa gerada pelo Quark OS\nPrioridade: ${priority}\nResponsável: ${assignee}`,
                    start: { date: dateStr },
                    end: { date: dateStr },
                };

                await calendar.events.insert({
                    calendarId: 'vendas.quarkenergia@gmail.com',
                    resource: event,
                });
                calendarSuccess = true;
                calendarError = null;
                console.log('✅ Task inserted into Google Calendar.');
            } else {
                console.log('⚠️ google-credentials.json não encontrado. Ignorando Google Agenda.');
            }
        } catch (err) {
            console.error('Google Calendar Error:', err);
            calendarError = err.message;
        }
    }

    res.json({ ok: true, whatsappSent, calendarSuccess, calendarError });
});

// ─── Start Server ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
    console.log(`\n🚀 Quark WhatsApp Backend running on http://localhost:${PORT}\n`);

    // Sync inicial da planilha de preços
    await spinAgent.syncProductSheet();

    // Sincroniza a cada 3 dias (à meia-noite)
    cron.schedule('0 0 */3 * *', async () => {
        console.log('📅 Cron: sincronizando tabela de preços da planilha...');
        await spinAgent.syncProductSheet();
    });
});
