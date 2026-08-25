# Relatório de Auditoria Frontend - Quark SaaS

## Resumo Executivo
**Nota Geral:** 7.5 / 10

O frontend do projeto Quark SaaS apresenta uma arquitetura sólida, utilizando tecnologias modernas como React 18, Vite e Tailwind CSS. A separação de responsabilidades e o uso de Context API para gerenciamento de estado global são pontos fortes. No entanto, há oportunidades significativas para otimização de performance, padronização de tipagem e aprimoramento da experiência do desenvolvedor e do usuário.

---

## Análise por Arquivo/Módulo

### 1. `src/App.tsx` (Roteamento e Estrutura Principal)
* **O que está BEM feito:** Uso adequado de `React.lazy` e `Suspense` para code-splitting das rotas, reduzindo o bundle inicial. Boa implementação de layout principal com transições de página (Framer Motion).
* **O que PRECISA ser melhorado:** O `Suspense` envolve todo o `<Routes>`, o que causa piscas (flickering) inteiros na tela ao navegar.
* **Sugestões:**
  - Descer o `Suspense` para dentro de cada rota, ou usar um preloader mais suave.
  - Implementar um layout persistente (Sidebar, Nav) por fora do switch de rotas principal, garantindo que o esqueleto da aplicação nunca desmonte.

### 2. `src/components/proposal/solarCalc.ts` (Motor de Cálculo)
* **O que está BEM feito:** Lógica matemática isolada de componentes visuais. Funções bem documentadas (comentários JSDoc) e utilização de interfaces TS puras.
* **O que PRECISA ser melhorado:** O arquivo é longo e mistura cálculos financeiros, Fio B, dimensionamento e deduções de Faturamento.
* **Sugestões:**
  - Dividir em módulos menores: `calcFinance.ts`, `calcSizing.ts`, `calcTariff.ts`.
  - Melhorar as constantes hardcoded (como fator de geração e % do Fio B). Estas deveriam vir de configuração ou banco de dados para evitar deploys na virada do ano de taxação.

### 3. `src/components/proposal/ProposalPDF.tsx` (Geração de PDF)
* **O que está BEM feito:** Uso do `@react-pdf/renderer` para geração em client-side (offloading do servidor). Boa estruturação em blocos funcionais menores (`PDFCover`, `PDFTechSpecs`, etc).
* **O que PRECISA ser melhorado:** Estilos (`StyleSheet.create`) muito inflados. Tema anteriormente totalmente escuro (impraticável para impressão real).
* **Sugestões:**
  - Padronizar os estilos em um arquivo separado ou objeto de tema injetável.
  - Manter rigor sobre as cores padronizadas (azul marinho e preto no tema claro) para garantir legibilidade e economia de tinta, conforme ajustado na revisão de hoje.

### 4. `src/pages/InvoiceAudit.tsx` (Auditoria de Faturas)
* **O que está BEM feito:** UI bem desenhada, uso de ícones intuitivos (Lucide), loading states adequados durante chamadas assíncronas, simulação correta do JSON para dev/fallback.
* **O que PRECISA ser melhorado:** Tratamento de erros de rede de forma global, para não depender de setar o erro manualmente sempre (ex: `setError`).
* **Sugestões:**
  - Extrair o fetcher API para um custom hook (ex: `useAuditEquatorial`) que cuida de loading/error state.

---

## Lista de Melhorias Priorizadas

1. **[CRÍTICA] Centralização de Configurações Taxativas:**
   - Extrair taxas (Fio B 15%->30%->45%, IPCA, TMA) para variáveis de ambiente ou tabela no Supabase. Modificar cálculos "hardcoded" de 2022/2023.

2. **[ALTA] Perf & Re-renders em Contextos:**
   - O arquivo `AppContext.tsx` (suposto) tende a acoplar muitos estados. Sugere-se dividir em `AuthContext`, `UIContext` e `DataContext` para evitar renderizações desnecessárias.

3. **[MÉDIA] Padronização de Interfaces TS:**
   - Arquivo `types.ts` concentra tudo. Dividir em domínios (`types/proposal.ts`, `types/crm.ts`).
   - Evitar uso de `any` (identificado em alguns pontos como respostas de mock de API).

4. **[BAIXA] Componentização de UI:**
   - Criar uma pasta `src/components/ui/` para componentes base (Buttons, Inputs, Cards, Badges) com variants (usando `cva` e `tailwind-merge`).

---

## Checklist Final de Ações Recomendadas
- [x] Correção da matemática do Fio B no motor Solar.
- [x] Refatoração do Proposal PDF para Tema Claro / Cores Oficiais.
- [x] Criação da interface de Auditoria com mock fallback de IA.
- [ ] Implementar Toast global para erros de API (substituir mensagens inline espalhadas).
- [ ] Extrair constantes solares (Fio B, TUSD) para Supabase Remote Config.
- [ ] Implementar Strict Mode no TypeScript (`"strict": true` em tsconfig).

**Finalizado por:** quark-frontend-dev
