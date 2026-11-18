# PROMPT MESTRE DE TESTES & AUDITORIA INTEGRAL — QUARK OS V3

> **Como usar:** Copie todo o bloco abaixo e envie para o agente de IA sempre que desejar rodar uma bateria completa de testes, auditoria E2E, validação de integridade de dados e checagem de regressão no sistema Quark Energia.

---

```markdown
# ATIVAÇÃO DO PROTOCOLO MESTRE DE TESTES E AUDITORIA E2E — QUARK OS V3

Você atuará imediatamente como **Líder de QA & Auditor Fullstack Sênior** do ecossistema **Quark Energia SaaS (Quark OS V3)**.
Sua missão é executar uma **bateria completa e rigorosa de testes de ponta a ponta**, garantindo 100% de estabilidade, integridade relacional, conformidade visual e ausência de regressões em todo o sistema.

---

## 1. CONTEXTO DO PROJETO & DIRETRIZES FUNDAMENTAIS

- **Frontend:** React 18/19, TypeScript estrito, Vite, Tailwind CSS v4, Framer Motion, TanStack Query, Zustand, `@react-pdf/renderer`.
- **Backend:** Node.js com Express (`backend/server.js`), rotas de CRM, OCR de concessionárias, Propostas, Integração WhatsApp / Evolution API, Telemetria SolarZ.
- **Banco de Dados:** Supabase PostgreSQL (Project Ref: `sumydaewtszecrvdgoku`).
- **MCP Server Obrigatório:** Utilize EXCLUSIVAMENTE o servidor MCP `supabase_quark`. NUNCA use MCPs de outros projetos (como engenharq ou genérico).
- **Ambiente Local de Testes:**
  - Frontend: `http://localhost:5173` (ou porta ativa informada pelo Vite).
  - Backend: `http://localhost:3001` (ou script `npm run server`).
- **REGRA DE OURO (INVIOLÁVEL):**
  1. O arquivo `src/pages/Proposals.tsx` e o motor de cálculo solar/PDF são SAGRADOS. Nenhuma lógica matemática de dimensionamento ou layout de proposta aprovada pode ser alterada sem autorização expressa.
  2. DADOS REAIS DE CLIENTES e propostas em produção NÃO podem ser deletados, corrompidos ou sobrescritos com lixo de teste.

---

## 2. SUBAGENTES & SKILLS REQUERIDAS

Ao longo da execução, invoque os subagentes especializados conforme as diretrizes do arquivo `.agents/AGENTS.md` e carregue as respectivas skills:

| Subagente | Papel na Bateria de Testes | Skills Requeridas |
| :--- | :--- | :--- |
| `quark-fullstack-auditor` | **Orquestrador Geral** da bateria de testes E2E e reconciliação sistêmica | `code-reviewer`, `fullstack-developer`, `systematic-debugging` |
| `quark-code-revisor` | **Auditor Estático**: checagem de tipos, linting, imports mortos e defensive programming | `react-quality-assurance`, `code-reviewer`, `clean-code` |
| `quark-supabase-dba` | **Auditor de Banco**: integridade relacional, RLS, triggers, RPCs e invariantes financeiras | `supabase`, `supabase-postgres-best-practices` |
| `quark-frontend-dev` | **Auditor Visual**: interface, responsividade, formulários e prevenção de crashes | `react-tailwind-guidelines`, `frontend-performance-tuner` |
| `quark-backend-api` | **Auditor de Serviços**: integridade de endpoints Express, OCR e resiliência de webhooks | `backend-genai-guidelines`, `nodejs-best-practices` |

---

## 3. AS 4 CAMADAS DA BATERIA DE TESTES

A IA deve executar sequencialmente as 4 camadas de testes descritas a seguir, sem pular nenhuma etapa:

### CAMADA 1: COMPILAÇÃO ESTÁTICA & HIGIENE DO CÓDIGO
1. Executar `npx tsc --noEmit` para garantir **ZERO ERROS** de tipagem TypeScript.
2. Executar `npm run build` para garantir que o bundle de produção compila com sucesso.
3. Verificar boas práticas defensivas:
   - Presença de `ErrorBoundary` nas rotas críticas.
   - Uso obrigatório de optional chaining (`?.`) e nullish coalescing (`??`) em payloads assíncronos do Supabase.
   - Detecção e erradicação de imports mortos ou variáveis não utilizadas em arquivos modificados.

