// Rodar: node --test routes/contratos.test.js (Supabase falso em memória, sem rede)
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createRequire } from 'module';
import { createContratosRouter } from './contratos.js';

const require = createRequire(import.meta.url);
const yulia = require('../contratos/exemplos/yulia.json');

function fakeDb(seed) {
  const tables = structuredClone(seed);
  const files = new Map();
  let seq = 0;
  const from = (name) => {
    const rows = (tables[name] ||= []);
    let filters = [], op = 'select', payload = null;
    const match = (r) => filters.every(([k, v]) => (v === null ? r[k] == null : r[k] === v));
    const run = () => {
      if (op === 'insert') {
        const list = (Array.isArray(payload) ? payload : [payload]).map((p) => {
          const row = { id: `id-${++seq}`, token: `tok-${seq}`, ...p };
          if (name === 'generated_contracts') row.version = rows.filter((r) => r.proposal_id === p.proposal_id).length + 1;
          rows.push(row);
          return row;
        });
        return list;
      }
      const found = rows.filter(match);
      if (op === 'update') found.forEach((r) => Object.assign(r, payload));
      return found;
    };
    const q = {
      select: () => q, order: () => q,
      eq: (k, v) => { filters.push([k, v]); return q; },
      is: (k, v) => { filters.push([k, v]); return q; },
      insert: (p) => { op = 'insert'; payload = p; return q; },
      update: (p) => { op = 'update'; payload = p; return q; },
      maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
      single: async () => { const r = run()[0]; return r ? { data: r, error: null } : { data: null, error: new Error('no rows') }; },
      then: (res, rej) => Promise.resolve({ data: run(), error: null }).then(res, rej),
    };
    return q;
  };
  const storage = {
    from: (bucket) => ({
      upload: async (path, buf) => (files.has(`${bucket}/${path}`) ? { error: new Error('exists') } : (files.set(`${bucket}/${path}`, buf), { data: { path }, error: null })),
      download: async (path) => ({ data: new Blob([files.get(`${bucket}/${path}`)]), error: null }),
      createSignedUrl: async (path, ttl, opts) => ({ data: { signedUrl: `https://signed/${bucket}/${path}?ttl=${ttl}&dl=${encodeURIComponent(opts.download)}` }, error: null }),
    }),
  };
  return { client: { from, storage }, tables, files };
}

const PROPOSTA = { id: 'p1', status: 'aceita', final_price: 33867, client_name: 'Yulia Amaral Almeida', deleted_at: null, opportunity_id: null, lead_id: 'x', phone: '82999990000', inputs: { moduleQty: 23, modulePowerW: 710, inverterQty: 1, inverterBrand: 'SolPlanet', inverterPowerKw: 15 } };

