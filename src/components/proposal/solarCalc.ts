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

  // Novas variáveis
  financingRate?: number;           // % a.m. (padrão BNB ou Sicoob)
  creditCardRate?: number;          // % a.m. (padrão 2.99)
  financingInstallments?: number;   // Quantidade de parcelas (ex: 60, 84)
  simultaneityFactor?: number;      // Fração de autoconsumo (ex: 0.30 = 30%)
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

  // Detalhamento da nova conta
  billBreakdown: {
    custoDispo: number;
    fioB: number;
    publicLighting: number;
  };
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
    if (Math.abs(newRate - rate) < tolerance) return Math.max(0, newRate);
    rate = newRate;
  }
  return Math.max(0, rate);
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

  const custoDispo_kwh = CUSTO_DISPO_KWH[connectionType] || 30;

  // ── 2. Fluxo de Caixa Dinâmico ──────────────────────────────
  const adjustRate = tariffAdjustmentRate / 100;
  const tmaRate = tma / 100;
  const ipcaRate = 0.045; // 4.5% para o reajuste isolado da TUSD/Fio B
  const degradationRate = 0.005; // 0.5% ao ano de perda de eficiência
  
  // Detalhes de pagamento
  // Se for financiado, a entrada é no ano 0, e as parcelas são deduzidas nos anos seguintes
  const isFinanced = (input.financingInstallments || 0) > 0 && (input.financingRate !== undefined);
  const finMonthly = isFinanced ? (input.financingRate || 0) / 100 : 0;
  const finInstallments = input.financingInstallments || 0;
  
  const finPmt = (isFinanced && finMonthly > 0)
    ? finalPrice * (finMonthly * Math.pow(1 + finMonthly, finInstallments)) / (Math.pow(1 + finMonthly, finInstallments) - 1)
    : (isFinanced ? finalPrice / finInstallments : 0);
  
  const initialInvestment = isFinanced ? 0 : finalPrice;
  
  const cashFlowsArray: number[] = [-initialInvestment]; // Ano 0 = investimento ou 0 (se 100% financiado)
  const cashFlow: CashFlowYear[] = [{
    year: 0,
    annualSavings: 0,
    cumulativeSavings: 0,
    cumulativeNet: -initialInvestment,
    discountedCashFlow: -initialInvestment,
  }];
  
  let cumulativeSavings = 0;
  let cumulativeNet = -initialInvestment;
  let cumulativeDiscounted = -initialInvestment;
  let paybackMonths = -1;
  let paybackDiscountedYears = 0;

  const currentYear = new Date().getFullYear();
  const baseYear = 2022; // 2023 é o ano 1 (15%)

  let firstYearMonthlyBillBefore = 0;
  let firstYearMonthlyBillAfter = 0;
  let firstYearMonthlySavings = 0;
  let firstYearAnnualSavings = 0;
  
  // Curva de sazonalidade (multiplicadores para cada mês, simulando verão/inverno no Brasil)
  const seasonalMultipliers = [1.10, 1.08, 1.05, 0.95, 0.85, 0.80, 0.82, 0.90, 1.00, 1.05, 1.15, 1.25]; // Soma = 12

  for (let year = 1; year <= systemLifeYears; year++) {
    const simulationYear = currentYear + year - 1;
    
    // Geração com degradação
    const degradation = Math.pow(1 - degradationRate, year - 1);
    const yearlyGen = annualGenerationKwh * degradation;
    
    let yearBillBefore = 0;
    let yearBillAfter = 0;
    
    // Fio B step-up
    const fioBPercent = Math.min(Math.max((simulationYear - baseYear) * 0.15, 0), 1);
    
    // Tarifa de Energia (com inflação pesada)
    const currentTariff = tariffRate * Math.pow(1 + adjustRate, year - 1);
    
    // Fio B (com inflação isolada - IPCA)
    const fiobBase = fiobEffective > 0 ? (fiobEffective * Math.pow(1 + ipcaRate, year - 1)) : (tariffRate * 0.28 * Math.pow(1 + ipcaRate, year - 1));
    const actualFiobRate = fiobBase * fioBPercent;
    const custoDispo_R = custoDispo_kwh * currentTariff;
    
    // Iteração mensal para precisão sazonal
    for (let m = 0; m < 12; m++) {
      const monthlyGen = (yearlyGen / 12) * seasonalMultipliers[m];
      const simultaneousConsumption = monthlyGen * (input.simultaneityFactor || 0.30);
      const injectedEnergy = monthlyGen * (1 - (input.simultaneityFactor || 0.30));
      const gridConsumption = Math.max(0, monthlyConsumptionKwh - simultaneousConsumption);
      const compensatedEnergy = Math.min(injectedEnergy, gridConsumption); // sem acúmulo entre meses (simplificado)
      const billedConsumption = gridConsumption - compensatedEnergy;
      
      const fioBCost = compensatedEnergy * actualFiobRate;
      
      const mBillBefore = monthlyConsumptionKwh * currentTariff + publicLighting;
      let mBillAfter = Math.max(custoDispo_R, billedConsumption * currentTariff);
      mBillAfter += fioBCost + publicLighting;
      
      yearBillBefore += mBillBefore;
      yearBillAfter += mBillAfter;
      
      if (year === 1 && m === 0) { // Guarda métricas do 1º mês
        firstYearMonthlyBillBefore = mBillBefore;
        firstYearMonthlyBillAfter = mBillAfter;
        firstYearMonthlySavings = mBillBefore - mBillAfter;
      }
    }

    let yearSavings = yearBillBefore - yearBillAfter;

    if (year === 1) {
      firstYearAnnualSavings = yearSavings;
    }
    
    // Subtrai parcelas do financiamento caso existam naquele ano
    const installmentsThisYear = Math.max(0, Math.min(12, finInstallments - (year - 1) * 12));
    const debtService = installmentsThisYear * finPmt;
    const netCashFlowThisYear = yearSavings - debtService;
    
    cumulativeSavings += yearSavings; // Total economizado puro
    cumulativeNet += netCashFlowThisYear; // Saldo real no bolso

    const discountFactor = Math.pow(1 + tmaRate, year);
    const discountedCF = netCashFlowThisYear / discountFactor;
    cumulativeDiscounted += discountedCF;

    cashFlowsArray.push(netCashFlowThisYear);
    cashFlow.push({
      year,
      annualSavings: yearSavings,
      cumulativeSavings,
      cumulativeNet,
      discountedCashFlow: discountedCF,
    });

    // Payback simples
    if (paybackMonths < 0 && cumulativeNet >= 0) {
      const prevNet = cumulativeNet - netCashFlowThisYear;
      const fraction = -prevNet / netCashFlowThisYear;
      paybackMonths = Math.round((year - 1 + fraction) * 12);
    }

    // Payback descontado
    if (paybackDiscountedYears === 0 && cumulativeDiscounted >= 0) {
      paybackDiscountedYears = year;
    }
  }

  if (paybackMonths < 0) paybackMonths = -1;

  // ── 3. TIR e VPL ────────────────────────────────────────────
  const tirDecimal = calcTIR(cashFlowsArray);
  const tir = tirDecimal * 100;

  let vpl = 0;
  for (let t = 0; t <= systemLifeYears; t++) {
    vpl += cashFlowsArray[t] / Math.pow(1 + tmaRate, t);
  }

  if (paybackMonths < 0) paybackMonths = 0;
  const paybackYears = paybackMonths > 0 ? paybackMonths / 12 : 0;

  // O ROI baseia-se no Investimento Inicial, se for zero (100% financiado), consideramos o preço total para não dar infinito
  const investmentBase = initialInvestment > 0 ? initialInvestment : finalPrice;
  const roi = ((cumulativeSavings - investmentBase) / investmentBase) * 100;

  // ── 4. Ambiental ────────────────────────────────────────────
  const co2EvitedKgYear = annualGenerationKwh * CO2_KG_PER_KWH;
  const co2EvitedTon25Years = (co2EvitedKgYear * systemLifeYears) / 1000;
  const treesEquivalent = Math.round(co2EvitedTon25Years * 1000 / CO2_PER_TREE_KG_YEAR);

  return {
    monthlyGenerationKwh,
    annualGenerationKwh,
    monthlyBillBefore: firstYearMonthlyBillBefore,
    monthlyBillAfter: firstYearMonthlyBillAfter,
    monthlySavings: firstYearMonthlySavings,
    annualSavings: firstYearAnnualSavings,
    paybackMonths,
    paybackYears,
    paybackDiscountedYears,
    tir,
    vpl,
    roi,
    totalSavings25Years: cumulativeSavings,
    co2EvitedKgYear,
    co2EvitedTon25Years,
    treesEquivalent,
    cashFlow,
    billBreakdown: {
      custoDispo: (CUSTO_DISPO_KWH[connectionType] || 30) * tariffRate,
      fioB: firstYearMonthlyBillAfter - ((CUSTO_DISPO_KWH[connectionType] || 30) * tariffRate) - publicLighting,
      publicLighting: publicLighting
    }
  };
}

