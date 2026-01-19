import React, { useState, useEffect } from 'react';
import { Calculator as CalcIcon, Sun, Zap, FileText, MapPin, AlertTriangle, TrendingUp, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { jsPDF } from 'jspdf';
import { CityData, SolarSystemResult } from '../types';

// Dados geoespaciais completos de Alagoas
// HSP (Horas de Sol Pleno) aproximado para a região Nordeste/Alagoas
const ALAGOAS_HSP = 5.25; 
const ALAGOAS_TARIFF = 0.98;

const CITIES: CityData[] = [
  { name: 'Maceió', state: 'AL', hsp: 5.35, tariff: ALAGOAS_TARIFF },
  { name: 'Arapiraca', state: 'AL', hsp: 5.40, tariff: ALAGOAS_TARIFF },
  { name: 'Rio Largo', state: 'AL', hsp: 5.30, tariff: ALAGOAS_TARIFF },
  { name: 'Palmeira dos Índios', state: 'AL', hsp: 5.25, tariff: ALAGOAS_TARIFF },
  { name: 'União dos Palmares', state: 'AL', hsp: 5.20, tariff: ALAGOAS_TARIFF },
  { name: 'Penedo', state: 'AL', hsp: 5.35, tariff: ALAGOAS_TARIFF },
  { name: 'São Miguel dos Campos', state: 'AL', hsp: 5.30, tariff: ALAGOAS_TARIFF },
  { name: 'Campo Alegre', state: 'AL', hsp: 5.25, tariff: ALAGOAS_TARIFF },
  { name: 'Coruripe', state: 'AL', hsp: 5.40, tariff: ALAGOAS_TARIFF },
  { name: 'Marechal Deodoro', state: 'AL', hsp: 5.35, tariff: ALAGOAS_TARIFF },
  { name: 'Delmiro Gouveia', state: 'AL', hsp: 5.50, tariff: ALAGOAS_TARIFF },
  { name: 'Santana do Ipanema', state: 'AL', hsp: 5.45, tariff: ALAGOAS_TARIFF },
  { name: 'Atalaia', state: 'AL', hsp: 5.25, tariff: ALAGOAS_TARIFF },
  { name: 'Teotônio Vilela', state: 'AL', hsp: 5.30, tariff: ALAGOAS_TARIFF },
  { name: 'Girau do Ponciano', state: 'AL', hsp: 5.35, tariff: ALAGOAS_TARIFF },
  { name: 'Pilar', state: 'AL', hsp: 5.30, tariff: ALAGOAS_TARIFF },
  { name: 'São Sebastião', state: 'AL', hsp: 5.30, tariff: ALAGOAS_TARIFF },
  { name: 'Maragogi', state: 'AL', hsp: 5.40, tariff: ALAGOAS_TARIFF },
  { name: 'São José da Tapera', state: 'AL', hsp: 5.45, tariff: ALAGOAS_TARIFF },
  { name: 'Boca da Mata', state: 'AL', hsp: 5.25, tariff: ALAGOAS_TARIFF },
  { name: 'Murici', state: 'AL', hsp: 5.20, tariff: ALAGOAS_TARIFF },
  { name: 'Porto Calvo', state: 'AL', hsp: 5.30, tariff: ALAGOAS_TARIFF },
  { name: 'Viçosa', state: 'AL', hsp: 5.20, tariff: ALAGOAS_TARIFF },
  { name: 'Pão de Açúcar', state: 'AL', hsp: 5.55, tariff: ALAGOAS_TARIFF },
  { name: 'Igaci', state: 'AL', hsp: 5.30, tariff: ALAGOAS_TARIFF },
  { name: 'Mata Grande', state: 'AL', hsp: 5.40, tariff: ALAGOAS_TARIFF },
  { name: 'Piranhas', state: 'AL', hsp: 5.60, tariff: ALAGOAS_TARIFF },
].sort((a, b) => a.name.localeCompare(b.name));

const MODULE_POWER = 550; // Wp
const MODULE_AREA = 2.27; // m2
const PERFORMANCE_RATIO = 0.78; // 78% global efficiency

const Calculator: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState<string>('Maceió');
  const [consumption, setConsumption] = useState<number>(800);
  const [inverterPower, setInverterPower] = useState<number>(5); // kW
  const [result, setResult] = useState<SolarSystemResult | null>(null);
  const [roiData, setRoiData] = useState<any[]>([]);

  // Engineering Core Logic
  useEffect(() => {
    calculateSystem();
  }, [consumption, selectedCity, inverterPower]);

  const calculateSystem = () => {
    const city = CITIES.find(c => c.name === selectedCity) || CITIES[0];
    
    // 1. Required System Size (kWp)
    const requiredPowerKw = consumption / (city.hsp * 30 * PERFORMANCE_RATIO);
    
    // 2. Module Configuration
    const modulesCount = Math.ceil((requiredPowerKw * 1000) / MODULE_POWER);
    const installedPowerKw = (modulesCount * MODULE_POWER) / 1000;
    
    // 3. Oversizing Check
    const oversizing = installedPowerKw / inverterPower;
    
    // 4. Financial Base
    const costPerKwp = installedPowerKw < 4 ? 3800 : installedPowerKw < 10 ? 3200 : 2900;
    const totalInvestment = installedPowerKw * costPerKwp;

    // 5. Advanced Cash Flow (Fluxo de Caixa)
    // Variáveis Econômicas
    const tariffInflation = 1.06; // 6% a.a. inflação energética
    const panelDegradation = 0.007; // 0.7% a.a. perda de eficiência
    const maintenanceCostYear12 = totalInvestment * 0.35; // Troca de inversor no ano 12

    const cashFlow = [];
    let cumulativeBalance = -totalInvestment; // Saldo Acumulado começa negativo (Investimento)
    let currentTariff = city.tariff;
    let currentGeneration = installedPowerKw * city.hsp * 30 * PERFORMANCE_RATIO;
    let paybackYear = 0;

    // Ano 0
    cashFlow.push({
      year: 0,
      balance: -totalInvestment,
      economy: 0,
      cumulativeGridCost: 0
    });

    let cumulativeGridCost = 0; // O que gastaria sem solar

    for (let year = 1; year <= 25; year++) {
      // Degradação do painel afeta geração
      const efficiencyFactor = 1 - ((year - 1) * panelDegradation);
      const yearGeneration = currentGeneration * efficiencyFactor * 12;
      
      // Economia gerada no ano
      const yearSavings = yearGeneration * currentTariff;
      
      // Custo do que pagaria à concessionária (para comparativo)
      const yearGridCost = (consumption * 12) * currentTariff;
      cumulativeGridCost -= yearGridCost;

      // Despesas de Manutenção (O&M)
      let opex = 0;
      if (year === 12) opex = maintenanceCostYear12;

      // Fluxo de Caixa Livre do Ano
      const freeCashFlow = yearSavings - opex;
      
      // Atualiza Saldo Acumulado
      const previousBalance = cumulativeBalance;
      cumulativeBalance += freeCashFlow;

      // Detecta Payback
      if (previousBalance < 0 && cumulativeBalance >= 0) {
        paybackYear = year + (Math.abs(previousBalance) / freeCashFlow);
      }

      cashFlow.push({
        year,
        balance: Math.floor(cumulativeBalance),
        economy: Math.floor(yearSavings),
        cumulativeGridCost: Math.floor(cumulativeGridCost)
      });

      // Inflaciona tarifa para o próximo ano
      currentTariff *= tariffInflation;
    }

    const firstYearGeneration = installedPowerKw * city.hsp * 30 * PERFORMANCE_RATIO;
    const firstYearSavings = firstYearGeneration * city.tariff * 12;
    const monthlySavings = firstYearGeneration * city.tariff;
    
    // ROI Simples (Lucro Total / Investimento)
    const totalProfit25Years = cumulativeBalance; // Já desconta o investimento inicial pois começa negativo
    const roi25 = (totalProfit25Years / totalInvestment) * 100;

    setResult({
      systemSizeKw: Number(installedPowerKw.toFixed(2)),
      modulesCount,
      inverterSizeKw: inverterPower,
      oversizingFactor: Number(oversizing.toFixed(2)),
      areaM2: Number((modulesCount * MODULE_AREA).toFixed(1)),
      monthlyGeneration: Math.floor(firstYearGeneration),
      monthlySavings: Math.floor(monthlySavings),
      annualSavings: Math.floor(firstYearSavings),
      paybackYears: Number(paybackYear.toFixed(1)),
      totalInvestment: Math.floor(totalInvestment),
      roi25Years: Math.floor(roi25)
    });

    setRoiData(cashFlow);
  };

  const generatePDF = () => {
    if (!result) return;
    const city = CITIES.find(c => c.name === selectedCity);
    const doc = new (window as any).jspdf.jsPDF();

    // Modern Header
    doc.setFillColor(5, 11, 20);
    doc.rect(0, 0, 210, 297, 'F'); // Dark Background
    
    // Brand Header
    doc.setFillColor(132, 204, 22);
    doc.rect(0, 0, 210, 6, 'F'); // Lime Top Bar
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text('QUARK ENERGIA', 20, 30);
    doc.setFontSize(10);
    doc.setTextColor(132, 204, 22);
    doc.text('SOLUÇÕES EM ENERGIA', 20, 35);
    doc.setTextColor(150, 150, 150);
    doc.text(`Proposta Técnica para ${selectedCity} - ${city?.state}`, 20, 45);

    // Summary Cards
    const drawCard = (x: number, y: number, label: string, value: string) => {
      doc.setDrawColor(50, 50, 50);
      doc.setFillColor(20, 30, 50);
      doc.roundedRect(x, y, 50, 30, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setTextColor(180, 180, 180);
      doc.text(label, x + 5, y + 10);
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(value, x + 5, y + 22);
    };

    drawCard(20, 60, "Potência Pico", `${result.systemSizeKw} kWp`);
    drawCard(80, 60, "Geração Mensal", `${result.monthlyGeneration} kWh`);
    drawCard(140, 60, "Economia Anual", `R$ ${result.annualSavings.toLocaleString('pt-BR')}`);

    // Technical Details
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('Especificações de Engenharia', 20, 110);
    
    doc.setDrawColor(132, 204, 22);
    doc.line(20, 115, 60, 115);

    doc.setFontSize(11);
    doc.setTextColor(200, 200, 200);
    doc.setFont("helvetica", "normal");
    const techLines = [
      `Localidade: ${selectedCity} (HSP: ${city?.hsp})`,
      `Módulos: ${result.modulesCount}x 550W Monocristalino PERC`,
      `Área de Telhado: ${result.areaM2} m²`,
      `Inversor Selecionado: ${inverterPower} kW`,
      `Fator de Oversizing (CC/CA): ${result.oversizingFactor}x`,
      `Performance Ratio Adotado: ${(PERFORMANCE_RATIO * 100)}%`
    ];

    let yPos = 130;
    techLines.forEach(line => {
      doc.text(`• ${line}`, 25, yPos);
      yPos += 10;
    });

    // Investment
    doc.setFillColor(30, 40, 60);
    doc.roundedRect(20, 200, 170, 50, 3, 3, 'F');
    doc.setFontSize(14);
    doc.setTextColor(132, 204, 22);
    doc.text('Investimento Total Estimado', 30, 215);
    doc.setFontSize(28);
    doc.setTextColor(255, 255, 255);
    doc.text(`R$ ${result.totalInvestment.toLocaleString('pt-BR')}`, 30, 230);
    doc.setFontSize(10);
    doc.setTextColor(180, 180, 180);
    doc.text(`Payback estimado em ${result.paybackYears} anos`, 30, 240);

    doc.save(`Proposta_Quark_${selectedCity}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-enter">
      {/* Left Panel: Inputs */}
      <div className="xl:col-span-4 space-y-6">
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-lime-500/10 rounded-lg text-lime-400">
              <Sun size={24} />
            </div>
            <div>
              <h2 className="text-lg font-display font-bold text-white">Parâmetros do Projeto</h2>
              <p className="text-xs text-slate-400">Dados base para dimensionamento</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Localidade (Alagoas)</label>
              <div className="relative">
                <select 
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3.5 pl-10 text-white text-sm focus:border-lime-500 outline-none appearance-none custom-scrollbar"
                >
                  {CITIES.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Consumo Mensal (kWh)</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={consumption}
                  onChange={(e) => setConsumption(Number(e.target.value))}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3.5 pl-10 text-white text-sm font-display font-semibold focus:border-lime-500 outline-none"
                />
                <Zap className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                 <label className="block text-xs font-semibold text-slate-400 uppercase">Potência do Inversor (kW)</label>
                 {result && (
                   <span className={`text-xs font-bold px-2 py-0.5 rounded ${result.oversizingFactor > 1.35 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                     Oversizing: {result.oversizingFactor}x
                   </span>
                 )}
              </div>
              <input 
                type="number"
                step="0.5"
                value={inverterPower}
                onChange={(e) => setInverterPower(Number(e.target.value))}
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3.5 text-white text-sm font-display font-semibold focus:border-lime-500 outline-none"
              />
              {result && result.oversizingFactor > 1.35 && (
                <div className="flex items-center gap-2 mt-2 text-xs text-red-400">
                  <AlertTriangle size={12} />
                  <span>Atenção: Sobrecarga acima de 35% recomendada apenas com análise detalhada.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {result && (
            <div className="glass-panel p-6 rounded-2xl bg-gradient-to-br from-lime-900/10 to-transparent border border-lime-500/20">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-lime-400" />
                Viabilidade Financeira
              </h3>
              <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Investimento Estimado</span>
                    <span className="text-white font-bold font-display">R$ {result.totalInvestment.toLocaleString('pt-BR')}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Economia Anual (Ano 1)</span>
                    <span className="text-lime-400 font-bold font-display">R$ {result.annualSavings.toLocaleString('pt-BR')}</span>
                 </div>
                 <div className="h-px bg-white/10"></div>
                 <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Payback Descontado</span>
                    <span className="text-white font-bold font-display">{result.paybackYears} Anos</span>
                 </div>
              </div>
              <button 
                onClick={generatePDF}
                className="w-full mt-6 py-3 rounded-xl bg-lime-500 hover:bg-lime-400 text-black font-bold text-sm transition-all flex justify-center items-center gap-2 shadow-lg shadow-lime-500/20"
              >
                <FileText size={18} /> Exportar Proposta PDF
              </button>
            </div>
        )}
      </div>

      {/* Right Panel: Advanced Visuals */}
      <div className="xl:col-span-8 space-y-6">
        {result ? (
          <>
            {/* KPI Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="glass-panel p-4 rounded-xl border-l-4 border-l-lime-500">
                <p className="text-xs text-slate-400 mb-1">Potência Instalada</p>
                <p className="text-2xl font-display font-bold text-white">{result.systemSizeKw} <span className="text-sm font-normal text-slate-500">kWp</span></p>
              </div>
              <div className="glass-panel p-4 rounded-xl border-l-4 border-l-yellow-500">
                <p className="text-xs text-slate-400 mb-1">Geração Mensal (Média)</p>
                <p className="text-2xl font-display font-bold text-white">{result.monthlyGeneration} <span className="text-sm font-normal text-slate-500">kWh</span></p>
              </div>
              <div className="glass-panel p-4 rounded-xl border-l-4 border-l-blue-500">
                <p className="text-xs text-slate-400 mb-1">Área Necessária</p>
                <p className="text-2xl font-display font-bold text-white">{result.areaM2} <span className="text-sm font-normal text-slate-500">m²</span></p>
              </div>
            </div>

            {/* Charts */}
            <div className="glass-panel p-6 rounded-2xl h-[400px]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-semibold text-white">Fluxo de Caixa Acumulado (25 Anos)</h3>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Info size={12}/> Inflação: 6% a.a.</span>
                  <span className="flex items-center gap-1"><Info size={12}/> Degradação: 0.7% a.a.</span>
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height="85%">
                <LineChart data={roiData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="year" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} tickFormatter={(val) => `R$${val/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
                  />
                  <Legend />
                  <Line name="Saldo Acumulado (Projeto)" type="monotone" dataKey="balance" stroke="#84cc16" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                  <Line name="Gasto Acumulado com Concessionária" type="monotone" dataKey="cumulativeGridCost" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center glass-panel rounded-2xl p-12 text-center">
            <div className="w-20 h-20 bg-lime-500/10 rounded-full flex items-center justify-center mb-4 animate-pulse">
               <CalcIcon size={40} className="text-lime-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Engenharia de Precisão Alagoana</h3>
            <p className="text-slate-400 max-w-md">Selecione uma cidade de Alagoas e preencha os parâmetros para iniciar o dimensionamento técnico e financeiro.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calculator;