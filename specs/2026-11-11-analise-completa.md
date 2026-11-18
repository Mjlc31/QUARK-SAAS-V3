# Análise completa — o que falta no Quark OS V3 (2026-11-11)

## Como foi testado
- Playwright MCP, sessão logada (Arthur), front em `127.0.0.1:5180`, backend em `3005`.
- 26 telas internas: carga, console, rede, e clique em cada botão distinto (até 40 por tela). Escritas no Supabase/backend foram bloqueadas na rede; botões destrutivos ou de envio (excluir, salvar, enviar WhatsApp, disparar, publicar, baixar) foram pulados de propósito.
- Mesmas 26 telas em 375×812 (celular).
- Banco: só SELECT via MCP `supabase_quark` + advisors. Nada foi alterado.
- **Não testado:** portal do cliente logado (precisa de senha de cliente), fluxos que gravam (criar lead, mover card, salvar proposta, emitir recibo/contrato, assinatura), envio real de WhatsApp, publicação no Instagram, OCR com fatura real.

## Resultado geral
- 26/26 telas carregam, 0 crash, 0 erro vermelho de console, 0 resposta HTTP ≥ 400.
- ~190 botões clicados; nenhum quebrou a tela.

## P0 — Segurança (antes de qualquer deploy)
1. Webhook Evolution sem autenticação (`backend/server.js:307`): POST forjado faz o agente responder no WhatsApp.
2. RPC `get_client_auth_email` aberta ao `anon` com prefixo de 6 dígitos: enumeração CPF → e-mail.
3. Backend sem `SUPABASE_SERVICE_ROLE_KEY`: roda com anon key; gravações server-side são barradas pela RLS.
4. Webhook da Evolution registrado com IP fixo `192.168.0.149` (`backend/server.js:222`): só funciona naquela rede.
5. Leaked password protection desligado no Supabase Auth.

## P1 — Erros funcionais e de dados
6. **Equipe mostra clientes como membros**: "Online 1/74" e tabela com 65 perfis `client`, "Test User", "Admin User", "pentest+quark". O filtro de responsáveis em Tarefas tem o mesmo problema (`storageService.ts:434` lê `profiles` sem filtrar role).
7. **3 perfis de teste/pentest** em produção.
8. **15/15 oportunidades Ganho com `system_power` = 0**: Engenharia mostra "0 kWp"; potência não vem da proposta.
9. **Engenharia parada**: 14 obras em `venda_confirmada`, 8 delas sem avanço desde 02/11.
10. **Contratos**: 0 emitidos, 15 clientes aguardando.
11. **Financeiro incompleto**: 16 receitas (R$ 277 mil) mas só 6 custos e 6 despesas — DRE real superestima lucro; novembro/2026 zerado.
12. **Propostas com status misturado**: `enviada`/`rascunho` e `sent`/`draft` convivem; filtros "Enviadas/Rascunhos" perdem 4 registros. Só 1 proposta `aceita` para 15 vendas.
13. **CRM sujo**: 107 leads, 90 sem valor; 34 oportunidades sem telefone (7 delas Ganho); Dashboard acusa 125 pendências críticas e leads "sem contato há 186 dias".
14. **Portal**: 9 de 75 clientes sem login e sem CPF — não conseguem entrar.
15. **Inteligência**: 15 de 65 usinas sem geração; 1 sem cliente vinculado; muitas sem data de instalação/manutenção.
16. **Relatórios**: CAC cai no valor fixo R$ 480 quando não há gasto de marketing lançado, mas é exibido como "Tempo Real" (`Reports.tsx:74,164`).
17. **Robô de Faturas**: mostra "ONLINE" e horários de execução com 0 logins configurados.
18. **Alertas de Manutenção**: vazio; nenhuma regra gera alertas apesar de 21 obras finalizadas.
19. **Vendedor fixo** ("Arthur Duda", telefone) em proposta pública, documento e backend (`PublicProposal.tsx:32`, `proposals.js:82,111`, `client.ts:514`): proposta de outro vendedor sai com o nome errado.
20. Hooks com dados `SAMPLE_*` de fallback (tickets, manutenção, alertas, inteligência, tracking, clientes): se o banco falhar, a tela mostra dado fictício como se fosse real.
21. Número de recibo e de orçamento rápido gerado por `Math.random()` — pode repetir.
22. `VITE_BACKEND_URL` cai em `localhost:3001` em 3 arquivos, mas o backend usa 3005.

