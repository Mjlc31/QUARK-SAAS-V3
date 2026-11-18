# Fórmulas Financeiras e Engenharia Econômica Solar

Este documento consolida as diretrizes matemáticas para cálculo de retorno financeiro, fluxo de caixa e métricas de investimento no Quark SaaS.

---

## 1. Payback Simples (Não Descontado)

O Payback Simples representa o tempo necessário para que o somatório dos fluxos de caixa operacionais líquidos (economia líquida) iguale o investimento inicial de capital (CAPEX).

### Algoritmo com Interpolação Linear
Dado o investimento inicial $I_0 > 0$ e os fluxos de caixa anuais líquidos $CF_t$ para $t = 1, \dots, N$:

1. Iniciar saldo acumulado: $S_0 = -I_0$.
2. Para cada ano $t \in [1, N]$:
   $$S_t = S_{t-1} + CF_t$$
   Se $S_t \ge 0$ e $S_{t-1} < 0$:
   $$\text{Fração do Ano} = \frac{-S_{t-1}}{CF_t}$$
   $$\text{Payback (anos)} = (t - 1) + \text{Fração do Ano}$$
   $$\text{Payback (meses)} = \text{round}(\text{Payback (anos)} \times 12)$$
   Interromper iteração.

> [!WARNING]
> Erro clássico de off-by-one: somar $t + \frac{-S_{t-1}}{CF_t}$ em vez de $(t - 1) + \frac{-S_{t-1}}{CF_t}$ adiciona 1 ano inteiro ao resultado.

---

## 2. Payback Descontado (Valor do Dinheiro no Tempo)

O Payback Descontado considera o custo de oportunidade do capital por meio da Taxa Mínima de Atratividade (TMA, $k$).

$$\text{DCF}_t = \frac{CF_t}{(1 + k)^t}$$
$$S_{\text{desc}, t} = S_{\text{desc}, t-1} + \text{DCF}_t \quad (\text{com } S_{\text{desc}, 0} = -I_0)$$

Ao atingir $S_{\text{desc}, t} \ge 0$:
$$\text{Payback Descontado} = (t - 1) + \frac{-S_{\text{desc}, t-1}}{\text{DCF}_t}$$

---

## 3. Payback do Ativo (À Vista) vs Payback do Financiamento (Alavancado)

Em propostas solares, há duas visões fundamentais:

### Visão A: Payback do Ativo (Project/Unlevered Payback)
- **Investimento**: Preço total do sistema à vista ($I_0 = \text{Preço Final}$).
- **Fluxo de Caixa Anual**: Economia de energia pura no ano ($CF_t = \text{Economia}_t - \text{OPEX}_t$).
- **Aplicação**: Avalia a atratividade técnica e econômica do sistema independentemente da forma de pagamento.

### Visão B: Fluxo de Caixa do Cliente Financiado (Levered Cashflow)
- **Investimento Inicial**: Apenas a Entrada paga ($I_0 = \text{DownPayment}$). Se 100% financiado sem entrada, $I_0 = 0$.
- **Serviço da Dívida**: Parcela mensal $PMT$ calculada pela Tabela Price.
- **Fluxo Anual**: $CF_t = \text{Economia}_t - \text{Parcelas Anuais}_t - \text{OPEX}_t$.
- **Métrica-Chave**: "A Parcela se Paga!". Se $\text{Economia Mensal} > PMT$, o cliente obtém **lucro líquido imediato desde o primeiro mês**, o que representa retorno infinito / imediato sobre o capital próprio investido.

---

## 4. Taxa Interna de Retorno (TIR / IRR)

A TIR é a taxa de desconto $r$ que zera o Valor Presente Líquido (VPL):

$$\text{VPL}(r) = -I_0 + \sum_{t=1}^{N} \frac{CF_t}{(1 + r)^t} = 0$$

### Método Numérico de Newton-Raphson:
$$r_{k+1} = r_k - \frac{\text{VPL}(r_k)}{\text{VPL}'(r_k)}$$
onde a derivada é:
$$\text{VPL}'(r) = -\sum_{t=1}^{N} \frac{t \times CF_t}{(1 + r)^{t+1}}$$

Salvaguardas numéricas obrigatórias:
- Taxa inicial: $r_0 = 0.12$.
- Limitar iterações a 1.000.
- Critério de parada: $|\Delta r| < 10^{-7}$.
- Se não convergir ou se $r < 0$, retornar $0$.

---

## 5. Valor Presente Líquido (VPL / NPV)

$$\text{VPL} = -I_0 + \sum_{t=1}^{N} \frac{CF_t}{(1 + \text{TMA})^t}$$
- $\text{VPL} > 0$: O projeto gera riqueza superior ao custo de oportunidade (ex: CDI/Selic).

---

## 6. OPEX e Reinvestimento em Inversores

Para uma modelagem financeira institucional e fidedigna de 25 anos:
1. **O&M Anual**: $0.5\%$ a $1.0\%$ do CAPEX/ano (limpeza de módulos, vistorias, reaperto de conexões).
2. **Substituição de Inversor**: Ao ano 10 a 12, programar reinvestimento equivalente a $15\%$ a $25\%$ do valor inicial do sistema.
3. **Degradação de Módulos**: $0.5\%$ a.a. linear (garantia padrão Tier 1: mínimo de $80\%$ de geração no ano 25).
