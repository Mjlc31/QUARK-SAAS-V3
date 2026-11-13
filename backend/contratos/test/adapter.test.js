const test = require('node:test');
const assert = require('node:assert/strict');
const { mapearPropostaParaContrato, paraDocumentoAssinatura, blocosAssinatura } = require('../lib/adapter');
const { montarCampos } = require('../lib/contrato');

// Formato real de uma proposta aceita no Supabase (dados fictícios)
const proposta = {
  id: '4420708c-5c89-418a-89cd-09f899371db8', status: 'aceita', client_name: 'Gabriel Conde', cpf_cnpj: null, address: null,
  city: 'Maceió', state: null, final_price: '14859.28', power_kwp: '5.5', phone: '(82) 99999-0000',
  opportunity_id: '7b464af5-3c68-4db2-850d-0129c656b4a3',
  data: { lead: { name: 'Gabriel Conde', city: 'Maceió' } },
  inputs: { moduleQty: 10, modulePowerW: 550, inverterQty: 1, inverterBrand: 'Growatt', inverterPowerKw: 5, structureType: 'Telhado cerâmico' },
};

test('mapeia proposta + oportunidade sem redigitar', () => {
  const d = mapearPropostaParaContrato(proposta, { oportunidade: { cpf_cnpj: '075.716.334-35', address: 'Rua A, 10' }, hoje: '2026-11-13' });
  assert.equal(d.cliente.nome, 'Gabriel Conde');
  assert.equal(d.cliente.documento, '075.716.334-35');
  assert.equal(d.cliente.endereco.logradouro, 'Rua A, 10');
  assert.equal(d.cliente.endereco.cidade, 'Maceió');
  assert.equal(d.cliente.endereco.uf, 'AL');
  assert.deepEqual(d.sistema, { qtd_modulos: 10, potencia_modulo_wp: 550, qtd_inversores: 1, inversor_marca: 'Growatt', inversor_potencia_kw: 5 });
  assert.equal(d.tipo_estrutura, 'telhado cerâmico');
  assert.equal(d.valor_total, 14859.28);
  assert.deepEqual(d.pagamentos, [{ tipo: 'pix', valor: 14859.28 }]);
  assert.equal(d.fornecedora, 'SOU ENERGY');
  assert.equal(d.garantia_eficiencia, 84);
  assert.equal(d.data_assinatura, '2026-11-13');
});

test('reaproveita da versão anterior o que o banco não guarda', () => {
  const anterior = {
    cliente: { documento: '075.716.334-35', genero: 'f', endereco: { logradouro: 'Rua B', numero: '1', cep: '57000000', bairro: 'Centro', cidade: 'Maceió', uf: 'AL' } },
    pagamentos: [{ tipo: 'cartao', valor: 4859.28, parcelas: 10, juros: true }, { tipo: 'pix', valor: 10000 }],
    fornecedora: 'ALDO SOLAR', garantia_modulo_anos: 12,
  };
  const d = mapearPropostaParaContrato(proposta, { anterior });
  assert.equal(d.cliente.genero, 'f');
  assert.equal(d.cliente.documento, '075.716.334-35');
  assert.equal(d.cliente.endereco.bairro, 'Centro');
  assert.equal(d.pagamentos.length, 2);
  assert.equal(d.fornecedora, 'ALDO SOLAR');
  assert.equal(d.garantia_modulo_anos, 12);
  assert.equal(d.garantia_linear_anos, 25);
  assert.doesNotThrow(() => montarCampos(d));
  // pagamentos antigos que não fecham com o novo total são descartados
  const d2 = mapearPropostaParaContrato({ ...proposta, final_price: 20000 }, { anterior });
  assert.deepEqual(d2.pagamentos, [{ tipo: 'pix', valor: 20000 }]);
});

test('proposta sem CPF/endereço gera pendências, não contrato', () => {
  const d = mapearPropostaParaContrato(proposta);
  assert.throws(() => montarCampos(d), /cliente\.documento é obrigatório/);
});

test('documento para assinatura usa o texto exato do .docx', () => {
  const blocos = blocosAssinatura(['CONTRATO', 'PARTES', 'Cláusula 1 texto longo', 'Maceió/AL, 1 de janeiro de 2027.', '____', 'CONTRATANTE'], 'Maceió/AL, 1 de janeiro de 2027.');
  assert.deepEqual(blocos.map((b) => b.t), ['title', 'h', 'p', 'place']);
  const dados = { sistema: { qtd_modulos: 10, potencia_modulo_wp: 550, qtd_inversores: 1, inversor_marca: 'Growatt', inversor_potencia_kw: 5 }, valor_total: 100 };
  const campos = { cliente_doc_tipo: 'CPF', cliente_nome: 'FULANA', cliente_doc: '075.716.334-35', cliente_endereco: 'RUA', condicao_pagamento: 'x.', local_data: 'Maceió/AL, 1 de janeiro de 2027.' };
  const doc = paraDocumentoAssinatura({ dados, campos, paragrafos: ['CONTRATO', 'Maceió/AL, 1 de janeiro de 2027.'], contratoId: 'c1', versao: 2 });
  assert.equal(doc.client.kind, 'pf');
  assert.equal(doc.price, 100);
  assert.equal(doc.generatedVersion, 2);
  assert.equal(doc.generatedBlocks.length, 2);
  assert.equal(doc.contractor.doc, '55.138.256/0001-51');
});
