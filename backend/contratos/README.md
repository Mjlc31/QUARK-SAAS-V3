# Gerador de Contratos — Quark Energia

Gera o contrato de microgeração solar (padrão Quark) a partir dos dados do cliente e da proposta.
Mantém 100% da formatação do modelo original (timbrado, fontes, numeração, rodapé).

```bash
npm install
node gerar-contrato.js exemplos/yulia.json           # gera .docx em saida/
node gerar-contrato.js exemplos/*.json --pdf         # lote + PDF (requer LibreOffice)
```

## Como o modelo foi dividido

### Fixo (igual para todo cliente)
Dados da CONTRATADA (Quark, CNPJ, endereço, José Anderson), cláusula 2 (itens a–n), cláusula 4 (prazos),
5.3–5.5, cláusulas 6 a 10, foro de Maceió, Equatorial Alagoas.

### Variável por cliente
| Campo no template | De onde vem | Observação |
|---|---|---|
| `{cliente_nome}` | `cliente.nome` | Convertido para MAIÚSCULAS |
| `{cliente_doc_tipo}` / `{cliente_doc}` | `cliente.documento` | Detecta CPF ou CNPJ, valida dígitos e formata |
| `{cliente_o_a}` / `{cliente_domicilio}` | `cliente.genero` + tipo de doc | "inscrito/inscrita", "residente e domiciliado(a)" ou "com sede" (PJ) |
| `{cliente_endereco}` | `cliente.endereco` (objeto ou texto) | Montado no padrão "RUA, Nº, COMPL, CEP: … - BAIRRO - CIDADE - UF" |
| `{potencia_kwp}` | **calculado**: módulos × Wp ÷ 1000 | Avisa se a potência informada divergir |
| `{qtd_modulos}` + extenso | `sistema.qtd_modulos` | Aparece na cláusula 1 e no item "o" |
| `{potencia_modulo_wp}` | `sistema.potencia_modulo_wp` | |
| `{qtd_inversores}` + extenso, `{inversor_label}` | `sistema.qtd_inversores` | "Inversor"/"Inversores" automático |
| `{inversor_marca}`, `{inversor_potencia_kw}` | `sistema.*` | |
| `{tipo_estrutura}` | `tipo_estrutura` (padrão: telhado) | telhado / solo / laje… |
| `{valor_total}` + extenso | `valor_total` | |
| `{condicao_pagamento}` | `pagamentos[]` | Texto da 3.1 montado automaticamente; a soma tem que bater com o total |
| `{fornecedora}` e garantias | padrão SOU ENERGY / 15 / 25 / 84% / 10 | Sobrescreva quando o kit vier de outro distribuidor |
| `{local_data}` | `data_assinatura` (padrão: hoje) | "Maceió/AL, 13 de novembro de 2026." |

### Tipos de pagamento aceitos
```json
{ "tipo": "pix", "valor": 10000 }
{ "tipo": "transferencia", "valor": 10000 }
{ "tipo": "cartao", "valor": 23867, "parcelas": 18, "juros": true }
{ "tipo": "boleto", "valor": 5000, "parcelas": 5 }
{ "tipo": "financiamento", "valor": 80000, "banco": "Banco do Nordeste" }
{ "tipo": "texto", "texto": "condição especial escrita à mão" }
```
Campo opcional `momento` (padrão: "no ato da assinatura deste contrato").

## Integração com o Quark OS

`lib/contrato.js` não depende da CLI: é uma função pura `gerarContrato(dados) → { buffer, nomeArquivo }`.

```js
// server/routes/contratos.js (Express)
const { gerarContrato } = require('../contratos/lib/contrato');

router.post('/contratos/:propostaId/gerar', async (req, res) => {
  const proposta = await carregarPropostaComCliente(req.params.propostaId); // Supabase
  const dados = mapearPropostaParaContrato(proposta);                      // adapter
  const { buffer, nomeArquivo } = gerarContrato(dados);
  // opcional: salvar no Storage do Supabase e registrar em `contratos`
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(nomeArquivo)}"`);
  res.type('application/vnd.openxmlformats-officedocument.wordprocessingml.document').send(buffer);
});
```

Fluxo recomendado: **Proposta aprovada → botão "Gerar contrato" → .docx/PDF salvo no Storage →
módulo de assinatura digital**. Assim o vendedor nunca digita os dados de novo.

## Editar o modelo
Abra `template-contrato-quark.docx` no Word e altere o texto normalmente. Só não quebre as `{tags}`.
Para adicionar um campo novo: escreva `{nome_do_campo}` no Word e inclua a chave em `montarCampos()`.
Se algum campo ficar sem valor, a geração falha em vez de sair um contrato incompleto.
