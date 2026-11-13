import sys, copy
from docx import Document
src, out = sys.argv[1], sys.argv[2]
d = Document(src)
P = d.paragraphs
def find(start):
    for p in P:
        if p.text.startswith(start): return p
    raise SystemExit('não achei: '+start)
def setr(p, mapping, expect=None):
    r = p.runs
    for i, t in mapping.items():
        r[i].text = t

# Qualificação do CONTRATANTE
p = find('CONTRATANTE:')
assert p.runs[2].text == 'YULIA AMARAL ALMEIDA'
setr(p, {2:'{cliente_nome}', 3:', inscrit{cliente_o_a} no ', 4:'{cliente_doc_tipo} ', 5:'sob o nº: ',
         6:'{cliente_doc}', 8:'{cliente_domicilio} ', 9:'n', 10:'o', 11:' endereço ', 12:'{cliente_endereco}.'})
# Objeto
p = find('1. O presente contrato')
assert p.runs[5].text.startswith('16.33')
setr(p, {5:'{potencia_kwp} kWp, ', 7:'{qtd_modulos} ({qtd_modulos_extenso}) ', 8:'módulos fotovoltaicos de ',
         9:'{potencia_modulo_wp} Wp ', 11:'{qtd_inversores} ({qtd_inversores_extenso}) {inversor_label} {inversor_marca} de {inversor_potencia_kw} kW, ',
         13:' {tipo_estrutura}'})
# Itens o / p
p = find('Fornecimento de 23'); setr(p, {1:'{qtd_modulos}'})
p = find('Fornecimento de 1 I'); setr(p, {1:'{qtd_inversores}', 3:'{inversor_label}', 4:''})
# Valor total
p = find('3. Pela prestação'); setr(p, {5:' {valor_total} ({valor_total_extenso})'})
# Condição de pagamento (texto gerado)
p = find('3.1')
setr(p, {4:' pagará {condicao_pagamento}', 5:'', 6:'', 7:'', 8:''})
# Garantias
p = find('5.1 ')
setr(p, {2:' ({fornecedora}), através do fabricante, oferecerá garantia dos módulos solares fotovoltaicos pelo prazo de {garantia_modulo_anos} ({garantia_modulo_anos_extenso}) anos contra defeitos de fabricação e garantia linear de produção de {garantia_linear_anos} ({garantia_linear_anos_extenso}) anos com entrega mínima de {garantia_eficiencia}% ({garantia_eficiencia_extenso} por cento) da capacidade total do módulo. '})
p = find('5.2')
setr(p, {1:' A FORNECEDORA ({fornecedora}), através do fabricante, oferecerá a garantia do inversor de {garantia_inversor_anos} ({garantia_inversor_anos_extenso}) anos contra defeitos de f'})
# Assinatura
p = [x for x in P if x.text.startswith('CONTRATANTE\n')][0]
setr(p, {1:'{cliente_nome}', 3:'{cliente_doc_tipo}', 5:'{cliente_doc}'})
# Local e data (novo parágrafo após "Por estarem assim...")
p = find('Por estarem assim')
new = copy.deepcopy(p._p); p._p.addnext(new)
from docx.text.paragraph import Paragraph
np_ = Paragraph(new, p._parent)
for r in np_.runs[1:]: r._r.getparent().remove(r._r)
np_.runs[0].text = '{local_data}'
np_.alignment = 2  # direita
from docx.shared import Pt
np_.paragraph_format.space_before = Pt(12)
d.save(out)
print('ok')
