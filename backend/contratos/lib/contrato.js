// Monta os campos do contrato Quark a partir dos dados do cliente/proposta
// e preenche o template .docx. Sem dependência de CLI: pode ser importado
// direto numa rota Express do Quark OS.
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ext = require('./extenso');

const TEMPLATE = path.join(__dirname, '..', 'template-contrato-quark.docx');
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto',
  'setembro', 'outubro', 'novembro', 'dezembro'];

// Padrões que hoje são iguais em todo contrato (podem ser sobrescritos por cliente).
const PADROES = {
  fornecedora: 'SOU ENERGY',
  tipo_estrutura: 'telhado',
  garantia_modulo_anos: 15,
  garantia_linear_anos: 25,
  garantia_eficiencia: 84,
  garantia_inversor_anos: 10,
  cidade_assinatura: 'Maceió/AL',
};

// Erro de dado de entrada (CPF inválido, soma divergente, campo faltando): a rota devolve 422.
class ErroValidacao extends Error {
  constructor(msg) { super(msg); this.name = 'ErroValidacao'; }
}

// ---------- utilidades ----------
const brl = (v) => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const soDigitos = (s) => String(s || '').replace(/\D/g, '');

function cpfValido(c) {
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  for (const t of [9, 10]) {
    let s = 0;
    for (let i = 0; i < t; i++) s += Number(c[i]) * (t + 1 - i);
    if (((s * 10) % 11) % 10 !== Number(c[t])) return false;
  }
  return true;
}
function cnpjValido(c) {
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const calc = (len) => {
    const pesos = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const s = pesos.reduce((a, p, i) => a + Number(c[i]) * p, 0);
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
}
function documento(doc) {
  const d = soDigitos(doc);
  if (d.length === 11) {
    if (!cpfValido(d)) throw new ErroValidacao(`CPF inválido: ${doc}`);
    return { tipo: 'CPF', pj: false, fmt: d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') };
  }
  if (d.length === 14) {
    if (!cnpjValido(d)) throw new ErroValidacao(`CNPJ inválido: ${doc}`);
    return { tipo: 'CNPJ', pj: true, fmt: d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') };
  }
  throw new ErroValidacao(`Documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos: ${doc}`);
}

function enderecoTexto(e) {
  if (typeof e === 'string') return e.trim().replace(/\.$/, '').toUpperCase();
  const cep = soDigitos(e.cep).replace(/(\d{5})(\d{3})/, '$1-$2');
  const linha1 = [e.logradouro, e.numero, e.complemento].filter(Boolean).join(', ');
  return `${linha1}, CEP: ${cep} - ${e.bairro} - ${e.cidade} - ${e.uf}`.toUpperCase();
}

function dataExtenso(iso) {
  const d = iso ? new Date(iso + 'T12:00:00') : new Date();
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

// ---------- condição de pagamento (cláusula 3.1) ----------
function trechoPagamento(p) {
  const base = `o valor de ${brl(p.valor)} (${ext.reais(p.valor)})`;
  const quando = p.momento || 'no ato da assinatura deste contrato';
  switch (p.tipo) {
    case 'cartao': {
      const n = Number(p.parcelas || 1);
      const juros = p.juros === false ? 'sem juros' : 'com juros';
      return n > 1 ? `${base} no cartão de crédito em ${n} parcelas ${juros}` : `${base} no cartão de crédito à vista`;
    }
    case 'pix':
    case 'transferencia':
    case 'avista': {
      const meio = p.tipo === 'pix' ? ', via PIX' : p.tipo === 'transferencia' ? ', via transferência bancária' : '';
      return `${base} à vista${meio}, diretamente para a CONTRATADA, ${quando}`;
    }
    case 'boleto': {
      const n = Number(p.parcelas || 1);
      return n > 1 ? `${base} em ${n} parcelas mensais via boleto bancário` : `${base} via boleto bancário, ${quando}`;
    }
    case 'financiamento':
      return `${base} por meio de financiamento bancário${p.banco ? ' junto ao ' + p.banco : ''}, com liberação do recurso diretamente para a CONTRATADA`;
    case 'texto':
      return p.texto.replace(/[.;]\s*$/, '');
    default:
      throw new ErroValidacao(`Tipo de pagamento desconhecido: ${p.tipo}`);
  }
}
function condicaoPagamento(pagamentos) {
  const t = pagamentos.map(trechoPagamento);
  const juntos = t.length === 1 ? t[0] : `${t.slice(0, -1).join('; ')}; e ${t[t.length - 1]}`;
  return juntos + '.';
}

// ---------- montagem dos campos ----------
function montarCampos(input) {
  const d = { ...PADROES, ...input };
  const erros = [];
  const exige = (cond, msg) => { if (!cond) erros.push(msg); };

  exige(d.cliente?.nome, 'cliente.nome é obrigatório');
  exige(d.cliente?.documento, 'cliente.documento é obrigatório');
  exige(d.cliente?.endereco, 'cliente.endereco é obrigatório');
  exige(d.sistema?.qtd_modulos > 0, 'sistema.qtd_modulos é obrigatório');
  exige(d.sistema?.potencia_modulo_wp > 0, 'sistema.potencia_modulo_wp é obrigatório');
  exige(d.sistema?.inversor_marca, 'sistema.inversor_marca é obrigatório');
  exige(d.sistema?.inversor_potencia_kw > 0, 'sistema.inversor_potencia_kw é obrigatório');
  exige(d.valor_total > 0, 'valor_total é obrigatório');
  exige(Array.isArray(d.pagamentos) && d.pagamentos.length, 'pagamentos é obrigatório');
  for (const k of ['garantia_modulo_anos', 'garantia_linear_anos', 'garantia_eficiencia', 'garantia_inversor_anos']) {
    exige(Number.isInteger(Number(d[k])) && Number(d[k]) > 0, `${k} deve ser inteiro maior que zero`);
  }
  exige(String(d.fornecedora || '').trim(), 'fornecedora é obrigatória');
  exige(!d.data_assinatura || /^\d{4}-\d{2}-\d{2}$/.test(d.data_assinatura), 'data_assinatura deve estar no formato AAAA-MM-DD');
  const e = d.cliente?.endereco;
  if (e && typeof e === 'object') {
    for (const k of ['logradouro', 'numero', 'bairro', 'cidade', 'uf']) exige(String(e[k] || '').trim(), `cliente.endereco.${k} é obrigatório`);
    exige(soDigitos(e.cep).length === 8, 'cliente.endereco.cep deve ter 8 dígitos');
  }
  (Array.isArray(d.pagamentos) ? d.pagamentos : []).forEach((p, i) => {
    if (p?.tipo === 'texto') return exige(String(p.texto || '').trim(), `pagamentos[${i}]: texto é obrigatório`);
    exige(Number(p?.valor) > 0, `pagamentos[${i}]: valor deve ser maior que zero`);
    if (p?.parcelas !== undefined) exige(Number.isInteger(Number(p.parcelas)) && Number(p.parcelas) >= 1, `pagamentos[${i}]: parcelas deve ser inteiro ≥ 1`);
  });
  if (erros.length) throw new ErroValidacao('Dados incompletos:\n- ' + erros.join('\n- '));

  const doc = documento(d.cliente.documento);
  const s = d.sistema;
  const qtdInv = Number(s.qtd_inversores || 1);

  // Soma dos pagamentos tem que bater com o total (evita contrato com valor errado)
  const soma = d.pagamentos.filter((p) => p.tipo !== 'texto').reduce((a, p) => a + Number(p.valor), 0);
  if (d.pagamentos.every((p) => p.tipo !== 'texto') && Math.abs(soma - d.valor_total) > 0.009) {
    throw new ErroValidacao(`Pagamentos somam ${brl(soma)}, mas o valor total é ${brl(d.valor_total)}.`);
  }

  // Potência calculada (módulos × Wp). Se vier informada e divergir, avisa.
  const kwpCalc = (s.qtd_modulos * s.potencia_modulo_wp) / 1000;
  const avisos = [];
  if (s.potencia_kwp && Math.abs(s.potencia_kwp - kwpCalc) > 0.01) {
    avisos.push(`potência informada ${s.potencia_kwp} kWp ≠ calculada ${kwpCalc.toFixed(2)} kWp`);
  }
  const kwp = s.potencia_kwp || kwpCalc;

  if (!doc.pj && !['f', 'm'].includes(d.cliente.genero)) avisos.push('gênero do cliente não informado: usando "inscrito/domiciliado"');
  const generoF = d.cliente.genero === 'f';
  const campos = {
    cliente_nome: d.cliente.nome.trim().toUpperCase(),
    cliente_doc_tipo: doc.tipo,
    cliente_doc: doc.fmt,
    cliente_o_a: doc.pj ? 'a' : generoF ? 'a' : 'o',
    cliente_domicilio: doc.pj ? 'com sede' : `residente e domiciliad${generoF ? 'a' : 'o'}`,
    cliente_endereco: enderecoTexto(d.cliente.endereco),

    potencia_kwp: kwp.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    qtd_modulos: s.qtd_modulos,
    qtd_modulos_extenso: ext.inteiro(s.qtd_modulos),
    potencia_modulo_wp: s.potencia_modulo_wp,
    qtd_inversores: qtdInv,
    qtd_inversores_extenso: ext.inteiro(qtdInv),
    inversor_label: qtdInv > 1 ? 'Inversores' : 'Inversor',
    inversor_marca: s.inversor_marca,
    inversor_potencia_kw: String(s.inversor_potencia_kw).replace('.', ','),
    tipo_estrutura: d.tipo_estrutura,

    valor_total: brl(d.valor_total),
    valor_total_extenso: ext.reais(d.valor_total),
    condicao_pagamento: condicaoPagamento(d.pagamentos),

    fornecedora: d.fornecedora,
    garantia_modulo_anos: d.garantia_modulo_anos,
    garantia_modulo_anos_extenso: ext.inteiro(d.garantia_modulo_anos),
    garantia_linear_anos: d.garantia_linear_anos,
    garantia_linear_anos_extenso: ext.inteiro(d.garantia_linear_anos),
    garantia_eficiencia: d.garantia_eficiencia,
    garantia_eficiencia_extenso: ext.inteiro(d.garantia_eficiencia),
    garantia_inversor_anos: d.garantia_inversor_anos,
    garantia_inversor_anos_extenso: ext.inteiro(d.garantia_inversor_anos),

    local_data: `${d.cidade_assinatura}, ${dataExtenso(d.data_assinatura)}.`,
  };
  return { campos, avisos };
}

/** Gera o .docx preenchido. Retorna { buffer, nomeArquivo, avisos }. */
function gerarContrato(input, templatePath = TEMPLATE) {
  const { campos, avisos } = montarCampos(input);
  const zip = new PizZip(fs.readFileSync(templatePath));
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: (part) => { throw new Error(`Campo sem valor no template: {${part.value}}`); },
  });
  doc.render(campos);
  const buffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  const nomeArquivo = `CONTRATO - ${campos.cliente_nome}.docx`;
  return { buffer, nomeArquivo, avisos, campos };
}

module.exports = { gerarContrato, montarCampos, condicaoPagamento, documento, cpfValido, cnpjValido, ErroValidacao, PADROES };
