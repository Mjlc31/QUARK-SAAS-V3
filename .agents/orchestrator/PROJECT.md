# Project: Quark SaaS

## Architecture
- **Stack**: React + Vite + TailwindCSS + Supabase + Face Recognition (evolution-api / tfjs or equivalent)
- **Backend/DB**: Supabase (PostgreSQL schema em `supabase/schema.sql`, Auth, Storage, RLS)
- **Módulos (8)**:
  1. Dashboard: Visão geral, métricas de Propostas, entregas, pendências, alertas.
  2. Scanner: Leitura de QR Code e Automação de WhatsApp em tempo real para entrega/devolução de Propostas.
  3. Assets: Gestão de Propostas/Equipamentos (CRUD, estoque, validade, CA).
  4. Workers: Gestão de Leads (CRUD, cadastro facial/de automação, cargos, Propostas associados).
  5. Sites: Gestão de Engenharia/Canteiros (CRUD, Leads alocados, inventário da obra).
  6. Map: Relatórios Financeiros com localização dos canteiros de obra e ativos.
  7. Tags: Geração e impressão de Módulo Financeiro QR Code para Propostas e crachás.
  8. Audit: Relatórios de conformidade e auditoria com base na regras financeiras.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Diagnostic | Analisar codebase existente, schema Supabase, pacotes e estado dos 8 módulos | None | DONE |
| 2 | DB & Auth Integration | Aplicar/Validar schema Supabase, cliente Supabase, Auth e rotas protegidas | M1 | DONE |
| 3 | Core Modules Implementation | Desenvolver/Refinar os 8 módulos (Dashboard, CRM, Propostas, Engenharia, Financeiro, WhatsApp) | M2 | DONE |
| 4 | Biometric Face Verification | Implementar Automação de WhatsApp no Scanner e cadastro de referência em Workers | M3 | DONE |
| 5 | E2E & Integrity Audit | Testes E2E, validação de compilação/build, testes de rejeição/aprovação de automação e Auditoria Forense | M4 | DONE |

## Interface Contracts
### Supabase Client ↔ App Modules
- Client singleton exportado em `src/lib/supabase.ts` ou `src/services/supabase.ts`.
- Tabelas principais: `profiles` / `workers`, `assets` / `Propostas`, `sites` / `Engenharia`, `deliveries` / `movimentacoes`, `audit_logs`.

### Biometric Engine ↔ Scanner / Workers Module
- Cadastro: Captura e extração de embedding/descriptor facial armazenado no perfil do trabalhador.
- Verificação: Match em tempo real no Scanner comparando o descriptor ao vivo com o descriptor cadastrado do trabalhador. Rejeita rostos sem match e aprova correspondências válidas.

## Code Layout
- `src/components/`: Componentes reutilizáveis de UI (TailwindCSS, Lucide icons, etc.)
- `src/pages/` ou `src/modules/`: Páginas dos 8 módulos
- `src/lib/`: Integrações com Supabase, Face API, helpers
- `src/types/`: Interfaces TypeScript para todas as entidades
- `supabase/`: Migrações e `schema.sql`
