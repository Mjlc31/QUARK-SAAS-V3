import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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
    const { message } = req.body;
    
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
  
  // WIP: Extrair o texto da mensagem do cliente do payload
  // Mandar para a rota de /api/chat da OpenAI
  // Devolver a resposta da IA disparando para a Evolution API

  res.sendStatus(200);
});

// Disparo ativo (ex: o Kanban de Engenharia moveu de fase e queremos notificar)
app.post('/api/evolution/send', async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    // WIP: Fazer POST para a URL da sua Evolution API (/message/sendText)
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
    const { segmento, localizacao, abertoAgora } = req.body;
    let query = `${segmento} em ${localizacao}`;
    if (abertoAgora) {
      query += " aberto agora";
    }

    console.log(`[PROSPECCAO] Iniciando busca: ${query}`);

    // 1. Geocode da localização usando Nominatim
    let lat = "0";
    let lon = "0";
    try {
      const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(localizacao)}&format=json&limit=1`;
      const geoRes = await fetch(geoUrl, {
        headers: { "User-Agent": "quark-saas" }
      });
      const geoData = await geoRes.json();
      if (geoData && geoData.length > 0) {
        lat = geoData[0].lat;
        lon = geoData[0].lon;
      }
    } catch (e) {
      console.warn("[PROSPECCAO] Falha no geocode. Usando 0,0", e);
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
      depth: 3, // Profundidade 3 para ser razoavelmente rápido na UI (aprox 60 resultados)
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
          avaliacao: lead.rating ? \`\${lead.rating} (\${lead.reviews})\` : '-',
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

app.listen(port, () => {
  console.log(`🚀 Servidor Quark Worker rodando na porta ${port}`);
  console.log(`🤖 IA e 📱 WhatsApp prontos para configuração.`);
});
