export type LeadStatus = 'Lead' | 'Qualificacao' | 'Proposta' | 'Fechado';
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
  city: string;
  value: number; // Proposta Valor
  monthlyConsumption: number;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
  history: LeadHistoryLog[];
  assignee?: string;
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

export interface Product {
  id: string;
  name: string;
  type: string;
  price: number;
  power?: number;
}