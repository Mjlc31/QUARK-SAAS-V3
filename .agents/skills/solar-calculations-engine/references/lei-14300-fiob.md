# Regulamentação e Faturamento Solar — Marco Legal da GD (Lei 14.300/2022)

Este guia estabelece o padrão regulatório para faturamento de sistemas de micro e minigeração distribuída (MMGD) no Quark SaaS.

---

## 1. Escalonamento da Transição da TUSD Fio B (Art. 27)

Para unidades consumidoras enquadradas como GD II (protocolo pós 06/01/2023), a cobrança da Tarifa de Uso do Sistema de Distribuição relativa aos componentes tarifários não associados à energia (TUSD Fio B) sobre a **energia compensada** segue o cronograma progressivo:

| Ano | Percentual da TUSD Fio B Cobrado |
| :--- | :--- |
| **2023** | 15% |
| **2024** | 30% |
| **2025** | 45% |
| **2026** | 60% |
| **2027** | 75% |
| **2028** | 90% |
| **2029 em diante** | 100% (ou valoração de custos e benefícios definida pela ANEEL) |

> Sistemas com parecer de acesso protocolado até 06/01/2023 pertencem a **GD I (Direito Adquirido)** e compensam 100% da tarifa integral sem incidência de Fio B até 31/12/2045.

---

## 2. Autoconsumo e Simultaneidade

Apenas a energia injetada na rede e posteriormente compensada está sujeita à incidência do Fio B. A parcela consumida instantaneamente no imóvel (autoconsumo simultâneo) não passa pelo medidor como injeção:

$$\text{Energia Simultânea} = \text{Geração Mensal} \times f_{\text{simultaneidade}}$$
$$\text{Injeção na Rede} = \text{Geração Mensal} - \text{Energia Simultânea}$$
$$\text{Consumo Puxado da Rede} = \max(0, \text{Consumo Total} - \text{Energia Simultânea})$$
$$\text{Energia Compensada} = \min(\text{Injeção}, \text{Consumo da Rede})$$

Fatores típicos de simultaneidade no Brasil:
- **Residencial comercial/trabalho fora**: 20% a 30%
- **Residencial com home office**: 30% a 40%
- **Comercial diurno (escritórios, lojas)**: 60% a 85%
- **Industrial diurno**: 80% a 95%

---

## 3. Regra de Ouro do Custo de Disponibilidade (Art. 16 e REN 1.000)

> [!IMPORTANT]
> **Proibição de Bitributação**: É estritamente vedado cobrar a taxa mínima de disponibilidade além da cobrança do Fio B caso o somatório das parcelas faturadas já ultrapasse o valor da disponibilidade mínima.

### Tabela de Disponibilidade Mínima (kWh/mês)
- **Monofásico**: 30 kWh
- **Bifásico**: 50 kWh
- **Trifásico**: 100 kWh

### Fórmula de Faturamento da Nova Conta
1. **Consumo não compensado**:
   $$\text{Parcela Não Compensada (R\$)} = (\text{Consumo da Rede} - \text{Energia Compensada}) \times \text{Tarifa Cheia}$$

2. **Custo do Fio B sobre o compensado**:
   $$\text{Custo Fio B (R\$)} = \text{Energia Compensada} \times \text{Tarifa Fio B} \times \%_{\text{ano}}$$

3. **Garantia da Disponibilidade Mínima (Top-up)**:
   $$\text{Valor Mínimo Disponibilidade (R\$)} = \text{kWh}_{\text{disponibilidade}} \times \text{Tarifa Cheia}$$
   $$\text{TopUp} = \max(0, \text{Valor Mínimo Disponibilidade} - \text{Parcela Não Compensada} - \text{Custo Fio B})$$

4. **Fatura Total**:
   $$\text{Conta Solar Final} = \text{Parcela Não Compensada} + \text{Custo Fio B} + \text{TopUp} + \text{Iluminação Pública (CIP/COSIP)}$$

Se a soma do não compensado com o Fio B for maior ou igual ao mínimo de disponibilidade, `TopUp = 0`. O consumidor nunca paga duas vezes pelo mesmo direito de conexão.
