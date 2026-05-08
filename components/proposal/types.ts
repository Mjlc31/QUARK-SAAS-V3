// ============================================================
// PROPOSAL ENGINE — TIPOS CENTRAIS
// Arquitetura: Block-Based Editor (estilo Notion/Canva)
// ============================================================

export type BlockType =
  | 'cover'
  | 'how_it_works'
  | 'generation_chart'
  | 'social_proof'
  | 'tech_specs'
  | 'financial'
  | 'text';

// ── Tema Global da Proposta ───────────────────────────────────
export type FontFamily = 'inter' | 'playfair' | 'dm-sans';

export interface ProposalTheme {
  primaryColor: string;   // hex — ex: #C4A050 (gold)
  secondaryColor: string; // hex — ex: #1a3a5c (navy)
  fontFamily: FontFamily;
  logoUrl: string | null; // blob URL ou URL remota
  backgroundColor?: string;
  textColor?: string;
}

export const DEFAULT_THEME: ProposalTheme = {
  primaryColor: '#C4A050',
  secondaryColor: '#0f1a30',
  fontFamily: 'inter',
  logoUrl: null,
  backgroundColor: '#0A0A0A',
  textColor: '#ffffff',
};

export const FONT_FAMILY_MAP: Record<FontFamily, string> = {
  'inter': "'Inter', sans-serif",
  'playfair': "'Playfair Display', serif",
  'dm-sans': "'DM Sans', sans-serif",
};

// Conteúdo de cada tipo de bloco
export interface CoverContent {
  clientName: string;
  city: string;
  date: string;
  systemSizeKw: number;
  finalPrice: number;
  currentBill?: number;
  newBill?: number;
  tagline: string;
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
  finalPrice: number;
  monthlyBill: number;
  tariffRate: number;
  tariffAdjustmentRate: number;
  paybackYears: number;
  systemLifeYears: number;
  installmentCount: number;
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
  // Metadados de persistência
  blocks?: ProposalBlock[];         // Snapshot dos blocos do editor WYSIWYG
  createdAt?: string;               // ISO string
  updatedAt?: string;               // ISO string
  status?: 'draft' | 'sent' | 'approved' | 'rejected';
  tags?: string[];
}
