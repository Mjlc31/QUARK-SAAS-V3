// ============================================================
// PROPOSAL ENGINE — TIPOS CENTRAIS v5.0
// Arquitetura: 5-Step Wizard + Inline Preview + PDF Export
// ============================================================

// ── Tipos de Blocos (mantidos para compatibilidade com PDF) ───
export type BlockType =
  | 'cover'
  | 'client_info'
  | 'how_it_works'
  | 'generation_chart'
  | 'social_proof'
  | 'tech_specs'
  | 'financial'
  | 'economy'
  | 'roi'
  | 'financing'
  | 'contact'
  | 'text';

// ── Tema Global da Proposta ───────────────────────────────────
export type FontFamily = 'inter' | 'playfair' | 'dm-sans' | 'montserrat' | 'raleway' | 'poppins' | 'space-grotesk';
export type ProposalMode = 'dark' | 'light';

export interface ProposalTheme {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: FontFamily;
  logoUrl: string | null;
  logoSize?: 'sm' | 'md' | 'lg';
  projectImages?: string[];
  companyName?: string;
  companyCnpj?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyAddress?: string;
  socialMetrics?: { label: string; sub: string; }[];
  mode?: ProposalMode;
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

// ── WIZARD: Tipos de Etapa ───────────────────────────────────

export type WizardStepId = 'client' | 'tech' | 'pricing' | 'preview' | 'export';

export interface WizardStepConfig {
  id: WizardStepId;
  label: string;
  description: string;
  icon: string;
  isCompleted: boolean;
  isActive: boolean;
}

export const WIZARD_STEPS: Omit<WizardStepConfig, 'isCompleted' | 'isActive'>[] = [
  { id: 'client',  label: 'Cliente',       description: 'Dados do cliente e da obra',       icon: 'User' },
  { id: 'tech',    label: 'Técnico',       description: 'Configuração do sistema solar',    icon: 'Settings' },
  { id: 'pricing', label: 'Precificação',  description: 'Custos, margem e preço final',     icon: 'DollarSign' },
  { id: 'preview', label: 'Preview',       description: 'Visualização e personalização',    icon: 'Eye' },
  { id: 'export',  label: 'Exportar',      description: 'Gerar PDF e salvar no sistema',    icon: 'Download' },
];

// Tipos de telhado
export type RoofType = 'ceramico' | 'metalico' | 'fibrocimento' | 'laje' | 'solo';

export const ROOF_TYPE_LABELS: Record<RoofType, string> = {
  'ceramico':     'Cerâmico (Colonial)',
  'metalico':     'Metálico (Trapezoidal)',
  'fibrocimento': 'Fibrocimento',
  'laje':         'Laje',
  'solo':         'Solo',
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
  monthlySavings?: number;
  paybackYears?: number;
  co2Ton25Years?: number;
}

export interface ClientInfoContent {
  clientName: string;
  cpfCnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  city: string;
  state?: string;
  concessionaria?: string;
  consumption: number;
  connectionType?: 'mono' | 'bi' | 'tri';
  roofType?: RoofType;
}

export interface SocialProofContent {
  images: Array<{ id: string; url: string; caption: string }>;
  headline: string;
  subheadline: string;
  metrics?: { label: string; sub: string }[];
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
  finalPrice: number;
  monthlyBill: number;
  tariffRate: number;
  tariffAdjustmentRate: number;
  paybackYears: number;
  systemLifeYears: number;
  installmentCount: number;
  systemPowerKwp?: number;
  monthlyConsumptionKwh?: number;
  tir?: number;
  vpl?: number;
  roi?: number;
  totalSavings25Years?: number;
  annualSavings?: number;
  co2EvitedKgYear?: number;
  co2EvitedTon25Years?: number;
  treesEquivalent?: number;
  monthlyGenerationKwh?: number;
  newMonthlyBill?: number;
  cashFlowData?: Array<{ year: number; cumulative: number }>;
}

export interface EconomyContent {
  currentBill: number;
  newBill: number;
  monthlySavings: number;
  annualSavings: number;
  totalSavings25Years: number;
  monthlyGenerationKwh: number;
  consumption: number;
}

export interface ROIContent {
  finalPrice: number;
  paybackYears: number;
  paybackMonths: number;
  tir: number;
  vpl: number;
  roi: number;
  totalSavings25Years: number;
  co2EvitedTon25Years: number;
  treesEquivalent: number;
  cashFlowData: Array<{ year: number; cumulative: number }>;
}

export interface FinancingContent {
  title?: string;
  finalPrice: number;
  cashDiscountPct: number;
  options: FinancingOptionBlock[];
}

export interface FinancingOptionBlock {
  id: string;
  label: string;
  description: string;
  installments: number;
  monthlyRate: number;
  installmentValue: number;
  totalPaid: number;
  downPayment: number;
  isHighlighted?: boolean;
}

export interface ContactContent {
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  companyAddress: string;
  companyCnpj: string;
  companyLogo?: string;
  pixKey?: string;
  conditions?: string;
  validityDays: number;
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
  | ClientInfoContent
  | HowItWorksContent
  | GenerationChartContent
  | SocialProofContent
  | TechSpecsContent
  | FinancialContent
  | EconomyContent
  | ROIContent
  | FinancingContent
  | ContactContent
  | TextContent;

export interface ProposalBlock {
  id: string;
  type: BlockType;
  content: BlockContent;
}

export interface BlockCatalogItem {
  type: BlockType;
  label: string;
  description: string;
  icon: string;
  defaultContent: BlockContent;
}

export interface ProposalEditorState {
  blocks: ProposalBlock[];
  selectedBlockId: string | null;
  isDirty: boolean;
}

// ── PROPOSAL DATA — Contrato Principal v5.0 ──────────────────

export type ProposalStatus = 'draft' | 'sent' | 'approved' | 'rejected';

export const STATUS_CONFIG: Record<ProposalStatus, { label: string; color: string }> = {
  draft:    { label: 'Rascunho',  color: 'bg-zinc-700/60 text-zinc-300' },
  sent:     { label: 'Enviada',   color: 'bg-blue-500/20 text-blue-400' },
  approved: { label: 'Aprovada',  color: 'bg-lime-500/20 text-lime-400' },
  rejected: { label: 'Recusada',  color: 'bg-red-500/20 text-red-400'   },
};

export interface ProposalData {
  id?: string;
  leadId?: string;
  version?: number;

