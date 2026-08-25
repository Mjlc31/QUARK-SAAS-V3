// ============================================================
// MOTOR DE CÁLCULO SOLAR — Quark Energia v4.0
// Payback, TIR, VPL, Fluxo de Caixa, CO2, Economia
// ============================================================

export interface SolarCalcInput {
  // Dados de consumo
  monthlyConsumptionKwh: number;   // kWh/mês
  tariffRate: number;               // R$/kWh (tarifa cheia)
  fiobEffective: number;            // R$/kWh (Fio B efetivo = total * 45%)
  publicLighting: number;           // R$/mês (CIP/COSIP)
  connectionType: 'mono' | 'bi' | 'tri'; // Tipo de ligação
  generationFactor: number;         // kWh/kWp/mês (padrão AL = 128.64)

  // Sistema instalado
  systemPowerKwp: number;           // kWp total instalado (módulos * Wp / 1000)
  finalPrice: number;               // Preço total do sistema (R$)

  // Parâmetros financeiros
  tariffAdjustmentRate: number;     // % a.a. reajuste tarifário (padrão 7)
  systemLifeYears: number;          // Anos de vida útil (padrão 25)
  tma: number;                      // Taxa Mínima de Atratividade % a.a. (padrão 12)
}

export interface SolarCalcResult {
  // Geração
  monthlyGenerationKwh: number;
  annualGenerationKwh: number;

  // Conta do cliente
  monthlyBillBefore: number;        // Conta antes do solar (R$)
  monthlyBillAfter: number;         // Conta após solar (R$)
  monthlySavings: number;           // Economia mensal (R$)
  annualSavings: number;            // Economia no 1º ano (R$)

  // Payback
  paybackMonths: number;            // Payback simples em meses
  paybackYears: number;             // Payback simples em anos
  paybackDiscountedYears: number;   // Payback descontado (TMA)

  // Indicadores financeiros
  tir: number;                      // TIR % a.a.
  vpl: number;                      // VPL a TMA (R$)
  roi: number;                      // ROI % sobre 25 anos
  totalSavings25Years: number;      // Economia acumulada em 25 anos (R$)

  // Ambiental
  co2EvitedKgYear: number;          // CO2 evitado por ano (kg)
  co2EvitedTon25Years: number;      // CO2 evitado em 25 anos (toneladas)
  treesEquivalent: number;          // Equivalente em árvores plantadas

  // Fluxo de caixa anual
  cashFlow: CashFlowYear[];
}

export interface CashFlowYear {
  year: number;
  annualSavings: number;            // Economia daquele ano (R$)
  cumulativeSavings: number;        // Economia acumulada até o ano (R$)
  cumulativeNet: number;            // Saldo líquido (acumulado - investimento)
  discountedCashFlow: number;       // FC descontado pela TMA
}

export interface FinancingOption {
  id: string;
  label: string;
  description: string;
  installments: number;
  monthlyRate: number;              // % ao mês
  annualRate: number;               // % ao ano
  installmentValue: number;         // R$ por parcela
  totalPaid: number;                // R$ total pago
  downPayment: number;              // Entrada R$
}

// Custo de disponibilidade por tipo de ligação (kWh/mês)
const CUSTO_DISPO_KWH = { mono: 30, bi: 50, tri: 100 };

// Fator de emissão CO2 grid Brasil (ANEEL)
const CO2_KG_PER_KWH = 0.0904;
// Equivalência de absorção de CO2 por árvore/ano
const CO2_PER_TREE_KG_YEAR = 10;

/**
 * Newton-Raphson para calcular TIR
 */
function calcTIR(cashFlows: number[], maxIter = 1000, tolerance = 1e-7): number {
  let rate = 0.1; // chute inicial 10%
  for (let iter = 0; iter < maxIter; iter++) {
    let vpl = 0;
    let dvpl = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      vpl += cashFlows[t] / Math.pow(1 + rate, t);
      if (t > 0) dvpl -= t * cashFlows[t] / Math.pow(1 + rate, t + 1);
    }
    const newRate = rate - vpl / dvpl;
    if (Math.abs(newRate - rate) < tolerance) return newRate;
    rate = newRate;
  }
  return rate;
}

/**
 * Motor principal de cálculo solar
 */
