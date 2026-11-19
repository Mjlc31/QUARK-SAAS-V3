---
name: verify
description: Verificação do Quark antes de commit/PR ou de dizer "pronto". Roda tsc, testes do backend e E2E seguros, depois sobe o app e exercita no browser os fluxos tocados pelo diff (proposta, PDF, contrato, CRM). Segue o protocolo da skill global verify (3 rodadas, carimbo Verified-by).
---

# Verify — Quark Energia

Protocolo comum (escopo pelo diff, máx. 3 rodadas, escalar, carimbo `Verified-by:` / `Not-verified:`) vem da skill global `verify`. Aqui só o que é do Quark.

## 1. Checks baratos (nesta ordem, parar no primeiro vermelho)

```bash
npx tsc --noEmit                      # tipos (não há script lint no repo)
npm --prefix backend test             # node --test: auth, rotas e motor de contratos
npx playwright test e2e/contratos.spec.ts   # harness offline (Vite 5180), não toca no banco
```

`npm run build` (tsc + vite build) só quando o diff mexe em config do Vite, imports dinâmicos ou assets.

## 2. Testes que NÃO rodam por padrão

| Spec | Por quê | Quando rodar |
|---|---|---|
| `e2e/proposal-save.spec.ts` | **Escreve no Supabase de produção** (salva orçamento em leads reais) e usa `127.0.0.1:5199` fixo em vez do `baseURL` | Só com ok explícito do Arthur, com Vite subido na 5199 |
| `e2e/contratos-real.spec.ts` | Gera versão real de contrato; pula sozinho sem `E2E_BASE_URL`, `QA_EMAIL`, `QA_PASSWORD`, `QA_PROPOSTA_ID` | Quando o Arthur fornecer a conta de QA e a proposta de teste |

## 3. Subir o app

- Frontend: `npm run dev` → http://localhost:5173 (use `preview_start`; criar `.claude/launch.json` se faltar).
- Backend: `npm run server` → porta **3005** (vem de `PORT` no `.env`; o default do código é 3001, mas o proxy `/api` e `/agent` do Vite aponta para 3005).
- Login: tela `/login` (`nome@empresa.com` + senha). Os E2E usam o bypass `localStorage.quark_offline_user` (ver `src/contexts/AuthContext.tsx`); nunca digite senha real — peça ao Arthur para logar no browser se precisar de sessão Supabase.
- Banco: só leitura via MCP `supabase_quark` (ref `sumydaewtszecrvdgoku`). Nunca criar/editar registro para "testar" sem ok.

## 4. Feature map (roteiro e rubrica)

Exercite só as linhas cujo gatilho aparece no diff. Em cada uma: sem erro em `read_console_messages`, sem 4xx/5xx inesperado em `read_network_requests`.

| Fluxo | Gatilho no diff | Caminho | Resultado esperado |
|---|---|---|---|
| Dimensionamento / novo orçamento | `pages/ProposalEditorPage`, `components/proposal/editor*`, `lib/pricing`, `lib/quick-estimate`, `lib/proposal-summary` | `/propostas/nova?lead=<id>` → conta de luz (`placeholder "Ex.: 450"`) → kit em `#sec-kit select` | kWp, nº de placas, geração mensal, economia e payback coerentes com a conta; sem `NaN`/`R$ 0,00` |
| Salvar orçamento | `lib/save`, `lib/proposal-actions`, editor | botão "Salvar orçamento" / "Salvar" | Redireciona para `/propostas/:id`, toast "Orçamento salvo com sucesso!", botão não fica preso em loading (**escreve no banco: pedir ok**) |
| PDF da proposta | `components/proposal/document*`, `lib/pdf-image`, `lib/proposal-content` | abrir proposta → exportar PDF | PDF baixa, abre, sem página em branco, números iguais aos da tela, imagens/fontes carregadas (inspecionar com Read no PDF) |
| Proposta pública | `pages/PublicProposal`, `lib/proposal-tracking` | `/p/:token` | Abre sem login, mesmos valores do editor |
| Contrato | `backend/contratos/**`, `backend/routes/contratos*`, `pages/Contracts`, `lib/contractPdfGenerator` | proposta aceita → `data-testid="abrir-gerar-contrato"` → `gerar-contrato` | Prévia cláusula 31 reflete a forma de pagamento; contrato gerado. Coberto por `contratos.spec.ts` (harness) |
| Assinatura | `pages/PublicDocumentSign` | `/assinar/:token` | Página abre sem login e mostra o documento |
| CRM / Kanban | `pages/CRM`, `lib/crm*`, `lib/cadence` | `/crm` | Colunas carregam, card arrasta e mantém posição após reload |
| Captura de lead | `pages/PublicCapture`, `pages/BioLanding`, `lib/crm-leads` | `/captura`, `/bio` | Formulário valida e cria lead (**escreve no banco: pedir ok**) |
| Automações WhatsApp/ManyChat | `backend/server.js` (webhooks), `whatsapp-backend/**` | `curl` no endpoint local na 3005 | Status 2xx com payload de exemplo; sem envio real de mensagem |

## 5. Armadilhas conhecidas

- O worktree costuma ter mudanças não commitadas do Arthur: verifique o diff inteiro, mas não reverta nada que não seja seu.
- `openreply/` e `scratch/` têm suítes próprias e não fazem parte do app; não rode a menos que o diff toque nelas.
