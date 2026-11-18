// Converte os dados do banco (proposals + opportunities) no JSON aceito por gerarContrato,
// e o contrato gerado no formato da tabela `documents` usada pela assinatura digital.
const { PADROES } = require('./contrato');

const num = (v) => (v === null || v === undefined || v === '' ? undefined : Number(v));
const texto = (...vs) => vs.map((v) => (typeof v === 'string' ? v.trim() : '')).find(Boolean) || '';
const hojeIso = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Maceio' });

/**
 * proposta: linha de `proposals`. opts.oportunidade: linha de `opportunities` (fallback de CPF/endereço).
 * opts.anterior: input_snapshot da última versão gerada (reaproveita o que o banco não guarda:
 * gênero, endereço estruturado, pagamentos, fornecedora e garantias).
 */
function mapearPropostaParaContrato(proposta, { oportunidade = null, anterior = null, hoje = hojeIso() } = {}) {
  const inp = proposta.inputs || proposta.data?.inputs || {};
  const lead = proposta.data?.lead || {};
  const opp = oportunidade || {};
  const prev = anterior || {};
  const valorTotal = num(proposta.final_price) || 0;

  const enderecoTexto = texto(proposta.address, opp.address);
  const endereco = prev.cliente?.endereco || {
    logradouro: enderecoTexto,
    numero: '',
    complemento: '',
    cep: '',
    bairro: '',
    cidade: texto(proposta.city, opp.city, lead.city),
    uf: texto(proposta.state) || 'AL',
  };

  // Pagamentos da versão anterior só valem se ainda fecham com o total da proposta.
  const somaPrev = (prev.pagamentos || []).filter((p) => p.tipo !== 'texto').reduce((a, p) => a + Number(p.valor || 0), 0);
  const pagamentos = prev.pagamentos?.length && Math.abs(somaPrev - valorTotal) < 0.01 ? prev.pagamentos : [{ tipo: 'pix', valor: valorTotal }];

  return {
    cliente: {
      nome: texto(proposta.client_name, lead.name, opp.client_name, opp.title),
      documento: texto(proposta.cpf_cnpj, opp.cpf_cnpj, prev.cliente?.documento),
      genero: prev.cliente?.genero || '',
      endereco,
    },
    sistema: {
      qtd_modulos: num(inp.moduleQty),
      potencia_modulo_wp: num(inp.modulePowerW),
      qtd_inversores: num(inp.inverterQty) || 1,
      inversor_marca: texto(inp.inverterBrand),
      inversor_potencia_kw: num(inp.inverterPowerKw),
      // potencia_kwp fica de fora: o gerador calcula (módulos × Wp) e acompanha as edições do modal
    },
    tipo_estrutura: texto(inp.structureType).toLowerCase() || PADROES.tipo_estrutura,
    valor_total: valorTotal,
    pagamentos,
    fornecedora: prev.fornecedora || PADROES.fornecedora,
    garantia_modulo_anos: prev.garantia_modulo_anos || PADROES.garantia_modulo_anos,
    garantia_linear_anos: prev.garantia_linear_anos || PADROES.garantia_linear_anos,
    garantia_eficiencia: prev.garantia_eficiencia || PADROES.garantia_eficiencia,
    garantia_inversor_anos: prev.garantia_inversor_anos || PADROES.garantia_inversor_anos,
    data_assinatura: hoje,
  };
}

/** Parágrafos do .docx → blocos da tela de assinatura. Corta no "local, data": as assinaturas a tela desenha. */
function blocosAssinatura(paragrafos, localData) {
  const fim = paragrafos.findIndex((p) => p === localData);
  const corpo = fim >= 0 ? paragrafos.slice(0, fim) : paragrafos;
  const blocos = corpo.map((t, i) => ({ t: i === 0 ? 'title' : t.length < 90 && t === t.toUpperCase() ? 'h' : 'p', text: t }));
  return fim >= 0 ? [...blocos, { t: 'place', text: localData }] : blocos;
}

// Dados fixos da CONTRATADA (iguais ao template e ao emptyContractor do frontend).
const CONTRATADA = {
  name: 'QUARK ENERGIA', doc: '55.138.256/0001-51', address: 'Rua Paulo Henrique Mendes', city: 'Maceió', state: 'AL',
  cep: '57.081-520', repName: 'José Anderson da Silva Alves', repDoc: '084.960.164-98', repRole: 'Diretor Técnico',
  repNationality: 'brasileiro', repMarital: '',
};

/** Monta o `documents.data` (formato ContratoData) com o texto exato do contrato gerado. */
function paraDocumentoAssinatura({ dados, campos, paragrafos, telefone = '', email = '', contratoId, versao }) {
  const pj = campos.cliente_doc_tipo === 'CNPJ';
  const s = dados.sistema;
  return {
    contractor: CONTRATADA,
    client: {
      kind: pj ? 'pj' : 'pf', name: campos.cliente_nome, doc: campos.cliente_doc, rg: '', nationality: '', marital: '', profession: '',
      repName: '', repDoc: '', address: campos.cliente_endereco, city: '', state: '', cep: '', email, phone: telefone,
    },
    installAddress: '',
    supplier: { name: dados.fornecedora || PADROES.fornecedora, doc: '' },
    equipment: [
      { id: 'mod', kind: 'modulo', qty: s.qtd_modulos, power: s.potencia_modulo_wp, brand: '', model: '', description: '' },
      { id: 'inv', kind: 'inversor', qty: s.qtd_inversores || 1, power: s.inversor_potencia_kw, brand: s.inversor_marca, model: '', description: '' },
    ],
    structure: dados.tipo_estrutura || PADROES.tipo_estrutura,
    utility: 'Equatorial Alagoas',
    price: dados.valor_total,
    payment: { method: 'personalizado', installments: 1, withInterest: false, multipleCards: false, entry: 0, balanceWhen: '', bank: '', custom: campos.condicao_pagamento },
    deadlines: { purchase: 5, delivery: 20, project: 5, request: 5, install: 15, inspection: 7, docs: 5 },
    warranty: {
      modules: dados.garantia_modulo_anos, linearYears: dados.garantia_linear_anos, linearPct: dados.garantia_eficiencia,
      inverter: dados.garantia_inversor_anos, structure: 15, cables: 5, box: 1, service: 1,
    },
    lateFee: 2, interest: 1, breachFee: 2, attorneyFee: 20, forum: 'Maceió', forumState: 'Alagoas', copies: 3, extraClauses: '',
    witnesses: [{ name: '', doc: '' }, { name: '', doc: '' }],
    contractorSignature: '/brand/assinatura.png',
    place: dados.cidade_assinatura || PADROES.cidade_assinatura,
    date: dados.data_assinatura || hojeIso(),
    // O texto exibido e assinado é o do .docx gerado (ver contratoBlocks no frontend).
    generatedBlocks: blocosAssinatura(paragrafos, campos.local_data),
    generatedContractId: contratoId,
    generatedVersion: versao,
  };
}

module.exports = { mapearPropostaParaContrato, paraDocumentoAssinatura, blocosAssinatura };
