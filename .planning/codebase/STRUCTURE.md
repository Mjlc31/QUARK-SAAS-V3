# Structure

## Root
- `App.tsx`, `index.tsx`, `index.html`: Main React entry points.
- `vite.config.ts`, `tailwind.config.js` (or via postcss), `tsconfig.json`: Frontend build config.
- `types.ts`: Shared TypeScript interfaces.
- `supabase/`: Contains SQL migration scripts and patches (e.g. `supabase_PATCH_FINAL.sql`, `supabase_THE_PURGE_FINANCEIRO.sql`).

## Frontend Directories
- `components/`: UI components (e.g., `Sidebar.tsx`, `ProposalEditor.tsx`).
  - `proposal/`: Specific components and logic for the Proposal Builder (`ProposalBuilder.tsx`, `ProposalCanvas.tsx`, etc.).
- `contexts/`: React context providers (`AuthContext`, `CrmContext`, `FinancialContext`, etc.).
- `lib/`: Utility libraries and initialized clients (`supabaseClient.ts`, `ai.ts`).
- `pages/`: Page-level components (`Dashboard.tsx`, `CRM.tsx`, `Conversations.tsx`, etc.).
- `services/`: External service wrappers (`aiOcrService.ts`, `storageService.ts`).

## Backend Directories
- `whatsapp-backend/`: The primary backend for WhatsApp bot and Evolution Go integration.
  - `index.js`: Main server file.
  - `spinAgent.js`: Logic for AI automated responses.
- `backend/`: Secondary worker for OpenAI integration (WIP).
