import React, { useState, useEffect, useRef } from 'react';
import { Calculator as CalcIcon, Sun, Zap, FileText, MapPin, AlertTriangle, TrendingUp, Info, Leaf, Trees, DollarSign, Settings2, Package, Gauge, Check, UserPlus, ArrowRight, BarChart3, PiggyBank, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, ComposedChart, Area, Cell, AreaChart } from 'recharts';
import { CityData, SolarSystemResult } from '../types';
import { useApp } from '../contexts/AppContext';
import { jsPDF } from 'jspdf';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { ProposalTemplate, ProposalProps } from '../components/ProposalTemplate';

const ALAGOAS_TARIFF_DEFAULT = 0.98;

const CITIES: CityData[] = [
  { name: 'Maceió', state: 'AL', hsp: 5.35, tariff: ALAGOAS_TARIFF_DEFAULT },
  { name: 'Arapiraca', state: 'AL', hsp: 5.40, tariff: ALAGOAS_TARIFF_DEFAULT },
  { name: 'Rio Largo', state: 'AL', hsp: 5.30, tariff: ALAGOAS_TARIFF_DEFAULT },
  { name: 'Palmeira dos Índios', state: 'AL', hsp: 5.25, tariff: ALAGOAS_TARIFF_DEFAULT },
  { name: 'União dos Palmares', state: 'AL', hsp: 5.20, tariff: ALAGOAS_TARIFF_DEFAULT },
  { name: 'Penedo', state: 'AL', hsp: 5.35, tariff: ALAGOAS_TARIFF_DEFAULT },
  { name: 'São Miguel dos Campos', state: 'AL', hsp: 5.30, tariff: ALAGOAS_TARIFF_DEFAULT },
  { name: 'Campo Alegre', state: 'AL', hsp: 5.25, tariff: ALAGOAS_TARIFF_DEFAULT },
  { name: 'Coruripe', state: 'AL', hsp: 5.40, tariff: ALAGOAS_TARIFF_DEFAULT },
  { name: 'Maragogi', state: 'AL', hsp: 5.40, tariff: ALAGOAS_TARIFF_DEFAULT },
  { name: 'Delmiro Gouveia', state: 'AL', hsp: 5.50, tariff: ALAGOAS_TARIFF_DEFAULT },
  { name: 'Santana do Ipanema', state: 'AL', hsp: 5.45, tariff: ALAGOAS_TARIFF_DEFAULT },
  { name: 'Piranhas', state: 'AL', hsp: 5.60, tariff: ALAGOAS_TARIFF_DEFAULT },
].sort((a, b) => a.name.localeCompare(b.name));

const DEFAULT_MODULE_POWER = 550;
const MODULE_AREA = 2.27;
const BASE_PERFORMANCE_RATIO = 0.78;

