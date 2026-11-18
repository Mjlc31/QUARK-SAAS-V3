# Relatório de QA & Auditoria Sistêmica — Quark OS V3

- **Data:** 2026-11-07T23:50 (BRT local)
- **Status geral:** PARCIAL COM RESSALVAS
- **TypeScript & Build:** PASS (0 erros `tsc --noEmit`; `vite build` ok em ~5s)
- **Logística de dados (via MCP supabase_quark, read-only):** 6/6 PASS
- **Telas E2E:** 37/37 sem crash nem erro de console — **sem sessão autenticada** (rotas internas e do portal testadas só até o gate de login)
- **Backend Express:** sobe ok (porta 3005), guards 401 e SSRF ok

## Matriz

| ID | Teste | Método | Status | Evidência |
|---|---|---|:-:|---|
| TC-01 | 15 fechamentos Ganho ↔ portal ↔ receita ↔ obra | SQL MCP | PASS | 15/15: 1 portal, 1 receita com valor idêntico, ≥1 tracking |
| TC-02 | Idempotência | SQL MCP | PASS | `uq_client_portal_opportunity_id` existe; 0 duplicatas no portal; 0 receitas duplicadas |
| TC-03 | Proposta aceita vs mais recente | SQL MCP | PASS | 0 oportunidades onde a aceita não é a resolvida |
| TC-04 | DRE / pró-labore 45/10/5/5 → 45/45/10 | SQL MCP | PASS | 15/15 linhas de `prolabore_settlements` batem a fórmula ao centavo; receita R$ 273.394,23, lucro R$ 101.839,35 |
| TC-05 | RPC `get_client_auth_email` | `qa_portal_auth_solarz_test_suite.mjs` | PASS | 13/13 casos (6, 11 dígitos, máscara, e-mail, bordas) |
| TC-06 | Telemetria SolarZ | script | NÃO VERIFICADO | anon key retorna 0 linhas pós-lockdown |
| TC-07 | Build & tipagem | CLI | PASS | 0 erros |
| TC-08 | Navegação 37 rotas | Playwright MCP | PASS (sem login) | 0 pageerror / 0 console error após correções |
| TC-09 | Assinatura e PDF | — | NÃO VERIFICADO | exige token real; assinar muta dado de cliente |
| TC-10 | RLS staff × cliente | `pg_policies` + advisors | PASS c/ ressalvas | todas as tabelas com RLS; políticas `public` amarradas a `auth.uid()`; 0 leitura anon |
| — | Middleware auth | `node --test backend/middleware/auth.test.js` | PASS | 5/5 |

## Correções aplicadas

1. `src/App.tsx` — `PageWrapper` agora envolve cada página em `ErrorBoundary`: crash em uma tela não derruba sidebar/portal.
2. `src/lib/supabase/client.ts` — `/p/:token` só chama `/api/proposals/:token` (rota `requireTeam`) quando há sessão; elimina o 401 vermelho para todo cliente que abre proposta pública. Cálculo/PDF intocados.
3. `src/pages/BioLanding.tsx` — `fetchPriority` → `fetchpriority` (React 18 rejeitava a prop).
4. `src/pages/CRM.tsx` — removido `reload` não usado.

`Proposals.tsx` tem 5 locais não usados; não foi tocado (arquivo sagrado).

## Achados em aberto (não corrigidos — exigem decisão)

| Sev. | Achado | Onde |
|---|---|---|
| ALTA | Webhook Evolution sem autenticação: um POST forjado `messages.upsert` faz o agente SPIN gerar resposta Gemini e enviar WhatsApp para qualquer JID | `backend/server.js:307` |
| ALTA | `get_client_auth_email` é executável por `anon` e aceita prefixo de 6 dígitos: 10⁶ tentativas mapeiam CPF→e-mail de clientes | RPC Supabase |
| MÉDIA | Backend sem `SUPABASE_SERVICE_ROLE_KEY`: roda com anon key, RLS bloqueia leituras/escritas server-side (ex.: `action:'view'` em proposta pública não grava) | `backend/.env` |
| MÉDIA | Scripts `scripts/qa_*.mjs` usam anon key → pós-lockdown leem 0 linhas e reportam PASS vazio; o de portal imprime "STATUS GERAL: PASS" fixo | `scripts/` |
| MÉDIA | Conflito de porta: `localhost:5173` (IPv6) serve o EngenharQ; o Quark só responde em `127.0.0.1:5173` | dev env |
| BAIXA | Dev server 5173 do Quark não recarregou edições (watcher parado) — reiniciar `npm run dev` | dev env |
| BAIXA | Advisors: `pg_net` no schema public; leaked password protection desligado; 12 SECURITY DEFINER expostos ao anon (maioria intencional: proposta/documento público) | Supabase |
| BAIXA | Chunk > 500 kB no bundle; aviso CSS `.mb-3\.5` | build |

## Veredito

Integridade de dados e financeiro: sólida (15/15 fechamentos, DRE exato). Build limpo. Não aprovar 100% enquanto: (a) webhook sem segredo e (b) enumeração CPF→e-mail estiverem abertos, e (c) o E2E autenticado (CRM Kanban, orçamento rápido, portal logado, assinatura/PDF) não for rodado com uma conta de teste.
