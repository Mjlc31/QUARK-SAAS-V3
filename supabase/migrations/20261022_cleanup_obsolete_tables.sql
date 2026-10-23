-- ==============================================================================
-- QUARK SAAS V3 - LIMPEZA DE TABELAS OBSOLETAS E DESUSADAS (CLEANUP)
-- Project: sumydaewtszecrvdgoku (QUARK SAAS V3)
-- Date: 2026-10-22
--
-- Motivo: Estas 10 tabelas são heranças de templates antigos ou modelos duplicados
-- que NÃO são chamadas nem no frontend (React) nem no backend (Node.js).
-- Elas poluem o Table Editor do Supabase gerando confusão operacional.
-- ==============================================================================

-- 1. Tabelas de tarefas duplicadas (O sistema usa apenas public.tasks e public.activities)
DROP TABLE IF EXISTS public.active_tasks CASCADE;
DROP TABLE IF EXISTS public.opportunity_tasks CASCADE;

-- 2. Tabela de contexto duplicada (O sistema usa apenas public.client_intelligence)
DROP TABLE IF EXISTS public.client_context CASCADE;

-- 3. Tabela de kits solares descontinuada (O sistema usa settings.data->'kits' e public.products)
DROP TABLE IF EXISTS public.solar_kits CASCADE;

-- 4. Tabela de versionamento descontinuada (O sistema usa public.proposals.inputs e versionamento direto)
DROP TABLE IF EXISTS public.proposal_versions CASCADE;

-- 5. Tabelas de campanhas do Instagram abandonadas
DROP TABLE IF EXISTS public.instagram_logs CASCADE;
DROP TABLE IF EXISTS public.instagram_campaigns CASCADE;

-- 6. Tabela de telemetria descontinuada
DROP TABLE IF EXISTS public.usage_daily CASCADE;

-- 7. Tabelas genéricas de CRM antigo tipo Salesforce (O sistema Quark usa public.leads, public.opportunities e public.client_portal_users)
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.accounts CASCADE;
