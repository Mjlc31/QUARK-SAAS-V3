# Relatório de Auditoria Agressiva V5 - Quark SaaS Backend

## 1. Resumo Executivo
**Nota Geral: 4.5 / 10**

O backend apresenta uma fundação funcional (MVP) e integrações valiosas (WhatsApp via Evolution API, GenAI via Gemini), além de ter incorporado melhorias recentes como `p-retry`, `express-rate-limit` e `node-cache`. No entanto, ele falha criticamente nos quesitos de **Segurança**, **Escalabilidade (Stateless)** e **Arquitetura (Clean Code)**, o que inviabiliza sua utilização em um ambiente Enterprise de alta carga sem refatorações profundas.

Existem graves vazamentos de autorização nas rotas REST, o estado da aplicação está acoplado à memória do processo Node.js (impedindo escalabilidade horizontal) e o código sofre do antipattern "Fat Controller", com regras de negócio, infraestrutura e rotas misturadas em apenas dois arquivos massivos (`index.js` e `spinAgent.js`).

---

## 2. Análise das Adições Recentes

### 2.1. `node-cache`
- **Uso Atual:** Usado para manter os `activeContacts` em memória em `index.js`.
- **Falha:** Impede a escalabilidade horizontal. Se houver mais de uma instância do backend, o webhook de uma mensagem pode cair no Servidor B, enquanto o contato foi ativado no Servidor A.
- **Solução:** Substituir `node-cache` por um banco de dados em memória distribuído, como **Redis**, para manter o rastreamento de contatos ativos globalmente.

### 2.2. `express-rate-limit`
- **Uso Atual:** Aplicado globalmente em `app.use(limiter)` com 100 requisições por minuto.
- **Falha:** Rate limit global baseado em IP e aplicado em todas as rotas indistintamente. Um atacante pode esgotar as cotas globais ou sofrer bypass caso o servidor esteja atrás de um proxy/load balancer sem configurar o `app.set('trust proxy', 1)`.
- **Solução:** Aplicar rate limits granulares (ex: mais restritivo no `/api/ocr`, mais permissivo em webhooks seguros) e garantir que o IP correto do cliente seja lido via cabeçalhos de proxy.

### 2.3. `p-retry`
- **Uso Atual:** Utilizado na função `sendWhatsAppMessage` e chamadas ao Gemini via importação dinâmica (`await import('p-retry')`).
- **Falha:** A importação dinâmica dentro da função/route handler, apesar de armazenada em cache pelo Node, é uma prática que pode gerar overhead desnecessário e poluir o código.
- **Solução:** Fazer a importação no topo do arquivo (ou migrar para TypeScript/ESM) e implementar uma estratégia de Backoff Exponencial adequada, com logs de `onFailedAttempt`.

### 2.4. Rotas JWT / OCR
- **Uso Atual:** O Socket.io verifica o JWT via `supabase.auth.getUser()`. Já o `/api/ocr` está completamente aberto.
- **Falha de Implementação:** A rota `/api/ocr` recebe payloads de imagem de até 50MB **sem nenhuma autenticação**. Qualquer um pode fazer POST na rota, consumindo cotas da sua API do Gemini e causando prejuízos financeiros ou DoS no servidor. Além disso, a guideline pede uso do `gemini-2.5-flash`, mas o código utiliza o modelo antigo (`gemini-1.5-flash`).
- **Solução:** Proteger **todas** as rotas da API (exceto webhooks externos) com middleware de validação do token JWT e atualizar o modelo para `gemini-2.5-flash` nas chamadas multimodais.

---

## 3. Escalabilidade Horizontal e Estado (Stateless)

**O backend NÃO é 100% stateless.** Pelo contrário, é altamente stateful.
Se você provisionar duas instâncias deste backend atrás de um Load Balancer, a aplicação quebrará pelas seguintes razões:

1. **Memória de Conversas (`spinAgent.js`):** Utiliza um `Map` (`conversations`) e um `Set` (`processingContacts`, `pausedContacts`). Se a mensagem 1 for pro Servidor A e a mensagem 2 for pro Servidor B, o Servidor B não terá o histórico da conversa e o agente não funcionará corretamente.
2. **Estado Global (`index.js`):** Variáveis como `qrCodeData`, `clientReady` e `agentEnabled` vivem na memória do processo. O Servidor A pode achar que o WhatsApp está conectado, enquanto o Servidor B acha que está desconectado.
3. **Polling vs Webhook:** O `startQRPolling` faria com que ambas as instâncias ficassem buscando o QR code ao mesmo tempo.

**Solução Enterprise (Stateless):**
- Migrar todo o armazenamento de sessão, cache, configurações de instâncias (ligado/desligado) e histórico de conversa recente para o **Redis**.
- Utilizar o Redis Pub/Sub ou os adaptadores do Socket.io (`@socket.io/redis-adapter`) para emitir eventos de WebSocket em todas as instâncias simultaneamente.
- O histórico consolidado deve estar persistido no Supabase e apenas puxado sob demanda.