## P2 — Usabilidade
23. **11 modais não fecham com Esc**: Links de captura (CRM), Novo/Editar Kit, Histórico de Preços, Configurações (Propostas), Nova Tarefa, Adicionar Item, Lançamento Rápido, Novo Contrato, Novo Cliente Intel, Novo Serviço. Só 2 de ~30 modais têm `role="dialog"`.
24. **Celular (375px)**: estouro horizontal em Dashboard, Clientes, Conversas, Social Studio, Ferramentas, Ranking, Orçamento Rápido, Equipe, Calculadora, Contratos. Social Studio tem 96 botões menores que 28px.
25. Botões só com ícone e sem rótulo acessível: 26 em Tarefas, 12 em Produtos, 2 em Manutenção.
26. Clientes: "Próxima Página" não recebe o clique (elemento coberto/fora da área).
27. Tickets (admin): lista sem nenhuma ação visível (responder, mudar status).
28. Imagens externas bloqueadas pelo navegador: Unsplash no Social Studio, link do Google Drive em Ferramentas.
29. `/propostas` aborta a chamada `/api/proposals` (timeout de 2 s) em toda carga.

## P3 — Engenharia
30. Sem testes automatizados no front (só `backend/middleware/auth.test.js`); sem CI (`.github/workflows` não existe); sem ESLint.
31. Scripts `scripts/qa_*.mjs` dão PASS vazio (anon key).
32. 307 usos de `any`; páginas de 1.100–1.900 linhas (ClientCatalog, SocialStudio, Contracts, CRM, Financial).
33. Bundle: react-pdf 1,4 MB, recharts 574 kB, index 457 kB.
34. Banco: 15 índices duplicados, 73 não usados, `pg_net` no schema public.
35. 14 arquivos modificados + 3 migrations sem commit desde o lockdown de 06/11.
36. Persistência dupla de propostas (localStorage + JSON no backend + Supabase) — fonte de divergência.
37. Dev: `localhost:5173` colide com o EngenharQ.

## Andamento (2026-11-11)
- **Item 1 — feito:** webhook da Evolution exige `EVOLUTION_WEBHOOK_SECRET` (`?token=` ou header `x-webhook-secret`); sem segredo configurado nega tudo. Verificado: sem token 401, token errado 401, token certo 200, nas duas rotas.
- **Item 4 — feito:** URL do webhook vem de `WEBHOOK_BASE_URL` (IP antigo só como fallback).
- **Item 6 — feito:** diretório de usuários ignora `role = 'client'`. Equipe passou de 1/74 para 1/9; filtro de Tarefas idem.
- **Item 7 — pendente de decisão:** 6 contas de equipe falsas com login ativo (projetos, 2× Test User, 2× Admin User, pentest+quark) e 1 "Admin" @engenharq.com com 2 oportunidades.
- **Item 2 — pendente de decisão:** login do portal usa 6 dígitos do CPF como usuário **e** como senha inicial; a RPC anônima ainda devolve o CPF completo no e-mail sintético e provisiona conta. Corrigir muda como o cliente entra.
- **Itens 3 e 5 — dependem do Arthur:** `SUPABASE_SERVICE_ROLE_KEY` no `.env` e leaked password protection no painel do Supabase.

## Banco — migração `data_hygiene_20261111` aplicada (2026-11-11)
- 16 índices duplicados removidos (item 34).
- Propostas: `draft`→`rascunho` (3), `sent`→`enviada` (1) (item 12).
- Potência preenchida em 12 das 15 vendas Ganho a partir do cadastro do portal; pró-labore do Coronel Cleydson corrigido de 5 para 16,38 kWp / 30 módulos (item 8). Sem fonte: Almir Ilário, Everson, Jeferson.
- Conferido depois: totais financeiros idênticos (receita 277.194,23 · custo 25.333,90 · despesa 3.569,78), lucro do pró-labore 101.839,35, 15/15 vendas com receita 1:1.
- **Não aplicado:** remoção das 5 contas de teste (`supabase/pending_remove_test_accounts.sql`). A conta "projetos" é real (dona de 15 lançamentos) e fica.
- Rollback: `supabase/rollback/20261111_data_hygiene_rollback.sql`.
