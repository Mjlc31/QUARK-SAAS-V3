# Plano de Ação: Otimização Fullstack do Quark SaaS

## [Goal Description]
Realizar uma auditoria técnica e arquitetural de todas as abas do Quark SaaS e implementar melhorias para tornar o código mais profissional, rápido e robusto. O foco é resolver ineficiências (como excesso de re-renders), atualizar componentes baseados em práticas legadas (Context API para buscas pesadas) e resolver os alertas exibidos no console pelo Playwright.

## 1. Melhorias Identificadas (Varredura Aba a Aba)

### A. Console e Index (App Shell)
- **Aviso no Console:** `apple-mobile-web-app-capable` é obsoleto e falta o `logo.png` real.
- **Ação:** Atualizar o `index.html` e `manifest.json`.

### B. Aba Obras (Engineering.tsx)
- **Problema:** A aba de Obras usa estados e colunas estáticas (Vistoria, Projeto, etc.) e consome o `useApp()`, ignorando a nossa nova arquitetura de `project_tracking` que construímos em Supabase (`useProjectTracking.ts`).
- **Ação:** Refatorar o `Engineering.tsx` para consumir o hook assíncrono `@tanstack/react-query` do `useProjectTracking`, garantindo dados em tempo real e em sincronia perfeita com o Portal do Cliente.

### C. Aba Financeiro (Financial.tsx)
- **Problema:** O Recharts dispara avisos constantes no console pelo uso de medidas fixas (width/height) no `ResponsiveContainer`.
- **Ação:** Ajustar os gráficos e remover prop properties redundantes que prejudicam a responsividade e poluem o console.

### D. Aba CRM e Sincronização (storageService.ts e AppContext)
- **Problema:** O console loga `✅ Leads sincronizados da nuvem` constantemente. Isso indica que a sincronização do `storageService` está disparando múltiplos re-renders sem memoização adequada no `AppContext`.
- **Ação:** Remover logs de produção desnecessários e otimizar o `useEffect` de carregamento para evitar loops e refetchs passivos de 60+ leads por tela.

### E. Limpeza Geral e Perfomance (/fullstack-developer guidelines)
- Adicionar React.memo/useMemo em tabelas grandes (CRM, Financeiro, Obras) para otimizar as renderizações do React 19 / Vite.

## User Review Required
> [!IMPORTANT]
> A migração da tela de Obras (`Engineering.tsx`) para o formato do Supabase (`useProjectTracking.ts`) fará com que utilizemos o novo modelo de 9 etapas do projeto (desde "Venda Confirmada" até "Finalizado"). O layout de Kanban será adaptado para isso. Vocês concordam com essa virada de chave?

## Proposed Changes

### 1. Atualizações de Metadados e Console (App Shell)
#### [MODIFY] index.html e manifest.json
- Remover as tags obsoletas.

### 2. Otimização de Performance
#### [MODIFY] src/services/storageService.ts
- Retirar `console.log` abusivos que pesam o client.
#### [MODIFY] src/pages/Financial.tsx
- Arrumar o `ResponsiveContainer` do Recharts.

### 3. Modernização da Engenharia (Obras)
#### [MODIFY] src/pages/Engineering.tsx
- Integrar 100% com `useProjectTracking` e as novas fases de obra.

## Verification Plan
### Automated Tests
- Testar o build `npm run build` para checar tipagens.
### Manual Verification
- Validar se o console do Playwright não apresenta mais avisos do Recharts ou Manifest.
- Confirmar se a tela de Obras exibe os dados reais do banco usando a nova arquitetura do tracking.
