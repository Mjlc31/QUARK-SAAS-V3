// ============================================================
// PROPOSAL ENGINE — TIPOS CENTRAIS v4.0
// Arquitetura: Block-Based Editor (estilo Notion/Canva)
// ============================================================

export type BlockType =
  | 'cover'
  | 'how_it_works'
  | 'generation_chart'
  | 'social_proof'
  | 'tech_specs'
  | 'financial'
  | 'financing'
  | 'text';

// ── Tema Global da Proposta ───────────────────────────────────
export type FontFamily = 'inter' | 'playfair' | 'dm-sans' | 'montserrat' | 'raleway' | 'poppins' | 'space-grotesk';
export type ProposalMode = 'dark' | 'light';

export interface ProposalTheme {
  primaryColor: string;        // hex — ex: #C4A050 (gold)
  secondaryColor: string;      // hex — ex: #1a3a5c (navy)
  fontFamily: FontFamily;
  logoUrl: string | null;      // blob URL ou URL remota
  logoSize?: 'sm' | 'md' | 'lg'; // Tamanho da logo (padrão 'lg' — maior)
  mode?: ProposalMode;         // 'dark' | 'light'
  backgroundColor?: string;
  textColor?: string;
}

export const DEFAULT_THEME: ProposalTheme = {
  primaryColor: '#C4A050',
  secondaryColor: '#0f1a30',
  fontFamily: 'inter',
  logoUrl: null,
  logoSize: 'lg',
  mode: 'dark',
  backgroundColor: '#0A0A0A',
  textColor: '#ffffff',
};

export const FONT_FAMILY_MAP: Record<FontFamily, string> = {
  'inter': "'Inter', sans-serif",
  'playfair': "'Playfair Display', serif",
  'dm-sans': "'DM Sans', sans-serif",
  'montserrat': "'Montserrat', sans-serif",
  'raleway': "'Raleway', sans-serif",
  'poppins': "'Poppins', sans-serif",
  'space-grotesk': "'Space Grotesk', sans-serif",
};

export const FONT_LABELS: Record<FontFamily, string> = {
  'inter': 'Inter — Clean & Modern',
  'playfair': 'Playfair — Elegant & Classic',
  'dm-sans': 'DM Sans — Friendly & Clear',
  'montserrat': 'Montserrat — Bold & Geometric',
  'raleway': 'Raleway — Sophisticated',
  'poppins': 'Poppins — Rounded & Friendly',
  'space-grotesk': 'Space Grotesk — Tech & Premium',
};

// ── CONTEÚDO DOS BLOCOS ───────────────────────────────────────

export interface CoverContent {
  clientName: string;
  city: string;
  date: string;
  systemSizeKw: number;
  finalPrice: number;
  currentBill?: number;
  newBill?: number;
  tagline: string;
  categoryLabel?: string;
  headlineLine1?: string;
  headlineLine2?: string;
  // Dados do solar calc para exibição na capa
  monthlySavings?: number;
  paybackYears?: number;
  co2Ton25Years?: number;
}

export interface SocialProofContent {
  images: Array<{ id: string; url: string; caption: string }>;
  headline: string;
  subheadline: string;
}

export interface TechSpecsContent {
  consumption: number;
  systemSizeKw: number;
  moduleBrand: string;
  modulePower: number;
  modulesCount: number;
  inverterBrand: string;
  inverterPower: number;
  inverterCount: number;
  roofArea: number;
}

