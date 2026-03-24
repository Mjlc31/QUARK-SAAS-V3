export type LeadStatus = 'Lead' | 'Qualificacao' | 'Proposta' | 'Fechado';
export type ProjectStatus = 'Vistoria' | 'Projeto' | 'Homologacao' | 'Instalacao' | 'Finalizado';
export type UserRole = 'Admin' | 'Sales' | 'Engineering';

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