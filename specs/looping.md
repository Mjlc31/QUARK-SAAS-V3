# Especificação Técnica: Auditoria E2E Ampla com Playwright e Revisão de Código

> **Arquivo:** `specs/looping.md`  
> **Status:** Pronta para `/build`  
> **Gerada em:** 02 de Novembro de 2026, 21:17 BRT  

---

## 1. Objetivo
Executar uma auditoria abrangente de ponta a ponta no sistema Quark SaaS Enterprise utilizando o MCP do Playwright para navegar, interagir, clicar e inspecionar todas as 25 telas da aplicação rodando em ambiente local integrado ao Supabase real (`supabase_quark`). O foco principal é validar a operacionalidade dos botões, acionamento de modais, alertas e, criticamente, a logística de comunicação de dados entre os módulos (CRM, Propostas, Contratos, Clientes, Obras, Financeiro e Dashboard), corrigindo falhas de runtime, interações inoperantes e dessincronizações de dados diretamente no código.

## 2. Usuários-Alvo & Contexto
- **Usuários:** Vendedores, orçamentistas, gestores de obras, diretores financeiros, administradores e clientes finais no portal.
- **Ambiente de Testes:** Aplicação local rodando no Vite (`http://localhost:5173`) com backend Node/Express (`http://localhost:3005`) conectado ao banco de dados Supabase real (`sumydaewtszecrvdgoku.supabase.co`).
- **Ferramenta de Auditoria:** MCP do Playwright (navegação, snapshots de DOM, cliques em botões, checagem de erros de console e inspeção visual).

## 3. Requisitos Exatos

### 3.1 Requisitos Indispensáveis (P0 - Must-Have)
- [ ] **REQ-01 (Inicialização dos Servidores Locais):** Iniciar e manter ativos o frontend Vite (`http://localhost:5173`) e o backend Express (`http://localhost:3005`), garantindo conectividade com a API e com o Supabase.
- [ ] **REQ-02 (Navegação E2E Ampla nas 25 Telas via Playwright):** Acessar sistematicamente cada uma das 25 telas do sistema (Dashboard, Leads/CRM, Ranking/Arena, Oferta Rápida, Prospecção, WhatsApp/Conversas, Propostas, Contratos, Tabela de Preços, Calculadora, Equipe/Metas, Acompanhamento de Obras, Tarefas, Clientes, Manutenção, Alertas de Manutenção, Ferramentas/Recibos, Inteligência de Clientes, Relatórios, Robô Concessionária, Social Studio, Suporte/Tickets Admin e telas do Portal do Cliente).
- [ ] **REQ-03 (Teste Interativo de Botões, Modais e Ações):** Em cada tela, inspecionar botões principais (novo lead, exportação, filtros, abas internas, abertura de modais, alternância de visualizações) verificando se disparam as ações corretas sem congelamentos ou erros não tratados.
- [ ] **REQ-04 (Auditoria da Logística e Conversa de Dados Entre Módulos):** Verificar se as alterações e criações de registros em uma etapa refletem com fidelidade nas outras telas conectadas (ex: status de leads refletindo no funil do CRM, métricas consolidadas no Dashboard, clientes disponíveis para contratos/obras).
- [ ] **REQ-05 (Correção Imediata de Bugs e Falhas no /build):** Aplicar correções de código cirúrgicas caso sejam detectados botões sem handler, quebras de layout, exceções não tratadas ou bugs de sincronização de estado.
- [ ] **REQ-06 (Compilação Limpa e Build 100% Verde):** Garantir que `npx tsc --noEmit` finalize com 0 erros e `npm run build` conclua com êxito após todas as intervenções.

### 3.2 O que NÃO fazer (Fora de Escopo)
- **REGRA MANDATÓRIA ABSOLUTA:** **NUNCA modificar o arquivo `src/pages/Proposals.tsx`** sob qualquer hipótese.
- NÃO realizar migrações destrutivas de banco (como `DROP TABLE` ou expurgo de dados existentes de produção no Supabase).
- NÃO alterar dependências no `package.json` (nem adicionar nem remover pacotes).
- NÃO alterar o design system visual ou identidade estética do sistema.

