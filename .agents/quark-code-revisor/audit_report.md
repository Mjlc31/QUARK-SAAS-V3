# 🛡️ Relatório de Varredura de Segurança e Qualidade - Quark SaaS

**Data da Auditoria:** 20 de Agosto de 2026
**Escopo:** Fullstack (Frontend React, Supabase DB/RLS, Backend Node.js/Express)
**Foco:** Red Team (Ataques complexos, falhas de lógica, vazamento de secrets e code smells)

---

## 📊 Resumo Executivo

- **Nota de Segurança:** 🔴 **2/10** (Crítico) - O sistema possui falhas estruturais graves de autorização e exposição de chaves que permitem o controle total dos dados e do canal de comunicação da empresa.
- **Nota de Qualidade:** 🟡 **5/10** (Média) - Código funciona e atende requisitos, mas sofre com uso excessivo de `any` no TypeScript, lógicas duplicadas e falta de tratamento adequado de erros no backend.

---

## 🚨 Vulnerabilidades de Segurança

### 1. Quebra Total de Isolamento de Dados (RLS Excessivamente Permissivo)
- **Severidade:** **CRÍTICA** (CVSS: 10.0)
- **Local:** `supabase/migrations/supabase_DEFINITIVO_v3.sql` (e outros arquivos SQL)
- **Descrição:** As políticas Row Level Security (RLS) estão configuradas como `USING (true) WITH CHECK (true)` para a role `authenticated`. Como o endpoint de criação de contas (SignUp) está ativo via `supabase.auth.signUp()` em `AuthContext.tsx`, um atacante qualquer da internet pode se registrar no sistema, obter um JWT válido e ter acesso de **leitura, escrita e exclusão** em absolutamente **todas** as tabelas do CRM (Leads, Pipelines, Produtos, Fluxo de Caixa/Financial Transactions).
- **Vetor de Ataque:** Cadastro público via API do Supabase `->` Login `->` Query para `supabase.from('leads').select('*')`.
- **Mitigação:** 
  1. Se for um sistema interno exclusivo da empresa, desativar o cadastro público (Signups) via painel do Supabase.
  2. Implementar `tenant_id` ou controle por `user_id` nas tabelas e alterar o RLS para: `(auth.uid() = user_id)`.

### 2. Exposição de Chaves Sensíveis (Secrets) no Git e Frontend
- **Severidade:** **CRÍTICA** (CVSS: 9.5)
- **Local:** `.env` e `src/lib/supabaseClient.ts`
- **Descrição:** O arquivo `.env` (contendo `VITE_GOOGLE_AI_KEY` e `VITE_SUPABASE_URL`) está sendo versionado e exposto, visto que não foi incluído no `.gitignore`. Além disso, a chave da API do Gemini é acessada diretamente no frontend (que fica visível no bundle para qualquer usuário). Chaves de LLM cobradas por uso nunca devem residir do lado do cliente.
- **Mitigação:** 
  1. Adicionar `.env` ao `.gitignore` imediatamente e remover do git cache (`git rm --cached .env`).
  2. Invalidar e rotacionar a chave `AIzaSy...` no painel do Google.
  3. Mover todas as requisições ao Gemini para o backend.

### 3. Ausência de Autenticação em Endpoints do Backend WhatsApp
- **Severidade:** **CRÍTICA** (CVSS: 9.0)
- **Local:** `whatsapp-backend/index.js` (Rotas Express e Socket.io)
- **Descrição:** Os endpoints como `/agent/task-notify`, `/agent/toggle`, `/whatsapp/connect` e até mesmo conexões do `socket.io` (`send_message`) estão totalmente desprotegidos.
- **Vetor de Ataque:** Um atacante pode chamar `/agent/task-notify` com um payload falso para disparar mensagens de WhatsApp para qualquer número em nome da Quark Energia, além de inserir eventos maliciosos no Google Calendar da empresa. Também pode derrubar o agente IA desligando-o via `/agent/toggle`.
- **Mitigação:** Implementar um middleware que verifique o JWT do Supabase via `Authorization: Bearer <token>` em todas as rotas de API e no handshake do Socket.io.

