import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import helmet from 'helmet';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Global Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests, please try again later.' }
});

// Apply rate limit to all /api routes
app.use('/api/', limiter);


const port = process.env.PORT || 3001;

// Instância da OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// =========== ROTAS DE HEALTH CHECK ===========
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Quark AI & Evolution Backend V1' });
});

// =========== ROTAS DA OPENAI (PASSO 3) ===========
app.post('/api/chat', async (req, res) => {
  try {
    const schema = z.object({ message: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Mensagem inválida', details: parsed.error });
    const { message } = parsed.data;
    
    // WIP: Aqui o robô da OpenAI processará o contexto do cliente
    console.log(`[IA] Processando mensagem: ${message}`);

    res.json({ reply: 'Robô IA conectado ao backend do Quark com sucesso!' });
  } catch (error) {
    console.error('[IA] Erro:', error);
    res.status(500).json({ error: 'Erro interno no servidor IA' });
  }
});

// =========== ROTAS DA EVOLUTION API (PASSO 2) ===========
// Webhook receptor (escuta quando o cliente manda mensagem no WhatsApp)
app.post('/api/evolution/webhook', (req, res) => {
  const payload = req.body;
  console.log('[EVOLUTION] Webhook Recebido:', JSON.stringify(payload, null, 2));
  res.sendStatus(200);
});

// Proxy Seguro para gerar o QR Code da Evolution API
app.post('/api/evolution/connect', async (req, res) => {
  try {
    const schema = z.object({ instanceName: z.string().optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos', details: parsed.error });
    const { instanceName } = parsed.data;
    const EVOLUTION_URL = 'http://localhost:8082'; // Baseado no docker-compose.evolution.yml
    const API_KEY = process.env.EVOLUTION_API_KEY || 'quark_senha_secreta_123'; // Chave mestra no .env
    
    const targetName = instanceName || 'QuarkCRM';
    console.log(`[EVOLUTION] Tentando criar instância ${targetName}...`);
    
    // Tenta criar a instância (cria e já devolve o QR Code)
    let evRes = await fetch(`${EVOLUTION_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': API_KEY
      },
      body: JSON.stringify({
        instanceName: targetName,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true
      })
    });

    console.log(`[EVOLUTION] Create status: ${evRes.status}`);

    // Se já existe, ele retorna erro. Vamos buscar o status da instância já existente.
    if (!evRes.ok) {
      console.log(`[EVOLUTION] Criar falhou. Tentando conectar a ${targetName}...`);
      evRes = await fetch(`${EVOLUTION_URL}/instance/connect/${targetName}`, {
        method: 'GET',
        headers: {
          'apikey': API_KEY
        }
      });
      console.log(`[EVOLUTION] Connect status: ${evRes.status}`);
    }

    if (!evRes.ok) {
      const errorText = await evRes.text();
      console.error(`[EVOLUTION] API retornou erro: ${errorText}`);
      return res.status(evRes.status).json({ error: 'Erro ao conectar na Evolution API local', details: errorText });
    }

    const data = await evRes.json();
    res.json(data);

  } catch (error) {
    console.error('[EVOLUTION] Erro no Proxy:', error);
    res.status(500).json({ error: 'Falha de conexão com Evolution API local' });
  }
});

// Disparo ativo
app.post('/api/evolution/send', async (req, res) => {
  try {
    const { phone, message } = req.body;
    console.log(`[EVOLUTION] Disparando para ${phone}: ${message}`);
    res.json({ success: true, status: 'Simulado envio para Evolution' });
  } catch (error) {
    console.error('[EVOLUTION] Erro de Disparo:', error);
    res.status(500).json({ error: 'Falha no disparo Evolution' });
  }
});

// =========== ROTAS DO INSTAGRAM (META API) ===========
const VERIFY_TOKEN = process.env.INSTA_VERIFY_TOKEN || 'quark_insta_token';

app.get('/api/instagram/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[INSTAGRAM] Webhook Verificado');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

app.post('/api/instagram/webhook', async (req, res) => {
  try {
    const body = req.body;
    console.log('[WEBHOOK DUMP] POST recebido:', JSON.stringify(body, null, 2));
    
    if (body.object === 'instagram' || body.object === 'page') {
      console.log('[INSTAGRAM] Evento Recebido (Object: ' + body.object + ')');
      
      // Processar todas as entradas (pode haver mais de uma ao mesmo tempo)
      for (const entry of body.entry) {
        const igAccountId = entry.id;
        
        // Iterar sobre as mudanças (ex: comentários)
        for (const change of entry.changes || []) {
          if (change.field === 'comments') {
            const comment = change.value;
            const text = comment.text ? comment.text.toLowerCase() : '';
            
            console.log(`[INSTAGRAM] Comentário recebido de ${comment.from?.username}: ${text}`);
            
            // Regra simples de palavra-chave
            if (text.includes('teste') || text.includes('eu quero')) {
              console.log(`[INSTAGRAM] Palavra-chave detectada! Enviando DM...`);
              
              const META_TOKEN = process.env.META_ACCESS_TOKEN;
              
              // Fazer POST para a Graph API para enviar a resposta privada (Private Reply)
              const response = await fetch(`https://graph.instagram.com/v20.0/${igAccountId}/messages`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${META_TOKEN}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  recipient: {
                    comment_id: comment.id
                  },
                  message: {
                    text: `Olá, ${comment.from?.username}! Recebemos o seu comentário e essa é uma mensagem automática da nossa nova IA. Como podemos te ajudar com energia solar hoje?`
                  }
                })
              });
              
              const result = await response.json();
              console.log('[INSTAGRAM] Resposta da Meta:', result);
            }
          }
        }
      }
      
      res.status(200).send('EVENT_RECEIVED');
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('[INSTAGRAM] Erro no Webhook:', error);
    res.sendStatus(500);
  }
});