/**
 * Calcular potência recomendada a partir do consumo
 */
export function calcRecommendedPower(
  monthlyConsumptionKwh: number,
  generationFactor: number = 125,
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

export function calcFinancingOptions(
  totalPrice: number,
  discountRate = 0.05, // desconto à vista padrão
  customFinancingRate?: number,
  customInstallments?: number,
  customCreditCardRate?: number,
  multipleInstallments?: number[]
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

  // Financiamento Customizado / Padrão (Sicoob)
  const finMonthly = (customFinancingRate !== undefined ? customFinancingRate : 1.29) / 100;
  
  const installmentsToUse = (multipleInstallments && multipleInstallments.length > 0) 
    ? multipleInstallments 
    : [customInstallments || 60];

  installmentsToUse.forEach(finInstallments => {
    const finPmt = finMonthly > 0 
      ? totalPrice * (finMonthly * Math.pow(1 + finMonthly, finInstallments)) / (Math.pow(1 + finMonthly, finInstallments) - 1)
      : totalPrice / finInstallments;
      
    options.push({
      id: `custom-fin-${finInstallments}`,
      label: `Financiamento ${finInstallments}x`,
      description: `Crédito solar — ${finInstallments}× sem entrada`,
      installments: finInstallments,
      monthlyRate: finMonthly * 100,
      annualRate: (Math.pow(1 + finMonthly, 12) - 1) * 100,
      installmentValue: finPmt,
      totalPaid: finPmt * finInstallments,
      downPayment: 0,
    });
  });

  // Cartão de crédito Customizado / Padrão (18x)
  const cardMonthly = (customCreditCardRate !== undefined ? customCreditCardRate : 2.99) / 100;
  const cardInstallments = 18;
  const cardPmt = cardMonthly > 0 
    ? totalPrice * (cardMonthly * Math.pow(1 + cardMonthly, cardInstallments)) / (Math.pow(1 + cardMonthly, cardInstallments) - 1)
    : totalPrice / cardInstallments;
    
  options.push({
    id: 'credit-card',
    label: `Cartão de Crédito ${cardInstallments}×`,
    description: 'Parcelamento no cartão sem burocracia',
    installments: cardInstallments,
    monthlyRate: cardMonthly * 100,
    annualRate: (Math.pow(1 + cardMonthly, 12) - 1) * 100,
    installmentValue: cardPmt,
    totalPaid: cardPmt * cardInstallments,
    downPayment: 0,
  });

  return options;
}
