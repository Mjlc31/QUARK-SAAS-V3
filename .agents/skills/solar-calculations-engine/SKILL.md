---
name: solar-calculations-engine
description: Especialista e motor de cálculos de engenharia fotovoltaica e matemática financeira para o Quark SaaS. Use SEMPRE que precisar calcular, auditar, debugar ou refatorar: dimensionamento de potência (kWp, módulos, inversores), geração de energia (HSP, PR, sazonalidade, perdas, degradação), faturamento e compensação segundo a Lei 14.300/2022 (Fio B, TUSD, simultaneidade, custo de disponibilidade sem bitributação), payback simples e descontado, fluxo de caixa de 25 anos (à vista e financiado), TIR/IRR, VPL/NPV, LCOE, parcelamento Price/SAC e indicadores ambientais (CO2 e árvores).
---

# Solar Calculations & Financial Engineering Engine

Motor de regras, fórmulas e diretrizes de cálculo fotovoltaico e engenharia econômica do Quark SaaS. Garante consistência matemática, fidelidade regulatória à legislação brasileira (Lei 14.300/2022, REN 1.000/ANEEL) e precisão comercial nas propostas geradas aos clientes.

---

## 1. Responsabilidade do Agente

Como subagente de contas e cálculos (`quark-solar-calculator`), você é a autoridade técnica final sobre:
1. **Dimensionamento Fotovoltaico**: Relação kWp/consumo, número de módulos, área de telhado, FDI (razão CC/CA) e HSP regional.
2. **Faturamento Regulatório**: Aplicação estrita da Lei 14.300/2022 (escalonamento do Fio B até 2029+, simultaneidade e garantia de custo de disponibilidade sem dupla cobrança).
3. **Engenharia Financeira**: Payback simples (anos/meses), Payback descontado (pela TMA), TIR, VPL, LCOE e projeção de fluxo de caixa em 25 anos.
4. **Modelagem de Financiamento**: Simulação de parcelas (Tabela Price), fluxo alavancado com entrada e comparação imediata "Parcela vs Economia".

---

## 2. Fórmulas e Algoritmos Padrão

### A. Geração de Energia e Dimensionamento
- **Fator de Geração Mensal**: $F_g = \text{HSP} \times \text{PR} \times 30.41$ (kWh/kWp/mês).
  - Padrão Alagoas / Maceió: $\text{HSP} = 5.2$ a $5.5$, $\text{PR} = 0.80$ $\to$ $F_g \approx 125$ a $130\text{ kWh/kWp/mês}$.
- **Potência Recomendada**: $P_{\text{kWp}} = \frac{\text{Consumo Médio (kWh/mês)} \times \text{Alvo Compensação}}{F_g}$.
- **Geração Mensal com Sazonalidade**: $E_m = P_{\text{kWp}} \times \left(\frac{F_g}{30.41}\right) \times s_m \times D_m$.
- **Degradação Anual**: Módulos perdem $0.5\%$ ao ano ($g_t = (1 - 0.005)^{t-1}$).

### B. Fatura e Compensação (Lei 14.300 / GD II)
- **Simultaneidade ($f_{\text{autoconsumo}}$)**: Fração consumida instantaneamente (padrão residencial: 30%; comercial: 60%-80%).
- **Energia Compensada**: $\min(\text{Injeção}, \text{Consumo da Rede})$.
- **Escalonamento Fio B**: $2023 \to 15\%$, $2024 \to 30\%$, $2025 \to 45\%$, $2026 \to 60\%$, $2027 \to 75\%$, $2028 \to 90\%$, $2029+ \to 100\%$.
- **Regra de Ouro do Custo de Disponibilidade (Art. 16)**:
  $$\text{Disponibilidade (kWh)}: \text{Mono} = 30,\; \text{Bi} = 50,\; \text{Tri} = 100$$
  $$\text{Valor Mínimo} = \text{Disponibilidade (kWh)} \times \text{Tarifa}$$
  $$\text{TopUp} = \max(0,\; \text{Valor Mínimo} - \text{Consumo Não Compensado} - \text{Custo Fio B})$$
  $$\text{Fatura Final} = \text{Consumo Não Compensado} + \text{Custo Fio B} + \text{TopUp} + \text{CIP}$$
  > *NUNCA somar a taxa mínima integral em cima do Fio B cobrado quando o total já atinge o piso.*