export interface FinancialContent {
  title?: string;
  description?: string;
  // Dados básicos
  finalPrice: number;
  monthlyBill: number;
  tariffRate: number;
  tariffAdjustmentRate: number;
  paybackYears: number;
  systemLifeYears: number;
  installmentCount: number;
  systemPowerKwp?: number;          // Added for accurate recalc
  monthlyConsumptionKwh?: number;   // Added for accurate recalc
  // Novos indicadores financeiros (v4.0)
  tir?: number;                     // TIR % a.a.
  vpl?: number;                     // VPL (R$)
  roi?: number;                     // ROI total %
  totalSavings25Years?: number;     // Economia total R$
  annualSavings?: number;           // Economia 1º ano R$
  co2EvitedKgYear?: number;         // CO2 evitado kg/ano
  co2EvitedTon25Years?: number;     // CO2 em 25 anos (ton)
  treesEquivalent?: number;         // Equivalente em árvores
  monthlyGenerationKwh?: number;    // Geração mensal kWh
  newMonthlyBill?: number;          // Nova conta R$
  // Fluxo de caixa para gráfico (simplificado)
  cashFlowData?: Array<{ year: number; cumulative: number }>;
}

export interface FinancingContent {
  title?: string;
  finalPrice: number;
  cashDiscountPct: number;          // % desconto à vista (padrão 5)
  options: FinancingOptionBlock[];
}

export interface FinancingOptionBlock {
  id: string;
  label: string;
  description: string;
  installments: number;
  monthlyRate: number;              // % a.m.
  installmentValue: number;
  totalPaid: number;
  downPayment: number;
  isHighlighted?: boolean;
}

export interface TextContent {
  html: string;
  placeholder: string;
}

export interface HowItWorksContent {
  title: string;
  subtitle: string;
  steps: Array<{ label: string; duration: string }>;
}

export interface GenerationChartContent {
  title: string;
  subtitle?: string;
  data: Array<{ month: string; generation: number; consumption: number; balance: number }>;
}

export type BlockContent =
  | CoverContent
  | HowItWorksContent
  | GenerationChartContent
  | SocialProofContent
  | TechSpecsContent
  | FinancialContent
  | FinancingContent
  | TextContent;

// Estrutura central de um bloco
export interface ProposalBlock {
  id: string;
  type: BlockType;
  content: BlockContent;
}

// Mapa de informações do catálogo de blocos (sidebar)
export interface BlockCatalogItem {
  type: BlockType;
  label: string;
  description: string;
  icon: string;
  defaultContent: BlockContent;
}

// Estado global do editor
export interface ProposalEditorState {
  blocks: ProposalBlock[];
  selectedBlockId: string | null;
  isDirty: boolean;
}

// Props do ProposalData herdado do CRM
export interface ProposalData {
  id?: string;
  clientName: string;
  city: string;
  phone?: string;                   // Telefone do cliente (v4.0)
  consumption: number;
  systemSizeKw: number;
  moduleBrand: string;
  modulePower: number;
  modulesCount: number;
  inverterBrand: string;
  inverterPower: number;
  inverterCount: number;
  pricePerModule: number;
  priceKit: number;
  priceCA: number;
  taxPercentage: number;
  profitPercentage: number;
  additionalCosts: number;
  finalPrice: number;
  // Novos campos v4.0 — dados de cálculo solar
  tariffRate?: number;              // R$/kWh tarifa
  fiobRate?: number;                // R$/kWh Fio B efetivo
  concessionaria?: string;          // ID da distribuidora
  connectionType?: 'mono' | 'bi' | 'tri';
  publicLighting?: number;          // CIP/COSIP R$/mês
  generationFactor?: number;        // kWh/kWp/mês (padrão 130)
  billValue?: number;               // Valor da conta em R$ (alternativa ao kWh)
  // Resultados dos cálculos (armazenados para a proposta)
  monthlySavings?: number;
  paybackMonths?: number;
  paybackYears?: number;
  tir?: number;
  vpl?: number;
  roi?: number;
  co2EvitedKgYear?: number;
  monthlyGenerationKwh?: number;
  // Metadados de persistência
  blocks?: ProposalBlock[];         // Snapshot dos blocos do editor WYSIWYG
  theme?: ProposalTheme;            // Tema salvo da proposta
  createdAt?: string;               // ISO string
  updatedAt?: string;               // ISO string
  status?: 'draft' | 'sent' | 'approved' | 'rejected';
  tags?: string[];
  observations?: string;            // Observações adicionais
}
