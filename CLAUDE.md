# Quark Energia SaaS — Guia do Projeto para Claude Code

## Visão Geral
Sistema Enterprise para gestão de energia solar da Quark Energia.
Responsável por:
- Geração e dimensionamento de propostas solares (painéis, inversores, geração mensal, economia e payback).
- Exportação de propostas comerciais pixel-perfect em PDF (`@react-pdf/renderer`).
- CRM com Kanban de oportunidades e automações (ManyChat, WhatsApp/Evolution API).
- Gestão de clientes, portal do cliente e relatórios operacionais.

## Stack Técnica
- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, Framer Motion, TanStack Query.
- **Backend**: Express (`backend/server.js`), Node.js.
- **Banco de Dados**: Supabase (PostgreSQL, Auth, RLS). Project Ref: `sumydaewtszecrvdgoku`.
- **MCP Server**: `supabase_quark` (disponível globalmente no Claude Code).

## Comandos Principais
```bash
npm run dev        # Inicia frontend Vite (http://localhost:5173)
npm run server     # Inicia backend Express
npm run build      # Valida tipos com tsc e gera build de produção
npm run preview    # Preview do build de produção
```

## Memória e Contexto
Memória contínua, histórico de decisões arquiteturais e documentação detalhada estão disponíveis em `~/.claude/projects/-Users-arthurdemoraespd-Documents-QUARK-SAAS-V3-main/memory/MEMORY.md`.
