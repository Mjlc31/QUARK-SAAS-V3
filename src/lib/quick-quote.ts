/**
 * Motor de dimensionamento e cálculo para o Orçamento Rápido (QUARK OS).
 * Permite dimensionar placas, inversor, economia mensal/anual/25 anos e parcelamentos
 * no cartão (até 18x) e financiamento (até 72x) para geração de criativos de venda.
 */

export const INVERTER_SIZES = [2, 3, 3.6, 4, 5, 6, 7, 8, 10, 12, 15, 20, 25, 30, 36, 40, 50, 60, 75, 100];
const MODULE_AREA_M2 = 2.4;
const DEFAULT_PR = 0.80; // Performance ratio padrão
const DEFAULT_HSP = 5.35; // Alagoas / Nordeste médio
const DEFAULT_TARIFF = 0.98; // R$/kWh
const DEFAULT_FIO_B = 0.28; // TUSD Fio B
const DEFAULT_LIGHTING = 45; // Iluminação pública R$

export interface QuickQuoteInput {
  consumptionKwh: number;
  moduleW: number;
  /** 0 = automático (dimensiona pelo consumo). */
  modules: number;
  /** 0 = automático. */
  inverterKw: number;
  priceMode: 'wp' | 'total';
  /** R$/Wp (modo wp) ou valor total em R$ (modo total). */
  price: number;
  cashDiscountPct: number;
  financingRate: number; // % ao mês
  financingMonths: number;
  cardInstallments: number;
  cardRate: number; // % ao mês
  tariff: number;
  sunHours: number;
  fioBTariff: number;
  publicLighting: number;
  connectionType: 'mono' | 'bi' | 'tri';
}

export const DEFAULT_QUICK: QuickQuoteInput = {
  consumptionKwh: 650,
  moduleW: 550,
  modules: 0,
  inverterKw: 0,
  priceMode: 'wp',
  price: 2.85, // R$ 2,85 / Wp padrão de mercado
  cashDiscountPct: 5,
  financingRate: 1.49, // 1.49% a.m.
  financingMonths: 72,
  cardInstallments: 18,
  cardRate: 1.19, // taxa de parcelamento cartão
  tariff: DEFAULT_TARIFF,
  sunHours: DEFAULT_HSP,
  fioBTariff: DEFAULT_FIO_B,
  publicLighting: DEFAULT_LIGHTING,
  connectionType: 'bi',
};

/** Quantidade mínima de placas para cobrir o consumo (mínimo 4) */
export function modulesFor(consumptionKwh: number, moduleW: number, sunHours = DEFAULT_HSP, pr = DEFAULT_PR) {
  if (consumptionKwh <= 0 || moduleW <= 0) return 0;
  const kwp = consumptionKwh / (sunHours * 30 * pr);
  return Math.max(4, Math.ceil((kwp * 1000) / moduleW));
}

/** Inversor comercial recomendado mais próximo (overload seguro de até ~1.30) */
export function inverterFor(kwp: number) {
  if (kwp <= 0) return 0;
  const min = kwp / 1.3;
  return INVERTER_SIZES.find((s) => s >= min) ?? Math.ceil(min);
}

/** Cálculo de parcela pela Tabela Price */
export function pmt(principal: number, ratePctMonth: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = ratePctMonth / 100;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export function brl(v: number, digits = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(v) ? v : 0);
}

export function fmtNum(v: number, digits = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(v) ? v : 0);
}

/** Motor de cálculo do orçamento rápido */
export function quickQuote(q: QuickQuoteInput) {
  const modules = q.modules > 0 ? Math.round(q.modules) : modulesFor(q.consumptionKwh, q.moduleW, q.sunHours);
  const kwp = (modules * q.moduleW) / 1000;
  const inverterKw = q.inverterKw > 0 ? q.inverterKw : inverterFor(kwp);

  // Preço total e à vista
  const price = Math.max(0, q.priceMode === 'wp' ? q.price * kwp * 1000 : q.price);
  const cashPrice = price * (1 - Math.min(Math.max(q.cashDiscountPct, 0), 50) / 100);

  // Geração mensal estimada (kWh)
  const monthlyGeneration = Math.round(kwp * q.sunHours * 30 * DEFAULT_PR);
  const annualGeneration = monthlyGeneration * 12;

  // Cobertura do consumo
  const coverage = q.consumptionKwh > 0 ? Math.min(1.5, monthlyGeneration / q.consumptionKwh) : 0;

  // Contas estimada antes vs depois
  const billBefore = q.consumptionKwh * q.tariff + q.publicLighting;
  const availabilityKwh = q.connectionType === 'mono' ? 30 : q.connectionType === 'bi' ? 50 : 100;

  // Excedente compensado e custo de disponibilidade
  const selfConsumedKwh = Math.min(monthlyGeneration * 0.35, q.consumptionKwh);
  const gridKwh = q.consumptionKwh - selfConsumedKwh;
  const injectedKwh = monthlyGeneration - selfConsumedKwh;
  const compensatedKwh = Math.min(injectedKwh, gridKwh);

  const energyCharge = (gridKwh - compensatedKwh) * q.tariff;
  const fioBCharge = compensatedKwh * q.fioBTariff * 0.60; // 60% Fio B em 2026
  const minimum = availabilityKwh * q.tariff;
  const minimumTopUp = Math.max(0, minimum - energyCharge - fioBCharge);
  const billAfter = energyCharge + fioBCharge + minimumTopUp + q.publicLighting;

  const monthlySavings = Math.max(0, billBefore - billAfter);
  const annualSavings = monthlySavings * 12;
  const savings25y = annualSavings * 25 * 0.95; // considerando 0.5% degradação média

  // Payback simples em anos
  const paybackYears = cashPrice > 0 && annualSavings > 0 ? Number((cashPrice / annualSavings).toFixed(1)) : 0;

  // Parcelamentos
  const financing = price > 0 && q.financingMonths > 0 ? pmt(price, q.financingRate, q.financingMonths) : 0;
  const card = price > 0 && q.cardInstallments > 0 ? pmt(price, q.cardRate, q.cardInstallments) : 0;

  // Emissões evitadas de CO2
  const co2Tons25y = Number(((annualGeneration * 25 * 0.084) / 1000).toFixed(1));

  return {
    modules,
    kwp,
    inverterKw,
    areaM2: Math.round(modules * MODULE_AREA_M2),
    generation: monthlyGeneration,
    coverage,
    billBefore,
    billAfter,
    monthlySavings,
    annualSavings,
    savings25y,
    paybackYears,
    price,
    cashPrice,
    financing,
    card,
    pricePerWp: kwp > 0 ? price / (kwp * 1000) : 0,
    co2Tons25y,
  };
}

export type QuickQuote = ReturnType<typeof quickQuote>;