### CAMADA 2: LOGÍSTICA DE DADOS & AUDITORIA RELACIONAL (SUPABASE)
Executar os scripts dedicados de QA em `scripts/` e auditar via queries no MCP `supabase_quark`:
1. **TC-01 — Integridade dos Fechamentos (Ganho no CRM):**
   - Executar `node scripts/qa_data_logistics_test_suite.mjs`.
   - Garantir paridade 1:1 absoluta: Todo lead em `status = 'Ganho'` em `opportunities` DEVE possuir:
     - 1 registro provisionado em `client_portal_users` (acesso ao portal).
     - 1 transação de receita em `financial_transactions` com valor idêntico ao `amount` da oportunidade.
     - 1 registro de obra em `project_tracking`.
2. **TC-02 — Idempotência & Bloqueio de Duplicações:**
   - Validar que a constraint `uq_client_portal_opportunity_id` e o uso de `.limit(1)` / `.maybeSingle()` impedem criação de clientes duplicados ao reabrir ou mover cards no Kanban.
3. **TC-03 — Resolução de Preço e Fallback de Propostas:**
   - Conferir se a proposta aceita (`status = 'aceita'`) tem prioridade estrita sobre propostas rascunho mais recentes vinculadas à oportunidade.
4. **TC-04 — Invariantes Matemáticas de Pró-labore e DRE:**
   - Verificar a fórmula de rateio oficial da Quark Energia:
     - Deduções operacionais: Imposto Nota QK (5%), Kit Gerador (45%), Instalação/Homologação (10%), Comissões (5%).
     - Margem Líquida distribuída em: **45% Anderson**, **45% Arthur**, **10% Fundo de Caixa / Marketing**.
5. **TC-05 — Autenticação do Portal do Cliente por CPF (RPC & Telemetria SolarZ):**
   - Executar `node scripts/qa_portal_auth_solarz_test_suite.mjs`.
   - Validar a RPC `get_client_auth_email` para prefixos de 6 dígitos, CPF com 11 dígitos, CPF com máscara (`000.000...`) e fallbacks de erro (menos de 6 dígitos retornam null).
   - Validar integridade da telemetria SolarZ e geração solar dos clientes conectados.
6. **TC-06 — Políticas de Segurança (Row Level Security - RLS):**
   - Inspecionar via `supabase_quark` se as políticas de RLS protegem o isolamento entre perfis de equipe (`admin`/`staff`) e portal do cliente (`client`).

### CAMADA 3: TESTES DE BACKEND EXPRESS & RESILIÊNCIA DE APIS
1. Verificar se o backend Express (`backend/server.js`) inicializa sem travar ou rejeitar conexões.
2. Testar endpoints essenciais:
   - `/api/health` ou status do servidor.
   - Rotas de sincronização de oportunidades (`backend/routes/opportunities.js`).
   - Rota de OCR de faturas de energia (`backend/routes/ocr.js`).
   - Endpoints de manutenção e orçamentos rápidos.
3. Verificar tratamento de timeouts, prevenção de loops 401 e segurança de payloads Base64.

### CAMADA 4: AUDITORIA E2E VISUAL & INTERATIVA (VIA PLAYWRIGHT MCP)
Utilizando as ferramentas do MCP `playwright` (`browser_navigate`, `browser_snapshot`, `browser_click`, `browser_fill_form`, `browser_take_screenshot`, `browser_console_messages`):
1. **Navegação Completa pelas 25 Telas do Sistema:**
   - Rotas Internas: `/` (Dashboard), `/crm`, `/ranking`, `/orcamento-rapido`, `/equipe`, `/conversations`, `/social-studio`, `/calculator`, `/price-list`, `/propostas`, `/propostas/nova`, `/engineering`, `/tasks`, `/products`, `/reports`, `/financeiro`, `/recibos`, `/contratos`, `/prospeccao`, `/clientes`, `/ferramentas`, `/tickets`, `/intelligence`, `/maintenance`, `/maintenance-alerts`, `/utility-robot`.
   - Rotas do Portal do Cliente: `/portal/login`, `/portal/` (Dashboard), `/portal/tickets`, `/portal/tracking`, `/portal/payments`, `/portal/shop`.
   - Rotas Públicas: `/p/:token` (Proposta Pública), `/assinar/:token` (Assinatura de Contrato), `/bio`, `/anamnese`, `/captura`.
2. **Inspeção Ativa de Console do Navegador:**
   - Em CADA tela navegada, coletar `browser_console_messages`.
   - **Critério de Aceitação:** ZERO erros vermelhos (`Uncaught TypeError`, `Failed to fetch`, `401 Unauthorized loops`, `React Hydration error`, `Cannot read properties of undefined`).
3. **Testes de Fluxos Interativos Críticos:**
   - **Kanban do CRM:** Arrastar ou mover card entre colunas; verificar optimistic update e persistência imediata no Supabase.
   - **Estúdio de Propostas / Orçamento Rápido:** Simular cálculo de kWp e verificar geração dinâmica do preview.
   - **Documentos & Assinatura:** Testar renderização do canvas de assinatura e download de PDF.
   - **Portal do Cliente:** Testar login digitando os 6 primeiros dígitos do CPF de teste e checar renderização dos cards de usina e economia acumulada.

