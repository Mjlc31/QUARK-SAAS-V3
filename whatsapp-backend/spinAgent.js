/**
 * Quark Energia — SPIN Selling AI Agent v3
 * Powered by Google Gemini 1.5 Flash
 *
 * ESTRATÉGIA CENTRAL:
 * Taxa de conversão da visita = 90%.
 * Logo, o agente tem UM ÚNICO OBJETIVO: qualificar o lead e marcar a visita.
 * Nada de vender pelo WhatsApp. Brevidade é poder.
 *
 * FLUXO:
 *   1. GREETING    → responder a mensagem inicial (orçamento, quanto custa, etc.)
 *   2. QUALIFY     → coletar: valor da conta + cidade/bairro
 *   3. BOOK        → propor e confirmar a visita técnica gratuita
 *   4. CONFIRMED   → confirmar dados e encerrar o atendimento bot
 *   5. DISQUALIFIED → cliente sem perfil (quer barato + muito, sem condições)
 */

'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

// ─── Init ─────────────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = process.env.SUPABASE_URL ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY) : null;

// Tabela de preços — atualizada pelo sync da planilha
let PRICE_TABLE = buildDefaultPriceTable();
// Versão JSON estruturada (usada pelo Calculator do frontend)
let PRICE_TABLE_JSON = buildDefaultPriceTableJSON();


function buildDefaultPriceTable() {
    return `
REFERÊNCIA DE PREÇOS (use para estimar — nunca cite valor exato antes da visita):
| Consumo kWh/mês | À Vista        | Financiado (Solfácil) |
|-----------------|----------------|-----------------------|
| 200             | R$ 8.009       | R$ 8.875              |
| 300             | R$ 8.471       | R$ 8.425              |
| 400             | R$ 9.594       | R$ 9.982              |
| 500             | R$ 10.429      | R$ 12.546             |
| 600             | R$ 13.154      | R$ 13.066             |
| 700             | R$ 12.565      | R$ 15.000             |
| 800             | R$ 14.735      | R$ 16.397             |
| 900             | R$ 15.254      | R$ 17.740             |
| 1000            | R$ 16.972      | R$ 18.734             |

FINANCIAMENTO SOLFÁCIL:
- Parcela geralmente MENOR que a conta de energia atual
- Sem entrada em muitos casos — aprovação rápida
- Cliente começa a economizar no primeiro mês
- Prazo até 84 meses
`.trim();
}

function buildDefaultPriceTableJSON() {
    return [
        { kwh: 200, avista: 8009, financiado: 8875 },
        { kwh: 300, avista: 8471, financiado: 8425 },
        { kwh: 400, avista: 9594, financiado: 9982 },
        { kwh: 500, avista: 10429, financiado: 12546 },
        { kwh: 600, avista: 13154, financiado: 13066 },
        { kwh: 700, avista: 12565, financiado: 15000 },
        { kwh: 800, avista: 14735, financiado: 16397 },
        { kwh: 900, avista: 15254, financiado: 17740 },
        { kwh: 1000, avista: 16972, financiado: 18734 },
        { kwh: 1200, avista: 19500, financiado: 21800 },
        { kwh: 1500, avista: 23000, financiado: 26000 },
        { kwh: 2000, avista: 28500, financiado: 32000 },
        { kwh: 3000, avista: 38000, financiado: 44000 },
    ];
}

