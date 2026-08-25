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
          url: '/images/projetos-entregues.jpg',
          caption: '+500 Projetos Entregues',
        },
        {
          id: nanoid(),
          url: '/images/instalacao-premium.jpg',
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

import { calcSolar } from './solarCalc';

// Gera o estado inicial de blocos a partir dos dados do CRM
export function buildInitialBlocks(data: ProposalData): ProposalBlock[] {
  const monthlyBill = data.consumption ? data.consumption * 0.85 : 860;
  const systemSizeKw = data.systemSizeKw || 6.82;
  const finalPrice = data.finalPrice || 25000;
  const newBill = data.consumption ? 100 * 0.85 : 207;

  // Calculo de geração mensal (Potência * 5.36 * 30 * 0.8) = Potência * 128.64
  const generationMonthly = Math.round(systemSizeKw * 5.36 * 30 * 0.8);
  const consumptionBase = Math.round(data.consumption || 800);
  
  const solarResult = calcSolar({
    monthlyConsumptionKwh: consumptionBase,
    tariffRate: 0.85,
    fiobEffective: 0.85 * 0.45,
    publicLighting: 50,
    connectionType: 'tri',
    generationFactor: 128.64,
    systemPowerKwp: systemSizeKw,
    finalPrice: finalPrice,
    tariffAdjustmentRate: 7,
    systemLifeYears: 25,
    tma: 12,
  });
  return [
    {
      id: nanoid(),
      type: 'cover',
      content: {
        clientName: data.clientName || 'Nome do Cliente',
        city: data.city || 'Sua Cidade',
        date: new Date().toLocaleDateString('pt-BR'),
        systemSizeKw,
        finalPrice,
        currentBill: monthlyBill,
        newBill,
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
          { month: 'Jan', generation: generationMonthly, consumption: consumptionBase, balance: generationMonthly - consumptionBase },
          { month: 'Fev', generation: generationMonthly, consumption: consumptionBase, balance: generationMonthly - consumptionBase },
          { month: 'Mar', generation: generationMonthly, consumption: consumptionBase, balance: generationMonthly - consumptionBase },
          { month: 'Abr', generation: generationMonthly, consumption: consumptionBase, balance: generationMonthly - consumptionBase },
          { month: 'Mai', generation: generationMonthly, consumption: consumptionBase, balance: generationMonthly - consumptionBase },
          { month: 'Jun', generation: generationMonthly, consumption: consumptionBase, balance: generationMonthly - consumptionBase },
          { month: 'Jul', generation: generationMonthly, consumption: consumptionBase, balance: generationMonthly - consumptionBase },
          { month: 'Ago', generation: generationMonthly, consumption: consumptionBase, balance: generationMonthly - consumptionBase },
          { month: 'Set', generation: generationMonthly, consumption: consumptionBase, balance: generationMonthly - consumptionBase },
          { month: 'Out', generation: generationMonthly, consumption: consumptionBase, balance: generationMonthly - consumptionBase },
          { month: 'Nov', generation: generationMonthly, consumption: consumptionBase, balance: generationMonthly - consumptionBase },
          { month: 'Dez', generation: generationMonthly, consumption: consumptionBase, balance: generationMonthly - consumptionBase },
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
            url: '/images/projetos-entregues.jpg',
            caption: '+500 Projetos Entregues',
          },
          {
            id: nanoid(),
            url: '/images/instalacao-premium.jpg',
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
        finalPrice,
        monthlyBill,
        systemPowerKwp: systemSizeKw,
        monthlyConsumptionKwh: consumptionBase,
        tariffRate: 0.85,
        tariffAdjustmentRate: 7,
        paybackYears: solarResult.paybackYears,
        systemLifeYears: 25,
        installmentCount: 60,
      },
    },
  ];
}
