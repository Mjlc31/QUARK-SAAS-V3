export type LeadStatus = 'Lead' | 'Qualificacao' | 'Proposta' | 'Fechado' | 'Perdido' | string;
export type ProjectStatus = 'Vistoria' | 'Projeto' | 'Homologacao' | 'Instalacao' | 'Finalizado';
export type UserRole = 'Admin' | 'Sales' | 'Engineering';
export type PersonType = 'PF' | 'PJ';
export type PipelineType = 'Geral' | 'Evento' | 'Produto';

export interface PipelineStage {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface Pipeline {
  id: string;
  name: string;
  type: PipelineType;
  color: string;
  stages?: PipelineStage[];
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface LeadPipelineEntry {
  pipelineId: string;
  stage: LeadStatus;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarInitials: string;
}

export interface LeadHistoryLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  author: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  cpfCnpj?: string;
  rg?: string;
  birthDate?: string;
  expeditionDate?: string;
  street?: string;
  neighborhood?: string;
  state?: string;
  zipCode?: string;
  city: string;
  value: number; // Proposta Valor
  monthlyConsumption: number;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
  history: LeadHistoryLog[];
  assignee?: string;
  notes?: string;
  // ── Dados Empresa (PJ) ──
  personType?: PersonType;
  companyName?: string;
  cnpj?: string;
  stateRegistration?: string;
  // ── CRM v2: Tags e Multi-Pipeline ──
  tags?: Tag[];
  pipelineEntries?: LeadPipelineEntry[];
  // ── CRM Elite: Controle Implacável ──
  nextActionDate?: string;
  nextActionType?: 'Ligar' | 'Reunião' | 'WhatsApp' | 'Visita' | 'Outro';
  lossReason?: string;
  source?: string;
}

export interface ProjectFinance {
  revenue: number;
  kitCost: number;
  installationCost: number;
  materialCost: number;
  signatureCost: number;
  commissionCost: number;
  modulePowerW?: number;
  moduleCount?: number;
  taxRate?: number;
}

export interface Project {
  id: string;
  clientId: string; // Link to Lead ID if available
  clientName: string;
  clientPhone?: string;
  city: string;
  systemSizeKw: number;
  status: ProjectStatus;
  installDate?: string;
  updatedAt: string;
  attachments?: string[]; // Arrays de Base64 ou URLs
  hasWebhook?: boolean;
  finance?: ProjectFinance;
}

export interface CityData {
  name: string;
  state: string;
  hsp: number; // Horas de Sol Pleno Anualizado
  tariff: number; // R$/kWh
}

export interface SolarSystemResult {
  systemSizeKw: number;
  modulesCount: number;
  inverterSizeKw: number;
  oversizingFactor: number;
  areaM2: number;
  monthlyGeneration: number;
  monthlySavings: number;
  annualSavings: number;
  paybackYears: number;
  totalInvestment: number;
  roi25Years: number;
  // New Fields
  co2SavedTons: number;
  treesPlanted: number;
  financed: boolean;
  monthlyPayment?: number;
  totalFinancingCost?: number;
}

export interface Task {
  id: string;
  title: string;
  assignee: string;
  deadline: string;
  completed: boolean;
  priority: 'High' | 'Medium' | 'Low';
}

export type ProductCategory = 'Módulo' | 'Inversor' | 'Estrutura' | 'Cabo' | 'String Box' | 'Disjuntor' | 'Outros';

export interface Product {
  id: string;
  name: string; // Model name usually
  brand: string;
  category: ProductCategory;
  price: number;
  power?: number; // Numeric value
  powerUnit?: string; // W, kW, A, m
  stock: number;
  image?: string;
  description?: string;
}

// ── Global Error & Response Types ──
export interface AppError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

export interface ApiResult<T> {
  data?: T;
  error?: AppError | null;
}
// -- Activity (feed de atividades recentes) ------
export interface Activity {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
}