## 4. Fluxos de Usuário & Roteiro de Teste Playwright
1. **Passo 1 (Subida dos Serviços):** Subir os serviços locais (frontend na porta 5173 e backend na porta 3005) e verificar disponibilidade HTTP.
2. **Passo 2 (Auditoria das Telas Comerciais & CRM):**
   - Iniciar pelo **Dashboard** (`/`), conferir cards de receita, pipeline ativo e taxa de conversão.
   - Navegar para **Leads & CRM** (`/crm`), testar colunas Kanban, modal de novo lead, filtros de pesquisa.
   - Navegar para **Ranking / Arena** (`/ranking`), verificar líderes de vendas e pontuação.
   - Navegar para **Oferta Rápida** (`/quick-quote`), testar cálculo instantâneo e geração de simulação.
   - Navegar para **Prospecção** (`/prospeccao`), checar listagem de prospects e filtros de cidade.
   - Navegar para **WhatsApp & IA** (`/conversations`), testar seleção de conversas e carregamento de mensagens.
   - Navegar para **Propostas** (`/proposals`), verificar listagem de orçamentos (**sem alterar o arquivo `Proposals.tsx`**).
   - Navegar para **Contratos** (`/contracts`), testar criação de minuta, abas de status e filtros.
   - Navegar para **Tabela de Preços** (`/pricing-table`), verificar kits solares e margens.
   - Navegar para **Calculadora** (`/calculator`), testar inputs de consumo, geração de payback e dimensionamento.
3. **Passo 3 (Auditoria das Telas Operacionais & Gestão):**
   - Navegar para **Equipe & Metas** (`/team`), verificar vendedores e comissões.
   - Navegar para **Acompanhamento de Obras** (`/engineering`), testar kanban de obras e etapas técnicas.
   - Navegar para **Tarefas** (`/tasks`), testar adição e filtro de tarefas.
   - Navegar para **Clientes** (`/clients`), verificar listagem de clientes, catálogo e detalhes.
   - Navegar para **Manutenção & Alertas** (`/maintenance` e `/maintenance-alerts`), checar histórico de chamados e alertas de telemetria.
   - Navegar para **Ferramentas / Recibos** (`/receipts`), testar emissão e visualização de recibos.
   - Navegar para **Inteligência de Clientes** (`/client-intelligence`), testar análise de faturas e predição.
   - Navegar para **Relatórios** (`/reports`), verificar filtros de data e gráficos gerados.
   - Navegar para **Robô Concessionária** (`/utility-robot`), testar credenciais e status de faturas.
   - Navegar para **Social Studio** (`/social-studio`), testar carrossel de posts, agendamento e métricas.
   - Navegar para **Suporte / Tickets Admin** (`/tickets-admin`), verificar fila de atendimento.
4. **Passo 4 (Auditoria do Portal do Cliente):**
   - Acessar `/portal`, testar autenticação e abas de tracking, pagamentos, tickets e loja de pontos.
5. **Passo 5 (Consolidação e Correção):**
   - Registrar qualquer inconsistência de botão ou sincronização, corrigir cirurgicamente o arquivo correspondente, retestar e rodar a validação de build.

## 5. Casos Extremos & Tratamento de Erros (Edge Cases)

| Cenário / Falha | Comportamento Esperado |
| :--- | :--- |
| **Elemento demorando a carregar** | Aguardar o seletor correspondente com timeout adequado antes de falhar o teste. |
| **Botão sem `onClick` ou com função vazia** | Identificar a intenção da interface e implementar a lógica correspondente (ou acionar toast contextual). |
| **Divergência entre dados do Supabase e estado local** | Assegurar que os hooks utilizem invalidação de cache do React Query ou `useLive`/`useApp` para sincronização consistente. |
| **Proteção estrita de `src/pages/Proposals.tsx`** | Confirmar via `git status` que o arquivo jamais sofreu qualquer edição. |

## 6. Restrições Técnicas & Arquitetura
- **Stack:** React 18, Vite 5, Tailwind CSS, TypeScript 5, Supabase, Lucide Icons, Node.js Express.
- **Auditoria:** Playwright MCP (`browser_navigate`, `browser_snapshot`, `browser_click`, `browser_take_screenshot`).
- **Padrões de Código:** Seguir estritamente `.agents/AGENTS.md` e skills `code-review`, `fullstack-developer` e `clean-code`.

## 7. Definição Concreta de "Concluído" (Definition of Done)
Checklist rigoroso de verificação para aprovação no `/review`:
- [ ] Servidores locais ativos e responsivos no ambiente de testes.
- [ ] Todas as 25 telas navegadas e inspecionadas via Playwright.
- [ ] Botões interativos, modais e transições operacionais sem erros bloqueantes no console.
- [ ] Logística de dados consistente entre telas relacionadas.
- [ ] `src/pages/Proposals.tsx` mantido 100% intocado (`git diff` vazio para este arquivo).
- [ ] `npx tsc --noEmit` executa com exatamente 0 erros.
- [ ] `npm run build` completa a compilação com êxito gerando os assets de produção.
- [ ] Relatório completo de auditoria emitido e aprovado pelo `/review`.
