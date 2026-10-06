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

export type TransactionType = 'receita' | 'custo' | 'despesa';
export type Category = 
  | 'instalacao_residencial' | 'instalacao_comercial' | 'manutencao' | 'outros_receita'
  | 'equipamentos' | 'mao_de_obra' | 'frete' | 'outros_cpv'
  | 'salarios' | 'marketing' | 'aluguel' | 'combustivel' | 'software' | 'imposto' | 'outras_despesas';

export interface FinancialTransaction {
  id: string;
  description: string;
  type: TransactionType;
  category: Category;
  amount: number;
  date: string;
  note?: string;
  user_id?: string;
}

export interface ProspectLead {
  id: number;
  nome: string;
  avaliacao: string;
  endereco: string;
  telefone: string;
  website: string;
  latitude: string;
  longitude: string;
}


// ── Portal do Cliente ──
export type TicketCategory = 'manutencao' | 'limpeza' | 'projeto' | 'homologacao' | 'financeiro' | 'outros';
export type TicketPriority = 'baixa' | 'normal' | 'alta' | 'urgente';
export type TicketStatus = 'aberto' | 'em_andamento' | 'aguardando_cliente' | 'resolvido' | 'fechado';
export type MaintenanceServiceType = 'manutencao' | 'limpeza' | 'inspecao' | 'reparo';
export type MaintenanceServiceStatus = 'pendente' | 'agendado' | 'em_campo' | 'concluido' | 'cancelado';
export type AlertType = 'manutencao_preventiva' | 'limpeza' | 'inspecao' | 'garantia';
export type AlertChannel = 'whatsapp' | 'email' | 'sms' | 'portal';
export type AlertStatus = 'pendente' | 'enviado' | 'lido' | 'respondido' | 'falha';
export type ProjectPhase = 'venda_confirmada' | 'projeto_elaboracao' | 'projeto_enviado' | 'aprovacao_concessionaria' | 'logistica_entrega' | 'instalacao' | 'homologacao' | 'comissionamento' | 'finalizado';

export interface ClientPortalUser {
  id: string;
  lead_id?: string;
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  birth_date?: string;
  auth_user_id?: string;
  is_active: boolean;
  quark_points?: number;
  referral_code?: string;
  last_login?: string;
  created_at?: string;
}

export interface SupportTicket {
  id: string;
  client_id: string;
  user_id?: string;
  subject: string;
  description?: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  client_name?: string;
  messages?: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_type: 'client' | 'operator' | 'system';
  sender_id?: string;
  message: string;
  attachments: string[];
  created_at: string;
}

export interface ProjectTrackingPhase {
  id: string;
  project_id: string;
  client_id?: string;
  user_id?: string;
  phase: ProjectPhase;
  phase_label: string;
  started_at: string;
  completed_at?: string;
  notes?: string;
  is_current: boolean;
}

export interface MaintenanceService {
  id: string;
  user_id: string;
  client_id?: string;
  lead_id?: string;
  service_type: MaintenanceServiceType;
  status: MaintenanceServiceStatus;
  scheduled_date?: string;
  completed_date?: string;
  price: number;
  cost: number;
  technician?: string;
  notes?: string;
  before_photos: string[];
  after_photos: string[];
  created_at: string;
  updated_at: string;
  // Joined
  client_name?: string;
}

export interface ClientIntelligenceRecord {
  id: string;
  user_id: string;
  lead_id?: string;
  client_name: string;
  install_start_date?: string;
  install_end_date?: string;
  system_size_kw?: number;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  total_savings_brl: number;
  monthly_generation_kwh?: number;
  utility_account?: string;
  utility_login?: { cpf?: string; birth_date?: string; email?: string };
  installed_by: 'quark' | 'terceiro';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UtilityInvoice {
  id: string;
  intelligence_id: string;
  user_id?: string;
  month_ref: string;
  consumption_kwh?: number;
  generation_kwh?: number;
  amount_brl?: number;
  savings_brl?: number;
  pdf_url?: string;
  status?: 'pendente' | 'aprovado' | 'rejeitado';
  captured_at: string;
}

export interface EcommerceProduct {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  promo_price?: number;
  image_url?: string;
  is_active: boolean;
  includes_installation: boolean;
  delivery_days: number;
  overload_percentage?: number;
  created_at: string;
}

export interface MaintenanceAlert {
  id: string;
  intelligence_id: string;
  user_id?: string;
  alert_type: AlertType;
  message?: string;
  scheduled_for?: string;
  sent_at?: string;
  channel: AlertChannel;
  status: AlertStatus;
  created_at: string;
  error_reason?: string;
  // Joined
  client_name?: string;
}

// ── Maintenance Dashboard Stats ──
export interface MaintenanceStats {
  totalServices: number;
  completedThisMonth: number;
  revenueThisMonth: number;
  profitThisMonth: number;
  monthlyGoal: number;
  avgProfitPerService: number;
}
