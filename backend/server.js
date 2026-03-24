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
  apiKey: process.env.OPENAI_API_KEY || 'sk-chave-pendente',
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

app.listen(port, () => {
  console.log(`🚀 Servidor Quark Worker rodando na porta ${port}`);
  console.log(`🤖 IA e 📱 WhatsApp prontos para configuração.`);
});
