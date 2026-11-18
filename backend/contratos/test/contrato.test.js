const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const { gerarContrato, montarCampos, condicaoPagamento, cpfValido, cnpjValido, ErroValidacao } = require('../lib/contrato');
const { paragrafos } = require('../lib/texto');

const raiz = path.join(__dirname, '..');
const yulia = () => JSON.parse(fs.readFileSync(path.join(raiz, 'exemplos/yulia.json'), 'utf8'));
const empresa = () => JSON.parse(fs.readFileSync(path.join(raiz, 'exemplos/empresa-financiamento.json'), 'utf8'));

test('CPF e CNPJ', () => {
  assert.ok(cpfValido('07571633435'));
  assert.ok(!cpfValido('07571633436'));
  assert.ok(!cpfValido('11111111111'));
  assert.ok(cnpjValido('11222333000181'));
  assert.ok(!cnpjValido('11222333000182'));
  assert.ok(!cnpjValido('00000000000000'));
  const d = yulia();
  d.cliente.documento = '075.716.334-36';
  assert.throws(() => montarCampos(d), (e) => e instanceof ErroValidacao && /CPF inválido/.test(e.message));
  d.cliente.documento = '123';
  assert.throws(() => montarCampos(d), ErroValidacao);
});

test('soma dos pagamentos tem que bater com o total', () => {
  const d = yulia();
  d.pagamentos[1].valor = 9999.99;
  assert.throws(() => montarCampos(d), (e) => e instanceof ErroValidacao && /somam R\$ 33\.866,99/.test(e.message));
  d.pagamentos.push({ tipo: 'texto', texto: 'saldo combinado à parte' });
  assert.doesNotThrow(() => montarCampos(d)); // com texto livre não há como somar
});

test('campos obrigatórios e pagamentos inválidos viram ErroValidacao', () => {
  const d = yulia();
  delete d.cliente.nome;
  d.cliente.endereco.cep = '123';
  d.pagamentos = [{ tipo: 'pix', valor: 0 }, { tipo: 'cartao', valor: 33867, parcelas: 0 }];
  assert.throws(() => montarCampos(d), (e) => e instanceof ErroValidacao && /cliente\.nome/.test(e.message) && /cep/.test(e.message) && /parcelas/.test(e.message));
  assert.throws(() => montarCampos({ ...yulia(), pagamentos: [{ tipo: 'cheque', valor: 33867 }] }), ErroValidacao);
});

test('inversor no singular e no plural', () => {
  assert.equal(montarCampos(yulia()).campos.inversor_label, 'Inversor');
  const { campos } = montarCampos(empresa());
  assert.equal(campos.inversor_label, 'Inversores');
  assert.equal(campos.qtd_inversores_extenso, 'dois');
});

test('PF × PJ e gênero', () => {
  const pf = montarCampos(yulia()).campos;
  assert.equal(pf.cliente_doc_tipo, 'CPF');
  assert.equal(pf.cliente_o_a, 'a');
  assert.equal(pf.cliente_domicilio, 'residente e domiciliada');
  const m = yulia();
  m.cliente.genero = 'm';
  assert.equal(montarCampos(m).campos.cliente_domicilio, 'residente e domiciliado');
  const semGenero = yulia();
  delete semGenero.cliente.genero;
  assert.match(montarCampos(semGenero).avisos.join(), /gênero/);
  const pj = montarCampos(empresa());
  assert.equal(pj.campos.cliente_doc_tipo, 'CNPJ');
  assert.equal(pj.campos.cliente_doc, '11.222.333/0001-81');
  assert.equal(pj.campos.cliente_domicilio, 'com sede');
  assert.equal(pj.avisos.length, 0);
});

test('kWp calculado e aviso de divergência', () => {
  assert.equal(montarCampos(yulia()).campos.potencia_kwp, '16,33');
  const d = yulia();
  d.sistema.potencia_kwp = 16;
  assert.match(montarCampos(d).avisos[0], /16 kWp ≠ calculada 16\.33/);
});

