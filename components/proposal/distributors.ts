// ============================================================
// DISTRIBUIDORAS DE ENERGIA — BANCO DE DADOS ANEEL 2025
// Fio B (TUSD Fio B) por distribuidora — R$/kWh
// Fonte: ANEEL — Resoluções Homologatórias 2025
// Lei 14.300/2022: gradualidade 45% em 2025 para novos sistemas
// ============================================================

export interface Distributor {
  id: string;
  name: string;
  shortName: string;
  uf: string;
  fiobTotal: number;       // TUSD Fio B total R$/kWh (100%)
  tariffB1: number;        // Tarifa média B1 residencial R$/kWh (TE+TUSD)
  custoDispo: {            // Custo de disponibilidade (kWh/mês franquia)
    mono: number;          // Monofásico
    bi: number;            // Bifásico
    tri: number;           // Trifásico
  };
}

// Percentual de Fio B pago em 2025 (Lei 14.300/2022)
// Sistemas conectados após 7/jan/2023 pagam progressivamente:
// 2023:15% | 2024:30% | 2025:45% | 2026:60% | 2027:75% | 2028:90% | 2029+:100%
export const FIOB_PERCENTAGE_2025 = 0.45;

export const DISTRIBUTORS: Distributor[] = [
  {
    id: 'equatorial-al',
    name: 'Equatorial Alagoas',
    shortName: 'Equatorial AL',
    uf: 'AL',
    fiobTotal: 0.22626,
    tariffB1: 0.8823,    // Tarifa B1 após redução mai/2025 (Res. 3.450/2025)
    custoDispo: { mono: 30, bi: 50, tri: 100 },
  },
  {
    id: 'equatorial-pa',
    name: 'Equatorial Pará',
    shortName: 'Equatorial PA',
    uf: 'PA',
    fiobTotal: 0.1189,
    tariffB1: 0.7654,
    custoDispo: { mono: 30, bi: 50, tri: 100 },
  },
  {
    id: 'equatorial-pi',
    name: 'Equatorial Piauí',
    shortName: 'Equatorial PI',
    uf: 'PI',
    fiobTotal: 0.1205,
    tariffB1: 0.7891,
    custoDispo: { mono: 30, bi: 50, tri: 100 },
  },
  {
    id: 'equatorial-ma',
    name: 'Equatorial Maranhão',
    shortName: 'Equatorial MA',
    uf: 'MA',
    fiobTotal: 0.1312,
    tariffB1: 0.8120,
    custoDispo: { mono: 30, bi: 50, tri: 100 },
  },
  {
    id: 'equatorial-go',
    name: 'Equatorial Goiás',
    shortName: 'Equatorial GO',
    uf: 'GO',
    fiobTotal: 0.1434,
    tariffB1: 0.8340,
    custoDispo: { mono: 30, bi: 50, tri: 100 },
  },
  {
    id: 'cemig',
    name: 'CEMIG Distribuição',
    shortName: 'CEMIG',
    uf: 'MG',
    fiobTotal: 0.1485,
    tariffB1: 0.8640,
    custoDispo: { mono: 30, bi: 50, tri: 100 },
  },
  {
    id: 'copel',
    name: 'COPEL Distribuição',
    shortName: 'COPEL',
    uf: 'PR',
    fiobTotal: 0.1621,
    tariffB1: 0.9012,
    custoDispo: { mono: 30, bi: 50, tri: 100 },
  },
  {
    id: 'celpe',
    name: 'Neoenergia CELPE',
    shortName: 'CELPE',
    uf: 'PE',
    fiobTotal: 0.1293,
    tariffB1: 0.8223,
    custoDispo: { mono: 30, bi: 50, tri: 100 },
  },
  {
    id: 'enel-ce',
    name: 'Enel Ceará',
    shortName: 'Enel CE',
    uf: 'CE',
    fiobTotal: 0.1406,
    tariffB1: 0.8456,
    custoDispo: { mono: 30, bi: 50, tri: 100 },
  },
  {
    id: 'cosern',
    name: 'COSERN',
    shortName: 'COSERN',
    uf: 'RN',
    fiobTotal: 0.1448,
    tariffB1: 0.8312,
    custoDispo: { mono: 30, bi: 50, tri: 100 },
  },
  {
    id: 'neoenergia-coelba',
    name: 'Neoenergia Coelba',
    shortName: 'Coelba',
    uf: 'BA',
    fiobTotal: 0.1371,
    tariffB1: 0.8234,
    custoDispo: { mono: 30, bi: 50, tri: 100 },
  },
  {
    id: 'celesc',
    name: 'CELESC Distribuição',
    shortName: 'CELESC',
    uf: 'SC',
    fiobTotal: 0.1557,
    tariffB1: 0.8890,
    custoDispo: { mono: 30, bi: 50, tri: 100 },
  },
  {
    id: 'energisa-pb',
    name: 'Energisa Paraíba',
    shortName: 'Energisa PB',
    uf: 'PB',
    fiobTotal: 0.1289,
    tariffB1: 0.8015,
    custoDispo: { mono: 30, bi: 50, tri: 100 },
  },
  {
    id: 'energisa-se',
    name: 'Energisa Sergipe',
    shortName: 'Energisa SE',
    uf: 'SE',
    fiobTotal: 0.1340,
    tariffB1: 0.8123,
    custoDispo: { mono: 30, bi: 50, tri: 100 },
  },
  {
    id: 'energisa-mt',
    name: 'Energisa Mato Grosso',
    shortName: 'Energisa MT',
    uf: 'MT',
    fiobTotal: 0.1612,
    tariffB1: 0.9234,
    custoDispo: { mono: 30, bi: 50, tri: 100 },
  },
  {
    id: 'light',
    name: 'Light',
    shortName: 'Light RJ',
    uf: 'RJ',
    fiobTotal: 0.1534,
    tariffB1: 0.9120,
    custoDispo: { mono: 30, bi: 50, tri: 100 },
  },
  {
    id: 'enel-sp',
    name: 'Enel São Paulo',
    shortName: 'Enel SP',
    uf: 'SP',
    fiobTotal: 0.1598,
    tariffB1: 0.9341,
    custoDispo: { mono: 30, bi: 50, tri: 100 },
  },
  {
    id: 'cpfl-paulista',
    name: 'CPFL Paulista',
    shortName: 'CPFL',
    uf: 'SP',
    fiobTotal: 0.1723,
    tariffB1: 0.9567,
    custoDispo: { mono: 30, bi: 50, tri: 100 },
  },
  {
    id: 'edp-sp',
    name: 'EDP São Paulo',
    shortName: 'EDP SP',
    uf: 'SP',
    fiobTotal: 0.1489,
    tariffB1: 0.9120,
    custoDispo: { mono: 30, bi: 50, tri: 100 },
  },
  {
    id: 'celg',
    name: 'CELG Distribuição',
    shortName: 'CELG',
    uf: 'GO',
    fiobTotal: 0.1398,
    tariffB1: 0.8234,
    custoDispo: { mono: 30, bi: 50, tri: 100 },
  },
  {
    id: 'eletropaulo',
    name: 'Edefor / Fortaleza',
    shortName: 'Edefor',
    uf: 'CE',
    fiobTotal: 0.1380,
    tariffB1: 0.8198,
    custoDispo: { mono: 30, bi: 50, tri: 100 },
  },
];

// Helper: buscar distribuidora por UF (retorna a primeira)
export function getDistributorByUF(uf: string): Distributor | undefined {
  return DISTRIBUTORS.find(d => d.uf === uf);
}

// Helper: Fio B efetivo em 2025 (45% do total)
export function getEffectiveFiob(total: number, percentage = FIOB_PERCENTAGE_2025): number {
  return parseFloat((total * percentage).toFixed(5));
}

// Distribuidora padrão Quark: Equatorial Alagoas
export const DEFAULT_DISTRIBUTOR = DISTRIBUTORS[0];
