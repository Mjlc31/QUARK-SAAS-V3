export const SYSTEM_CONSTANTS = {
  // Configurações do Sistema
  APP_NAME: 'Quark OS',
  VERSION: '3.0.0',
  DEFAULT_CURRENCY: 'BRL',
  LOCALE: 'pt-BR',

  // Configurações Técnicas de Engenharia
  HSP_CONVERSION_FACTOR: 123, // Horas de Sol Pleno Anualizado estimativa padrão
  DEFAULT_SYSTEM_SIZE_KW: 5,

  // Configurações de Senhas e Segurança
  MIN_PASSWORD_LENGTH: 6,
};

export const FINANCIAL_CONSTANTS = {
  // Proporções para DRE Minuciosa e Custo (Em %)
  COST_KIT_PERCENTAGE: 0.45,       // Custo de Kit (45%)
  COST_LABOR_PERCENTAGE: 0.10,     // Mão de Obra (10%)
  COST_TAX_PERCENTAGE: 0.10,       // Impostos (10%)
  COST_ENGINEERING_PERCENTAGE: 0.03, // Engenharia/Homologação (3%)
  COST_FREIGHT_PERCENTAGE: 0.02,   // Frete (2%)
  COST_COMMISSION_PERCENTAGE: 0.05, // Comissão (5%)
  
  // Categorias de Lançamento
  CATEGORY_RESIDENTIAL: 'instalacao_residencial',
  CATEGORY_EQUIPMENT: 'equipamentos',
  CATEGORY_LABOR: 'mao_de_obra',
  CATEGORY_TAX: 'imposto',
  CATEGORY_OTHER_CPV: 'outros_cpv',
  CATEGORY_FREIGHT: 'frete',
  CATEGORY_SALARIES: 'salarios'
};

export const PIPELINE_CONSTANTS = {
  DEFAULT_FALLBACK: [
    { id: '00000000-0000-0000-0000-000000000001', name: 'Geral', type: 'Geral', color: '#a3e635' },
    { id: '00000000-0000-0000-0000-000000000002', name: 'Evento — Tênis', type: 'Evento', color: '#38bdf8' },
    { id: '00000000-0000-0000-0000-000000000003', name: 'Evento — Poker', type: 'Evento', color: '#f472b6' },
    { id: '00000000-0000-0000-0000-000000000004', name: 'Evento — Ritmo', type: 'Evento', color: '#fb923c' },
  ],
  DEFAULT_TAGS: [
    { id: 'tag-1', name: 'Anúncios', color: '#f59e0b' },
    { id: 'tag-2', name: 'Indicação', color: '#10b981' },
    { id: 'tag-3', name: 'Instagram orgânico', color: '#8b5cf6' },
    { id: 'tag-4', name: 'Google Ads', color: '#3b82f6' },
    { id: 'tag-5', name: 'Indicação interna', color: '#ec4899' },
  ]
};
