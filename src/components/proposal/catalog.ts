import { BlockCatalogItem, ProposalBlock, ProposalData, ProposalTheme } from './types';
import { nanoid } from './utils';
import { calcSolar } from './solarCalc';

export const BLOCK_CATALOG: BlockCatalogItem[] = [
  {
    type: 'cover',
    label: 'Capa da Proposta',
    description: 'Página de capa com nome do cliente, data e resumo do sistema',
    icon: 'FileText',
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
    type: 'client_info',
    label: 'Dados do Cliente',
    description: 'Informações detalhadas do cliente e conexão',
    icon: 'User',
    defaultContent: {
      clientName: 'Nome do Cliente',
      city: 'Cidade',
      consumption: 800,
    },
  },
  {
    type: 'how_it_works',
    label: 'Como Funciona',
    description: 'Cronograma de implantação',
    icon: 'Settings',
    defaultContent: {
      title: 'Operação e Cronograma',
      subtitle: 'Da aprovação à economia real na sua conta.',
      steps: [
        { label: 'Aprovação e Projeto', duration: 'Semana 1' },
        { label: 'Homologação na Concessionária', duration: 'Semana 2-3' },
        { label: 'Instalação do Sistema', duration: 'Semana 4' },
        { label: 'Vistoria e Troca de Medidor', duration: 'Semana 5-6' },
      ],
    },
  },
  {
    type: 'tech_specs',
    label: 'Ficha Técnica',
    description: 'Tabela técnica: potência, módulos, inversores e área',
    icon: 'Cpu',
    defaultContent: {
      consumption: 800,
      systemSizeKw: 6.82,
      moduleBrand: 'Canadian Solar',
      modulePower: 550,
      modulesCount: 12,
      inverterBrand: 'Growatt',
      inverterPower: 5,
      inverterCount: 1,
      roofArea: 30,
    },
  },
  {
    type: 'generation_chart',
    label: 'Geração vs Consumo',
    description: 'Gráfico comparativo mensal',
    icon: 'BarChart2',
    defaultContent: {
      title: 'Geração vs Consumo',
      data: Array(12).fill(0).map((_, i) => ({
        month: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][i],
        generation: 850,
        consumption: 800,
        balance: 50,
      })),
    },
  },
  {
    type: 'economy',
    label: 'Economia Detalhada',
    description: 'Resumo da economia gerada pelo sistema',
    icon: 'TrendingDown',
    defaultContent: {
      currentBill: 860,
      newBill: 207,
      monthlySavings: 653,
      annualSavings: 7836,
      totalSavings25Years: 195900,
      monthlyGenerationKwh: 850,
      consumption: 800,
    },
  },
  {
    type: 'roi',
    label: 'Retorno do Investimento',
    description: 'Métricas financeiras (TIR, VPL, Payback)',
    icon: 'LineChart',
    defaultContent: {
      finalPrice: 25000,
      paybackYears: 3,
      paybackMonths: 6,
      tir: 35,
      vpl: 45000,
      roi: 300,
      totalSavings25Years: 195900,
      co2EvitedTon25Years: 50,
      treesEquivalent: 250,
      cashFlowData: [],
    },
  },
  {
    type: 'social_proof',
    label: 'Prova Social',
    description: 'Fotos de instalações e depoimentos',
    icon: 'Star',
    defaultContent: {
      headline: 'Por que os clientes escolhem a Quark?',
      subheadline: 'Tecnologia Tier 1 e instalação Classe A.',
      images: [],
    },
  },
  {
    type: 'contact',
    label: 'Contato & Encerramento',
    description: 'Dados da empresa e condições comerciais',
    icon: 'Phone',
    defaultContent: {
      companyName: 'Quark Energia',
      companyPhone: '(00) 00000-0000',
      companyEmail: 'contato@quarkenergia.com.br',
      companyAddress: 'Av. Principal, 1000 - Centro',
      companyCnpj: '00.000.000/0001-00',
      validityDays: 7,
    },
  },
];

