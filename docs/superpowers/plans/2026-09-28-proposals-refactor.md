# Proposals Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve Proposals page UI/UX, fix redundant WhatsApp link generation, and add persistent view preferences.

**Architecture:** We will clean up `Proposals.tsx` by consuming `generateWhatsAppLink` from the `useProposals` hook, add localStorage persistence for grid/list view mode, and fix how the hook accesses `paybackYears` from the proposal blocks.

**Tech Stack:** React, TypeScript, Supabase, Tailwind CSS

**Spec:** Refactor requested by user.

## Global Constraints

- No external dependencies can be added.
- Typescript must pass cleanly (`tsc --noEmit`).
- Keep code DRY.

---

### Task 1: Fix generateWhatsAppLink in useProposals.ts

**Files:**
- Modify: `src/hooks/useProposals.ts`

**Interfaces:**
- Produces: Correct WhatsApp link with payback years extracted from `roi` block.

- [ ] **Step 1: Write minimal implementation**

Update `generateWhatsAppLink` to properly extract payback from blocks.

```typescript
  // ── Gerar link de compartilhamento WhatsApp ─────────────────
  const generateWhatsAppLink = (proposal: ProposalData) => {
    // Extrai payback do bloco ROI se existir
    const roiBlock = proposal.blocks?.find((b: any) => b.type === 'roi' || b.type === 'financial');
    const paybackYears = roiBlock?.content?.paybackYears;

    const message = [
      `Olá ${proposal.clientName}! 👋`,
      ``,
      `Segue sua proposta de energia solar da *Quark Energia*:`,
      ``,
      `⚡ Sistema: ${proposal.systemSizeKw?.toFixed(2)} kWp`,
      `💰 Investimento: ${formatCurrency(proposal.finalPrice)}`,
      paybackYears ? `📊 Payback: ${paybackYears.toFixed(1)} anos` : '',
      ``,
      proposal.pdfUrl ? `📄 PDF da proposta: ${proposal.pdfUrl}` : '',
      ``,
      `Ficou com alguma dúvida? Estou à disposição!`,
    ].filter(Boolean).join('\n');

    const phone = proposal.phone?.replace(/\D/g, '') || '';
    const encodedMessage = encodeURIComponent(message);
    
    return phone
      ? `https://wa.me/55${phone}?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`;
  };
```

### Task 2: Refactor Proposals.tsx

**Files:**
- Modify: `src/pages/Proposals.tsx`

**Interfaces:**
- Consumes: `generateWhatsAppLink` from `useProposals` hook.

- [ ] **Step 1: Write minimal implementation**

1. Remove the local `generateWhatsAppLink` function.
2. Destructure `generateWhatsAppLink` from `useProposals`.
3. Add `useState` with lazy initializer to read `viewMode` from `localStorage`, and a `useEffect` to save it.

```typescript
  // Update viewMode initialization
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const saved = localStorage.getItem('@quark:proposals-view');
    return (saved as 'grid' | 'list') || 'grid';
  });

  // Add useEffect
  React.useEffect(() => {
    localStorage.setItem('@quark:proposals-view', viewMode);
  }, [viewMode]);

  // Use generateWhatsAppLink from useProposals
  const {
    proposals,
    isLoading,
    saveProposal,
    duplicateProposal,
    deleteProposal,
    updateStatus,
    generateWhatsAppLink // ADD THIS
  } = useProposals();

  // Remove the local generateWhatsAppLink function
  // const generateWhatsAppLink = (proposal: ProposalData) => { ... } // REMOVE THIS
```
