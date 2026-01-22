import React, { useState, useEffect } from 'react';
import { Calculator as CalcIcon, Sun, Zap, FileText, MapPin, AlertTriangle, TrendingUp, Info, Leaf, Trees, DollarSign, Settings2, Package, Gauge, Check, UserPlus, ArrowRight, BarChart3, PiggyBank } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, ComposedChart, Area, Cell, AreaChart } from 'recharts';
import { CityData, SolarSystemResult } from '../types';
import { useApp } from '../contexts/AppContext';
import { jsPDF } from 'jspdf';
import { useNavigate } from 'react-router-dom';

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
  
  const [inverterPower, setInverterPower] = useState<number>(8); 
  const [azimuthLoss, setAzimuthLoss] = useState<number>(0); 
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  
  const [isFinanced, setIsFinanced] = useState<boolean>(false);
  const [downPayment, setDownPayment] = useState<number>(0);
  const [interestRate, setInterestRate] = useState<number>(1.49); 
  const [loanTerm, setLoanTerm] = useState<number>(60); 

  const [energyInflation, setEnergyInflation] = useState<number>(6); 
  const [panelDegradation, setPanelDegradation] = useState<number>(0.7); 

  const [result, setResult] = useState<SolarSystemResult | null>(null);
  const [cashFlowData, setCashFlowData] = useState<any[]>([]);
  const [generationData, setGenerationData] = useState<any[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);

  const [isSavingToCRM, setIsSavingToCRM] = useState(false);

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
  }, [consumption, selectedCity, inverterPower, tariff, azimuthLoss, isFinanced, downPayment, interestRate, loanTerm, selectedModuleId, energyInflation, panelDegradation]);

  const calculateSystem = () => {
    const city = CITIES.find(c => c.name === selectedCity) || CITIES[0];
    const selectedModule = products.find(p => p.id === selectedModuleId);
    const modulePowerW = selectedModule?.power || DEFAULT_MODULE_POWER;
    
    const adjustedPR = BASE_PERFORMANCE_RATIO * (1 - (azimuthLoss / 100));
    const requiredPowerKw = consumption / (city.hsp * 30 * adjustedPR);
    const modulesCount = Math.ceil((requiredPowerKw * 1000) / modulePowerW);
    const installedPowerKw = (modulesCount * modulePowerW) / 1000;
    const oversizing = installedPowerKw / inverterPower;
    
    let costPerKwp = 3800;
    if (installedPowerKw > 4) costPerKwp = 3400;
    if (installedPowerKw > 10) costPerKwp = 2900;
    if (installedPowerKw > 30) costPerKwp = 2600;
    if (installedPowerKw > 75) costPerKwp = 2400; 

    const totalInvestment = installedPowerKw * costPerKwp;

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
    const doc = new jsPDF();

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
    doc.text('PROPOSTA COMERCIAL', 20, 35);
    doc.setTextColor(150, 150, 150);
    doc.text(`Cliente: ${clientName || 'Consumidor'} | ${selectedCity} - ${city?.state}`, 20, 45);

    // Visual Line
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.1);
    doc.line(20, 55, 190, 55);

    let y = 70;
    const addLine = (label: string, value: string, isHighlight = false) => {
      doc.setTextColor(180, 180, 180);
      doc.setFontSize(12);
      doc.text(label, 20, y);
      doc.setTextColor(isHighlight ? 132 : 255, isHighlight ? 204 : 255, isHighlight ? 22 : 255);
      doc.setFont("helvetica", "bold");
      doc.text(value, 140, y, { align: 'right' });
      y += 10;
    };

    addLine("Potência do Sistema", `${result.systemSizeKw} kWp`);
    addLine("Produção Estimada", `${result.monthlyGeneration} kWh/mês`);
    addLine("Economia Anual", `R$ ${result.annualSavings.toLocaleString('pt-BR')}`, true);
    addLine("Investimento Total", `R$ ${result.totalInvestment.toLocaleString('pt-BR')}`);
    addLine("Retorno (Payback)", `${result.paybackYears} Anos`);
    
    y += 10;
    if (result.financed) {
       doc.setTextColor(59, 130, 246);
       doc.text("Plano de Financiamento", 20, y);
       y += 10;
       addLine("Parcela Mensal", `R$ ${result.monthlyPayment?.toLocaleString('pt-BR')}`);
       addLine("Taxa Estimada", `${interestRate}% a.m.`);
    }

    y += 20;
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(20, y, 170, 40, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("Impacto Ambiental (25 Anos)", 30, y + 15);
    doc.setFontSize(10);
    doc.text(`Evitará ${result.co2SavedTons} toneladas de CO2, o equivalente a`, 30, y + 25);
    doc.text(`plantar ${result.treesPlanted} árvores.`, 30, y + 30);

    doc.save(`Proposta_Solar_${selectedCity}.pdf`);
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
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-enter pb-20">
      
      {/* --- LEFT COLUMN: CONTROLS --- */}
      <div className="xl:col-span-4 space-y-6">
        
        {/* 1. Basic Parameters */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-lime-500/10 rounded-lg text-lime-400"><Sun size={20} /></div>
            <h2 className="text-base font-bold text-white">Parâmetros do Projeto</h2>
          </div>

          <div className="space-y-4">
             {/* Nome Cliente */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Cliente (Opcional)</label>
              <input 
                  type="text" 
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nome do Cliente"
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-lime-500 outline-none"
                />
            </div>

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
                   {products.filter(p => p.category === 'Módulo').length === 0 && (
                     <option value="default">Genérico 550W</option>
                   )}
                 </select>
                 <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
               </div>
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

        {/* 2. Financing Simulator */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden transition-all hover:border-blue-500/30">
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
            </div>
          )}
        </div>

        {/* 3. Advanced Technical Toggle */}
        <div className="glass-panel p-4 rounded-xl border border-white/5">
             <div className="flex items-center justify-between cursor-pointer group" onClick={() => {
                const el = document.getElementById('advanced-settings');
                if(el) el.classList.toggle('hidden');
             }}>
                 <div className="flex items-center gap-2">
                    <Settings2 size={16} className="text-slate-500 group-hover:text-white" />
                    <span className="text-xs font-bold text-slate-500 uppercase group-hover:text-white transition-colors">Avançado (Perdas)</span>
                 </div>
                 <ArrowRight size={14} className="text-slate-600" />
             </div>
             <div id="advanced-settings" className="hidden mt-4 space-y-4 animate-enter pt-4 border-t border-white/5">
                <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-2">
                       <span>Perda por Azimute</span>
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
                     <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Inflação (%)</label>
                     <input type="number" step="0.5" value={energyInflation} onChange={(e) => setEnergyInflation(Number(e.target.value))} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white outline-none"/>
                  </div>
                  <div>
                     <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Degradação (%)</label>
                     <input type="number" step="0.1" value={panelDegradation} onChange={(e) => setPanelDegradation(Number(e.target.value))} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white outline-none"/>
                  </div>
                </div>
             </div>
        </div>

        {result && (
          <div className="space-y-3 pt-2">
             <button 
               onClick={generatePDF}
               className="w-full py-4 rounded-xl bg-white text-black font-bold text-sm transition-all flex justify-center items-center gap-2 hover:bg-zinc-200"
             >
               <FileText size={18} /> Gerar PDF da Proposta
             </button>
             
             <button 
               onClick={handleSaveToCRM}
               disabled={isSavingToCRM}
               className="w-full py-4 rounded-xl bg-lime-500 text-black font-bold text-sm transition-all flex justify-center items-center gap-2 hover:bg-lime-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {isSavingToCRM ? <Check size={18} /> : <UserPlus size={18} />}
               {isSavingToCRM ? 'Salvo no CRM!' : 'Salvar Oportunidade'}
             </button>
          </div>
        )}
      </div>

      {/* --- RIGHT COLUMN: RESULTS VISUALIZATION --- */}
      <div className="xl:col-span-8 space-y-6">
         {result ? (
           <>
             {/* 1. THE KILLER FEATURE: Bill Comparison Chart */}
             <div className="glass-panel p-8 rounded-2xl border-t-4 border-lime-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                   <PiggyBank size={120} className="text-lime-500" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                   <div>
                      <h3 className="text-2xl font-bold text-white mb-2">Economia Mensal</h3>
                      <p className="text-slate-400 text-sm mb-6">Comparativo estimado entre sua fatura atual e o cenário com Energia Solar.</p>
                      
                      <div className="flex items-end gap-2 mb-2">
                        <span className="text-4xl font-display font-bold text-lime-400">R$ {result.monthlySavings.toLocaleString()}</span>
                        <span className="text-sm text-lime-500/80 font-bold mb-1.5">Economizados / Mês</span>
                      </div>
                      <p className="text-xs text-slate-500">Média anualizada considerando inflação energética.</p>

                      {isFinanced && (
                        <div className="mt-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                           <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-blue-300 font-bold uppercase">Parcela Financiamento</span>
                              <span className="text-white font-bold">R$ {result.monthlyPayment?.toLocaleString()}</span>
                           </div>
                           <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-400">Investimento Inicial</span>
                              <span className="text-slate-300">R$ {downPayment.toLocaleString()}</span>
                           </div>
                        </div>
                      )}
                   </div>

                   <div className="h-[250px] w-full bg-zinc-900/50 rounded-xl p-4 border border-white/5">
                      <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={comparisonData} layout="vertical" barSize={40}>
                           <XAxis type="number" hide />
                           <YAxis dataKey="name" type="category" width={100} tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} />
                           <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} formatter={(val: number) => `R$ ${val.toLocaleString()}`}/>
                           <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                             {comparisonData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.fill} />
                             ))}
                           </Bar>
                         </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>
             </div>

             {/* 2. Key Stats Grid */}
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel p-4 rounded-xl">
                   <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Investimento</p>
                   <p className="text-xl font-display font-bold text-white">R$ {(result.totalInvestment/1000).toFixed(1)}k</p>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                   <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Payback</p>
                   <p className="text-xl font-display font-bold text-lime-400">{result.paybackYears} <span className="text-sm text-slate-500">Anos</span></p>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                   <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Geração</p>
                   <p className="text-xl font-display font-bold text-white">{result.monthlyGeneration} <span className="text-xs text-slate-500">kWh</span></p>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                   <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">ROI (25 Anos)</p>
                   <p className="text-xl font-display font-bold text-white">{result.roi25Years}%</p>
                </div>
             </div>

             {/* 3. Cash Flow Chart */}
             <div className="glass-panel p-6 rounded-2xl h-[350px]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp size={16} className="text-lime-400" />
                    Fluxo de Caixa Acumulado
                  </h3>
                  <div className="flex gap-4 text-xs">
                     <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-lime-500"></div>Saldo Solar</div>
                     <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div>Custo Grid (Sem Solar)</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height="85%">
                  <AreaChart data={cashFlowData}>
                    <defs>
                      <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#84cc16" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#84cc16" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="year" stroke="#64748b" tickLine={false} axisLine={false} fontSize={10} />
                    <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={10} tickFormatter={(val) => `R$${val/1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                      formatter={(value: any) => [`R$ ${value.toLocaleString()}`, '']}
                    />
                    <Area type="monotone" dataKey="balance" name="Saldo Acumulado" stroke="#84cc16" fill="url(#colorBalance)" strokeWidth={2} />
                    <Line type="monotone" dataKey="cumulativeGridCost" name="Custo Grid" stroke="#ef4444" strokeDasharray="3 3" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
             </div>

             {/* 4. Generation vs Consumption */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel p-6 rounded-2xl h-[300px]">
                   <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-wider">Sazonalidade</h3>
                   <ResponsiveContainer width="100%" height="85%">
                     <BarChart data={generationData}>
                       <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                       <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                       <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                       <Bar dataKey="generation" name="Geração" fill="#84cc16" radius={[4,4,0,0]} />
                       <Line type="monotone" dataKey="consumption" name="Consumo" stroke="#3b82f6" strokeWidth={2} dot={false} />
                     </BarChart>
                   </ResponsiveContainer>
                </div>

                <div className="glass-panel p-6 rounded-2xl flex flex-col justify-center relative overflow-hidden bg-green-900/5">
                   <h3 className="text-xs font-bold text-white mb-6 uppercase tracking-wider relative z-10">Impacto ESG</h3>
                   <div className="space-y-6 relative z-10">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                            <Leaf size={20} />
                         </div>
                         <div>
                            <p className="text-2xl font-display font-bold text-white">{result.co2SavedTons}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Ton. CO₂ evitadas</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <Trees size={20} />
                         </div>
                         <div>
                            <p className="text-2xl font-display font-bold text-white">{result.treesPlanted}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Árvores plantadas</p>
                         </div>
                      </div>
                   </div>
                   <Leaf className="absolute -right-6 -bottom-6 text-green-500/5" size={150} />
                </div>
             </div>
           </>
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
    </div>
  );
};

export default Calculator;