// ─── Knowledge Base da Quark ──────────────────────────────────────────────────
const QUARK_KNOWLEDGE = `
## QUARK ENERGIA — MANUAL DO AGENTE

### QUEM SOMOS
Empresa de engenharia solar fundada em 2021 em Maceió, Alagoas.
Fundadores: Arthur (engenheiro de energia, 25 anos) e Anderson.
Canal único de atendimento: WhatsApp por indicação.

### NOSSA PROPOSTA DE VALOR (MEMORIZE)
Não vendemos placas. Eliminamos um sócio parasita da vida do cliente.
Todo mês ele paga à distribuidora como aluguel — sem retorno. 
Com a Quark, esse dinheiro vira investimento com retorno de 2,5% a 3% ao mês.

### QUALIDADE TÉCNICA (diferenciais reais)
- Cabos com proteção UV certificada
- Conectores Stäubli originais (padrão europeu, não pirata)
- Estrutura em alumínio anodizado naval
- Projeto aprovado por engenheiro registrado no CREA
- Garantia real de 25 anos de geração

### PERFIL DO CLIENTE IDEAL
- Homem, 25 a 60 anos
- Aposentado, empresário ou assalariado que quer economizar todo mês
- Tem conta de energia acima de R$200/mês
- Tem imóvel próprio (residência ou empresa)
- Toma decisão racional baseado em ROI e segurança

### PERFIL A DESQUALIFICAR (politely)
- Quer o mais barato do mercado sem se importar com qualidade
- Deixa claro que não tem condições financeiras (nem financiamento)
- Quer pagar pouco e receber muito — esse perfil não é nosso cliente

### COMO CHEGAM OS LEADS
Todos chegam por indicação. Primeira mensagem típica:
- "Quero um orçamento"
- "Quanto custa um sistema para X kWh?"
- "Gostaria de um orçamento"
- "Vi com fulano que vocês fazem energia solar"

### ARGUMENTO QUE MAIS CONVERTE
"Você vai continuar refém da conta de energia? 
Todos os meses ver seu dinheiro indo embora, sabendo que existe uma solução que cabe no seu bolso."

### REGRA DE OURO DA VISITA
Taxa de conversão da visita técnica presencial = 90%.
O agente NÃO precisa vender. Só precisa marcar a visita.
A visita é sempre GRATUITA e SEM COMPROMISSO.

### OBJEÇÕES E RESPOSTAS CURTAS

"Tá caro":
→ "Caro comparado a pagar essa conta por mais 25 anos? Depois da visita você vai entender o porquê do investimento."

"Vou pensar":
→ "Claro. O que ficou em dúvida? Porque a visita é gratuita e você não assume nada."

"Quero só um orçamento por aqui":
→ "Entendo. Mas o orçamento preciso depende de uma análise no local — é rápida e gratuita. Qual o melhor dia pra você?"

"Conheço quem faz mais barato":
→ "Com que componentes? A Quark usa Stäubli e alumínio naval — garantia real de 25 anos. Na visita você vê a diferença."

"Não tenho dinheiro":
→ "O Solfácil financia com parcela menor que a sua conta atual — sem entrada, aprovação rápida. Mas precisa da visita pra ver se cabe no seu perfil."
Se insistir → desqualificar educadamente.

### O QUE NUNCA FAZER
- Não seja prolixo. Menos é mais.
- Não mande mensagem em bloco de texto. Máximo 3 frases.
- Não seja agressivo ou pressione.
- Nunca dê um valor exato sem a visita.
- Não fique explicando tecnicamente — o cliente não quer palestra.
`.trim();

// ─── Gerenciamento de conversas por contato ───────────────────────────────────
const conversations = new Map();

// Conversas pausadas manualmente (o vendedor assumiu)
const pausedContacts = new Set();

// Controle de concorrência (evita respostas duplicadas pro mesmo contato)
const processingContacts = new Set();

function getOrCreateConversation(contactId, contactName) {
    if (!conversations.has(contactId)) {
        conversations.set(contactId, {
            contactId,
            contactName: contactName || 'Cliente',
            phase: 'greeting',
            history: [],
            billValue: null,
            city: null,
            visitScheduled: false,
            disqualified: false,
            transferToHuman: false,
            summary: null,
            createdAt: new Date(),
            lastMessageAt: new Date(),
        });
    }
    const conv = conversations.get(contactId);
    conv.lastMessageAt = new Date();
    if (contactName && contactName !== 'Cliente') {
        conv.contactName = contactName;
    }
    return conv;
}