export function buildInitialBlocks(data: ProposalData, theme?: ProposalTheme): ProposalBlock[] {
  const finalPrice = data.finalPrice || 25000;
  const systemSizeKw = data.systemSizeKw || 6.82;
  const consumptionBase = Math.round(data.consumption || 800);
  const monthlyBill = data.billValue || consumptionBase * 0.85;
  const newBill = data.newMonthlyBill || 100;
  const monthlySavings = data.monthlySavings || (monthlyBill - newBill);
  const generationMonthly = Math.round(data.monthlyGenerationKwh || systemSizeKw * 128.64);

  const solarResult = calcSolar({
    monthlyConsumptionKwh: consumptionBase,
    tariffRate: data.tariffRate || 0.85,
    fiobEffective: data.fiobRate || 0.85 * 0.45,
    publicLighting: data.publicLighting || 50,
    connectionType: data.connectionType || 'tri',
    generationFactor: data.generationFactor || 128.64,
    systemPowerKwp: systemSizeKw,
    finalPrice: finalPrice,
    tariffAdjustmentRate: 7,
    systemLifeYears: 25,
    tma: 12,
  });

  return [
    {
      id: 'block-' + '1',
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
      id: 'block-' + '2',
      type: 'client_info',
      content: {
        clientName: data.clientName || 'Nome do Cliente',
        cpfCnpj: data.cpfCnpj,
        phone: data.phone,
        email: data.email,
        address: data.address,
        city: data.city || 'Sua Cidade',
        state: data.state,
        concessionaria: data.concessionaria,
        consumption: consumptionBase,
        connectionType: data.connectionType || 'tri',
        roofType: data.roofType,
      },
    },
    {
      id: 'block-' + '3',
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
      id: 'block-' + '4',
      type: 'tech_specs',
      content: {
        consumption: consumptionBase,
        systemSizeKw: systemSizeKw,
        moduleBrand: data.moduleBrand || 'Jinko Solar',
        modulePower: data.modulePower || 550,
        modulesCount: data.modulesCount || 12,
        inverterBrand: data.inverterBrand || 'Sungrow',
        inverterPower: data.inverterPower || 5,
        inverterCount: data.inverterCount || 1,
        roofArea: Math.ceil((data.modulesCount || 12) * 2.4),
      },
    },
    {
      id: 'block-' + '5',
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
      id: 'block-' + '6',
      type: 'economy',
      content: {
        currentBill: monthlyBill,
        newBill: solarResult.monthlyBillAfter,
        monthlySavings: solarResult.monthlySavings,
        annualSavings: solarResult.annualSavings,
        totalSavings25Years: solarResult.totalSavings25Years,
        monthlyGenerationKwh: generationMonthly,
        consumption: consumptionBase,
      },
    },
    {
      id: 'block-' + '7',
      type: 'roi',
      content: {
        finalPrice: finalPrice,
        paybackYears: solarResult.paybackYears,
        paybackMonths: solarResult.paybackMonths,
        tir: solarResult.tir,
        vpl: solarResult.vpl,
        roi: solarResult.roi,
        totalSavings25Years: solarResult.totalSavings25Years,
        co2EvitedTon25Years: solarResult.co2EvitedTon25Years,
        treesEquivalent: solarResult.treesEquivalent,
        systemLifeYears: 25,
        installmentCount: 60,
        cashFlowData: solarResult.cashFlow.map(cf => ({ year: cf.year, cumulative: cf.cumulativeNet })),
      },
    },
    {
      id: 'block-' + '8',
      type: 'social_proof',
      content: {
        metrics: theme?.socialMetrics || [{ label: '+500', sub: 'Projetos Entregues' }, { label: '100%', sub: 'Satisfação' }, { label: '25 Anos', sub: 'Garantia de Geração' }],
        headline: 'Por que os clientes mais exigentes escolhem a Quark?',
        subheadline: 'Tecnologia Tier 1, engenharia cirúrgica e retorno garantido a cada ciclo de sol.',
        images: theme?.projectImages && theme.projectImages.length > 0 
          ? theme.projectImages.map((url: string, i: number) => ({ id: 'img-'+i, url, caption: `Projeto ${i+1}` }))
          : [
            {
              id: 'img-1',
              url: 'https://images.unsplash.com/photo-1509391366360-12009a508f73?auto=format&fit=crop&q=80',
              caption: '+500 Projetos Entregues',
            },
            {
              id: 'img-2',
              url: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&q=80',
              caption: 'Instalação Premium',
            },
            {
              id: 'img-3',
              url: 'https://images.unsplash.com/photo-1497440001374-f26997328c1b?auto=format&fit=crop&q=80',
              caption: 'Equipe Especializada',
            },
            {
              id: 'img-4',
              url: 'https://images.unsplash.com/photo-1613665813446-82a78c468a1d?auto=format&fit=crop&q=80',
              caption: 'Garantia de Geração',
            },
          ],
      },
    },
    {
      id: 'block-' + '11',
      type: 'contact',
      content: {
        companyName: 'Quark Energia',
        companyPhone: '(00) 00000-0000',
        companyEmail: 'contato@quarkenergia.com.br',
        companyAddress: 'Av. Principal, 1000 - Centro',
        companyCnpj: '00.000.000/0001-00',
        validityDays: 7,
      },
    },
  ];
}
