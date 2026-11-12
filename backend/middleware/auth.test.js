// Rodar: node --test backend/middleware/auth.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { requireUser, requireTeam, requireClientAccess, canAccessClient, resolveAuth, requireWebhookSecret } from './auth.js';

const team = { user: { id: 'u-team' }, isTeam: true, clientId: null };
const client = { user: { id: 'u-cli' }, isTeam: false, clientId: 'c-1' };

// req.auth pré-preenchido pula a validação do JWT (null = não autenticado)
const run = async (mw, auth, params = {}) => {
  const req = { auth, params, headers: {} };
  let status = 200;
  let nextCalled = false;
  const res = { status(code) { status = code; return this; }, json() { return this; } };
  await mw(req, res, () => { nextCalled = true; });
  return nextCalled ? 'next' : status;
};

test('requireUser', async () => {
  assert.equal(await run(requireUser, null), 401);
  assert.equal(await run(requireUser, client), 'next');
  assert.equal(await run(requireUser, team), 'next');
});

test('requireTeam', async () => {
  assert.equal(await run(requireTeam, null), 401);
  assert.equal(await run(requireTeam, client), 403);
  assert.equal(await run(requireTeam, team), 'next');
});

test('requireClientAccess: cliente só o próprio id, equipe qualquer um', async () => {
  const mw = requireClientAccess();
  assert.equal(await run(mw, client, { clientId: 'c-1' }), 'next');
  assert.equal(await run(mw, client, { clientId: 'c-2' }), 403);
  assert.equal(await run(mw, client, { clientId: '12345678901' }), 403); // CPF de outro
  assert.equal(await run(mw, team, { clientId: 'c-2' }), 'next');
});

test('canAccessClient sem perfil vinculado nega', () => {
  assert.equal(canAccessClient({ auth: { ...client, clientId: null } }, null), false);
  assert.equal(canAccessClient({ auth: { ...client, clientId: null } }, undefined), false);
});

test('resolveAuth rejeita token ausente, lixo e anon key', async () => {
  assert.equal(await resolveAuth(undefined), null);
  assert.equal(await resolveAuth('offline-token'), null);
  assert.equal(await resolveAuth(process.env.VITE_SUPABASE_ANON_KEY), null);
});

test('requireWebhookSecret', async () => {
  const call = (secret, query, headers = {}) => {
    let out = 'next';
    requireWebhookSecret(secret)({ query, headers }, { status(c) { out = c; return this; }, json() { return this; } }, () => {});
    return out;
  };
  assert.equal(call('s3gredo', { token: 's3gredo' }), 'next');
  assert.equal(call('s3gredo', {}, { 'x-webhook-secret': 's3gredo' }), 'next');
  assert.equal(call('s3gredo', { token: 'errado!' }), 401);
  assert.equal(call('s3gredo', {}), 401);
  assert.equal(call('', { token: '' }), 401); // sem segredo configurado nega tudo
  assert.equal(call(undefined, {}), 401);
});