// ─── Prompt do Sistema ────────────────────────────────────────────────────────
function buildSystemPrompt(conv) {
    const phaseInstructions = {
        greeting: `O cliente acabou de mandar a primeira mensagem (provavelmente pedindo orçamento).
Responda de forma calorosa e OBJETIVA. Pergunte apenas:
1. Qual a média da conta de energia (em kWh ou em reais)
2. Se é residência ou empresa
Não explique nada ainda. Só qualifique.`,

        qualify: `Você está coletando dados para propor a visita.
Já tem: conta = R$${conv.billValue || '?'}, cidade = ${conv.city || 'não informada'}.
Se falta algum dado, pergunte apenas um de cada vez.
Assim que tiver conta e localização → avance para BOOK.`,

        book: `Você tem os dados. Agora MARQUE A VISITA.
Seja direto: "A visita técnica é gratuita e sem compromisso. Qual o melhor dia e horário para você?"
Não explique mais nada — a visita fecha sozinha (90% de conversão).
Se o cliente resistir à visita, use: "Sem a visita presencial não consigo te dar um orçamento preciso."`,

        confirmed: `A visita foi agendada! 
Confirme: nome completo, endereço, dia e horário.
Agradeça e diga que o consultor vai confirmar por aqui antes da visita.
Encerre com elegância — não fique mandando mais mensagem.`,

        disqualified: `Esse cliente não tem perfil Quark (quer barato, sem condições, etc).
Seja educado e breve. Diga que no momento não consegue atender o perfil dele.
Não gaste mais tempo. Encerre com respeito.`,
    };

    return `Você é o consultor de atendimento da Quark Energia. Chame-se apenas "equipe Quark".

REGRAS ABSOLUTAS:
1. NUNCA revele que é IA, bot ou assistente virtual. Você é humano.
2. SEJA BREVE. Máximo 3 frases por mensagem. Ponto final.
3. UMA pergunta por vez. Nunca duas.
4. Tom: consultor direto, humano, confiante. Sem robótica.
5. Emojis: zero ou máximo 1 por mensagem.
6. Se o cliente pedir para falar com atendente humano → retorne transferToHuman=true.
7. Se detectar que o cliente quer "o mais barato" ou claramente não tem condições → retorne phase="disqualified".

FASE ATUAL: ${conv.phase.toUpperCase()}
NOME: ${conv.contactName}
${phaseInstructions[conv.phase] || ''}

${QUARK_KNOWLEDGE}

${PRICE_TABLE}

RESPONDA SOMENTE em JSON, sem texto fora do JSON:
{
  "phase": "greeting|qualify|book|confirmed|disqualified",
  "message": "sua resposta aqui",
  "transferToHuman": false,
  "billValue": null,
  "city": null
}

- "phase": fase ideal para continuar (pode avançar)
- "billValue": se o cliente mencionou valor de conta, extraia aqui (número só). Senão, null.
- "city": se mencionou cidade/bairro, extraia aqui. Senão, null.
- "transferToHuman": true somente se o cliente pediu explicitamente para falar com humano.`;
}

// ─── Pausa manual por contato ─────────────────────────────────────────────────
function pauseContact(contactId) {
    pausedContacts.add(contactId);
    console.log(`⏸️  Agente pausado para ${contactId}`);
}

function resumeContact(contactId) {
    pausedContacts.delete(contactId);
    console.log(`▶️  Agente retomado para ${contactId}`);
}

function isContactPaused(contactId) {
    return pausedContacts.has(contactId);
}

// ─── Funções Auxiliares de Inteligência ───────────────────────────────────────
async function syncLeadToCRM(contactId, contactName, conv) {
    if (!supabase) return;
    try {
        const id = contactId.replace('@c.us', '');
        const leadObj = {
            id,
            name: contactName,
            phone: id,
            value: Number(conv.billValue) || 0,
            status: conv.phase === 'confirmed' ? 'Agendado' : 'Lead',
            createdAt: conv.createdAt.toISOString(),
            city: conv.city || '',
            monthlyConsumption: 0,
            updatedAt: new Date().toISOString(),
            history: [] // Histórico leve sincronizado no dashboard superior
        };

        await supabase.from('leads').upsert({
            id,
            data: leadObj,
            updated_at: new Date().toISOString()
        });
        console.log(`✅ [CRM] Lead sincronizado automaticamente no funil: ${contactName}`);
    } catch (err) {
        console.error('Erro ao sincronizar Lead no CRM:', err.message);
    }
}