test('cláusula 3.1 para cada forma de pagamento', () => {
  assert.equal(
    condicaoPagamento([{ tipo: 'boleto', valor: 5000, parcelas: 5 }, { tipo: 'financiamento', valor: 80000, banco: 'Banco do Nordeste' }]),
    'o valor de R$ 5.000,00 (cinco mil reais) em 5 parcelas mensais via boleto bancário; e o valor de R$ 80.000,00 (oitenta mil reais) por meio de financiamento bancário junto ao Banco do Nordeste, com liberação do recurso diretamente para a CONTRATADA.',
  );
  assert.equal(condicaoPagamento([{ tipo: 'cartao', valor: 100, parcelas: 1 }]), 'o valor de R$ 100,00 (cem reais) no cartão de crédito à vista.');
  assert.equal(condicaoPagamento([{ tipo: 'transferencia', valor: 1 }]), 'o valor de R$ 1,00 (um real) à vista, via transferência bancária, diretamente para a CONTRATADA, no ato da assinatura deste contrato.');
});

test('regressão: texto da Yulia igual ao esperado', () => {
  const { buffer, nomeArquivo } = gerarContrato(yulia());
  assert.equal(nomeArquivo, 'CONTRATO - YULIA AMARAL ALMEIDA.docx');
  const esperado = fs.readFileSync(path.join(__dirname, 'yulia.esperado.txt'), 'utf8').trimEnd().split('\n');
  assert.deepEqual(paragrafos(buffer), esperado);
});

test('regressão: diferenças em relação ao original são só as correções aprovadas', () => {
  const orig = paragrafos(fs.readFileSync(path.join(raiz, 'referencia/CONTRATO - YULIA AMARAL ALMEIDA.docx')));
  const ger = paragrafos(gerarContrato(yulia()).buffer);
  const iData = ger.indexOf('Maceió/AL, 13 de novembro de 2026.');
  assert.ok(iData > 0, 'fecho com local e data (correção: o original não tinha data)');
  const semData = ger.filter((_, i) => i !== iData);
  const corrigidos = { 2: 'qualificação PF', 4: 'vírgula decimal, "de 710 Wp", "15 kW"', 24: 'extenso sem "e" sobrando', 25: 'cláusula 3.1 montada', 90: 'CPF em vez de CNPJ na assinatura' };
  assert.equal(semData.length, orig.length);
  const diffs = semData.map((p, i) => (p !== orig[i] ? i : -1)).filter((i) => i >= 0);
  assert.deepEqual(diffs, Object.keys(corrigidos).map(Number));
  // Texto jurídico pendente de revisão continua exatamente como no original
  for (const trecho of ['resolução 482 da ANEEL', '(vinte por cento)', 'Projeto:']) {
    assert.equal(ger.join('\n').split(trecho).length, orig.join('\n').split(trecho).length, trecho);
  }
});

test('regressão: formatação do original preservada (estilos, cabeçalho, rodapé, seções, parágrafos)', () => {
  const g = new PizZip(gerarContrato(yulia()).buffer);
  const r = new PizZip(fs.readFileSync(path.join(raiz, 'referencia/CONTRATO - YULIA AMARAL ALMEIDA.docx')));
  const norm = (s) => s.replace(/<\?xml[^>]*\?>/, '').replace(/\s+/g, ' ').replace(/> </g, '><').replace(/ xmlns:\w+="[^"]*"/g, '').trim();
  for (const f of ['word/styles.xml', 'word/numbering.xml', 'word/header1.xml', 'word/header2.xml', 'word/footer1.xml', 'word/footer2.xml', 'word/settings.xml', 'word/theme/theme1.xml', 'word/fontTable.xml']) {
    assert.equal(norm(g.file(f).asText()), norm(r.file(f).asText()), f);
  }
  assert.ok(Buffer.from(g.file('word/media/image1.png').asUint8Array()).equals(Buffer.from(r.file('word/media/image1.png').asUint8Array())), 'timbrado');
  const ppr = (z) => z.file('word/document.xml').asText().split('</w:p>').map((p) => (p.match(/<w:pPr>.*?<\/w:pPr>/s) || [''])[0].replace(/<w:rPr>.*<\/w:rPr>/s, ''));
  const sect = (z) => (z.file('word/document.xml').asText().match(/<w:sectPr[\s\S]*?<\/w:sectPr>/g) || []).map((s) => s.replace(/ w:rsid\w*="[^"]*"/g, ''));
  const a = ppr(g), b = ppr(r);
  const extra = a.findIndex((p, i) => p !== b[i]); // o parágrafo do "local, data" inserido
  assert.deepEqual(a.filter((_, i) => i !== extra), b);
  assert.deepEqual(sect(g), sect(r));
});
