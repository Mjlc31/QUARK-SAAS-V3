# Concerns

- **Two Backends**: There is a `whatsapp-backend/` and a `backend/` directory with overlapping responsibilities (Evolution API webhooks, AI chat). This could lead to confusion and maintenance overhead.
- **Hardcoded Credentials**: The `backend/server.js` fallback key is `sk-chave-pendente`, and `whatsapp-backend/index.js` contains an `EVOLUTION_API_KEY` hardcoded as `quark_senha_secreta_123`.
- **Database Migrations**: Migrations are scattered across multiple `.sql` files (e.g., `supabase_PATCH_FINAL.sql`, `supabase_THE_PURGE_FINANCEIRO.sql`). Maintaining sequence and idempotency might become difficult without a proper migration tool.
- **Error Handling**: Some promises and Supabase calls silently ignore errors or only log them to the console.
- **Lack of Tests**: No automated tests exist in the codebase.