---

## 4. Vulnerabilidades de Segurança Encontradas

| Severidade | Vulnerabilidade | Arquivo | Descrição e Impacto |
|---|---|---|---|
| **CRÍTICA** | Ausência de Autenticação em Rotas REST | `index.js` | Rotas como `/agent/toggle`, `/agent/pause/:contactId` e `/whatsapp/connect` não exigem JWT. Qualquer pessoa pode controlar a operação do seu bot. |
| **CRÍTICA** | Abuso de API GenAI (Sem Autenticação) | `index.js` | `/api/ocr` está exposto sem autenticação. Permite gasto ilimitado de tokens e DoS com imagens de até 50MB. |
| **ALTA** | SSRF e Calendar Spam Injection | `index.js` | Rota `/agent/task-notify` não tem autenticação e permite criar eventos no Google Calendar oficial da empresa arbitrariamente, além de disparar mensagens via WhatsApp. |
| **ALTA** | Tratamento Simplório de Webhooks | `index.js` | A autenticação do webhook compara chaves fracamente ou faz hardcode de fallback (`quark_senha_secreta_123`). Permite spoofing de mensagens de WhatsApp. |
| **MÉDIA** | Falta de Validação de Input | Múltiplos | Os dados do req.body não são validados por uma biblioteca de esquema (Zod/Joi). Isso pode gerar exceções não tratadas e quebra da aplicação. |
| **BAIXA** | Exposição de Stack Trace | `index.js` | O uso de `res.status(500).json({ error: err.message })` em alguns endpoints pode vazar detalhes da infraestrutura. |

---

## 5. Arquitetura, Qualidade e Monitoramento (O Que Falta)

### 5.1. Arquitetura Limpa (Clean Architecture)
- O código atual concentra centenas de linhas de regras de negócios misturadas com código Express e Socket.io em apenas dois arquivos (Fat Controller).
- **Ação:** Refatorar o backend seguindo padrões de Camadas (Routes, Controllers, Services, Repositories). Exemplo: `EvolutionService.js`, `GeminiService.js`, `WhatsAppController.js`.

### 5.2. Monitoramento e Logs (APM)
- O único mecanismo de log atual é o `console.log`, que não oferece busca, rastreamento ou alertas.
- **Ação:** Implementar o **Winston** ou **Pino** para log estruturado (JSON).
- **Ação:** Adicionar um APM (Datadog, New Relic ou Sentry) para monitorar latência, erros nas integrações com o Gemini/Evolution e uptime das rotas.

### 5.3. Testes Automatizados
- O projeto apresenta ausência total de testes unitários ou de integração.
- **Ação:** Adicionar `Jest` e `Supertest`. Criar suítes para testar regras complexas, especialmente a lógica do `spinAgent.js` (geração de prompt, detecção de intenção) utilizando Mocks do Gemini.

### 5.4. Unificação dos Backends
- Atualmente existe a pasta `whatsapp-backend/` e `backend/` (este último parecendo um projeto estéril ou de testes paralelos).
- **Ação:** Unificar e remover código obsoleto para centralizar toda a operação em um único monólito modular ou dividi-los claramente em microserviços baseados em Docker.

---

## 6. Checklist Priorizado de Ações Recomendadas

### 🔴 Crítico (Fazer Agora)
- [ ] Aplicar Middleware de autenticação JWT em **todas** as rotas de API Express (exceto `/webhook/evolution` e `/health`).
- [ ] Bloquear `/api/ocr` para apenas usuários logados (autenticados no Supabase).
- [ ] Remover ou atualizar o fallback hardcoded do token do webhook (`quark_senha_secreta_123`).
- [ ] Configurar o Rate Limit para respeitar proxies (`app.set('trust proxy', 1)`).

### 🟠 Alta Prioridade (Próximo Sprint)
- [ ] Migrar o estado da aplicação (`activeContacts`, `conversations`, `pausedContacts`, `qrCodeData`) da memória RAM para o **Redis**, tornando o backend *Stateless*.
- [ ] Atualizar as chamadas do Gemini para usar o modelo exigido nas guidelines (`gemini-2.5-flash`).
- [ ] Mudar a validação de entrada de dados para usar `Zod` (ex: verificar estrutura das mensagens).

### 🟡 Média Prioridade
- [ ] Configurar um Logger estruturado (Pino/Winston) e integrá-lo a um APM (Sentry).
- [ ] Refatorar o `index.js` dividindo a responsabilidade em Módulos (Routes, Services, Controllers).
- [ ] Padronizar o tratamento de exceções (ErrorHandler middleware no Express) para não vazar `err.message` direto para o client.

### 🟢 Baixa Prioridade / Contínuo
- [ ] Implementar suíte de testes com Jest.
- [ ] Padronizar a tabela de preços do Agent puxada do CSV para algo mais robusto ou armazenado em banco de dados com cache.
- [ ] Mover as lógicas dinâmicas (`await import`) para configurações nativas ou converter o projeto para ES Modules (ESM) nativo.