### 4. Hardcode de Secret no Webhook e Validação Fraca
- **Severidade:** **ALTA**
- **Local:** `whatsapp-backend/index.js` (Rota `/webhook/evolution`)
- **Descrição:** A verificação do webhook realiza um fallback para a string hardcoded `'quark_senha_secreta_123'` caso a variável de ambiente não esteja configurada. 
- **Vetor de Ataque:** Um atacante que adivinhe a string ou leia o código-fonte pode injetar mensagens arbitrárias no banco de dados do Supabase, forjando uma conversa (falso positivo no CRM) ou corrompendo fluxos de atendimento.
- **Mitigação:** Remover o fallback hardcoded. Utilizar verificação `crypto.timingSafeEqual` para comparar tokens, prevenindo ataques de timing.

### 5. Stored XSS via DOMinnerHTML
- **Severidade:** **MÉDIA**
- **Local:** `src/components/proposal/blocks/BlockText.tsx`
- **Descrição:** O uso de `dangerouslySetInnerHTML={{ __html: content.html }}` sem sanitização apropriada. Combinado a um banco de dados cujo RLS está vulnerável, um atacante pode injetar scripts malignos.
- **Mitigação:** Passar o conteúdo por um sanitizador (e.g. `DOMPurify.sanitize`) antes de renderizá-lo.

---

## 🛠️ Qualidade e TypeScript (Code Smells)

1. **Abuso Extremo da Tipagem `any`:**
   - **Local:** `src/types.ts`, `BlockRenderer.tsx`, `ProposalPDF.tsx`, `Financial.tsx`.
   - **Descrição:** O uso de type casting inseguro como `(error as any).details` ou funções utilitárias engolindo o tipo (ex: `const CustomTooltip = ({ active, payload }: any) => { ... }`) remove as vantagens fundamentais de usar TypeScript, camuflando erros de runtime (e.g., acesso à propriedade inexistente).

2. **Duplicação da Lógica de Preços (Fonte da Verdade Quebrada):**
   - **Local:** `whatsapp-backend/spinAgent.js`
   - **Descrição:** Os preços base de sistemas solares estão duplicados (texto formatado e JSON estruturado). Embora exista uma sync via `syncProductSheet()`, o fallback aponta para valores fixos duplicados. Se a tabela no código divergir da planilha original, o CRM mostrará preços diferentes do que o Agente IA informa ao cliente.

3. **Arquitetura de Banco com JSONB Abusivo:**
   - **Local:** Migrações SQL
   - **Descrição:** As tabelas (e.g., `leads`, `projects`) utilizam uma coluna genérica `data JSONB` para armazenar informações vitais. Embora flexível, isso prejudica profundamente as tipagens geradas e complica queries analíticas, além de mascarar a ausência de um design de esquema estruturado.

4. **Gerenciamento de Erros Silencioso:**
   - **Local:** `whatsapp-backend/index.js`
   - **Descrição:** Erros críticos nos webhooks são silenciados no bloco `catch` com `res.status(500).send('Error')` ou ignorados sem logging detalhado ou fallbacks informativos. Em outros pontos, `res.status(200).send('Ignored')` oculta anomalias indesejadas no fluxo de dados.

---

## 📝 Plano de Remediação Priorizado (Checklist)

- [ ] **1. Desativar Sign-ups Públicos:** Vá imediatamente ao Supabase -> Authentication -> Configs -> desative "Allow new users to sign up" ou refaça o RLS de isolamento.
- [ ] **2. Consertar RLS:** Reescrever as políticas de RLS para checar relação com o perfil do usuário (ex: `auth.uid() = user_id`) ou restringir permissão de gravação/leitura ao cargo admin via JWT Role.
- [ ] **3. Proteção API WhatsApp:** Exigir header `Authorization` usando token Supabase válido no Express (`/agent/*`) e Socket.io.
- [ ] **4. Revogar Secrets Expostos:** Rotacionar `VITE_GOOGLE_AI_KEY`, remover hardcoded fallbacks no código, excluir `.env` do Git (`git rm --cached .env`) e incluí-lo no `.gitignore`.
- [ ] **5. Sanitizar Entradas Web:** Instalar `DOMPurify` e blindar os componentes de Props/Blocos contra XSS.
- [ ] **6. Limpeza TypeScript:** Substituir os retornos `any` no Frontend (especialmente componentes PDF e Recharts) por Generics ou Interfaces consolidadas da aplicação.
