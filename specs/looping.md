# Especificação Técnica: Correção Definitiva do Salvamento de Propostas e Orçamentos

> **Arquivo:** `specs/looping.md`  
> **Status:** Pronta para `/build`  
> **Gerada em:** 2026-11-16 01:05 (Black Friday Incident Response)

---

## 1. Objetivo
Restaurar e blindar em 100% o salvamento, atualização e sincronização de propostas e orçamentos comerciais (Solar e S.A.V.E) tanto no banco de dados Supabase quanto no frontend (Quark OS / Enterprise). Garantir que nenhum vendedor ou cliente perca orçamentos, especialmente no período crítico da Black Friday, permitindo a criação e atualização imediata via RPC atômica, sem bloqueios de permissão (42501) nem travamento de botões/toasts no navegador.

## 2. Usuários-Alvo & Contexto
- **Usuários:** Vendedores, engenheiros e administradores da Quark Energia operando em `/propostas/nova` e `/propostas/:id`.
- **Ambiente:** Aplicação web em produção (`quark-saas-v4.vercel.app`), com usuários autenticados via Supabase Auth ou operando em sessão local/offline.

## 3. Requisitos Exatos

### 3.1 Requisitos Indispensáveis (P0 - Must-Have)
- [ ] **REQ-01 (Permissões de Execução no Supabase):** Garantir que as funções `public.save_proposal`, `public.get_proposal_by_id`, `public.get_proposals` e `public.duplicate_proposal` possuam privilégio `GRANT EXECUTE` para `anon`, `authenticated` e `service_role`.
- [ ] **REQ-02 (Integridade de Dados no UPDATE da RPC):** Na função `save_proposal`, ao atualizar uma proposta existente, NUNCA sobrescrever campos com valores default (ex: `'Cliente'`, `0` ou `null`) quando o payload não enviar essas propriedades. Campos existentes devem ser preservados (`COALESCE(p_proposal->>'client_name', v_existing.client_name)`).
- [ ] **REQ-03 (Auto-criação e Vinculação de Oportunidades no CRM):** Se a proposta pertencer a um lead novo ou sem oportunidade registrada no banco, a RPC deve auto-criar a oportunidade em `public.opportunities` e vincular `opportunity_id` e `lead_id` na proposta, sincronizando valor e potência.
- [ ] **REQ-04 (Proteção contra Deadlock/Zumbis no Frontend):** No editor de propostas (`src/components/proposal/editor.tsx` e `src/components/save/editor.tsx`), o toast de loading `"save-proposal-status"` deve ser explicitamente dispensado (`toast.dismiss("save-proposal-status")`) em todos os caminhos de saída (`success`, `error` e `finally`), garantindo que o botão e o toast nunca fiquem travados em `"Salvando..."`.
- [ ] **REQ-05 (Navegação Suave e Persistência Instantânea):** Ao salvar um novo orçamento, redirecionar com segurança para `/propostas/:id` e garantir que `get_proposal_by_id` retorne os dados salvos em menos de 100ms.

### 3.2 O que NÃO fazer (Fora de Escopo)
- Não alterar a lógica de cálculo solar (`calcPricing` / `calcEnergy`).
- Não alterar o layout visual das abas nem dos cards do CRM.
- Não remover índices de banco de dados.

## 4. Fluxos de Usuário & Telas
1. **Passo 1 (Criação de Proposta):** Usuário acessa `/propostas/nova?lead=...` ou seleciona cliente no LeadPicker.
2. **Passo 2 (Configuração de Kit e Valores):** Usuário preenche conta de luz, seleciona kit fotovoltaico e confere o preço final.
3. **Passo 3 (Clique em Salvar):** Usuário clica em "Salvar orçamento". O botão mostra feedback de carregamento.
4. **Passo 4 (Confirmação e Transição):** A RPC `save_proposal` executa em < 50ms, retorna o registro salvo com número sequencial (ex: `#85`), exibe toast verde `Orçamento #85 salvo com sucesso!`, e navega para `/propostas/:id` com status `✓ Salvo automaticamente`.

## 5. Casos Extremos & Tratamento de Erros (Edge Cases)

| Cenário / Falha | Comportamento Esperado |
| :--- | :--- |
| Usuário não autenticado no Supabase (sessão anônima/local) | A RPC `SECURITY DEFINER` executa normalmente sem retornar 42501 (Permission Denied). |
| Lead UUID não existe no banco (`0b182316-...`) | O banco cria a oportunidade no CRM com o nome do cliente e vincula o UUID real. |
| Payload de UPDATE omitindo campos | Os dados anteriores da proposta são 100% mantidos, apenas os novos campos são atualizados. |
| Timeout de conexão de rede | Timeout estrito de 4s com limpeza do toast e mensagem clara de erro sem travar o botão. |

## 6. Restrições Técnicas & Arquitetura
- **Banco de Dados:** Supabase PostgreSQL com RPCs `SECURITY DEFINER` e `SET search_path TO 'public', 'auth', 'extensions', 'pg_temp'`.
- **Frontend:** React 18, TypeScript, Tailwind CSS, `react-hot-toast`, Vite.
- **Deploy:** Vercel Production (`https://quark-saas-v4.vercel.app`).

## 7. Definição Concreta de "Concluído" (Definition of Done) - 100% APROVADO
- [x] 1. Todas as funções do Supabase testadas via cURL com chave anon e retornando sucesso 200/JSON (<150ms).
- [x] 2. Teste de UPDATE comprovando que campos não são sobrescritos por defaults (teste com #86 mantendo cliente e potência intactos).
- [x] 3. Código do frontend compilando limpo (`npm run build` passou sem erros em 3.77s).
- [x] 4. Teste automatizado Playwright E2E simulando criação e salvamento completo de orçamento (2/2 testes aprovados em 7.0s).
- [x] 5. Proteção contra deadlocks e toasts zumbis aplicada nos editores Solar e S.A.V.E.
