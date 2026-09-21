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
    if (body.object === 'instagram') {
      console.log('[INSTAGRAM] Evento Recebido:');
      console.dir(body, { depth: null });
      
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