const MONTHLY_YIELD_FACTOR = [1.05, 1.02, 1.0, 0.95, 0.90, 0.85, 0.88, 0.95, 1.0, 1.05, 1.08, 1.06];
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const Calculator: React.FC = () => {
  const { products, addLead } = useApp();
  const navigate = useNavigate();

  const [selectedCity, setSelectedCity] = useState<string>('Maceió');
  const [consumption, setConsumption] = useState<number>(1200);
  const [tariff, setTariff] = useState<number>(0.98);
  const [clientName, setClientName] = useState<string>('');

  const proposalRef = useRef<HTMLDivElement>(null);

  const [inverterPower, setInverterPower] = useState<number>(8);
  const [azimuthLoss, setAzimuthLoss] = useState<number>(0);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');

  const [isFinanced, setIsFinanced] = useState<boolean>(false);
  const [downPayment, setDownPayment] = useState<number>(0);
  const [interestRate, setInterestRate] = useState<number>(1.49);
  const [loanTerm, setLoanTerm] = useState<number>(60);

  // Credit card payment option
  const [isCreditCard, setIsCreditCard] = useState<boolean>(false);
  const [cardInstallments, setCardInstallments] = useState<number>(12);
  const [cardInterestRate, setCardInterestRate] = useState<number>(2.99);

  // Proposal modal state
  const [showProposalModal, setShowProposalModal] = useState<boolean>(false);
  const [proposalCustom, setProposalCustom] = useState({
    clientName: '',
    clientPhone: '',
    discount: 0,
    validityDays: 30,
    notes: '',
  });

  const [energyInflation, setEnergyInflation] = useState<number>(6);
  const [panelDegradation, setPanelDegradation] = useState<number>(0.7);

  const [result, setResult] = useState<SolarSystemResult | null>(null);
  const [cashFlowData, setCashFlowData] = useState<any[]>([]);
  const [generationData, setGenerationData] = useState<any[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);

  const [isSavingToCRM, setIsSavingToCRM] = useState(false);

  // 📊 Tabela CB - CUSTO BENEFÍCIO
  const KIT_PRICING = [
    { generation: 302.5, power: 2.42, modules: 4, brand: 'HANERSUN BI', powerW: 605, inverter: 'MICROINVERSOR', invPower: 2.25, kitPrice: 3515.90, finalPrice: 8875.90 },
    { generation: 305, power: 2.44, modules: 4, brand: 'HANERSUN BI', powerW: 610, inverter: 'MICROINVERSOR', invPower: 2.25, kitPrice: 3515.90, finalPrice: 8425.90 },
    { generation: 438.75, power: 3.51, modules: 6, brand: 'HANERSUN BI', powerW: 585, inverter: 'GOODWE', invPower: 3, kitPrice: 4200.00, finalPrice: 9982.00 },
    { generation: 533.75, power: 4.27, modules: 7, brand: 'HANERSUN BI', powerW: 610, inverter: 'GOODWE', invPower: 3.3, kitPrice: 6589.57, finalPrice: 12653.57 },
    { generation: 610, power: 4.88, modules: 8, brand: 'HANERSUN BI', powerW: 610, inverter: 'GOODWE', invPower: 3.3, kitPrice: 6928.16, finalPrice: 13066.56 },
    { generation: 686.25, power: 5.49, modules: 9, brand: 'HANERSUN BI', powerW: 610, inverter: 'GOODWE', invPower: 5, kitPrice: 8722.12, finalPrice: 15000.32 },
    { generation: 804.375, power: 6.435, modules: 11, brand: 'HANERSUN BI', powerW: 585, inverter: 'GOODWE', invPower: 5, kitPrice: 9398.67, finalPrice: 15873.92 },
    { generation: 930, power: 7.44, modules: 12, brand: 'HANERSUN BI', powerW: 620, inverter: 'GOODWE', invPower: 6, kitPrice: 10526.18, finalPrice: 17740.83 },
    { generation: 1007.5, power: 8.06, modules: 13, brand: 'HANERSUN BI', powerW: 620, inverter: 'SOLIS', invPower: 6, kitPrice: 11248.71, finalPrice: 18734.46 },
    { generation: 1525, power: 12.2, modules: 20, brand: 'HANERSUN BI', powerW: 610, inverter: 'GOODWE', invPower: 10, kitPrice: 16517.91, finalPrice: 26736.48 }
  ];

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    const city = CITIES.find(c => c.name === selectedCity);
    if (city) setTariff(city.tariff);
  }, [selectedCity]);

  useEffect(() => {
    if (products.length > 0 && !selectedModuleId) {
      const panel = products.find(p => p.category === 'Módulo');
      if (panel) setSelectedModuleId(panel.id);
    }
  }, [products]);

  useEffect(() => {
    calculateSystem();
  }, [consumption, selectedCity, tariff, azimuthLoss, isFinanced, downPayment, interestRate, loanTerm, energyInflation, panelDegradation]);

  const calculateSystem = () => {
    const city = CITIES.find(c => c.name === selectedCity) || CITIES[0];
    const adjustedPR = BASE_PERFORMANCE_RATIO * (1 - (azimuthLoss / 100));

    // Mapeando pela Geração do Kit na Planilha
    let selectedKit = KIT_PRICING.find(k => k.generation >= consumption);
    let multiplier = 1;
    
    if (!selectedKit) {
       const largestKit = KIT_PRICING[KIT_PRICING.length - 1];
       multiplier = consumption / largestKit.generation;
       selectedKit = largestKit;
    }

    const totalInvestment = selectedKit.finalPrice * multiplier;
    const modulesCount = Math.ceil(selectedKit.modules * multiplier);
    const installedPowerKw = selectedKit.power * multiplier;
    
    // Atualizar os selects visuais implicitamente
    const actualInverterPower = selectedKit.invPower * multiplier;
    const oversizing = installedPowerKw / actualInverterPower;

    let monthlyPayment = 0;
    let totalFinancingCost = 0;
    let financedAmount = 0;

    if (isFinanced) {
      financedAmount = totalInvestment - downPayment;
      if (financedAmount > 0) {
        const i = interestRate / 100;
        monthlyPayment = financedAmount * (i * Math.pow(1 + i, loanTerm)) / (Math.pow(1 + i, loanTerm) - 1);
        totalFinancingCost = (monthlyPayment * loanTerm) + downPayment;
      }
    }

    const tariffInflationFactor = 1 + (energyInflation / 100);
    const degradationFactor = panelDegradation / 100;
    const maintenanceCostYear12 = totalInvestment * 0.35;

    const cashFlow = [];
    let cumulativeBalance = isFinanced ? -downPayment : -totalInvestment;
    let currentTariff = tariff;
    let currentGenerationMonthlyAvg = installedPowerKw * city.hsp * 30 * adjustedPR;

    let cumulativeGridCost = 0;
    let paybackYear = 0;

    cashFlow.push({
      year: 0,
      balance: Math.floor(cumulativeBalance),
      economy: 0,
      loanPayment: 0
    });

    for (let year = 1; year <= 25; year++) {
      const efficiencyFactor = 1 - ((year - 1) * degradationFactor);
      const yearGeneration = currentGenerationMonthlyAvg * efficiencyFactor * 12;
      const yearSavings = yearGeneration * currentTariff;
      const yearGridCost = (consumption * 12) * currentTariff;
      cumulativeGridCost -= yearGridCost;

      let opex = 0;
      if (year === 12) opex += maintenanceCostYear12;

      let annualLoanPayment = 0;
      if (isFinanced && year <= (loanTerm / 12)) {
        annualLoanPayment = monthlyPayment * 12;
      } else if (isFinanced && year === Math.ceil(loanTerm / 12)) {
        const remainingMonths = loanTerm % 12;
        annualLoanPayment = monthlyPayment * (remainingMonths === 0 ? 12 : remainingMonths);
      }

      const netCashFlow = yearSavings - opex - annualLoanPayment;
      const previousBalance = cumulativeBalance;
      cumulativeBalance += netCashFlow;

      if (paybackYear === 0 && previousBalance < 0 && cumulativeBalance >= 0) {
        paybackYear = year + (Math.abs(previousBalance) / (netCashFlow === 0 ? 1 : netCashFlow));
      }

      cashFlow.push({
        year,
        balance: Math.floor(cumulativeBalance),
        economy: Math.floor(yearSavings),
        loanPayment: Math.floor(annualLoanPayment),
        cumulativeGridCost: Math.floor(cumulativeGridCost)
      });

      currentTariff *= tariffInflationFactor;
    }

    const annualGen = currentGenerationMonthlyAvg * 12;
    const co2SavedTons = (annualGen * 25 * 0.4) / 1000;
    const treesPlanted = Math.floor((annualGen * 25 * 0.4) / 150);

    const genData = MONTHS.map((month, idx) => ({
      name: month,
      consumption: consumption,
      generation: Math.floor(currentGenerationMonthlyAvg * MONTHLY_YIELD_FACTOR[idx])
    }));
    setGenerationData(genData);

    const roi25 = (cumulativeBalance / totalInvestment) * 100;

    // --- Data for Bill Comparison Chart ---
    const oldBill = consumption * tariff;
    // New bill = (consumption - generation) * tariff [Minimun Grid Tax applied conceptually] + Loan Payment
    // For simplicity, assuming Generation covers Consumption, so only Grid Tax (approx 50-100 BRL) + Loan
    const gridTax = 100; // Estimated Availability Cost
    const newBill = isFinanced ? (gridTax + monthlyPayment) : gridTax;

    setComparisonData([
      { name: 'Conta Atual', valor: Math.floor(oldBill), fill: '#ef4444' }, // Red
      { name: 'Conta Nova', valor: Math.floor(newBill), fill: '#84cc16' }  // Green
    ]);

    setResult({
      systemSizeKw: Number(installedPowerKw.toFixed(2)),
      modulesCount,
      inverterSizeKw: actualInverterPower,
      oversizingFactor: Number(oversizing.toFixed(2)),
      areaM2: Number((modulesCount * MODULE_AREA).toFixed(1)),
      monthlyGeneration: Math.floor(currentGenerationMonthlyAvg),
      monthlySavings: Math.floor(currentGenerationMonthlyAvg * tariff),
      annualSavings: Math.floor(currentGenerationMonthlyAvg * 12 * tariff),
      paybackYears: paybackYear > 25 ? 25 : Number(paybackYear.toFixed(1)),
      totalInvestment: Math.floor(totalInvestment),
      roi25Years: Math.floor(roi25),
      co2SavedTons: Number(co2SavedTons.toFixed(1)),
      treesPlanted,
      financed: isFinanced,
      monthlyPayment: Math.floor(monthlyPayment),
      totalFinancingCost: Math.floor(totalFinancingCost)
    });

    setCashFlowData(cashFlow);
  };

  // Credit card installment calculation
  const calcCardInstallment = (investment: number, installments: number, monthlyRate: number) => {
    if (installments <= 1 || monthlyRate === 0) return investment / installments;
    const rate = monthlyRate / 100;
    return investment * (rate * Math.pow(1 + rate, installments)) / (Math.pow(1 + rate, installments) - 1);
  };

  const generatePDF = async () => {
    if (!result || !proposalRef.current) return;
    setIsGeneratingPDF(true);
    
    try {
      // Create new PDF (A4)
      const doc = new jsPDF('p', 'mm', 'a4');
      const name = proposalCustom.clientName || clientName || 'Cliente';
      
      // We will capture pages 1 to 5
      for (let i = 1; i <= 5; i++) {
         const pageElement = proposalRef.current.querySelector(`#page-${i}`) as HTMLElement;
         if (pageElement) {
            const canvas = await html2canvas(pageElement, { 
               scale: 2, 
               useCORS: true, 
               logging: false,
               windowWidth: 794 
            });
            const imgData = canvas.toDataURL('image/png');
            
            if (i > 1) {
               doc.addPage();
            }
            
            doc.addImage(imgData, 'PNG', 0, 0, 210, 297);
         }
      }

      doc.save(`Proposta_Quark_${name.replace(/\s/g, '_')}.pdf`);
      setShowProposalModal(false);
    } catch(err) {
      console.error(err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSaveToCRM = async () => {
    if (!result) return;
    setIsSavingToCRM(true);

    const leadName = clientName || `Projeto ${selectedCity} - ${result.systemSizeKw}kWp`;

    await addLead({
      name: leadName,
      city: selectedCity,
      monthlyConsumption: consumption,
      value: result.totalInvestment,
      phone: ''
    });

    setTimeout(() => {
      setIsSavingToCRM(false);
      navigate('/crm');
    }, 1000);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-enter pb-20 relative">

      {/* Hidden Proposal Template for html2canvas generation */}
      {result && (
         <div className="fixed top-[200vh] left-0 opacity-0 pointer-events-none -z-50">
             <ProposalTemplate 
               ref={proposalRef}
               clientName={proposalCustom.clientName || clientName || 'Cliente'}
               systemSizeKw={result.systemSizeKw}
               modulesCount={result.modulesCount}
               inverterSizeKw={result.inverterSizeKw}
               areaM2={result.areaM2}
               monthlyGeneration={result.monthlyGeneration}
               annualGeneration={result.monthlyGeneration * 12}
               generationData={generationData}
               oldBill={comparisonData[0]?.valor || 0}
               newBill={comparisonData[1]?.valor || 0}
               investment={result.totalInvestment * (1 - proposalCustom.discount / 100)}
               monthlySavings={result.monthlySavings}
               paybackYears={result.paybackYears}
               roi25Years={result.roi25Years}
               isFinanced={isFinanced}
               loanTerm={loanTerm}
               monthlyPayment={result.monthlyPayment || 0}
               cardOptions={[6, 12, 18].filter(i => i <= cardInstallments).map(inst => ({
                   installments: inst,
                   value: calcCardInstallment(result.totalInvestment * (1 - proposalCustom.discount / 100), inst, cardInterestRate)
               }))}
               city={selectedCity}
               state={CITIES.find(c => c.name === selectedCity)?.state || 'AL'}
               proposalId={`${Math.floor(Math.random() * 90000) + 10000}`}
             />
         </div>
      )}

      {/* --- LEFT COLUMN: CONTROLS --- */}
      <div className="xl:col-span-4 flex flex-col gap-6">

        {/* 1. Basic Parameters - ENGINE BOARD */}
        <div className="bg-[#0B0A10]/60 backdrop-blur-2xl p-6 rounded-3xl border border-white/5 shadow-[0_0_40px_rgba(0,0,0,0.3)] relative overflow-hidden">
          {/* Subtle top glow */}
          <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-lime-500/50 to-transparent"></div>

          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-gradient-to-br from-lime-400/20 to-lime-600/5 rounded-xl border border-lime-500/20 text-lime-400 shadow-[0_0_15px_rgba(132,204,34,0.15)] block">
              <Sun size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">Motor de Cálculo</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Parâmetros Ativos</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Nome Cliente */}
            <div className="group">
              <label className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1.5 block group-focus-within:text-lime-400 transition-colors">Nome do Cliente (Opcional)</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: João da Silva"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-white text-sm focus:border-lime-500/50 focus:bg-white/10 outline-none transition-all placeholder:text-slate-600"
              />
            </div>

            <div className="group">
              <label className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1.5 block group-focus-within:text-lime-400 transition-colors">Localidade e Irradiação</label>
              <div className="relative">
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 pl-11 text-white text-sm focus:border-lime-500/50 focus:bg-white/10 outline-none appearance-none transition-all cursor-pointer"
                >
                  {CITIES.map(c => <option key={c.name} value={c.name} className="bg-slate-900">{c.name} - {c.state}</option>)}
                </select>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-lime-400 transition-colors">
                  <MapPin size={16} />
                </div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none">
                  <ArrowRight size={14} className="rotate-90" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="group">
                <label className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1.5 block group-focus-within:text-lime-400 transition-colors">Consumo Mensal</label>
                <div className="relative">
                   <input
                     type="number"
                     value={consumption}
                     onChange={(e) => setConsumption(Number(e.target.value))}
                     className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 pr-12 text-white text-lg font-bold focus:border-lime-500/50 focus:bg-white/10 outline-none transition-all"
                   />
                   <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">kWh</span>
                </div>
              </div>
              <div className="group">
                <label className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1.5 block group-focus-within:text-lime-400 transition-colors">Tarifa Atual</label>
                <div className="relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">R$</span>
                   <input
                     type="number"
                     step="0.01"
                     value={tariff}
                     onChange={(e) => setTariff(Number(e.target.value))}
                     className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 pl-10 text-white text-lg font-bold focus:border-lime-500/50 focus:bg-white/10 outline-none transition-all"
                   />
                </div>
              </div>
            </div>

            <div className="group">
              <label className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1.5 block group-focus-within:text-lime-400 transition-colors">Módulo Fotovoltaico Tier-1</label>
              <div className="relative">
                <select
                  value={selectedModuleId}
                  onChange={(e) => setSelectedModuleId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 pl-11 text-white text-sm focus:border-lime-500/50 focus:bg-white/10 outline-none appearance-none transition-all cursor-pointer"
                >
                  <option value="" disabled className="bg-slate-900">Selecione a tecnologia...</option>
                  {products.filter(p => p.category === 'Módulo').map(p => (
                    <option key={p.id} value={p.id} className="bg-slate-900">{p.name} ({p.power || DEFAULT_MODULE_POWER}W)</option>
                  ))}
                  {products.filter(p => p.category === 'Módulo').length === 0 && (
                    <option value="default" className="bg-slate-900">Genérico Monocristalino 580W</option>
                  )}
                </select>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-lime-400 transition-colors">
                  <Package size={16} />
                </div>
              </div>
            </div>

            <div className="group">
              <label className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1.5 block group-focus-within:text-lime-400 transition-colors">Potência do Inversor (kW)</label>
              <input
                type="number"
                step="0.5"
                value={inverterPower}
                onChange={(e) => setInverterPower(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-white text-sm font-bold focus:border-lime-500/50 focus:bg-white/10 outline-none transition-all"
              />
              {result && result.oversizingFactor > 1.35 && (
                <div className="flex items-center gap-2 mt-3 text-xs text-amber-500 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>Cuidado: Oversizing de <strong>{result.oversizingFactor}x</strong> reduz a vida útil do equipamento.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Financing Simulator */}
        <div className={`bg-[#0B0A10]/60 backdrop-blur-2xl p-6 rounded-3xl border transition-all duration-500 shadow-xl ${isFinanced ? 'border-sky-500/30 shadow-[0_0_30px_rgba(14,165,233,0.1)]' : 'border-white/5'}`}>
          <div className="flex items-center justify-between cursor-pointer group" onClick={() => setIsFinanced(!isFinanced)}>
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-xl transition-colors duration-500 ${isFinanced ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-white/5 text-slate-500 border border-white/5'}`}>
                <DollarSign size={20} />
              </div>
              <h2 className={`text-sm font-bold transition-colors ${isFinanced ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>Financiamento Bancário</h2>
            </div>
            <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${isFinanced ? 'bg-sky-500' : 'bg-white/10'}`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${isFinanced ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </div>
          </div>

          {isFinanced && (
            <div className="space-y-4 pt-6 animate-enter">
              <div className="group">
                <label className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1.5 block group-focus-within:text-sky-400">Entrada (R$)</label>
                <input
                  type="number"
                  value={downPayment}
                  onChange={(e) => setDownPayment(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm font-bold focus:border-sky-500/50 outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="group">
                  <label className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1.5 block group-focus-within:text-sky-400">Taxa C.E.T (% a.m.)</label>
                  <input
                    type="number" step="0.01"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm font-bold focus:border-sky-500/50 outline-none transition-all"
                  />
                </div>
                <div className="group">
                  <label className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1.5 block group-focus-within:text-sky-400">Prazo (Meses)</label>
                  <input
                    type="number"
                    value={loanTerm}
                    onChange={(e) => setLoanTerm(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm font-bold focus:border-sky-500/50 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Advanced Technical Toggle */}
        <div className="bg-[#0B0A10]/60 backdrop-blur-2xl p-5 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between cursor-pointer group" onClick={() => {
            const el = document.getElementById('advanced-settings');
            if (el) el.classList.toggle('hidden');
          }}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg">
                 <Settings2 size={16} className="text-slate-400 group-hover:text-white transition-colors" />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-white transition-colors">Avançado (Perdas Téc.)</span>
            </div>
            <ArrowRight size={14} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
          </div>
          <div id="advanced-settings" className="hidden mt-5 space-y-5 animate-enter pt-5 border-t border-white/5">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                <span>Perda por Azimute</span>
                <span className="text-white">{azimuthLoss}%</span>
              </div>
              <input
                type="range" min="0" max="30" step="1"
                value={azimuthLoss}
                onChange={(e) => setAzimuthLoss(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-lime-500 hover:accent-lime-400 transition-all"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="group">
                <label className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1.5 block group-focus-within:text-lime-400">Inflação Tarifária (% a.a.)</label>
                <input type="number" step="0.5" value={energyInflation} onChange={(e) => setEnergyInflation(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white font-bold outline-none focus:border-lime-500/50 transition-all" />
              </div>
              <div className="group">
                <label className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1.5 block group-focus-within:text-lime-400">Degradação do Painel (% a.a.)</label>
                <input type="number" step="0.1" value={panelDegradation} onChange={(e) => setPanelDegradation(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white font-bold outline-none focus:border-lime-500/50 transition-all" />
              </div>
            </div>
          </div>
        </div>

        {result && (
          <div className="space-y-4 pt-2">
            {/* Credit Card Toggle */}
            <div className={`bg-[#0B0A10]/60 backdrop-blur-2xl p-5 rounded-2xl border transition-all duration-500 ${isCreditCard ? 'border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.1)]' : 'border-white/5'}`}>
              <div className="flex items-center justify-between cursor-pointer group" onClick={() => setIsCreditCard(!isCreditCard)}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg transition-colors duration-500 ${isCreditCard ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-slate-500'}`}>
                     <PiggyBank size={18} />
                  </div>
                  <span className={`text-sm font-bold transition-colors ${isCreditCard ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>Receber via Cartão</span>
                </div>
                <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${isCreditCard ? 'bg-amber-500' : 'bg-white/10'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-300 ${isCreditCard ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </div>
              {isCreditCard && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 animate-enter">
                  <div className="group">
                    <label className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1.5 block group-focus-within:text-amber-400">Máx. Parcelas</label>
                    <select value={cardInstallments} onChange={e => setCardInstallments(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm font-bold text-white outline-none focus:border-amber-500/50">
                      {[6, 9, 12, 15, 18, 21].map(n => <option key={n} value={n} className="bg-slate-900">{n}x</option>)}
                    </select>
                  </div>
                  <div className="group">
                    <label className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1.5 block group-focus-within:text-amber-400">Juros Op. (% a.m.)</label>
                    <input type="number" step="0.1" value={cardInterestRate}
                      onChange={e => setCardInterestRate(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white outline-none font-bold focus:border-amber-500/50" />
                  </div>
                </div>
              )}
              {isCreditCard && result && (
                <div className="mt-5 space-y-2">
                  {[6, 12, 18].filter(n => n <= cardInstallments).map(n => {
                    const i = cardInterestRate / 100;
                    const pmt = i === 0 ? result.totalInvestment / n
                      : result.totalInvestment * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
                    return (
                      <div key={n} className="flex justify-between items-center text-xs py-2 border-b border-white/5 last:border-0">
                        <span className="text-slate-400 font-medium">{n}x de R$ {Math.round(pmt).toLocaleString('pt-BR')}</span>
                        <span className="text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-md text-[10px] tracking-wider uppercase">Cartão</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="pt-2 flex flex-col gap-3">
              <button
                onClick={() => { setProposalCustom(p => ({ ...p, clientName: clientName })); setShowProposalModal(true); }}
                className="w-full py-4 rounded-2xl bg-white text-black font-black text-sm transition-all flex justify-center items-center gap-2 hover:bg-zinc-200 hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                <FileText size={18} /> GERAR PROPOSTA IMPRESSA
              </button>

              <button
                onClick={handleSaveToCRM}
                disabled={isSavingToCRM}
                className="w-full py-4 rounded-2xl bg-[#0B0A10] border border-lime-500/30 text-lime-400 font-black text-sm transition-all flex justify-center items-center gap-2 hover:bg-lime-500/10 hover:shadow-[0_0_20px_rgba(132,204,34,0.15)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingToCRM ? <Check size={18} /> : <UserPlus size={18} />}
                {isSavingToCRM ? 'OPORTUNIDADE SALVA' : 'SALVAR NO CRM'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- RIGHT COLUMN: RESULTS VISUALIZATION (BENTO GRID) --- */}
      <div className="xl:col-span-8 space-y-6">
        {result ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* 1. HERO BLOCK: Economia Mensal (8 Cols) */}
            <div className="md:col-span-8 bg-[#0B0A10]/80 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden group">
              {/* Deep glowing background effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-lime-500/20 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-700"></div>
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-lime-500/10 rounded-full blur-[100px] pointer-events-none"></div>

              <div className="p-8 relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-lime-500/20 text-lime-400 rounded-lg">
                      <PiggyBank size={20} />
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Economia Projetada</h3>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Redução Mensal Média</p>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-5xl font-black text-lime-400 tracking-tighter drop-shadow-[0_0_15px_rgba(132,204,34,0.3)]">R$ {result.monthlySavings.toLocaleString('pt-BR')}</span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">Economia anualizada estimada em <span className="text-white font-bold">R$ {result.annualSavings.toLocaleString('pt-BR')}</span></p>

                      {isFinanced && (
                        <div className="mt-8 p-4 bg-sky-500/10 rounded-2xl border border-sky-500/20 backdrop-blur-md">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">Parcela do Financiamento</span>
                            <span className="text-white font-bold tracking-tight">R$ {result.monthlyPayment?.toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Investimento Inicial</span>
                            <span className="text-slate-300 font-bold">R$ {downPayment.toLocaleString('pt-BR')}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="h-[200px] md:h-[180px] w-full bg-black/40 rounded-2xl p-4 border border-white/5 shadow-inner">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 text-center">Antes vs Depois (Estimativa)</p>
                      <ResponsiveContainer width="100%" height="80%">
                        <BarChart data={comparisonData.map(d => ({ ...d, valorDisplay: d.valor }))} layout="vertical" barSize={32}>
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={90} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={{ backgroundColor: '#0B0A10', borderColor: '#ffffff1a', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }} formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR')}`} />
                          <Bar dataKey="valorDisplay" radius={[0, 6, 6, 0]}>
                            {comparisonData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. STATS COLUMN (4 Cols) */}
            <div className="md:col-span-4 flex flex-col gap-6">
              <div className="flex-1 bg-white/5 backdrop-blur-3xl rounded-3xl border border-white/5 p-6 flex flex-col justify-center relative overflow-hidden group hover:bg-white/10 transition-colors">
                <div className="absolute -right-4 -top-4 text-white/5 group-hover:text-white/10 transition-colors">
                  <TrendingUp size={80} />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 relative z-10">Retorno do Investimento</p>
                <div className="flex items-baseline gap-2 relative z-10">
                  <span className="text-4xl font-black text-white tracking-tighter">{result.paybackYears}</span>
                  <span className="text-sm font-bold text-slate-500">anos</span>
                </div>
                <p className="text-[10px] text-lime-400 font-bold mt-2 uppercase tracking-wider relative z-10">{result.roi25Years}% ROI em 25 anos</p>
              </div>

              <div className="flex-1 bg-white/5 backdrop-blur-3xl rounded-3xl border border-white/5 p-6 flex flex-col justify-center relative overflow-hidden group hover:bg-white/10 transition-colors">
                <div className="absolute -right-4 -top-4 text-white/5 group-hover:text-white/10 transition-colors">
                  <Zap size={80} />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 relative z-10">Geração Média Mensal</p>
                <div className="flex items-baseline gap-2 relative z-10">
                  <span className="text-4xl font-black text-white tracking-tighter">{result.monthlyGeneration}</span>
                  <span className="text-sm font-bold text-slate-500">kWh</span>
                </div>
                <p className="text-[10px] text-slate-500 font-bold mt-2 uppercase tracking-wider relative z-10">Sistema de {result.systemSizeKw} kWp</p>
              </div>
            </div>

            {/* 3. CASH FLOW CHART (8 Cols) */}
            <div className="md:col-span-8 bg-white/5 backdrop-blur-3xl rounded-3xl border border-white/5 p-4 md:p-8 md:h-[380px] flex flex-col min-h-[300px]">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Fluxo de Caixa Acumulado</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1 font-bold">Projeção conservadora 25 anos</p>
                </div>
                <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 w-full md:w-auto overflow-x-auto whitespace-nowrap">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-lime-500/80 shadow-[0_0_8px_rgba(132,204,34,0.6)]"></div>Acumulado Solar</div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>Custo Sem Solar</div>
                </div>
              </div>
              <div className="flex-1 -ml-4 md:ml-0">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={cashFlowData}>
                    <defs>
                      <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#84cc16" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#84cc16" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                    <XAxis dataKey="year" stroke="#64748b" tickLine={false} axisLine={false} fontSize={10} fontWeight={600} />
                    <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={10} fontWeight={600} tickFormatter={(val) => `R$${val / 1000}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0B0A10', borderColor: '#ffffff1a', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                      formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
                      itemStyle={{ color: '#84cc16' }}
                    />
                    <Area type="monotone" dataKey="balance" name="Saldo Acumulado" stroke="#84cc16" fill="url(#colorBalance)" strokeWidth={3} />
                    <Line type="monotone" dataKey="cumulativeGridCost" name="Custo Grid" stroke="#ef4444" strokeDasharray="4 4" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 4. ESG & INVESTMENT (4 Cols) */}
            <div className="md:col-span-4 flex flex-col gap-6">
              <div className="flex-1 bg-white/5 backdrop-blur-3xl rounded-3xl border border-white/5 p-6 flex flex-col justify-center relative overflow-hidden">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 relative z-10">Investimento Total</p>
                <div className="flex items-baseline gap-2 relative z-10">
                  <span className="text-sm font-bold text-slate-500">R$</span>
                  <span className="text-4xl font-black text-white tracking-tighter">{(result.totalInvestment / 1000).toFixed(1)}k</span>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Módulos: {result.modulesCount} un</span>
                  <span>Inversor: {result.inverterSizeKw} kW</span>
                </div>
              </div>

              <div className="flex-1 bg-gradient-to-br from-green-500/10 to-emerald-900/10 backdrop-blur-3xl rounded-3xl border border-green-500/20 p-6 relative overflow-hidden flex flex-col justify-center">
                <Leaf className="absolute -right-4 -bottom-4 text-green-500/10" size={100} />
                <p className="text-[10px] font-bold text-green-500/80 uppercase tracking-widest mb-4 relative z-10">Impacto Ambiental</p>
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                      <Trees size={14} />
                    </div>
                    <div>
                      <p className="text-lg font-black text-white">{result.treesPlanted.toLocaleString('pt-BR')}</p>
                      <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Árvores Plantadas</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Leaf size={14} />
                    </div>
                    <div>
                      <p className="text-lg font-black text-white">{result.co2SavedTons.toLocaleString('pt-BR')}</p>
                      <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Ton. CO₂ Evitadas</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center glass-panel rounded-2xl p-12 text-center border border-dashed border-white/10">
            <div className="w-20 h-20 bg-lime-500/5 rounded-full flex items-center justify-center mb-6 animate-pulse ring-1 ring-lime-500/20">
              <CalcIcon size={40} className="text-lime-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Simulador Solar Enterprise</h3>
            <p className="text-slate-400 max-w-sm text-sm leading-relaxed">
              Insira os dados de consumo e localidade para gerar uma proposta técnica, financeira e visual instantaneamente.
            </p>
          </div>
        )}
      </div>

      {/* ─── Proposal Customization Modal ─────────────────────────────────── */}
      {showProposalModal && result && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowProposalModal(false); }}>
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-lime-500/5">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-lime-400" />
                <div>
                  <h3 className="font-bold text-white">Personalizar Proposta</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Ajuste as informações antes de gerar o PDF</p>
                </div>
              </div>
              <button onClick={() => setShowProposalModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <ArrowRight size={18} className="rotate-180" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Preview summary */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-zinc-900/60 rounded-xl border border-white/5">
                <div className="text-center">
                  <p className="text-xs text-slate-500">Investimento</p>
                  <p className="text-sm font-bold text-white">R$ {(result.totalInvestment * (1 - proposalCustom.discount / 100)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Payback</p>
                  <p className="text-sm font-bold text-lime-400">{result.paybackYears} anos</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Economia/ano</p>
                  <p className="text-sm font-bold text-lime-400">R$ {result.annualSavings.toLocaleString('pt-BR')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Nome do Cliente</label>
                  <input type="text" value={proposalCustom.clientName}
                    onChange={e => setProposalCustom(p => ({ ...p, clientName: e.target.value }))}
                    placeholder="João Silva"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-lime-500 transition-colors placeholder-slate-600" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Telefone</label>
                  <input type="text" value={proposalCustom.clientPhone}
                    onChange={e => setProposalCustom(p => ({ ...p, clientPhone: e.target.value }))}
                    placeholder="(82) 99999-9999"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-lime-500 transition-colors placeholder-slate-600" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Desconto (%)</label>
                  <input type="number" min="0" max="30" step="0.5" value={proposalCustom.discount}
                    onChange={e => setProposalCustom(p => ({ ...p, discount: Number(e.target.value) }))}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-lime-500 transition-colors font-bold" />
                  {proposalCustom.discount > 0 && (
                    <p className="text-xs text-lime-400 mt-1">Valor final: R$ {(result.totalInvestment * (1 - proposalCustom.discount / 100)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Validade (dias)</label>
                  <input type="number" min="1" max="90" value={proposalCustom.validityDays}
                    onChange={e => setProposalCustom(p => ({ ...p, validityDays: Number(e.target.value) }))}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-lime-500 transition-colors font-bold" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Observações / Condições</label>
                <textarea rows={3} value={proposalCustom.notes}
                  onChange={e => setProposalCustom(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Ex: Inclui instalação, cabeamento e projeto de engenharia. Frete grátis para Maceió..."
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-lime-500 transition-colors placeholder-slate-600 resize-none" />
              </div>

              {/* Payment summary preview */}
              <div className="p-4 bg-zinc-900/60 rounded-xl border border-white/5 space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Formas de Pagamento na Proposta</p>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">À Vista</span>
                  <span className="text-lime-400 font-bold">R$ {(result.totalInvestment * (1 - proposalCustom.discount / 100)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                </div>
                {isFinanced && result.monthlyPayment && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Financiamento ({loanTerm}x)</span>
                    <span className="text-blue-400 font-bold">R$ {result.monthlyPayment.toLocaleString('pt-BR')}/mês</span>
                  </div>
                )}
                {isCreditCard && [6, 12, 18].filter(n => n <= cardInstallments).map(n => {
                  const rate = cardInterestRate / 100;
                  const pmt = rate === 0 ? result.totalInvestment / n
                    : result.totalInvestment * (rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1);
                  return (
                    <div key={n} className="flex justify-between text-sm">
                      <span className="text-slate-400">Cartão {n}x</span>
                      <span className="text-yellow-400 font-bold">R$ {Math.round(pmt).toLocaleString('pt-BR')}/mês</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-6 border-t border-white/5 flex gap-3">
              <button onClick={() => setShowProposalModal(false)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-slate-300 rounded-xl text-sm font-medium transition-colors">
                Cancelar
              </button>
              <button onClick={generatePDF} disabled={isGeneratingPDF}
                className="flex-1 py-3 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
                {isGeneratingPDF ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} 
                {isGeneratingPDF ? 'Renderizando PDF...' : 'Baixar PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calculator;