async function generateSummary(conv) {
    if (conv.history.length < 3 || conv.summary) return;
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const historyText = conv.history.map(m => `${m.role === 'model' ? 'Bot' : 'Cliente'}: ${m.parts[0].text}`).join('\n');
        const prompt = `Faça um resumo de 1 parágrafo bem curto desta conversa (3 a 4 linhas) para que o vendedor humano saiba o contexto antes de assumir o atendimento. Foco no valor da conta, cidade e principal dúvida/objeção do cliente.\n\nConversa:\n${historyText}`;

        const result = await model.generateContent(prompt);
        conv.summary = result.response.text().trim();
        console.log(`\n📋 RESUMO PARA O VENDEDOR (${conv.contactName}):\n${conv.summary}\n`);
    } catch (err) {
        console.error('Erro ao gerar resumo:', err.message);
    }
}

// ─── Geração de Resposta ──────────────────────────────────────────────────────
async function generateReply(contactId, contactName, userMessage) {
    // Se o contato está pausado (vendedor humano assumiu), não responde
    if (isContactPaused(contactId)) {
        return null;
    }

    const conv = getOrCreateConversation(contactId, contactName);

    // Não responde mais depois de confirmado ou desqualificado
    if (conv.visitScheduled || conv.disqualified || conv.transferToHuman) {
        return null;
    }

    // Adiciona mensagem do cliente ao histórico
    conv.history.push({
        role: 'user',
        parts: [{ text: userMessage }]
    });

    // Mutex: Se já está processando, apenas salva no histórico e ignora (evita duplicate API calls)
    if (processingContacts.has(contactId)) {
        console.log(`⏳ [${contactName}] Aguardando processamento atual (mensagem enfileirada no histórico).`);
        return null;
    }

    processingContacts.add(contactId);

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction: buildSystemPrompt(conv),
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.6,
                maxOutputTokens: 400,
            },
        });

        const chat = model.startChat({
            history: conv.history.slice(0, -1),
        });

        const result = await chat.sendMessage(userMessage);
        const rawText = result.response.text().trim();

        // Parse JSON
        let parsed;
        try {
            parsed = JSON.parse(rawText);
        } catch {
            const match = rawText.match(/\{[\s\S]*\}/);
            if (match) parsed = JSON.parse(match[0]);
            else throw new Error('Invalid JSON from Gemini: ' + rawText.substring(0, 120));
        }

        const { phase, message, transferToHuman, billValue, city } = parsed;

        // Atualiza estado
        if (phase && phase !== conv.phase) {
            console.log(`🔄 [${contactName}] ${conv.phase} → ${phase}`);
            conv.phase = phase;

            // Sync automático com o CRM quando a qualificação avança
            if ((phase === 'book' || phase === 'confirmed') && conv.billValue) {
                syncLeadToCRM(contactId, contactName, conv);
            }
        }
        if (billValue) conv.billValue = billValue;
        if (city) conv.city = city;
        if (phase === 'confirmed') conv.visitScheduled = true;
        if (phase === 'disqualified') conv.disqualified = true;
        if (transferToHuman) {
            conv.transferToHuman = true;
            pauseContact(contactId); // pausa automático quando transfere
        }

        // Gera resumo automaticamente se a conversa acabou/transferiu
        if (transferToHuman || conv.disqualified || conv.visitScheduled) {
            generateSummary(conv);
        }

        // Adiciona resposta ao histórico
        conv.history.push({
            role: 'model',
            parts: [{ text: message }]
        });

        // Limita histórico
        if (conv.history.length > 40) {
            conv.history = conv.history.slice(-40);
        }

        console.log(`🤖 [${conv.phase}] ${contactName}: "${message.substring(0, 80)}"`);

        return (transferToHuman || conv.disqualified) ? null : message;

    } catch (err) {
        console.error('❌ Gemini error:', err.message);
        return null;
    } finally {
        processingContacts.delete(contactId);
    }
}