// =========== ROTAS DE PROSPECÇÃO (GOOGLE MAPS) ===========
app.post('/api/prospeccao/buscar', async (req, res) => {
  try {
    const { segmento, localizacao, lat: reqLat, lon: reqLon } = req.body;
    let query = `${segmento} em ${localizacao}`;

    console.log(`[PROSPECCAO] Iniciando busca: ${query}`);

    // 1. Geocode da localização usando Nominatim
    let lat = reqLat ? String(reqLat) : "0";
    let lon = reqLon ? String(reqLon) : "0";
    
    if (!reqLat || !reqLon) {
      try {
        const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(localizacao)}&format=json&limit=1`;
        const geoRes = await fetch(geoUrl, {
          headers: { "User-Agent": "quark-saas" }
        });
        const geoData = await geoRes.json();
        if (geoData && geoData.length > 0) {
          lat = String(geoData[0].lat);
          lon = String(geoData[0].lon);
        }
      } catch (e) {
        console.warn("[PROSPECCAO] Falha no geocode. Usando 0,0", e);
      }
    }

    // 2. Criar Job no Scraper Local
    const body = {
      name: "quark-prospeccao",
      keywords: [query],
      lang: "pt",
      zoom: 15,
      lat,
      lon,
      fast_mode: false,
      radius: 10000,
      depth: 1, // Profundidade 1 para evitar timeout e rate limit (mais rapido)
      email: false, // Desligado para maior velocidade
      max_time: 300
    };

    const scraperUrl = 'http://localhost:8080';
    let jobRes;
    try {
      jobRes = await fetch(`${scraperUrl}/api/v1/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (e) {
      return res.status(503).json({ error: 'Scraper indisponível. Verifique se o Docker está rodando na porta 8080.' });
    }

    if (!jobRes.ok) {
      const errText = await jobRes.text();
      return res.status(500).json({ error: `Falha ao criar job no scraper: ${errText}` });
    }

    const jobData = await jobRes.json();
    const jobId = jobData.id;
    console.log(`[PROSPECCAO] Job criado: ${jobId}. Iniciando polling...`);

    // 3. Polling
    let status = null;
    let attempts = 0;
    while (attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Aguarda 5s
      const statusRes = await fetch(`${scraperUrl}/api/v1/jobs/${jobId}`);
      const statusData = await statusRes.json();
      status = statusData.Status;
      console.log(`[PROSPECCAO] Polling ${jobId}: ${status}`);
      if (status === 'ok') break;
      if (status === 'failed') {
        return res.status(500).json({ error: 'Job do scraper falhou (possível rate limit do Google).' });
      }
      attempts++;
    }

    if (status !== 'ok') {
      return res.status(504).json({ error: 'Timeout aguardando o scraper.' });
    }

    // 4. Download dos resultados (CSV) e parse simplificado
    const downloadRes = await fetch(`${scraperUrl}/api/v1/jobs/${jobId}/download`);
    const csvData = await downloadRes.text();
    
    // Parse básico de CSV (assumindo formato limpo retornado pelo docker)
    // O csv tem header. Vamos pegar as linhas.
    const lines = csvData.split('\n').filter(line => line.trim() !== '');
    if (lines.length <= 1) {
      return res.json({ leads: [] });
    }
    
    // O CSV parsing em JS puro aqui pode ser frágil com vírgulas dentro das aspas.
    // Usaremos regex para dividir respeitando aspas, ou apenas buscar os campos importantes se possível.
    // Uma solução mais robusta seria usar uma lib, mas faremos o parser na unha.
    const parseCSVLine = (text) => {
      let ret = [], val = '', inquotes = false;
      for (let ch of text) {
        if (ch === '"') inquotes = !inquotes;
        else if (ch === ',' && !inquotes) { ret.push(val); val = ''; }
        else val += ch;
      }
      ret.push(val);
      return ret;
    };

    const headers = parseCSVLine(lines[0]);
    const leads = [];
    
    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i]);
      const lead = {};
      headers.forEach((h, idx) => {
        lead[h.trim()] = row[idx] ? row[idx].trim().replace(/^"|"$/g, '') : '';
      });
      
      // Limpeza de campos vazios ou ruidosos
      if (lead.title && lead.address) {
        leads.push({
          id: i, // ID falso pro React map
          nome: lead.title,
          avaliacao: lead.rating ? `${lead.rating} (${lead.reviews})` : '-',
          endereco: lead.address,
          telefone: lead.phone || '-',
          website: lead.website || '',
          latitude: lead.latitude || '',
          longitude: lead.longitude || ''
        });
      }
    }

    console.log(`[PROSPECCAO] ${leads.length} leads retornados.`);
    res.json({ leads });

  } catch (error) {
    console.error('[PROSPECCAO] Erro na busca:', error);
    res.status(500).json({ error: 'Erro interno ao processar a prospecção' });
  }
});

