# Relatório de Auditoria V5: Segurança e Qualidade - Quark SaaS

## Resumo Executivo
- **Nota de Segurança:** 5/10
- **Nota de Qualidade:** 4/10
- **Estado Geral:** O sistema evoluiu e resolveu problemas críticos (como uso de DOMPurify para XSS), porém a integração entre componentes de segurança (ex: JWT no Socket) falha, e a base de código frontend sofre de hipertrofia severa (Monolithic Components), reduzindo a manutenibilidade. Além disso, a ausência de testes automatizados é um ponto crítico para um sistema SaaS.

---

## 1. Segurança (OWASP & Vulnerabilidades)

### 1.1 DOMPurify vs XSS
- **Status:** Implementado parcialmente.
- **Análise:** O `DOMPurify.sanitize` foi devidamente implementado em locais como `src/components/proposal/blocks/BlockText.tsx` (na prop `dangerouslySetInnerHTML`), o que mitiga injeções clássicas de XSS. Contudo, deve-se atentar para garantir que não existam instâncias de injeções de HTML não sanitizado em outros blocos complexos do projeto, bem como uso de `target="_blank"` sem `rel="noopener noreferrer"`.

### 1.2 JWT no Socket (WebSocket Auth)
- **Status:** Implementado no Backend, mas **Quebrado** na Integração Frontend.
- **Análise:** No arquivo `whatsapp-backend/index.js`, existe o middleware `io.use()` que valida rigorosamente o JWT usando `supabase.auth.getUser(token)`. Isso efetivamente **bloqueia intrusos** de forma correta e segura. 
- **O Problema:** O frontend (`src/pages/Conversations.tsx`) inicia o socket **sem passar o token**: `const newSocket = io(BACKEND_URL);`. 
- **Impacto:** O backend rejeitará a conexão de usuários legítimos com `Authentication error`. A segurança foi configurada, mas a integração quebrou.
- **Correção:** Atualizar o frontend para enviar o token durante o handshake: `io(BACKEND_URL, { auth: { token: session.access_token } })`.

### 1.3 OCR e Chaves de IA
- **Status:** Vulnerabilidade mitigada no cliente, mas quebrou a funcionalidade.
- **Análise:** O arquivo `src/services/aiOcrService.ts` foi refatorado para chamar `/api/ocr` em vez de usar `VITE_GOOGLE_AI_KEY` no lado do cliente. Isso foi uma grande melhoria. Contudo, o arquivo `backend/server.js` **não possui a rota** `/api/ocr` implementada. O serviço está funcionalmente quebrado. A chave `VITE_GOOGLE_AI_KEY` ainda consta no `.env` do frontend.

---

## 2. Qualidade de Código & Code Smells

### 2.1 Componentes Monolíticos ("God Objects")
Foram encontrados múltiplos arquivos com **Complexidade Ciclomática Altíssima** (arquivos gigantes), ferindo o SRP (Single Responsibility Principle):
- `src/pages/Calculator.tsx` (~940 linhas)
- `src/pages/Financial.tsx` (~908 linhas)
- `src/pages/Conversations.tsx` (~864 linhas)
- `src/pages/CRM.tsx` (~786 linhas)

**Problema:** Lógicas de requisição de dados, UI (interfaces extensas), modais, handlers de eventos e controle de state complexos estão agrupados na mesma função React (ex. dezenas de arrow functions dentro do componente principal).
**Solução:** Extração para Hooks customizados (ex: `useFinancialData()`) e divisão imperativa em subcomponentes puros (ex: `<FinancialFilters />`, `<FinancialTable />`).

### 2.2 Duplicação de Queries (Supabase)
- Uso repetitivo de `try/catch` para acesso ao banco Supabase em múltiplos arquivos de página (`pages/`).
- **Solução:** Implementar um padrão de Repositório (`src/services/`) para encapsular as requisições, deixando os componentes cuidarem apenas da apresentação.

---

## 3. Avaliação de Testes (Jest, Cypress, Playwright)

- **Status:** **Inexistente** no repositório.
- **Análise:** Uma varredura no repositório revelou que não há nenhuma estrutura de testes de unidade (Jest) ou E2E (Playwright/Cypress) configurada, o que expõe o código a regressões constantes.
- **Recomendação:**
  - Instalar o **Jest** e **React Testing Library** para testes unitários de funções core (ex: `src/lib/` e lógicas de cálculo).
  - Instalar o **Playwright** para garantir os fluxos de sucesso ponta-a-ponta (Login -> Funil de CRM -> Criação de Proposta).

---

## 4. Checklist Rigoroso de Refatoração (Priorizado)

### 🔴 CRÍTICO (Fazer Imediatamente)
- [ ] **Socket Auth no Frontend:** Corrigir a inicialização em `Conversations.tsx` passando o `access_token` no config do Socket.io.
- [ ] **Rota OCR Backend:** Adicionar `POST /api/ocr` no `backend/server.js` conectando à API do Google, pois hoje o serviço do frontend está cego.
- [ ] **Limpeza de .env:** Remover `VITE_GOOGLE_AI_KEY` do ambiente do Vite para evitar build no frontend.

### 🟠 ALTO (Qualidade e Escalabilidade)
- [ ] **Refatoração de Monólitos:** Quebrar `Financial.tsx` e `Calculator.tsx` extraindo hooks lógicos (ex: `useCalculator`) e subcomponentes visuais. Reduzir cada arquivo a no máximo 250-300 linhas.
- [ ] **Infraestrutura de Testes:** Inicializar e implementar 2 testes cruciais E2E no Playwright (ex: autenticação e edição de CRM).

### 🟡 MÉDIO / PREVENTIVO
- [ ] **Centralizar Fetch / Supabase:** Isolar queries do banco de dados em `src/services/` em vez de chamar livremente de dentro dos `useEffects` nos arquivos de View.
- [ ] **Auditoria de Tipagem Estrita:** Substituir ocorrências de `any` em tipagens de resposta do Supabase, definindo os objetos correspondentes para melhor suporte do TS.
