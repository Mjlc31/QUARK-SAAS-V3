# Original User Request

## Initial Request — 2026-08-08T21:18:44Z

<USER_REQUEST>
O Quark SaaS é um sistema operacional web (React + Vite + TailwindCSS + Supabase) de gestão de CRM, propostas comerciais, gestão de engenharia, módulos financeiros e automação de WhatsApp. A plataforma possui módulos de Dashboard, CRM/Leads, Propostas, Engenharia, Financeiro e Integração WhatsApp.

Working directory: c:\Users\arthu\Documents\quark-saas
Integrity mode: development

## Verification Resources
- **Schema do Supabase**: Arquivo disponível em `supabase/schema.sql` dentro do working directory.

## Requirements

### R1. Desenvolvimento Frontend e Integração
Construir a interface web para todos os 8 módulos (Dashboard, CRM, Propostas, Engenharia, Financeiro, WhatsApp) utilizando React, Vite e TailwindCSS. O frontend deve se conectar ao Supabase utilizando o schema fornecido, realizando autenticação e operações de CRUD necessárias para cada módulo.

### R2. Verificação de automação
Implementar a Automação de WhatsApp real (utilizando bibliotecas como evolution-api ou outra API adequada) no módulo de Scanner para controle de entrega/devolução de Propostas.

## Acceptance Criteria

### Compilação e Execução
- [ ] O projeto frontend compila com sucesso (`npm run build`) sem erros críticos.
- [ ] O servidor de desenvolvimento inicia corretamente e a página inicial carrega sem erros no console (verificável via script ou log).

### Funcionalidade (Validação via Agente-Juiz ou Script E2E)
- [ ] É possível realizar login via Supabase Auth e acessar o Dashboard.
- [ ] A navegação entre os 8 módulos principais funciona corretamente.
- [ ] A verificação de automação rejeita rostos não cadastrados e aprova rostos com correspondência válida (pode ser validado por script de teste enviando imagens de referência).
</USER_REQUEST>