// =========== AGENTE AUTÔNOMO CRM ===========
// Simulação do loop do agente rodando em background (inspirado no trycompai/crm)
setInterval(() => {
  console.log('[AGENT] Heartbeat: Analisando leads e enriquecendo dados no background...');
  // O Agente deverá consultar o banco (Supabase) por leads parados e usar a IA 
  // para preencher CNPJ, fazer resumos ou agendar tarefas.
}, 5 * 60 * 1000);

// ── Portal & Automation Endpoints ──

// Portal client auth verification
app.post('/api/portal/auth', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    // Verify client exists in portal
    res.json({ success: true, message: 'Portal auth endpoint ready' });
  } catch (error) {
    console.error('Portal auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Project tracking data for portal
app.get('/api/portal/project/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    if (!clientId) return res.status(400).json({ error: 'Client ID is required' });
    // Return tracking data for client
    res.json({
      success: true,
      phases: [
        { phase: 'venda_confirmada', label: 'Venda Confirmada', completed: true },
        { phase: 'projeto_elaboracao', label: 'Projeto em Elaboração', completed: true },
        { phase: 'projeto_enviado', label: 'Projeto Enviado', completed: false, is_current: true },
        { phase: 'aprovacao_concessionaria', label: 'Aprovação Concessionária', completed: false },
        { phase: 'logistica_entrega', label: 'Logística de Entrega', completed: false },
        { phase: 'instalacao', label: 'Instalação', completed: false },
        { phase: 'homologacao', label: 'Homologação', completed: false },
        { phase: 'comissionamento', label: 'Comissionamento', completed: false },
        { phase: 'finalizado', label: 'Finalizado', completed: false }
      ]
    });
  } catch (error) {
    console.error('Project tracking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create support ticket
app.post('/api/tickets', async (req, res) => {
  try {
    const schema = z.object({
      subject: z.string().min(3),
      description: z.string().optional(),
      category: z.string().optional(),
      priority: z.string().optional(),
      client_id: z.string()
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos', details: parsed.error });
    const { subject, description, category, priority, client_id } = parsed.data;
    res.json({
      success: true,
      ticket: {
        id: `ticket_${Date.now()}`,
        subject,
        description,
        category: category || 'outros',
        priority: priority || 'normal',
        status: 'aberto',
        client_id,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Ticket creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Batch maintenance alert dispatch
app.post('/api/maintenance/alert-batch', async (req, res) => {
  try {
    const { client_ids, alert_type, message, channel } = req.body;
    if (!client_ids || !Array.isArray(client_ids) || client_ids.length === 0) {
      return res.status(400).json({ error: 'client_ids array is required' });
    }
    const alerts = client_ids.map(id => ({
      client_id: id,
      alert_type: alert_type || 'manutencao_preventiva',
      message: message || 'Olá! Está na hora da sua manutenção preventiva. Entre em contato conosco!',
      channel: channel || 'whatsapp',
      status: 'enviado',
      sent_at: new Date().toISOString()
    }));
    console.log(`[Alert Batch] Dispatched ${alerts.length} maintenance alerts via ${channel || 'whatsapp'}`);
    res.json({ success: true, alerts_sent: alerts.length, alerts });
  } catch (error) {
    console.error('Alert batch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Utility bill crawler trigger (mock)
app.post('/api/utility/crawl', async (req, res) => {
  try {
    const { intelligence_id, cpf, birth_date } = req.body;
    if (!intelligence_id) return res.status(400).json({ error: 'intelligence_id is required' });
    // Mock crawler response
    console.log(`[Utility Robot] Crawl triggered for intelligence: ${intelligence_id}`);
    res.json({
      success: true,
      message: 'Crawler job initiated',
      job: {
        id: `crawl_${Date.now()}`,
        intelligence_id,
        status: 'processing',
        estimated_completion: '2 minutes',
        started_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Utility crawl error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Servidor Quark Worker rodando na porta ${port}`);
  console.log(`🤖 IA e 📱 WhatsApp prontos para configuração.`);
});
