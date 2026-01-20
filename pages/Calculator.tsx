import React, { useState, useEffect } from 'react';
import { Calculator as CalcIcon, Sun, Zap, FileText, MapPin, AlertTriangle, TrendingUp, Info, Leaf, Trees, DollarSign, Settings2, Package, Gauge } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, ComposedChart, Area } from 'recharts';
import { CityData, SolarSystemResult } from '../types';
import { useApp } from '../contexts/AppContext';
import { jsPDF } from 'jspdf';

// Dados geoespaciais completos de Alagoas
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

const DEFAULT_MODULE_POWER = 550; // Wp fallback
const MODULE_AREA = 2.27; // m2
const BASE_PERFORMANCE_RATIO = 0.78; // 78% global efficiency

// Seasonality Factors (Simplified for Northeast Brazil - fairly constant but slight dip in winter)
const MONTHLY_YIELD_FACTOR = [1.05, 1.02, 1.0, 0.95, 0.90, 0.85, 0.88, 0.95, 1.0, 1.05, 1.08, 1.06];
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const Calculator: React.FC = () => {
  const { products } = useApp();
  
  // --- Basic Inputs ---
  const [selectedCity, setSelectedCity] = useState<string>('Maceió');
  const [consumption, setConsumption] = useState<number>(1200);
  const [tariff, setTariff] = useState<number>(0.98);
  
  // --- Technical Inputs ---
  const [inverterPower, setInverterPower] = useState<number>(8); // kW
  const [azimuthLoss, setAzimuthLoss] = useState<number>(0); // 0% loss (Norte)
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  
  // --- Financing Inputs ---
  const [isFinanced, setIsFinanced] = useState<boolean>(false);
  const [downPayment, setDownPayment] = useState<number>(0);
  const [interestRate, setInterestRate] = useState<number>(1.49); // % a.m.
  const [loanTerm, setLoanTerm] = useState<number>(60); // months

  // --- Advanced Economic Inputs ---
  const [energyInflation, setEnergyInflation] = useState<number>(6); // % annual inflation
  const [panelDegradation, setPanelDegradation] = useState<number>(0.7); // % annual loss

  // --- Outputs ---
  const [result, setResult] = useState<SolarSystemResult | null>(null);
  const [cashFlowData, setCashFlowData] = useState<any[]>([]);
  const [generationData, setGenerationData] = useState<any[]>([]);

  useEffect(() => {
    // Reset defaults when city changes if tariff wasn't manually edited strongly
    const city = CITIES.find(c => c.name === selectedCity);
    if (city) setTariff(city.tariff);
  }, [selectedCity]);

  // Set default module if available and none selected
  useEffect(() => {
    if (products.length > 0 && !selectedModuleId) {
      const panel = products.find(p => p.category === 'Módulo');
      if (panel) setSelectedModuleId(panel.id);
    }
  }, [products]);

  useEffect(() => {
    calculateSystem();
  }, [consumption, selectedCity, inverterPower, tariff, azimuthLoss, isFinanced, downPayment, interestRate, loanTerm, selectedModuleId, energyInflation, panelDegradation]);

  const calculateSystem = () => {
    const city = CITIES.find(c => c.name === selectedCity) || CITIES[0];
    
    // Get Selected Module Data
    const selectedModule = products.find(p => p.id === selectedModuleId);
    const modulePowerW = selectedModule?.power || DEFAULT_MODULE_POWER;
    
    // 1. Efficiency Adjustments
    // Azimuth/Tilt losses reduce the Performance Ratio
    const adjustedPR = BASE_PERFORMANCE_RATIO * (1 - (azimuthLoss / 100));

    // 2. Required System Size (kWp)
    const requiredPowerKw = consumption / (city.hsp * 30 * adjustedPR);
    
    // 3. Module Configuration
    const modulesCount = Math.ceil((requiredPowerKw * 1000) / modulePowerW);
    const installedPowerKw = (modulesCount * modulePowerW) / 1000;
    
    // 4. Oversizing
    const oversizing = installedPowerKw / inverterPower;
    
    // 5. CAPEX (Investment)
    // Economy of scale pricing OR dynamic product pricing
    // For simplicity in this robust calculator, we'll keep the scale logic but allow it to be influenced 
    // effectively by market rates (you could enhance this to sum up selected products)
    let costPerKwp = 3800;
    if (installedPowerKw > 4) costPerKwp = 3400;
    if (installedPowerKw > 10) costPerKwp = 2900;
    if (installedPowerKw > 30) costPerKwp = 2600;
    if (installedPowerKw > 75) costPerKwp = 2400; // Enterprise level

    const totalInvestment = installedPowerKw * costPerKwp;

    // 6. Financing Calculation (Price Table)
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

    // 7. Cash Flow Analysis
    const tariffInflationFactor = 1 + (energyInflation / 100);
    const degradationFactor = panelDegradation / 100;
    const maintenanceCostYear12 = totalInvestment * 0.35; // Inverter replacement

    const cashFlow = [];
    let cumulativeBalance = isFinanced ? -downPayment : -totalInvestment;
    let currentTariff = tariff;
    let currentGenerationMonthlyAvg = installedPowerKw * city.hsp * 30 * adjustedPR;
    
    let cumulativeGridCost = 0;
    let paybackYear = 0;

    // Year 0
    cashFlow.push({
      year: 0,
      balance: Math.floor(cumulativeBalance),
      economy: 0,
      loanPayment: 0
    });

    for (let year = 1; year <= 25; year++) {
      // Degraded Generation
      const efficiencyFactor = 1 - ((year - 1) * degradationFactor);
      const yearGeneration = currentGenerationMonthlyAvg * efficiencyFactor * 12;
      
      // Savings
      const yearSavings = yearGeneration * currentTariff;
      
      // Avoided Cost (Grid)
      const yearGridCost = (consumption * 12) * currentTariff;
      cumulativeGridCost -= yearGridCost;

      // Expenses (O&M + Loan)
      let opex = 0;
      if (year === 12) opex += maintenanceCostYear12;
      
      let annualLoanPayment = 0;
      if (isFinanced && year <= (loanTerm / 12)) {
         annualLoanPayment = monthlyPayment * 12;
      } else if (isFinanced && year === Math.ceil(loanTerm / 12)) {
         // Partial year payment logic omitted for simplicity, assumed full year or done
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

    // 8. Environmental Impact
    const annualGen = currentGenerationMonthlyAvg * 12;
    const co2SavedTons = (annualGen * 25 * 0.4) / 1000;
    const treesPlanted = Math.floor((annualGen * 25 * 0.4) / 150); // simplified tree equivalent

    // 9. Seasonality Data
    const genData = MONTHS.map((month, idx) => ({
      name: month,
      consumption: consumption,
      generation: Math.floor(currentGenerationMonthlyAvg * MONTHLY_YIELD_FACTOR[idx])
    }));
    setGenerationData(genData);

    const roi25 = (cumulativeBalance / totalInvestment) * 100;

    setResult({
      systemSizeKw: Number(installedPowerKw.toFixed(2)),
      modulesCount,
      inverterSizeKw: inverterPower,
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

  const generatePDF = () => {
    if (!result) return;
    const city = CITIES.find(c => c.name === selectedCity);
    
    // Use the imported jsPDF class
    const doc = new jsPDF();

    // -- PDF GENERATION LOGIC (Simplified for brevity, matches existing style) --
    // Header
    doc.setFillColor(5, 11, 20);
    doc.rect(0, 0, 210, 297, 'F'); 
    doc.setFillColor(132, 204, 22);
    doc.rect(0, 0, 210, 6, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text('QUARK ENERGIA', 20, 30);
    doc.setFontSize(10);
    doc.setTextColor(132, 204, 22);
    doc.text('ENTERPRISE SOLUTIONS', 20, 35);
    doc.setTextColor(150, 150, 150);
    doc.text(`Relatório Técnico-Financeiro: ${selectedCity} - ${city?.state}`, 20, 45);

    // Results Box
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.1);
    doc.line(20, 55, 190, 55);

    let y = 70;
    const addLine = (label: string, value: string) => {
      doc.setTextColor(180, 180, 180);
      doc.setFontSize(12);
      doc.text(label, 20, y);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(value, 140, y, { align: 'right' });
      y += 10;
    };

    addLine("Potência do Sistema", `${result.systemSizeKw} kWp`);
    addLine("Produção Média Mensal", `${result.monthlyGeneration} kWh`);
    addLine("Economia Anual Estimada", `R$ ${result.annualSavings.toLocaleString('pt-BR')}`);
    addLine("Investimento CAPEX", `R$ ${result.totalInvestment.toLocaleString('pt-BR')}`);
    
    y += 10;
    if (result.financed) {
       doc.setTextColor(132, 204, 22);
       doc.text("Cenário Financiado", 20, y);
       y += 10;
       addLine("Parcela Mensal", `R$ ${result.monthlyPayment?.toLocaleString('pt-BR')}`);
       addLine("Custo Total Financiamento", `R$ ${result.totalFinancingCost?.toLocaleString('pt-BR')}`);
    }

    y += 10;
    doc.setTextColor(59, 130, 246); // Blue for ESG
    doc.text("Impacto ESG (25 Anos)", 20, y);
    y += 10;
    addLine("CO2 Evitado", `${result.co2SavedTons} Toneladas`);
    addLine("Árvores Equivalentes", `${result.treesPlanted} Árvores`);

    doc.save(`Quark_Enterprise_${selectedCity}.pdf`);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-enter pb-20">
      
      {/* --- LEFT COLUMN: CONTROLS --- */}
      <div className="xl:col-span-4 space-y-6">
        
        {/* 1. Basic Parameters */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-lime-500/10 rounded-lg text-lime-400"><Sun size={20} /></div>
            <h2 className="text-base font-bold text-white">Dimensionamento</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Localidade</label>
              <div className="relative">
                <select 
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-white text-sm focus:border-lime-500 outline-none appearance-none"
                >
                  {CITIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Consumo (kWh)</label>
                  <input 
                    type="number" 
                    value={consumption}
                    onChange={(e) => setConsumption(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm font-bold focus:border-lime-500 outline-none"
                  />
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tarifa (R$/kWh)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={tariff}
                    onChange={(e) => setTariff(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm font-bold focus:border-lime-500 outline-none"
                  />
               </div>
            </div>

            <div>
               <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Módulo Fotovoltaico</label>
               <div className="relative">
                 <select 
                   value={selectedModuleId}
                   onChange={(e) => setSelectedModuleId(e.target.value)}
                   className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-white text-sm focus:border-lime-500 outline-none appearance-none"
                 >
                   <option value="" disabled>Selecione um painel...</option>
                   {products.filter(p => p.category === 'Módulo').map(p => (
                     <option key={p.id} value={p.id}>{p.name} ({p.power || DEFAULT_MODULE_POWER}W)</option>
                   ))}
                   {/* Fallback if no products */}
                   {products.filter(p => p.category === 'Módulo').length === 0 && (
                     <option value="default">Genérico 550W</option>
                   )}
                 </select>
                 <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
               </div>
               {products.length === 0 && <p className="text-[10px] text-amber-500 mt-1">*Cadastre produtos em "Catálogo" para ver opções.</p>}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Inversor (kW)</label>
              <input 
                type="number"
                step="0.5"
                value={inverterPower}
                onChange={(e) => setInverterPower(Number(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm font-bold focus:border-lime-500 outline-none"
              />
               {result && result.oversizingFactor > 1.35 && (
                <div className="flex items-center gap-2 mt-2 text-xs text-amber-500 bg-amber-500/10 p-2 rounded">
                  <AlertTriangle size={12} />
                  <span>Oversizing Alto ({result.oversizingFactor}x)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Advanced Technical */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5">
           <div className="flex items-center gap-2 mb-4 cursor-pointer group">
              <Settings2 size={16} className="text-slate-500 group-hover:text-white" />
              <h3 className="text-xs font-bold text-slate-500 uppercase group-hover:text-white transition-colors">Perdas & Premissas</h3>
           </div>
           <div className="space-y-4">
             <div>
                <div className="flex justify-between text-xs text-slate-400 mb-2">
                   <span>Perda por Azimute/Inclinação</span>
                   <span className="text-white">{azimuthLoss}%</span>
                </div>
                <input 
                   type="range" min="0" max="30" step="1" 
                   value={azimuthLoss} 
                   onChange={(e) => setAzimuthLoss(Number(e.target.value))}
                   className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-lime-500"
                />
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Inflação Energética (%)</label>
                   <div className="relative">
                      <input 
                        type="number" step="0.5" 
                        value={energyInflation}
                        onChange={(e) => setEnergyInflation(Number(e.target.value))}
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2 pl-7 text-white text-xs focus:border-lime-500 outline-none"
                      />
                      <TrendingUp size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                   </div>
                </div>
                <div>
                   <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Degradação Painel (%)</label>
                   <div className="relative">
                      <input 
                        type="number" step="0.1" 
                        value={panelDegradation}
                        onChange={(e) => setPanelDegradation(Number(e.target.value))}
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2 pl-7 text-white text-xs focus:border-lime-500 outline-none"
                      />
                      <Gauge size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                   </div>
                </div>
             </div>
           </div>
        </div>

        {/* 3. Financing Simulator */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden">
          {isFinanced && <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>}
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg transition-colors ${isFinanced ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                  <DollarSign size={20} />
                </div>
                <h2 className={`text-base font-bold transition-colors ${isFinanced ? 'text-white' : 'text-slate-500'}`}>Financiamento</h2>
             </div>
             <button 
               onClick={() => setIsFinanced(!isFinanced)}
               className={`w-12 h-6 rounded-full p-1 transition-colors ${isFinanced ? 'bg-blue-600' : 'bg-slate-700'}`}
             >
               <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${isFinanced ? 'translate-x-6' : 'translate-x-0'}`}></div>
             </button>
          </div>

          {isFinanced && (
            <div className="space-y-4 animate-enter">
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Entrada (R$)</label>
                  <input 
                    type="number" 
                    value={downPayment}
                    onChange={(e) => setDownPayment(Number(e.target.value))}
                    className="w-full bg-black/40 border border-blue-500/30 rounded-xl p-3 text-white text-sm font-bold focus:border-blue-500 outline-none"
                  />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Taxa (% a.m.)</label>
                    <input 
                      type="number" step="0.01"
                      value={interestRate}
                      onChange={(e) => setInterestRate(Number(e.target.value))}
                      className="w-full bg-black/40 border border-blue-500/30 rounded-xl p-3 text-white text-sm font-bold focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Prazo (Meses)</label>
                    <input 
                      type="number" 
                      value={loanTerm}
                      onChange={(e) => setLoanTerm(Number(e.target.value))}
                      className="w-full bg-black/40 border border-blue-500/30 rounded-xl p-3 text-white text-sm font-bold focus:border-blue-500 outline-none"
                    />
                  </div>
               </div>
               {result && result.monthlyPayment && (
                 <div className="mt-4 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-center">
                    <p className="text-xs text-blue-300 uppercase font-bold mb-1">Parcela Estimada</p>
                    <p className="text-xl font-display font-bold text-white">R$ {result.monthlyPayment.toLocaleString()}</p>
                 </div>
               )}
            </div>
          )}
        </div>

        {result && (
           <button 
             onClick={generatePDF}
             className="w-full py-4 rounded-xl bg-white text-black font-bold text-sm transition-all flex justify-center items-center gap-2 hover:bg-zinc-200"
           >
             <FileText size={18} /> Gerar Proposta Enterprise
           </button>
        )}
      </div>

      {/* --- RIGHT COLUMN: RESULTS --- */}
      <div className="xl:col-span-8 space-y-6">
         {result ? (
           <>
             {/* 1. Main KPI Cards */}
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel p-4 rounded-xl border-t-2 border-lime-500">
                   <p className="text-xs text-slate-400 mb-1">Investimento</p>
                   <p className="text-lg md:text-2xl font-display font-bold text-white">R$ {(result.totalInvestment/1000).toFixed(1)}k</p>
                </div>
                <div className="glass-panel p-4 rounded-xl border-t-2 border-blue-500">
                   <p className="text-xs text-slate-400 mb-1">Geração Mês</p>
                   <p className="text-lg md:text-2xl font-display font-bold text-white">{result.monthlyGeneration} <span className="text-sm text-slate-500">kWh</span></p>
                </div>
                <div className="glass-panel p-4 rounded-xl border-t-2 border-purple-500">
                   <p className="text-xs text-slate-400 mb-1">Economia Ano 1</p>
                   <p className="text-lg md:text-2xl font-display font-bold text-white">R$ {(result.annualSavings/1000).toFixed(1)}k</p>
                </div>
                <div className="glass-panel p-4 rounded-xl border-t-2 border-orange-500">
                   <p className="text-xs text-slate-400 mb-1">Payback</p>
                   <p className="text-lg md:text-2xl font-display font-bold text-white">{result.paybackYears} <span className="text-sm text-slate-500">Anos</span></p>
                </div>
             </div>

             {/* 2. Cash Flow Chart (Crucial for Enterprise) */}
             <div className="glass-panel p-6 rounded-2xl h-[400px]">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-white">Fluxo de Caixa & ROI</h3>
                    <p className="text-xs text-slate-400">Retorno acumulado em 25 anos</p>
                  </div>
                  <div className="bg-lime-900/20 text-lime-400 px-3 py-1 rounded-full text-xs font-bold border border-lime-500/20">
                    ROI: {result.roi25Years}%
                  </div>
                </div>
                <ResponsiveContainer width="100%" height="85%">
                  <ComposedChart data={cashFlowData}>
                    <defs>
                      <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#84cc16" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#84cc16" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="year" stroke="#64748b" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={12} tickFormatter={(val) => `R$${val/1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                      formatter={(value: any) => [`R$ ${value.toLocaleString()}`, '']}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="balance" name="Saldo Acumulado" stroke="#84cc16" fill="url(#colorBalance)" strokeWidth={3} />
                    <Line type="monotone" dataKey="cumulativeGridCost" name="Custo Sem Solar (Grid)" stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
             </div>

             {/* 3. Seasonality & Production vs Consumption */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel p-6 rounded-2xl h-[300px]">
                   <h3 className="text-sm font-bold text-white mb-4">Geração Sazonal vs. Consumo</h3>
                   <ResponsiveContainer width="100%" height="85%">
                     <BarChart data={generationData}>
                       <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                       <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                       <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                       <Legend />
                       <Bar dataKey="generation" name="Geração Solar" fill="#84cc16" radius={[4,4,0,0]} />
                       <Line type="monotone" dataKey="consumption" name="Consumo" stroke="#ef4444" strokeWidth={2} dot={false} />
                     </BarChart>
                   </ResponsiveContainer>
                </div>

                {/* 4. ESG Impact */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col justify-center relative overflow-hidden">
                   {/* Background Decor */}
                   <Leaf className="absolute -right-10 -bottom-10 text-green-900/20" size={200} />
                   
                   <h3 className="text-sm font-bold text-white mb-6 relative z-10">Impacto Ambiental (25 anos)</h3>
                   
                   <div className="space-y-6 relative z-10">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                            <Leaf size={24} />
                         </div>
                         <div>
                            <p className="text-3xl font-display font-bold text-white">{result.co2SavedTons}</p>
                            <p className="text-xs text-slate-400 uppercase tracking-wider">Toneladas de CO₂ evitadas</p>
                         </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <Trees size={24} />
                         </div>
                         <div>
                            <p className="text-3xl font-display font-bold text-white">{result.treesPlanted}</p>
                            <p className="text-xs text-slate-400 uppercase tracking-wider">Árvores equivalentes</p>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
           </>
         ) : (
           <div className="h-full flex flex-col items-center justify-center glass-panel rounded-2xl p-12 text-center border border-dashed border-white/10">
             <div className="w-24 h-24 bg-lime-500/5 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <CalcIcon size={48} className="text-lime-500" />
             </div>
             <h3 className="text-2xl font-bold text-white mb-3">Simulador Enterprise</h3>
             <p className="text-slate-400 max-w-lg leading-relaxed">
               Configure os parâmetros à esquerda para gerar uma análise completa de viabilidade técnica, financeira e ambiental.
             </p>
           </div>
         )}
      </div>
    </div>
  );
};

export default Calculator;