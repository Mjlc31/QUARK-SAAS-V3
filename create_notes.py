import os

base_dir = "/Users/arthurdemoraespd/Documents/obsidian/second brain/Quark SaaS/🎨 Frontend"

files = {
    "MOC Frontend.md": """---
tags: [quark, frontend, moc, react]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---

# 🎨 Frontend — Map of Content

**Overview**: React 18 + Vite + Tailwind CSS v4 + TypeScript

## 📄 Páginas
- [[Dashboard]]
- [[CRM]]
- [[Conversations]]
- [[Calculator]]
- [[Proposals]]
- [[Engineering]]
- [[Financial]]
- [[FollowUp]]
- [[Tasks]]
- [[Products]]
- [[Reports]]
- [[LoginScreen]]
- [[NewPasswordScreen]]

## 🧩 Componentes
- [[AIOCRInvoiceUploader]]
- [[ErrorBoundary]]
- [[FinancialProlabore]]
- [[LeadCPQPanel]]
- [[LeadDetailsPanel]]
- [[ProposalEditor]]
- [[ProposalTemplate]]
- [[Sidebar]]
- [[SkeletonLoader]]

## 📦 Motor de Propostas v4.0
- [[Motor de Propostas v4.0]]
- [[ProposalBuilder]]
- [[ProposalCanvas]]
- [[ProposalPDF]]
- [[BlockRenderer]]
- [[BlockSidebar]]
- [[solarCalc]]
- [[distributors]]
- [[Blocos]]

## 🪝 Hooks
- [[useLeads]]
- [[useFinancial]]

## 🌐 Contextos
- [[AuthContext]]
- [[CrmContext]]
- [[FinancialContext]]
- [[ProjectContext]]
- [[AppContext]]

## 🏪 Store
- [[queryClient]]
- [[useUIStore]]

## 🔌 Serviços
- [[aiOcrService]]
- [[storageService]]

## 📚 Lib
- [[constants]]
- [[supabaseClient]]

## 📐 Architecture
```mermaid
graph TD
    A[AppContext] --> B[AuthContext]
    A --> C[CrmContext]
    A --> D[FinancialContext]
    A --> E[ProjectContext]
```
""",
    "Páginas/Dashboard.md": """---
tags: [quark, frontend, page, dashboard]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# Dashboard
- **Route:** `/`
- **Purpose:** Painel executivo com KPIs: Faturamento total, kWp instalado, Taxa de conversão, Ticket médio.
- **Features:** 
  - Gráfico de evolução de vendas (Recharts)
  - Feed de atividades recentes
- **Integrations:** [[CRM]], [[Reports]], [[Financial]]
""",
    "Páginas/CRM.md": """---
tags: [quark, frontend, page, crm]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# CRM
- **Route:** `/crm`
- **Purpose:** Funil de vendas completo com visão Kanban e Lista.
- **Features:** 
  - Multi-pipeline: Geral, Eventos, Produtos
  - Criação dinâmica de colunas
  - Drag-and-drop com touch support mobile
  - Smart Link WhatsApp
  - Integração OCR de faturas via [[AIOCRInvoiceUploader]]
- **Automation:** ao mover para 'Fechado', cria projeto de engenharia + lançamentos DRE.
- **Uses:** [[CrmContext]], [[LeadDetailsPanel]], [[LeadCPQPanel]]
""",
    "Páginas/Conversations.md": """---
tags: [quark, frontend, page, whatsapp]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# Conversations
- **Route:** `/conversations`
- **Purpose:** Central omnicanal WhatsApp via Socket.io.
- **Features:** 
  - QR Code para conexão
  - Leitura de conversas em tempo real
  - Envio de áudios/anexos
  - Toggle do robô SPIN Agent
  - Pausar/retomar atendimentos
  - Sugestões de resposta via IA
- **Uses:** Socket.io client, [[WhatsApp Backend]]
""",
    "Páginas/Calculator.md": """---
tags: [quark, frontend, page, calculator, solar]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# Calculator
- **Route:** `/calculator`
- **Purpose:** Calculadora solar avançada.
- **Features:** 
  - Suporte a todas as cidades de Alagoas (HSP e tarifas locais)
  - Simulação de perdas azimutais
  - Dimensionamento de inversores e módulos do catálogo
  - Cálculo de financiamento Solfácil e parcelamento cartão
- **Uses:** [[solarCalc]], [[distributors]]
""",
    "Páginas/Proposals.md": """---
tags: [quark, frontend, page, proposals]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# Proposals
- **Route:** `/proposals`
- **Purpose:** Listagem, busca e criação de propostas.
- **Features:** 
  - Conecta ao [[ProposalBuilder]]
- **Uses:** [[ProposalEditor]], [[Motor de Propostas v4.0]]
""",
    "Páginas/Engineering.md": """---
tags: [quark, frontend, page, engineering]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# Engineering
- **Route:** `/engineering`
- **Purpose:** Kanban de acompanhamento de projetos.
- **Features:** 
  - Kanban de 5 fases: Vistoria, Projeto, Homologação, Instalação, Finalizado
  - Anexo de arquivos/fotos em base64
  - Rastreamento de status da usina
- **Uses:** [[ProjectContext]]
""",
    "Páginas/Financial.md": """---
tags: [quark, frontend, page, financial]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# Financial
- **Route:** `/financeiro`
- **Purpose:** Controle financeiro e DRE gerencial detalhada.
- **Features:** 
  - Categorias: Receitas, CPV, Despesas Operacionais
  - Fluxo de caixa mensal
  - Exportação PDF
  - Pro-labore com [[FinancialProlabore]]
- **Uses:** [[FinancialContext]]
""",
    "Páginas/FollowUp.md": """---
tags: [quark, frontend, page, followup]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# Follow Up
- **Route:** `/follow-up`
- **Purpose:** Pós-venda automatizado.
- **Features:** 
  - Mensagens padronizadas de WhatsApp por fase da obra
  - Fases: Vistoria, Projeto, Protocolo, Aprovação, Ligação final
""",
    "Páginas/Tasks.md": """---
tags: [quark, frontend, page, tasks]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# Tasks
- **Route:** `/tasks`
- **Purpose:** Gestão de tarefas.
- **Features:** 
  - Gestão de tarefas com prioridades (Alta, Média, Baixa)
  - Visão lista/calendário
  - Notificações via WhatsApp
  - Integração Google Calendar
""",
    "Páginas/Products.md": """---
tags: [quark, frontend, page, products]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# Products
- **Route:** `/products`
- **Purpose:** Catálogo de equipamentos solares.
- **Features:** 
  - Categorias: Módulos, Inversores, Estruturas, Cabos, String Box, Disjuntores
  - Cálculo automático de valor patrimonial
  - Alerta de estoque baixo
""",
    "Páginas/Reports.md": """---
tags: [quark, frontend, page, reports]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# Reports
- **Route:** `/reports`
- **Purpose:** Dashboard analítico.
- **Features:** 
  - Conversão por vendedor
  - Tempo médio de fechamento
  - CAC e LTV
""",
    "Páginas/LoginScreen.md": """---
tags: [quark, frontend, page, auth]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# Login Screen
- **Route:** N/A (conditional render)
- **Path:** `src/pages/auth/LoginScreen.tsx`
- **Features:** 
  - Login tradicional + Cadastro + Recuperação de senha
  - Modo offline support
""",
    "Páginas/NewPasswordScreen.md": """---
tags: [quark, frontend, page, auth]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# New Password Screen
- **Route:** N/A (recovery mode)
- **Path:** `src/pages/auth/NewPasswordScreen.tsx`
- **Features:** 
  - Definição de nova senha pós-link de email
""",
    "Componentes/AIOCRInvoiceUploader.md": """---
tags: [quark, frontend, component, ocr]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# AIOCRInvoiceUploader
- **Purpose:** Upload de contas de luz, base64, POST `/api/ocr`, preenche consumo e tarifa.
""",
    "Componentes/ErrorBoundary.md": """---
tags: [quark, frontend, component, error]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# ErrorBoundary
- **Purpose:** Classe component, captura erros de renderização, fallback com stack trace.
""",
    "Componentes/FinancialProlabore.md": """---
tags: [quark, frontend, component, financial]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# FinancialProlabore
- **Purpose:** Modal de pro-labore por projeto, cálculo de nota QK, deduções, gráficos pizza Recharts.
""",
    "Componentes/LeadCPQPanel.md": """---
tags: [quark, frontend, component, cpq, crm]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# LeadCPQPanel
- **Purpose:** Configure Price Quote, potência recomendada, preço final, PDF em tempo real.
""",
    "Componentes/LeadDetailsPanel.md": """---
tags: [quark, frontend, component, crm]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# LeadDetailsPanel
- **Purpose:** Drawer/modal de alta densidade, dados PF/PJ, histórico, tags, pipeline, copy WhatsApp via IA.
""",
    "Componentes/ProposalEditor.md": """---
tags: [quark, frontend, component, proposals]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# ProposalEditor
- **Purpose:** Bridge/wrapper retrocompatível, delega para [[ProposalBuilder]].
""",
    "Componentes/ProposalTemplate.md": """---
tags: [quark, frontend, component, proposals]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# ProposalTemplate
- **Purpose:** Template A4 pixel-perfect, html2canvas + jspdf.
""",
    "Componentes/Sidebar.md": """---
tags: [quark, frontend, component, navigation]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# Sidebar
- **Purpose:** Nav lateral desktop + Bottom Navigation mobile, status de conectividade Supabase.
""",
    "Componentes/SkeletonLoader.md": """---
tags: [quark, frontend, component, ui]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# SkeletonLoader
- **Purpose:** Loading skeleton shimmer (Card, KanbanColumn, ListRow, Page).
""",
    "Motor de Propostas v4.0/Motor de Propostas v4.0.md": """---
tags: [quark, frontend, proposals, moc]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# Motor de Propostas v4.0
- **Overview:** Engine avançada de criação e exportação de propostas solares.
- **Components:**
  - [[ProposalBuilder]]
  - [[ProposalCanvas]]
  - [[ProposalPDF]]
  - [[BlockRenderer]]
  - [[BlockSidebar]]
  - [[solarCalc]]
  - [[distributors]]
  - [[Blocos]]
""",
    "Motor de Propostas v4.0/ProposalBuilder.md": """---
tags: [quark, frontend, proposals]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# ProposalBuilder
- **Purpose:** WYSIWYG orchestrator, drag-and-drop @dnd-kit/sortable, preview, persistence, dual PDF export.
""",
    "Motor de Propostas v4.0/ProposalCanvas.md": """---
tags: [quark, frontend, proposals]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# ProposalCanvas
- **Purpose:** A4 workspace Figma-style, dark bg, dotted grid, A4 sheet with shadows.
""",
    "Motor de Propostas v4.0/ProposalPDF.md": """---
tags: [quark, frontend, proposals, pdf]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# ProposalPDF
- **Purpose:** @react-pdf/renderer native HD document.
""",
    "Motor de Propostas v4.0/BlockRenderer.md": """---
tags: [quark, frontend, proposals]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# BlockRenderer
- **Purpose:** Dynamic router for block types.
""",
    "Motor de Propostas v4.0/BlockSidebar.md": """---
tags: [quark, frontend, proposals]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# BlockSidebar
- **Purpose:** Canva/Notion-style sidebar, draggable blocks, color picker, dark/light toggle, typography selector.
""",
    "Motor de Propostas v4.0/solarCalc.md": """---
tags: [quark, frontend, proposals, calc, physics]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# solarCalc
- **Purpose:** Solar physics engine (annual generation, 7% tariff increase, 25yr life, IRR, NPV, ROI, Payback, CO2).
""",
    "Motor de Propostas v4.0/distributors.md": """---
tags: [quark, frontend, proposals, data]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# distributors
- **Purpose:** Brazilian energy distributors database, B1 tariffs, Lei 14.300/2022.
""",
    "Motor de Propostas v4.0/Blocos.md": """---
tags: [quark, frontend, proposals]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# Blocos
- **Purpose:** Overview of all 7 block types: Cover, Financial, GenerationChart, HowItWorks, SocialProof, TechSpecs, Text.
""",
    "Hooks/useLeads.md": """---
tags: [quark, frontend, hooks, react-query]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# useLeads
- **Purpose:** React Query hook for leads table.
""",
    "Hooks/useFinancial.md": """---
tags: [quark, frontend, hooks, react-query]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# useFinancial
- **Purpose:** React Query hook for financial transactions.
""",
    "Contextos/AuthContext.md": """---
tags: [quark, frontend, context, auth]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# AuthContext
- **Purpose:** Supabase Auth, login/logout/signup, offline detection, localStorage cache.
""",
    "Contextos/CrmContext.md": """---
tags: [quark, frontend, context, crm]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# CrmContext
- **Purpose:** Leads, pipelines, tags, history.
> [!info] Automation
> Fechado → creates Engineering project + DRE entries.
""",
    "Contextos/FinancialContext.md": """---
tags: [quark, frontend, context, financial]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# FinancialContext
- **Purpose:** Auto DRE entries (Kit 45%, Instalação 10%, Impostos 10%, Engenharia 3%, Frete 2%, Comissão 5%).
""",
    "Contextos/ProjectContext.md": """---
tags: [quark, frontend, context, engineering]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# ProjectContext
- **Purpose:** Engineering projects, Kanban phases, Supabase sync.
""",
    "Contextos/AppContext.md": """---
tags: [quark, frontend, context, core]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# AppContext
- **Purpose:** Master orchestrator wrapping [[AuthContext]]+[[FinancialContext]]+[[ProjectContext]]+[[CrmContext]], tasks, products, users, activities.
""",
    "Store/queryClient.md": """---
tags: [quark, frontend, store, react-query]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# queryClient
- **Purpose:** React Query config (staleTime 5min, gcTime 10min, retry 1).
""",
    "Store/useUIStore.md": """---
tags: [quark, frontend, store, zustand]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# useUIStore
- **Purpose:** Zustand store for sidebar open/close.
""",
    "Serviços/aiOcrService.md": """---
tags: [quark, frontend, services, ocr]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# aiOcrService
- **Purpose:** OCR extraction via POST `/api/ocr`.
""",
    "Serviços/storageService.md": """---
tags: [quark, frontend, services, storage]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# storageService
- **Purpose:** Offline-first persistence, Supabase primary + localStorage fallback.
- **Tables:** leads, tasks, products, projects, profiles, pipelines, tags.
""",
    "Lib/constants.md": """---
tags: [quark, frontend, lib, constants]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# constants
- **Purpose:** APP_NAME, VERSION 3.0.0, HSP factors, DRE rates, default pipelines and tags.
""",
    "Lib/supabaseClient.md": """---
tags: [quark, frontend, lib, supabase]
created: 2026-08-25
updated: 2026-08-25
status: active
area: frontend
---
# supabaseClient
- **Purpose:** @supabase/supabase-js initialization, URL/key fallback, session persistence, memory storage fallback.
"""
}

for filepath, content in files.items():
    full_path = os.path.join(base_dir, filepath)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w") as f:
        f.write(content)

print("All notes created successfully.")