// ─── Geração de Sugestão Exclusiva para o Vendedor ────────────────────────────
async function generateSuggestionForHuman(messages) {
    if (!messages || messages.length === 0) return null;
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // Converte o array do frontend para formato texto
        const historyText = messages.slice(-15).map(m => `${m.fromMe ? 'Empresa' : 'Cliente'}: ${m.body}`).join('\n');

        const prompt = `Você é o assistente expert em vendas solares da Quark Energia.
As últimas mensagens com este cliente estão abaixo.
Escreva a MENSAGEM IDEAL (pronta para enviar) que o consultor humano deve mandar agora para esquentar a venda, quebrar objeções ou agendar a visita.
SEJA NATURAL. No máximo 3 frases curtas. 
NÃO explique a sugestão, retorne APENAS o texto exato da mensagem sugerida.
Se o cliente parou de responder, sugira um follow-up persuasivo.

Histórico Recente:
${historyText}

Sua sugestão de resposta pronta:`;

        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (err) {
        console.error('Erro ao gerar sugestão para humano:', err.message);
        return null;
    }
}


// ─── Sync da Planilha de Preços ───────────────────────────────────────────────
async function syncProductSheet() {
    const url = process.env.SHEETS_CSV_URL;
    if (!url) return;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const csv = await res.text();
        const lines = csv.trim().split('\n');

        let table = '\nREFERÊNCIA DE PREÇOS (atualizada automaticamente):\n';
        table += '| Consumo kWh/mês | À Vista | Financiado (Solfácil) |\n';
        table += '|-----------------|---------|------------------------|\n';

        for (let i = 0; i < lines.length - 1; i += 2) {
            const kwh = lines[i].split(',')[0].trim().replace(/"/g, '');
            const parts = lines[i + 1].split(',');
            const avista = (parts[0]?.trim().replace(/"/g, '') || '').split('.')[0];
            const financiado = (parts[2]?.trim().replace(/"/g, '') || '').split('.')[0];
            if (kwh && !isNaN(Number(kwh)) && Number(kwh) > 0) {
                table += `| ${kwh.padEnd(15)} | ${avista.padEnd(7)} | ${financiado} |\n`;
            }
        }

        // Atualiza tabela texto
        PRICE_TABLE = table + '\nCliente nunca deve saber o valor exato antes da visita. Use estes dados só para estimar internamente.\n';

        // Atualiza tabela JSON estruturada para o Calculator
        const jsonRows = [];
        for (let i = 0; i < lines.length - 1; i += 2) {
            const kwh = Number(lines[i].split(',')[0].trim().replace(/"/g, ''));
            const parts = lines[i + 1].split(',');
            const avista = Number((parts[0] || '').trim().replace(/[^0-9.]/g, ''));
            const financiado = Number((parts[2] || '').trim().replace(/[^0-9.]/g, ''));
            if (kwh > 0 && !isNaN(avista) && avista > 0) {
                jsonRows.push({ kwh, avista: Math.round(avista), financiado: Math.round(financiado) || Math.round(avista * 1.12) });
            }
        }
        if (jsonRows.length >= 3) PRICE_TABLE_JSON = jsonRows;
        console.log(`📊 Tabela de preços atualizada: ${new Date().toLocaleString('pt-BR')} (${jsonRows.length} faixas)`);
    } catch (err) {
        console.warn('⚠️  Erro ao sync planilha:', err.message);
    }
}

// ─── Memória de Contexto ──────────────────────────────────────────────────────
function getContactContext(contactId) {
    if (!conversations.has(contactId)) return null;
    const conv = conversations.get(contactId);
    return {
        phase: conv.phase,
        billValue: conv.billValue || null,
        city: conv.city || null,
        disqualified: conv.disqualified,
        visitScheduled: conv.visitScheduled,
        transferToHuman: conv.transferToHuman
    };
}

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
    generateReply,
    generateSuggestionForHuman,
    syncProductSheet,
    getContactContext,

    pauseContact,
    resumeContact,
    isContactPaused,
    getConversation: (id) => conversations.get(id),
    getAllConversations: () => Object.fromEntries(conversations),
    getPausedContacts: () => [...pausedContacts],
    getPriceTable: () => PRICE_TABLE_JSON,
    resetConversation: (id) => { conversations.delete(id); pausedContacts.delete(id); },
    getStats: () => ({
        total: conversations.size,
        byPhase: [...conversations.values()].reduce((acc, c) => {
            acc[c.phase] = (acc[c.phase] || 0) + 1;
            return acc;
        }, {}),
        paused: pausedContacts.size,
        scheduled: [...conversations.values()].filter(c => c.visitScheduled).length,
        disqualified: [...conversations.values()].filter(c => c.disqualified).length,
    }),
};