export function calcSolar(input: SolarCalcInput): SolarCalcResult {
  const {
    monthlyConsumptionKwh,
    tariffRate,
    fiobEffective,
    publicLighting,
    connectionType,
    generationFactor,
    systemPowerKwp,
    finalPrice,
    tariffAdjustmentRate,
    systemLifeYears,
    tma,
  } = input;

  // ── 1. Geração ──────────────────────────────────────────────
  const monthlyGenerationKwh = systemPowerKwp * generationFactor;
  const annualGenerationKwh = monthlyGenerationKwh * 12;

  // ── 2. Conta antes/depois ───────────────────────────────────
  const custoDispo_kwh = CUSTO_DISPO_KWH[connectionType] || 30;
  const custoDispo_R = custoDispo_kwh * tariffRate;

  // Conta antes = consumo * tarifa + CIP
  const monthlyBillBefore = monthlyConsumptionKwh * tariffRate + publicLighting;

  // Autoconsumo simultâneo (30%) e Energia injetada (70%)
  const simultaneousConsumption = monthlyGenerationKwh * 0.30;
  const injectedEnergy = monthlyGenerationKwh * 0.70;

  // A energia consumida da rede é o consumo total menos o autoconsumo
  const gridConsumption = Math.max(0, monthlyConsumptionKwh - simultaneousConsumption);
  
  // A energia compensada da rede é a energia injetada, limitada ao que foi consumido da rede
  const compensatedEnergy = Math.min(injectedEnergy, gridConsumption);

  // O consumo faturado é o que sobrou após a compensação
  const billedConsumption = gridConsumption - compensatedEnergy;

  // Cálculo da tarifa do Fio B aplicável sobre a energia compensada
  // Fio B = 28% da tarifa. Cobrança = 15% (2023), 30% (2024), 45% (2025), etc.
  const currentYear = new Date().getFullYear();
  const baseYear = 2022; // 2023 é o ano 1 (15%)
  const fioBPercent = Math.min(Math.max((currentYear - baseYear) * 0.15, 0), 1); // Capped at 100%
  const fioBRate = tariffRate * 0.28 * fioBPercent;
  
  // O custo do Fio B incide sobre a energia que foi injetada e compensada
  const fioBCost = compensatedEnergy * (fiobEffective > 0 ? fiobEffective : fioBRate);

  // Conta depois = max(custo disponibilidade, consumo faturado * tarifa) + CIP + Fio B
  let monthlyBillAfter = Math.max(custoDispo_R, billedConsumption * tariffRate);
  monthlyBillAfter += fioBCost + publicLighting;

  // Economia mensal
  const monthlySavings = monthlyBillBefore - monthlyBillAfter;
  const annualSavings = monthlySavings * 12;

  // ── 3. Fluxo de Caixa ───────────────────────────────────────
  const adjustRate = tariffAdjustmentRate / 100;
  const tmaRate = tma / 100;
  const cashFlowsArray: number[] = [-finalPrice]; // Ano 0 = investimento
  const cashFlow: CashFlowYear[] = [];
  let cumulativeSavings = 0;
  let cumulativeNet = -finalPrice;
  let cumulativeDiscounted = -finalPrice;
  let paybackMonths = -1;
  let paybackDiscountedYears = 0;

  for (let year = 1; year <= systemLifeYears; year++) {
    // Economia cresce com reajuste tarifário
    const yearSavings = annualSavings * Math.pow(1 + adjustRate, year - 1);
    cumulativeSavings += yearSavings;
    cumulativeNet += yearSavings;

    const discountFactor = Math.pow(1 + tmaRate, year);
    const discountedCF = yearSavings / discountFactor;
    cumulativeDiscounted += discountedCF;

    cashFlowsArray.push(yearSavings);
    cashFlow.push({
      year,
      annualSavings: yearSavings,
      cumulativeSavings,
      cumulativeNet,
      discountedCashFlow: discountedCF,
    });

    // Payback simples (quando saldo fica positivo)
    if (paybackMonths < 0 && cumulativeNet >= 0) {
      // Interpolação para meses
      const prevNet = cumulativeNet - yearSavings;
      const fraction = -prevNet / yearSavings;
      paybackMonths = Math.round((year - 1 + fraction) * 12);
    }

    // Payback descontado
    if (paybackDiscountedYears === 0 && cumulativeDiscounted >= 0) {
      paybackDiscountedYears = year;
    }
  }

  if (paybackMonths < 0) paybackMonths = systemLifeYears * 12;
  const paybackYears = paybackMonths / 12;

  // ── 4. TIR e VPL ────────────────────────────────────────────
  const tirDecimal = calcTIR(cashFlowsArray);
  const tir = tirDecimal * 100;

  let vpl = -finalPrice;
  for (let t = 1; t <= systemLifeYears; t++) {
    vpl += cashFlowsArray[t] / Math.pow(1 + tmaRate, t);
  }

  const roi = finalPrice > 0 ? ((cumulativeSavings - finalPrice) / finalPrice) * 100 : 0;
  const totalSavings25Years = cumulativeSavings;

  // ── 5. Ambiental ────────────────────────────────────────────
  const co2EvitedKgYear = annualGenerationKwh * CO2_KG_PER_KWH;
  const co2EvitedTon25Years = (co2EvitedKgYear * systemLifeYears) / 1000;
  const treesEquivalent = Math.round(co2EvitedTon25Years * 1000 / CO2_PER_TREE_KG_YEAR);

  return {
    monthlyGenerationKwh,
    annualGenerationKwh,
    monthlyBillBefore,
    monthlyBillAfter,
    monthlySavings,
    annualSavings,
    paybackMonths,
    paybackYears,
    paybackDiscountedYears,
    tir,
    vpl,
    roi,
    totalSavings25Years,
    co2EvitedKgYear,
    co2EvitedTon25Years,
    treesEquivalent,
    cashFlow,
  };
}

