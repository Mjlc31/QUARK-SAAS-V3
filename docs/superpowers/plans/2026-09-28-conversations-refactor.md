# Conversations Security & Architecture Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix security and hardcoded URLs in `Conversations.tsx` (the active document).

**Architecture:** Introduce environment variables for `BACKEND_URL`, `EVO_URL`, and `EVO_API_KEY` with safe fallbacks for local development, preventing production deployment failures and security leaks.

**Tech Stack:** React, TypeScript, Vite

## Global Constraints
- Typescript must pass cleanly (`tsc --noEmit`).

---

### Task 1: Refactor hardcoded values in Conversations.tsx

**Files:**
- Modify: `src/pages/Conversations.tsx`

**Steps:**
- [ ] **Step 1:** Replace `BACKEND_URL` with env-aware constant and add `EVO_URL` and `EVO_API_KEY`.
- [ ] **Step 2:** Replace `http://localhost:8082` with `${EVO_URL}`.
- [ ] **Step 3:** Replace `'quark_senha_secreta_123'` with `EVO_API_KEY`.