async function withApp(seed, fn, { pdf = null } = {}) {
  const fake = fakeDb(seed);
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.auth = { user: { id: 'u-team' }, isTeam: true }; next(); });
  app.use('/api/contratos', createContratosRouter({ db: () => fake.client, converterParaPdf: async () => (pdf ? { pdf } : { pdf: null, aviso: 'PDF não gerado' }) }));
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api/contratos`;
  const call = async (method, path, body) => {
    const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json' }, body: body && JSON.stringify(body) });
    return { status: r.status, body: await r.json() };
  };
  try { await fn(call, fake); } finally { server.close(); }
}

test('preview-dados: pré-preenche e lista pendências (sem CPF na proposta)', () =>
  withApp({ proposals: [PROPOSTA] }, async (call) => {
    const r = await call('GET', '/p1/preview-dados');
    assert.equal(r.status, 200);
    assert.equal(r.body.dados.cliente.nome, 'Yulia Amaral Almeida');
    assert.equal(r.body.dados.sistema.qtd_modulos, 23);
    assert.equal(r.body.campos, null);
    assert.ok(r.body.pendencias.includes('cliente.documento é obrigatório'));
  }));

test('proposta não aceita → 409; inexistente → 404', () =>
  withApp({ proposals: [{ ...PROPOSTA, status: 'enviada' }] }, async (call) => {
    assert.equal((await call('GET', '/p1/preview-dados')).status, 409);
    assert.equal((await call('POST', '/p1/gerar', { dados: yulia })).status, 409);
    assert.equal((await call('GET', '/zz/preview-dados')).status, 404);
  }));

test('dados inválidos → 422 legível e nada é gravado', () =>
  withApp({ proposals: [PROPOSTA] }, async (call, fake) => {
    const r = await call('POST', '/p1/gerar', { dados: { ...yulia, cliente: { ...yulia.cliente, documento: '111.111.111-11' } } });
    assert.equal(r.status, 422);
    assert.match(r.body.error, /CPF inválido/);
    const soma = await call('POST', '/p1/gerar', { dados: { ...yulia, valor_total: 40000 } });
    assert.equal(soma.status, 422);
    assert.match(soma.body.error, /Pagamentos somam/);
    assert.equal((fake.tables.generated_contracts || []).length, 0);
    assert.equal(fake.files.size, 0);
  }));

test('prévia devolve a cláusula 3.1', () =>
  withApp({ proposals: [PROPOSTA] }, async (call) => {
    const r = await call('POST', '/p1/previa', { dados: yulia });
    assert.equal(r.status, 200);
    assert.match(r.body.campos.condicao_pagamento, /18 parcelas com juros; e o valor de R\$ 10\.000,00/);
  }));

test('gerar cria versões novas, salva DOCX/PDF e download devolve URL assinada', () =>
  withApp({ proposals: [PROPOSTA] }, async (call, fake) => {
    const v1 = await call('POST', '/p1/gerar', { dados: yulia });
    assert.equal(v1.status, 201);
    assert.equal(v1.body.contrato.version, 1);
    assert.equal(v1.body.contrato.status, 'gerado');
    assert.equal(v1.body.contrato.docx_path, 'p1/v1/contrato.docx');
    assert.equal(v1.body.contrato.pdf_path, 'p1/v1/contrato.pdf');
    assert.deepEqual(fake.tables.generated_contracts[0].input_snapshot, yulia);

    const v2 = await call('POST', '/p1/gerar', { dados: yulia });
    assert.equal(v2.body.contrato.version, 2);
    assert.ok(fake.files.has('contratos/p1/v1/contrato.docx') && fake.files.has('contratos/p1/v2/contrato.docx'));

    const dl = await call('GET', `/${v2.body.contrato.id}/download?formato=pdf`);
    assert.equal(dl.status, 200);
    assert.match(dl.body.url, /contratos\/p1\/v2\/contrato\.pdf\?ttl=120/);
    assert.equal(dl.body.nome, 'CONTRATO - YULIA AMARAL ALMEIDA (v2).pdf');
    assert.equal((await call('GET', '/nao-existe/download')).status, 404);
  }, { pdf: Buffer.from('%PDF-fake') }));

test('sem conversor de PDF: gera só DOCX com aviso; download pdf → 404', () =>
  withApp({ proposals: [PROPOSTA] }, async (call) => {
    const r = await call('POST', '/p1/gerar', { dados: { ...yulia, valor_total: 33867 } });
    assert.equal(r.body.contrato.pdf_path, null);
    assert.ok(r.body.avisos.some((a) => /PDF não gerado/.test(a)));
    assert.equal((await call('GET', `/${r.body.contrato.id}/download?formato=pdf`)).status, 404);
  }));

test('enviar para assinatura cria documento + signatários e marca a versão', () =>
  withApp({ proposals: [PROPOSTA] }, async (call, fake) => {
    const g = await call('POST', '/p1/gerar', { dados: yulia });
    const id = g.body.contrato.id;
    const r = await call('POST', `/${id}/enviar-assinatura`);
    assert.equal(r.status, 200);
    assert.ok(r.body.sign_token);
    const doc = fake.tables.documents[0];
    assert.equal(doc.kind, 'contrato');
    assert.equal(doc.user_id, 'u-team');
    assert.equal(doc.data.price, 33867);
    assert.ok(doc.data.generatedBlocks.some((b) => b.text.startsWith('3.1. O CONTRATANTE pagará o valor de R$ 23.867,00')));
    assert.equal(doc.data.generatedBlocks.at(-1).t, 'place');
    assert.deepEqual(fake.tables.document_signers.map((s) => s.role), ['contratada', 'contratante']);
    assert.equal(fake.tables.document_signers[1].cpf, '075.716.334-35');
    assert.equal(fake.tables.generated_contracts[0].status, 'enviado_assinatura');
    assert.equal(fake.tables.generated_contracts[0].document_id, doc.id);
    assert.equal((await call('POST', `/${id}/enviar-assinatura`)).status, 409); // não envia duas vezes
  }));
