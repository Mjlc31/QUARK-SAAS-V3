// ============================================================
// PROPOSAL ENGINE — CATÁLOGO DE BLOCOS
// Definições padrão de cada tipo de bloco disponível
// ============================================================

import { BlockCatalogItem, ProposalBlock, ProposalData } from './types';
import { nanoid } from './utils';

export const BLOCK_CATALOG: BlockCatalogItem[] = [
  {
    type: 'cover',
    label: 'Capa da Proposta',
    description: 'Página de capa com nome do cliente, data e valor do sistema',
    icon: '🏆',
    defaultContent: {
      clientName: 'Nome do Cliente',
      city: 'Cidade, Estado',
      date: new Date().toLocaleDateString('pt-BR'),
      systemSizeKw: 6.82,
      finalPrice: 25000,
      currentBill: 860,
      newBill: 207,
      tagline: 'SEU PASSAPORTE PARA A INDEPENDÊNCIA ENERGÉTICA',
    },
  },
  {
    type: 'how_it_works',
    label: 'Como Funciona',
    description: 'Cronograma de implantação com ícones de alto padrão',
    icon: '⚙️',
    defaultContent: {
      title: 'Operação e Cronograma',
      subtitle: 'Da aprovação à economia real na sua conta.',
      steps: [
        { label: 'Aprovação', duration: 'Semana 1' },
        { label: 'Homologação', duration: 'Semana 2' },
        { label: 'Instalação', duration: 'Semana 3' },
        { label: 'Vistoria', duration: 'Semana 4' },
        { label: 'Troca de Medidor', duration: 'Semana 4' }
      ]
    }
  },
  {
    type: 'generation_chart',
    label: 'Gráfico de Geração',
    description: 'Gráfico de barras de Geração vs Consumo com tabela de saldo',
    icon: '📊',
    defaultContent: {
      title: 'Geração vs Consumo',
      data: [
        { month: 'Jan', generation: 900, consumption: 800, balance: 100 },
        { month: 'Fev', generation: 850, consumption: 780, balance: 70 },
        { month: 'Mar', generation: 880, consumption: 820, balance: 60 },
        { month: 'Abr', generation: 820, consumption: 790, balance: 30 },
        { month: 'Mai', generation: 750, consumption: 700, balance: 50 },
        { month: 'Jun', generation: 700, consumption: 650, balance: 50 },
        { month: 'Jul', generation: 720, consumption: 680, balance: 40 },
        { month: 'Ago', generation: 800, consumption: 710, balance: 90 },
        { month: 'Set', generation: 850, consumption: 750, balance: 100 },
        { month: 'Out', generation: 890, consumption: 800, balance: 90 },
        { month: 'Nov', generation: 920, consumption: 850, balance: 70 },
        { month: 'Dez', generation: 950, consumption: 880, balance: 70 },
      ]
    }
  },
  {
    type: 'social_proof',
    label: 'Prova Social',
    description: 'Grade de fotos de obras e logos de clientes',
    icon: '📸',
    defaultContent: {
      headline: 'Por que os clientes mais exigentes escolhem a Quark?',
      subheadline:
        'Não vendemos apenas placas solares. Entregamos independência energética com tecnologia Tier 1.',
      images: [
        {
          id: nanoid(),
          url: 'https://images.unsplash.com/photo-1509391366360-1e97b524c5bb?auto=format&fit=crop&q=80&w=800',
          caption: '+500 Projetos Entregues',
        },
        {
          id: nanoid(),
          url: 'https://images.unsplash.com/photo-1613665813446-82a78c468a1d?auto=format&fit=crop&q=80&w=800',
          caption: 'Instalação Classe A',
        },
      ],
    },
  },
  {
    type: 'tech_specs',
    label: 'Ficha Técnica',
    description: 'Tabela técnica: potência, módulos, inversores e área',
    icon: '⚡',
    defaultContent: {
      consumption: 0,
      systemSizeKw: 0,
      moduleBrand: 'Canadian Solar',
      modulePower: 550,
      modulesCount: 0,
      inverterBrand: 'Growatt',
      inverterPower: 5,
      inverterCount: 1,
      roofArea: 0,
    },
  },
  {
    type: 'financial',
    label: 'Análise Financeira',
    description: 'Gráficos de payback, ROI e economia em 25 anos',
    icon: '💰',
    defaultContent: {
      finalPrice: 0,
      monthlyBill: 0,
      tariffRate: 0.85,
      tariffAdjustmentRate: 7,
      paybackYears: 5,
      systemLifeYears: 25,
      installmentCount: 60,
    },
  },
  {
    type: 'financing',
    label: 'Opções de Financiamento',
    description: 'Condições de pagamento: à vista, financiamento bancário, cartão de crédito',
    icon: '💳',
    defaultContent: {
      title: 'Condições Comerciais',
      finalPrice: 0,
      cashDiscountPct: 5,
      options: [
        { id: 'cash', label: 'À Vista (5% desconto)', description: 'Pagamento integral com desconto exclusivo', installments: 1, monthlyRate: 0, installmentValue: 0, totalPaid: 0, downPayment: 0, isHighlighted: false },
        { id: 'bnb-fne', label: 'BNB / FNE Verde', description: 'Linha especial solar — até 84× sem entrada', installments: 84, monthlyRate: 0.6, installmentValue: 0, totalPaid: 0, downPayment: 0, isHighlighted: true },
        { id: 'sicoob', label: 'Financiamento 60×', description: 'Crédito solar Sicoob / Caixa', installments: 60, monthlyRate: 1.29, installmentValue: 0, totalPaid: 0, downPayment: 0, isHighlighted: false },
        { id: 'credit-card-18', label: 'Cartão 18×', description: 'Parcelamento sem burocracia', installments: 18, monthlyRate: 2.99, installmentValue: 0, totalPaid: 0, downPayment: 0, isHighlighted: false },
      ],
    },
  },
  {
    type: 'text',
    label: 'Texto Livre',
    description: 'Cláusulas, observações ou parágrafos personalizados',
    icon: '📝',
    defaultContent: {
      html: '<p>Digite aqui suas observações, cláusulas ou condições especiais desta proposta...</p>',
      placeholder: 'Digite aqui...',
    },
  },
];

