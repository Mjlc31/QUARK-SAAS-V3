# 🛡️ Relatório de Auditoria de Banco de Dados: Quark SaaS (Supabase)

**Data da Auditoria:** 25 de Agosto de 2026
**Auditor:** `quark-supabase-dba` (Engenheiro de Banco de Dados)

---

## 📊 Resumo Executivo
**Nota Geral: 5.5 / 10**

O banco de dados passou por evoluções significativas recentemente (como a introdução de RLS rígido e chaves estrangeiras apropriadas). No entanto, o design atual sofre de uma "síndrome de NoSQL no PostgreSQL", abusando de colunas `JSONB` para armazenar dados altamente estruturados. Além disso, foram identificados gargalos críticos de performance em visualizações materializadas e consultas em campos não indexados.

---

## 🔍 1. Análise da Última Migration (`20260820_indexes_views_rls.sql`)
A migration mais recente introduziu boas práticas (índices B-Tree em chaves estrangeiras e RLS granular), mas deixou passar **Gargalos de Performance Críticos**:

1. **Materialized View "Morta":** A view `mv_monthly_financial_summary` foi criada, mas **não há nenhuma rotina para atualizá-la**. Views materializadas no Postgres não se atualizam sozinhas. 
   - **Correção:** É necessário criar um `TRIGGER` na tabela `financial_transactions` ou um job via `pg_cron` para executar `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_financial_summary`.
2. **Consultas em JSONB sem Índices Específicos:** Como as tabelas `leads`, `tasks`, `projects` e `products` armazenam os dados de negócio (ex: `status`, `email`, `cpfCnpj`) dentro de uma coluna `data JSONB`, as consultas de listagem e filtro feitas pelo frontend exigem varreduras sequenciais (Seq Scan) lentas.
   - **Correção:** Criar *Expression Indexes*. Exemplo: `CREATE INDEX idx_leads_status ON public.leads ((data->>'status'));`.
3. **Ausência de Índices B-Tree em Textos:** O GIN Index criado para a coluna `data` (`leads_data_gin_idx`) é bom para busca de chaves genéricas, mas ineficiente para ordenação (`ORDER BY`) ou buscas de igualdade exata de atributos internos frequentes.

---

## ⚡ 2. Automações: Edge Functions vs. Database Triggers
- **Diagnóstico:** O diretório `supabase/functions/` não existe. O projeto **não possui Edge Functions**. Todo o peso da regra de negócio parece estar sobrecarregando o Node.js/Frontend.
- **Recomendação de Triggers:** 
  1. **Timestamps:** Um trigger global de `moddatetime` deve ser ativado para gerenciar o `updated_at` automaticamente.
  2. **Soft Deletes & Histórico:** Triggers podem registrar as alterações da interface `LeadHistoryLog` de forma transacional, sem que o frontend precise fazer dois `inserts`.
  3. **Refresh de Views:** O trigger para dar refresh na Materialized View do financeiro é obrigatório.
- Quando usar Edge Functions? Se houver integrações de terceiros (ex: enviar email no fechamento do lead, disparar webhook do WhatsApp).

---

## 🛡️ 3. Políticas de Backup, Cascading e Integridade (FKs)
### Deleções em Cascata (ON DELETE CASCADE)
A migration de consolidação incluiu `ON DELETE CASCADE` para relações. Além disso, as tabelas têm `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`.
- **Risco Crítico (CUIDADO):** O cascade no `auth.users` significa que se um usuário for deletado na dashboard de Auth, **TODOS** os Leads, Projetos e Tarefas daquele usuário desaparecerão sem rastro.
- **Solução (Soft Delete):** Mudar para `ON DELETE RESTRICT` ou implementar uma arquitetura de "Soft Delete" (coluna `deleted_at`) nas tabelas principais.

### Integridade Referencial Quebrada (JSONB)
Como o schema do frontend (`types.ts`) define que um `Project` possui `clientId: string`, mas o banco guarda isso dentro do `data JSONB` da tabela `projects`, **não existe constraint de Foreign Key garantindo que o lead associado ao projeto realmente exista**.

### Backup
- **Recomendação:** Habilitar **PITR (Point-in-Time-Recovery)** no Supabase, permitindo reverter o banco para qualquer segundo específico em caso de desastre (como uma deleção em cascata acidental).

---

## 🏗️ 4. Design de Schema: O Problema do JSONB
O maior erro de arquitetura atual é tratar o PostgreSQL como MongoDB. As tabelas principais foram definidas como `id TEXT, data JSONB`.
* **Problema:** Perda de tipagem forte, impossibilidade de criar constraints `NOT NULL`, constraints de integridade relacional, `UNIQUE` (ex: emails duplicados) e validações automáticas.
* **Solução (Urgente):** Migrar de `JSONB` para **colunas estruturadas reais**. 
  * `leads(id, name, phone, email, status, ...)` em vez de `leads(id, data)`. 

---

## 🗂️ 5. Organização das Migrations (Caos de Patches)
Há pelo menos 15 scripts SQL soltos na pasta de migrations (`supabase_DEFINITIVO_v3.sql`, etc).
- **Recomendação:** Consolidar todo esse histórico em uma estrutura *Declarative Schema* usando a CLI atualizada do Supabase, ou fazer um `squash` das migrations em um único `00001_init.sql`.

---

## ✅ Checklist de Ações Recomendadas (Priorizado)

### 🔴 Crítico (Fazer Imediatamente)
- [ ] Criar trigger/função para realizar `REFRESH MATERIALIZED VIEW mv_monthly_financial_summary`.
- [ ] Criar *Expression Indexes* B-Tree para os campos mais acessados no `data JSONB`.

### 🟠 Alta (Próximo Sprint)
- [ ] Refatorar as tabelas principais (`leads`, `projects`, `tasks`, `products`) transformando os campos fixos mapeados no `types.ts` em **colunas tipadas no Postgres**.
- [ ] Adicionar Constraints `UNIQUE` e `CHECK` reais usando as colunas estruturadas.
- [ ] Habilitar o PITR.

### 🟡 Média 
- [ ] Modificar o comportamento de `ON DELETE CASCADE` do `auth.users`.
- [ ] Adicionar triggers de banco para gerenciar a coluna `updated_at`.
- [ ] Criar Edge Functions para integrações (Webhooks).

### 🟢 Baixa
- [ ] Limpar e recriar o histórico de migrations usando o Supabase CLI consolidando as 15 "patches".
- [ ] Alterar IDs do tipo `TEXT` para `UUID`.
