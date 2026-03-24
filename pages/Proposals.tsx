import React, { useState, useEffect } from 'react';
import { ProposalEditor, ProposalData } from '../components/ProposalEditor';
import { FileText, Plus, ChevronRight, Calculator, Package, CheckCircle } from 'lucide-react';

const Proposals: React.FC = () => {
  const [proposals, setProposals] = useState<ProposalData[]>(() => {
    const saved = localStorage.getItem('quark_proposals');
    return saved ? JSON.parse(saved) : [];
  });

  const [step, setStep] = useState(0); // 0 = List, 1 = Form1 (Client), 2 = Form2 (Modules/Inv), 3 = Config (Value), 4 = Preview
  const [formData, setFormData] = useState<Partial<ProposalData>>({
    clientName: '',
    city: '',
    consumption: 0,
    moduleBrand: 'Jinko Solar',
    modulePower: 550,
    modulesCount: 0,
    inverterBrand: 'Growatt',
    inverterPower: 0,
    inverterCount: 1,
    pricePerModule: 0,
    priceKit: 0,
    priceCA: 0,
    taxPercentage: 15,
    profitPercentage: 20,
    additionalCosts: 0,
    finalPrice: 0,
    systemSizeKw: 0
  });

  useEffect(() => {
    localStorage.setItem('quark_proposals', JSON.stringify(proposals));
  }, [proposals]);

  const handleNextStep1 = () => {
    if (!formData.clientName || !formData.city || formData.consumption === 0) {
      alert("Preencha todos os dados básicos.");
      return;
    }
    // Calcular Potência Esperada ~= Consumo / 123 (Rendimento Base)
    const expectedPower = (formData.consumption as number) / 123;
    setFormData(prev => ({ ...prev, systemSizeKw: expectedPower }));
    setStep(2);
  };

  const handleNextStep2 = () => {
    // Calculando novo kWp baseado na placa preenchida (Placas x Potência Placa W) / 1000
    const kwpReal = ((formData.modulesCount || 0) * (formData.modulePower || 0)) / 1000;
    
    setFormData(prev => ({ ...prev, systemSizeKw: kwpReal }));
    setStep(3); // Vamos para as perguntas de preço personalizadas
  };

  const handleCalculatePrice = () => {
    const totalModules = (formData.modulesCount || 0) * (formData.pricePerModule || 0);
    const totalKit = (formData.priceKit || 0);
    const totalCA = (formData.systemSizeKw || 0) * (formData.priceCA || 0);
    
    const custoEquipamentos = totalModules + totalKit + totalCA;
    const custoTotalBase = custoEquipamentos + (formData.additionalCosts || 0);
    
    const taxFactor = (formData.taxPercentage || 0) / 100;
    const profitFactor = (formData.profitPercentage || 0) / 100;
    const totalFactor = taxFactor + profitFactor;
    
    // Formula de Markup reverso
    const safeFactor = totalFactor >= 0.95 ? 0.95 : totalFactor;
    
    const finalCalculated = custoTotalBase / (1 - safeFactor);
    
    setFormData(prev => ({ ...prev, finalPrice: finalCalculated }));
    setStep(4);
  };

  const handleSavePreview = (payload: ProposalData) => {
    setProposals([...proposals, payload]);
    setStep(0); // Volta pra lista
    setFormData({}); // Limpa
  };

  return (
    <div className="space-y-6 h-full flex flex-col animate-enter">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Propostas Comerciais</h1>
          <p className="text-slate-400 mt-1">Gere propostas super profissionais em 3 passos.</p>
        </div>
        {step === 0 && (
            <button 
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-6 py-3 bg-lime-500 text-black font-bold rounded-xl hover:bg-lime-400 transition-colors shadow-lg shadow-lime-500/20 active:scale-95"
            >
              <Plus size={20} />
              Nova Proposta
            </button>
        )}
      </div>

      {step === 0 && (
         <div className="flex-1 min-h-0 bg-zinc-900/50 rounded-2xl border border-white/5 p-6">
            {proposals.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                    <div className="w-16 h-16 bg-lime-500/10 rounded-2xl flex items-center justify-center text-lime-400 mb-6">
                        <FileText size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Nenhuma proposta gerada ainda</h3>
                    <p className="text-zinc-500 max-w-sm">Crie orçamentos premium e personalizados para seus clientes utilizando nosso Wizard exclusivo.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {proposals.reverse().map((p, idx) => (
                        <div key={idx} className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-lime-500/30 transition-colors cursor-pointer group">
                            <h4 className="font-bold text-white text-lg group-hover:text-lime-400 transition-colors uppercase">{p.clientName}</h4>
                            <p className="text-xs text-zinc-500 mb-4">{p.city}</p>
                            <div className="grid grid-cols-2 gap-2 mb-4">
                               <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                                   <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Módulos</p>
                                   <p className="text-sm font-bold text-zinc-300">{p.modulesCount} un.</p>
                               </div>
                               <div className="bg-lime-500/5 rounded-xl p-3 border border-lime-500/10">
                                   <p className="text-[10px] text-lime-600 uppercase font-bold tracking-widest mb-1">Potência</p>
                                   <p className="text-sm font-display font-bold text-lime-400">{p.systemSizeKw.toFixed(2)} kWp</p>
                               </div>
                            </div>
                            <div className="flex items-center justify-between text-xs font-bold pt-2 border-t border-white/5">
                               <span className="text-zinc-500">Valor Final</span>
                               <span className="text-white">R$ {(p.finalPrice).toLocaleString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
         </div>
      )}

      {/* WIZARD DA PROPOSTA */}
      {(step === 1 || step === 2 || step === 3) && (
          <div className="max-w-2xl mx-auto w-full mt-10">
              <div className="glass-panel p-8 md:p-12 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden animate-enter">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-lime-500/5 blur-[80px] rounded-full"></div>
                  
                  {/* Etapas Visuais */}
                  <div className="flex justify-between items-center mb-10 relative z-10">
                      {[1, 2, 3].map(i => (
                          <div key={i} className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${step === i ? 'bg-lime-500 text-black shadow-[0_0_15px_rgba(163,230,53,0.5)]' : step > i ? 'bg-zinc-800 text-lime-500 border border-lime-500/30' : 'bg-black text-zinc-600 border border-zinc-800'}`}>
                                  {step > i ? <CheckCircle size={14} /> : i}
                              </div>
                          </div>
                      ))}
                      <div className="absolute top-4 left-4 right-4 h-px bg-zinc-800 -z-10"></div>
                  </div>

                  {step === 1 && (
                      <div className="space-y-6 relative z-10 animate-enter">
                          <h3 className="text-2xl font-bold text-white mb-2">Dados do Cliente</h3>
                          <p className="text-zinc-500 text-sm mb-6">Insira os dados básicos e o consumo para iniciarmos os cálculos.</p>
                          
                          <div>
                              <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Nome / Empresa</label>
                              <input type="text" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none" placeholder="Ex: Mercado CompreBem" />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Cidade - UF</label>
                              <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none" placeholder="Ex: São Paulo - SP" />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-zinc-500 uppercase block mb-2 flex justify-between">
                                 <span>Consumo Mensal (kWh)</span>
                                 <span className="text-lime-500/50 hidden md:inline">Potência Baseada em Hsp=123</span>
                              </label>
                              <div className="relative">
                                  <input type="number" value={formData.consumption || ''} onChange={e => setFormData({...formData, consumption: Number(e.target.value)})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 pl-12 text-white font-display focus:border-lime-500 outline-none text-xl" placeholder="0" />
                                  <Calculator className="absolute left-4 top-1/2 -translate-y-1/2 text-lime-500/50" size={20} />
                              </div>
                          </div>
                          <div className="flex gap-4 mt-8">
                              <button onClick={() => setStep(0)} className="flex-1 py-4 text-zinc-500 hover:text-white transition-colors font-bold">Cancelar</button>
                              <button onClick={handleNextStep1} className="flex-1 py-4 bg-lime-500 text-black font-bold rounded-xl shadow-[0_0_20px_rgba(163,230,53,0.2)] hover:bg-lime-400 flex items-center justify-center gap-2 transition-all">
                                  Avançar <ChevronRight size={18} />
                              </button>
                          </div>
                      </div>
                  )}

                  {step === 2 && (
                      <div className="space-y-6 relative z-10 animate-enter">
                          <h3 className="text-2xl font-bold text-white mb-2">Dimensionamento</h3>
                          <div className="bg-lime-500/10 border border-lime-500/20 p-4 rounded-xl flex justify-between items-center">
                             <p className="text-sm font-bold text-lime-400">Potência Recomendada:</p>
                             <p className="text-lg font-display text-lime-400 font-bold">{formData.systemSizeKw?.toFixed(2)} kWp</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                             <div className="col-span-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Marca do Módulo</label>
                                <input type="text" value={formData.moduleBrand} onChange={e => setFormData({...formData, moduleBrand: e.target.value})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none" placeholder="Ex: Jinko Solar" />
                             </div>
                             <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Potência (W)</label>
                                <input type="number" value={formData.modulePower} onChange={e => setFormData({...formData, modulePower: Number(e.target.value)})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none" />
                             </div>
                             <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Quantidade</label>
                                <input type="number" value={formData.modulesCount || ''} onChange={e => setFormData({...formData, modulesCount: Number(e.target.value)})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none" />
                             </div>

                             <div className="col-span-2 mt-4">
                                <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Marca Inversor</label>
                                <input type="text" value={formData.inverterBrand} onChange={e => setFormData({...formData, inverterBrand: e.target.value})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none" placeholder="Ex: Growatt / Deye" />
                             </div>
                             <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Inversor (kW)</label>
                                <input type="number" value={formData.inverterPower || ''} onChange={e => setFormData({...formData, inverterPower: Number(e.target.value)})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none" />
                             </div>
                             <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Qtd Inversores</label>
                                <input type="number" value={formData.inverterCount || 1} onChange={e => setFormData({...formData, inverterCount: Number(e.target.value)})} className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none" />
                             </div>
                          </div>

                          <div className="flex gap-4 mt-8">
                              <button onClick={() => setStep(1)} className="flex-1 py-4 text-zinc-500 hover:text-white transition-colors font-bold">Voltar</button>
                              <button onClick={handleNextStep2} className="flex-1 py-4 bg-lime-500 text-black font-bold rounded-xl shadow-[0_0_20px_rgba(163,230,53,0.2)] hover:bg-lime-400 flex items-center justify-center gap-2 transition-all">
                                  Validar Sistema <ChevronRight size={18} />
                              </button>
                          </div>
                      </div>
                  )}

                  {step === 3 && (
                      <div className="space-y-6 relative z-10 animate-enter">
                          <div className="text-center mb-6">
                              <Calculator size={48} className="mx-auto text-lime-500 mb-4 opacity-80" />
                              <h3 className="text-3xl font-display font-bold text-white mb-2">Composição de Custos</h3>
                              <p className="text-zinc-400">Usina calculada: <strong className="text-lime-400">{formData.systemSizeKw?.toFixed(2)} kWp</strong> ({formData.modulesCount} módulos).</p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                              <div className="col-span-1 md:col-span-2">
                                  <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Faturamento de Kit - Distribuidor (R$)</label>
                                  <input 
                                    type="number" 
                                    value={formData.priceKit || ''} 
                                    onChange={e => setFormData({...formData, priceKit: Number(e.target.value)})} 
                                    className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none" 
                                    placeholder="Ex: 15000"
                                  />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Instalação por Módulo (R$)</label>
                                  <input 
                                    type="number" 
                                    value={formData.pricePerModule || ''} 
                                    onChange={e => setFormData({...formData, pricePerModule: Number(e.target.value)})} 
                                    className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none" 
                                    placeholder="Ex: 200"
                                  />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Material CA (R$ / kWp)</label>
                                  <input 
                                    type="number" 
                                    value={formData.priceCA || ''} 
                                    onChange={e => setFormData({...formData, priceCA: Number(e.target.value)})} 
                                    className="w-full bg-black/40 border border-zinc-800 rounded-xl p-4 text-white focus:border-lime-500 outline-none" 
                                    placeholder="Ex: 400"
                                  />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-zinc-500 uppercase block mb-2 mt-4 text-blue-400">Custos Adicionais (R$)</label>
                                  <input 
                                    type="number" 
                                    value={formData.additionalCosts || ''} 
                                    onChange={e => setFormData({...formData, additionalCosts: Number(e.target.value)})} 
                                    className="w-full bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 text-blue-400 focus:border-blue-500 outline-none" 
                                  />
                              </div>
                              <div className="col-span-1 md:col-span-2 mt-4 border-t border-white/5 pt-6">
                                  <div className="flex justify-between items-center mb-2">
                                     <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                                        Margem de Lucro Projetada (%)
                                        <span className="text-lime-400 bg-lime-500/10 px-2 py-0.5 rounded text-[10px]">{formData.profitPercentage || 0}%</span>
                                     </label>
                                  </div>
                                  <input 
                                    type="range" 
                                    min="0" max="100" step="0.5"
                                    value={formData.profitPercentage || 0} 
                                    onChange={e => setFormData({...formData, profitPercentage: Number(e.target.value)})} 
                                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-lime-500" 
                                  />
                              </div>
                              <div className="col-span-1 md:col-span-2 pt-4">
                                  <div className="flex justify-between items-center mb-2">
                                     <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                                        Imposto sobre Venda Liquida / DAS (%)
                                        <span className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded text-[10px]">{formData.taxPercentage || 0}%</span>
                                     </label>
                                  </div>
                                  <input 
                                    type="range" 
                                    min="0" max="40" step="0.5"
                                    value={formData.taxPercentage || 0} 
                                    onChange={e => setFormData({...formData, taxPercentage: Number(e.target.value)})} 
                                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-500" 
                                  />
                              </div>
                          </div>

                          <div className="mt-6 bg-zinc-900 border border-white/10 rounded-xl p-6 text-sm text-zinc-400">
                             <strong className="text-white text-lg block mb-4">Extrato Transparente:</strong>
                             <div className="flex justify-between"><span>Custo de Equipamentos + CA + Serviços:</span> <span className="font-bold text-white">R$ {((formData.priceKit || 0) + ((formData.modulesCount || 0) * (formData.pricePerModule || 0)) + ((formData.systemSizeKw || 0) * (formData.priceCA || 0)) + (formData.additionalCosts || 0)).toLocaleString('pt-BR', {maximumFractionDigits:2})}</span></div>
                             <div className="flex justify-between text-yellow-500 mt-2"><span>Impostos ({formData.taxPercentage}%):</span> <span className="font-bold">R$ {(((formData.priceKit || 0) + ((formData.modulesCount || 0) * (formData.pricePerModule || 0)) + ((formData.systemSizeKw || 0) * (formData.priceCA || 0)) + (formData.additionalCosts || 0)) / (1 - (((formData.taxPercentage || 0)/100) + ((formData.profitPercentage || 0)/100))) * ((formData.taxPercentage || 0)/100)).toLocaleString('pt-BR', {maximumFractionDigits:2})}</span></div>
                             <div className="flex justify-between text-lime-400"><span>Lucratividade ({formData.profitPercentage}%):</span> <span className="font-bold">R$ {(((formData.priceKit || 0) + ((formData.modulesCount || 0) * (formData.pricePerModule || 0)) + ((formData.systemSizeKw || 0) * (formData.priceCA || 0)) + (formData.additionalCosts || 0)) / (1 - (((formData.taxPercentage || 0)/100) + ((formData.profitPercentage || 0)/100))) * ((formData.profitPercentage || 0)/100)).toLocaleString('pt-BR', {maximumFractionDigits:2})}</span></div>
                             <div className="mt-6 pt-4 border-t border-white/20 text-2xl font-display font-bold flex justify-between text-white">
                                <span>Preço de Venda Sugerido:</span>
                                <span className="text-lime-500">R$ {(((formData.priceKit || 0) + ((formData.modulesCount || 0) * (formData.pricePerModule || 0)) + ((formData.systemSizeKw || 0) * (formData.priceCA || 0)) + (formData.additionalCosts || 0)) / (1 - (((formData.taxPercentage || 0)/100) + ((formData.profitPercentage || 0)/100)))).toLocaleString('pt-BR', {maximumFractionDigits:2})}</span>
                             </div>
                          </div>

                          <div className="flex gap-4 pt-4 border-t border-white/5 mt-6">
                              <button onClick={() => setStep(2)} className="w-1/3 py-4 text-zinc-500 hover:text-white transition-colors font-bold">Voltar</button>
                              <button onClick={handleCalculatePrice} className="w-2/3 py-4 bg-lime-500 text-black font-bold rounded-xl shadow-[0_0_25px_rgba(163,230,53,0.3)] hover:bg-lime-400 flex items-center justify-center gap-2 transition-all active:scale-95 text-lg">
                                  Gerar Documento (PDF)
                              </button>
                          </div>
                      </div>
                  )}

              </div>
          </div>
      )}

      {/* RENDERIZADOR PDF - Modal Over the top */}
      {step === 4 && (
        <ProposalEditor 
          data={formData as ProposalData} 
          onClose={() => setStep(0)} 
          onSave={handleSavePreview} 
        />
      )}
    </div>
  );
};

export default Proposals;