/**
 * Calcular potência recomendada a partir do consumo
 */
export function calcRecommendedPower(
  monthlyConsumptionKwh: number,
  generationFactor: number = 128.64,
  targetCompensation: number = 1.0 // 100% de compensação
): number {
  if (generationFactor <= 0) return 0;
  const kwp = (monthlyConsumptionKwh * targetCompensation) / generationFactor;
  return parseFloat(kwp.toFixed(2));
}

/**
 * Calcular consumo a partir do valor da conta em R$
 */
export function calcConsumptionFromBill(
  billValue: number,
  tariffRate: number,
  publicLighting: number = 0,
  connectionType: 'mono' | 'bi' | 'tri' = 'mono'
): number {
  if (tariffRate <= 0) return 0;
  const custoDispo_kwh = CUSTO_DISPO_KWH[connectionType] || 30;
  const netBill = billValue - publicLighting - custoDispo_kwh * tariffRate;
  return Math.max(0, Math.round(netBill / tariffRate));
}

/**
 * Calcular opções de financiamento
 */
export function calcFinancingOptions(
  totalPrice: number,
  discountRate = 0.05 // desconto à vista padrão
): FinancingOption[] {
  const options: FinancingOption[] = [];

  // À vista
  options.push({
    id: 'cash',
    label: `À Vista (${(discountRate * 100).toFixed(0)}% desconto)`,
    description: 'Pagamento integral com desconto exclusivo',
    installments: 1,
    monthlyRate: 0,
    annualRate: 0,
    installmentValue: totalPrice * (1 - discountRate),
    totalPaid: totalPrice * (1 - discountRate),
    downPayment: 0,
  });

  // Financiamento BNB / FNE Verde (7.5% a.a.)
  const bnbAnnual = 0.075;
  const bnbMonthly = Math.pow(1 + bnbAnnual, 1 / 12) - 1;
  const bnbInstallments = 84; // 7 anos
  const bnbPmt = totalPrice * (bnbMonthly * Math.pow(1 + bnbMonthly, bnbInstallments)) /
    (Math.pow(1 + bnbMonthly, bnbInstallments) - 1);
  options.push({
    id: 'bnb-fne',
    label: 'BNB / FNE Verde',
    description: 'Linha especial solar — até 7 anos sem entrada',
    installments: bnbInstallments,
    monthlyRate: bnbMonthly * 100,
    annualRate: bnbAnnual * 100,
    installmentValue: bnbPmt,
    totalPaid: bnbPmt * bnbInstallments,
    downPayment: 0,
  });

  // Financiamento Sicoob / Caixa (1.29% a.m. / ~16.6% a.a.)
  const sicoobMonthly = 0.0129;
  const sicoobInstallments = 60; // 5 anos
  const sicoobPmt = totalPrice * (sicoobMonthly * Math.pow(1 + sicoobMonthly, sicoobInstallments)) /
    (Math.pow(1 + sicoobMonthly, sicoobInstallments) - 1);
  options.push({
    id: 'sicoob',
    label: 'Financiamento Sicoob / Caixa',
    description: 'Crédito solar — 60× sem entrada',
    installments: sicoobInstallments,
    monthlyRate: sicoobMonthly * 100,
    annualRate: (Math.pow(1 + sicoobMonthly, 12) - 1) * 100,
    installmentValue: sicoobPmt,
    totalPaid: sicoobPmt * sicoobInstallments,
    downPayment: 0,
  });

  // Cartão de crédito 18× (taxa 2.99% a.m.)
  const cardMonthly = 0.0299;
  const cardInstallments = 18;
  const cardPmt = totalPrice * (cardMonthly * Math.pow(1 + cardMonthly, cardInstallments)) /
    (Math.pow(1 + cardMonthly, cardInstallments) - 1);
  options.push({
    id: 'credit-card-18',
    label: 'Cartão de Crédito 18×',
    description: 'Parcelamento no cartão sem burocracia',
    installments: cardInstallments,
    monthlyRate: cardMonthly * 100,
    annualRate: (Math.pow(1 + cardMonthly, 12) - 1) * 100,
    installmentValue: cardPmt,
    totalPaid: cardPmt * cardInstallments,
    downPayment: 0,
  });

  // Cartão de crédito 12× (taxa 2.49% a.m.)
  const card12Monthly = 0.0249;
  const card12Pmt = totalPrice * (card12Monthly * Math.pow(1 + card12Monthly, 12)) /
    (Math.pow(1 + card12Monthly, 12) - 1);
  options.push({
    id: 'credit-card-12',
    label: 'Cartão de Crédito 12×',
    description: 'Parcelamento em 12× no cartão',
    installments: 12,
    monthlyRate: card12Monthly * 100,
    annualRate: (Math.pow(1 + card12Monthly, 12) - 1) * 100,
    installmentValue: card12Pmt,
    totalPaid: card12Pmt * 12,
    downPayment: 0,
  });

  return options;
}