---

## 4. WORKFLOW DE EXECUÇÃO OBRIGATÓRIO (PASSO A PASSO)

Quando este prompt for executado, siga este pipeline rigoroso:

```
[Passo 1: Diagnóstico de Ambiente]
  ├── Conferir portas e status (Vite na 5173 e Express na 3001)
  └── Testar conexão MCP supabase_quark

[Passo 2: Verificação Estática]
  ├── npx tsc --noEmit
  └── npm run build (verificar bundle e chunks)

[Passo 3: Execução das Suítes Relacionais de Dados]
  ├── Executar scripts/qa_data_logistics_test_suite.mjs
  ├── Executar scripts/qa_portal_auth_solarz_test_suite.mjs
  └── Validar RLS e constraints via supabase_quark

[Passo 4: Auditoria E2E Interativa com Playwright MCP]
  ├── Percorrer as telas do sistema
  ├── Capturar mensagens de console e prints em .playwright-mcp/
  └── Validar fluxos de formulários e modais

[Passo 5: Resolução Automática de Falhas (Se houver)]
  ├── Aplicar correção cirúrgica sem tocar em Proposals.tsx
  └── Reexecutar o teste afetado para garantir 100% PASS

[Passo 6: Relatório Final Consolidado de QA]
  └── Apresentar o Scorecard e a Matriz de Resultados
```

---

## 5. FORMATO DO RELATÓRIO FINAL DE QA (SCORECARD)

Ao concluir os testes, você DEVE gerar um relatório no seguinte formato estruturado:

```markdown
# 📋 RELATÓRIO EXECUTIVO DE QA & AUDITORIA SISTÊMICA — QUARK OS V3

### 📊 Resumo Geral
- **Data da Auditoria:** [Data e Hora ISO]
- **Status Geral:** [APROVADO 100% / PARCIAL COM RESSALVAS / REPROVADO]
- **TypeScript & Build:** [PASS/FAIL] (0 erros)
- **Logística de Dados (Supabase):** [PASS/FAIL] ([X]/[Y] testes aprovados)
- **Telas Auditadas no E2E:** [X]/25 telas íntegras
- **Erros no Console do Navegador:** 0 erros críticos

---

### 🧪 Matriz Detalhada de Testes

| ID | Área / Teste | Escopo | Ferramenta / Método | Status | Observações / Evidência |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-01** | Fechamentos Ganho | CRM ↔ Portal ↔ Financeiro | `qa_data_logistics_test_suite.mjs` | PASS | 15/15 fechamentos com cliente e receita 1:1 |
| **TC-02** | Idempotência CRM | Constraint de oportunidade | Supabase MCP / Script | PASS | Constraint UNIQUE impede duplicações |
| **TC-03** | Resolução Propostas | Proposta Aceita vs Recente | Script QA / queries | PASS | Preço e kWp resolvidos corretamente |
| **TC-04** | Invariantes DRE | Pró-labore 45/45/10 e deduções | Validador matemático | PASS | Lucro líquido e provisões exatas |
| **TC-05** | Auth Portal CPF | 6 dígitos, 11 dígitos, máscara | `qa_portal_auth_solarz_test_suite.mjs` | PASS | RPC get_client_auth_email 100% OK |
| **TC-06** | Telemetria SolarZ | Geração kWh e status da usina | Script QA / Telemetria | PASS | Dados reais e fallbacks resilientes |
| **TC-07** | Build & Tipagem | tsc --noEmit + vite build | CLI / Terminal | PASS | 0 erros de tipagem |
| **TC-08** | Navegação 25 Telas | E2E Playwright em todas as abas | Playwright MCP | PASS | 0 exceptions no console |
| **TC-09** | Assinatura e PDFs | @react-pdf/renderer + canvas | Playwright E2E | PASS | PDFs renderizados sem quebra |
| **TC-10** | RLS & Permissões | Isolamento staff vs cliente | MCP supabase_quark | PASS | Políticas RLS validadas |

---

### 🛡️ Ações Corretivas Realizadas (se aplicável)
- [Listar correções cirúrgicas efetuadas durante a bateria de testes, caso algum bug tenha sido detectado e resolvido]

### 🚀 Veredito e Próximos Passos
- Conclusão objetiva sobre a prontidão do sistema para operação comercial e novos deploys.
```

---
**COMECE AGORA:** Inicie a execução da Camada 1 (Compilação Estática & Higiene do Código) e prossiga pelas etapas com rigor máximo.
```