// Gera o estado inicial de blocos a partir dos dados do CRM
export function buildInitialBlocks(data: ProposalData): ProposalBlock[] {
  const monthlyBill = data.consumption * 0.85; // estimativa base

  return [
    {
      id: nanoid(),
      type: 'cover',
      content: {
        clientName: data.clientName || 'Nome do Cliente',
        city: data.city || 'Sua Cidade',
        date: new Date().toLocaleDateString('pt-BR'),
        systemSizeKw: data.systemSizeKw || 6.82,
        finalPrice: data.finalPrice || 25000,
        currentBill: data.consumption ? data.consumption * 0.85 : 860,
        newBill: data.consumption ? 100 * 0.85 : 207,
        tagline: 'SEU PASSAPORTE PARA A INDEPENDÊNCIA ENERGÉTICA',
      },
    },
    {
      id: nanoid(),
      type: 'how_it_works',
      content: {
        title: 'Operação e Cronograma',
        subtitle: 'Da aprovação à economia real na sua conta.',
        steps: [
          { label: 'Aprovação', duration: 'Semana 1' },
          { label: 'Homologação', duration: 'Semana 2' },
          { label: 'Instalação', duration: 'Semana 3' },
          { label: 'Vistoria', duration: 'Semana 4' },
          { label: 'Troca de Medidor', duration: 'Semana 4' }
        ]
      }
    },
    {
      id: nanoid(),
      type: 'generation_chart',
      content: {
        title: 'Geração vs Consumo',
        data: [
          { month: 'Jan', generation: 900, consumption: 800, balance: 100 },
          { month: 'Fev', generation: 850, consumption: 780, balance: 70 },
          { month: 'Mar', generation: 880, consumption: 820, balance: 60 },
          { month: 'Abr', generation: 820, consumption: 790, balance: 30 },
          { month: 'Mai', generation: 750, consumption: 700, balance: 50 },
          { month: 'Jun', generation: 700, consumption: 650, balance: 50 },
          { month: 'Jul', generation: 720, consumption: 680, balance: 40 },
          { month: 'Ago', generation: 800, consumption: 710, balance: 90 },
          { month: 'Set', generation: 850, consumption: 750, balance: 100 },
          { month: 'Out', generation: 890, consumption: 800, balance: 90 },
          { month: 'Nov', generation: 920, consumption: 850, balance: 70 },
          { month: 'Dez', generation: 950, consumption: 880, balance: 70 },
        ]
      }
    },
    {
      id: nanoid(),
      type: 'social_proof',
      content: {
        headline: 'Por que os clientes mais exigentes escolhem a Quark?',
        subheadline:
          'Tecnologia Tier 1, engenharia cirúrgica e retorno garantido a cada ciclo de sol.',
        images: [
          {
            id: nanoid(),
            url: 'https://images.unsplash.com/photo-1509391366360-1e97b524c5bb?auto=format&fit=crop&q=80&w=800',
            caption: '+500 Projetos Entregues',
          },
          {
            id: nanoid(),
            url: 'https://images.unsplash.com/photo-1613665813446-82a78c468a1d?auto=format&fit=crop&q=80&w=800',
            caption: 'Instalação Premium',
          },
        ],
      },
    },
    {
      id: nanoid(),
      type: 'tech_specs',
      content: {
        consumption: data.consumption,
        systemSizeKw: data.systemSizeKw,
        moduleBrand: data.moduleBrand,
        modulePower: data.modulePower,
        modulesCount: data.modulesCount,
        inverterBrand: data.inverterBrand,
        inverterPower: data.inverterPower,
        inverterCount: data.inverterCount,
        roofArea: Math.ceil(data.modulesCount * 2.4), // ~2.4 m² por módulo padrão
      },
    },
    {
      id: nanoid(),
      type: 'financial',
      content: {
        finalPrice: data.finalPrice,
        monthlyBill,
        tariffRate: 0.85,
        tariffAdjustmentRate: 7,
        paybackYears: Math.round(data.finalPrice / (monthlyBill * 12)),
        systemLifeYears: 25,
        installmentCount: 60,
      },
    },
  ];
}