### C. Payback e Fluxo de Caixa

#### 1. Payback Simples do Investimento (À Vista)
Calculado com interpolação linear contínua para precisão decimal:
```typescript
let cumulative = -investment;
let paybackYears = 0;
for (let year = 1; year <= lifeYears; year++) {
  const savings = annualNetSavings[year - 1];
  const prev = cumulative;
  cumulative += savings;
  if (cumulative >= 0 && savings > 0) {
    const fraction = -prev / savings;
    paybackYears = (year - 1) + fraction;
    break;
  }
}
const paybackMonths = Math.round(paybackYears * 12);
```

#### 2. Payback Descontado (TMA)
Considera o valor do dinheiro no tempo pela TMA ($k$, padrão $12\%$ a.a.):
$$\text{DCF}_t = \frac{CF_t}{(1 + k)^t}, \quad \text{Payback Descontado} = (t - 1) + \frac{-S_{\text{desc}, t-1}}{\text{DCF}_t}$$

#### 3. Financiamento e Fluxo de Caixa do Cliente
- **Parcela Tabela Price**:
  $$PMT = P \times \frac{i \times (1 + i)^n}{(1 + i)^n - 1}$$
- **Proposta Financiada**:
  - Se a entrada for $0$ e $\text{Economia Mensal} > PMT$, o retorno é **imediato** (saldo positivo desde o mês 1).
  - Manter sempre clara a distinção entre **Payback do Ativo** (preço do sistema $\div$ economia) e **Fluxo Alavancado do Cliente** (economia líquida após pagar a parcela).

---

## 3. Guardrails Obrigatórios

> [!CAUTION]
> **Anti-bugs Críticos Detectados**:
> 1. **Evite Off-by-One no Payback**: O ano de quitação fracionária deve somar `(year - 1) + fraction`, NUNCA `year + fraction`.
> 2. **Proibição de Bitributação de Disponibilidade**: Em nenhum cálculo de nova conta adicione `custoDispo` e `fioBCost` como somas cegas. Use o `topUp` conforme Art. 16 da Lei 14.300.
> 3. **Financiamento Não Zera Payback**: Em simulações de financiamento, nunca retorne payback 0 meses como se o investimento fosse zero; apresente o Payback do Ativo e o delta mensal de caixa ($\Delta = \text{Economia} - PMT$).
> 4. **OPEX e Inversores**: Lembre-se que em análises completas de 25 anos, injeções de custo como troca de inversor (anos 10–12, $\approx 20\%$ a $30\%$ do inversor) e manutenção/limpeza ($0.5\%$ a $1\%$ a.a.) devem ser previstas.

---

## 4. Arquivos e Integrações no Quark SaaS

- **Motor Principal das Propostas**: `src/lib/pricing.ts` (`calcEnergy`, `solarBill`, `calcPricing`).
- **Motor CPQ / Leads**: `src/components/proposal/solarCalc.ts` (`calcSolar`, `calcFinancingOptions`).
- **Gerador de PDF de Proposta**: `src/components/proposal/ProposalPDF.tsx`.
- **Interface da Proposta do Cliente**: `src/components/proposal/document.tsx` e `editor.tsx`.
- **Calculadora Web**: `src/pages/Calculator.tsx`.

---

## 5. Documentos de Referência Complementares

Para aprofundamento progressivo, consulte os arquivos especializados:
- [Faturamento Lei 14.300 e Fio B](references/lei-14300-fiob.md)
- [Fórmulas Financeiras e Engenharia Econômica](references/financial-formulas.md)
- [Dimensionamento Técnico e Geração](references/solar-generation.md)
- [Script Validador Unitário](scripts/verify_calculations.py)