  // ── Dados do Cliente (Step 1) ──
  clientName: string;
  cpfCnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  city: string;
  state?: string;
  roofType?: RoofType;

  // ── Dados Elétricos (Step 1) ──
  consumption: number;
  billValue?: number;
  tariffRate?: number;
  fiobRate?: number;
  concessionaria?: string;
  connectionType?: 'mono' | 'bi' | 'tri';
  publicLighting?: number;
  generationFactor?: number;

  // ── Configuração Técnica (Step 2) ──
  systemSizeKw: number;
  moduleBrand: string;
  modulePower: number;
  modulesCount: number;
  inverterBrand: string;
  inverterPower: number;
  inverterCount: number;

  // ── Precificação (Step 3) ──
  priceKit: number;
  priceCA: number;
  installationCost?: number;
  additionalCosts: number;
  taxPercentage: number;
  profitPercentage: number;
  finalPrice: number;

  // ── Resultados Calculados ──
  monthlySavings?: number;
  paybackMonths?: number;
  paybackYears?: number;
  tir?: number;
  vpl?: number;
  roi?: number;
  co2EvitedKgYear?: number;
  co2EvitedTon25Years?: number;
  treesEquivalent?: number;
  monthlyGenerationKwh?: number;
  totalSavings25Years?: number;
  annualSavings?: number;
  newMonthlyBill?: number;

  // ── Metadados de Persistência ──
  blocks?: ProposalBlock[];
  theme?: ProposalTheme;
  createdAt?: string;
  updatedAt?: string;
  status?: ProposalStatus;
  tags?: string[];
  observations?: string;
  pdfUrl?: string;
}

// ── Versionamento de Propostas ────────────────────────────────

export interface ProposalVersion {
  id: string;
  proposalId: string;
  version: number;
  data: Omit<ProposalData, 'id' | 'version' | 'createdAt' | 'updatedAt'>;
  blocks?: ProposalBlock[];
  theme?: ProposalTheme;
  createdAt: string;
}

// ── Wizard State ──────────────────────────────────────────────

export type WizardAction =
  | { type: 'SET_CLIENT_DATA'; payload: Partial<ProposalData> }
  | { type: 'SET_TECH_CONFIG'; payload: Partial<ProposalData> }
  | { type: 'SET_PRICING'; payload: Partial<ProposalData> }
  | { type: 'SET_THEME'; payload: Partial<ProposalTheme> }
  | { type: 'SET_BLOCKS'; payload: ProposalBlock[] }
  | { type: 'SET_STATUS'; payload: ProposalStatus }
  | { type: 'LOAD_PROPOSAL'; payload: ProposalData }
  | { type: 'RESET' };

export interface WizardState {
  proposalData: Partial<ProposalData>;
  theme: ProposalTheme;
  blocks: ProposalBlock[];
  currentStep: number;
  isEditing: boolean;
}
