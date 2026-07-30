import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Project, ProjectFinance } from '../types';
import { Target, DollarSign, Briefcase, ChevronRight, X, Save, PieChart as PieChartIcon, Zap, Calculator, Trash2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export const FinancialProlabore: React.FC = () => {
    const { projects, updateProject, deleteProject } = useApp();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editingFinance, setEditingFinance] = useState<ProjectFinance | null>(null);
    const [saving, setSaving] = useState(false);

    const selectedProject = projects.find(p => p.id === selectedId);

    const handleSelect = (p: Project) => {
        setSelectedId(p.id);
        const f = p.finance || { revenue: 0, kitCost: 0, installationCost: 0, materialCost: 0, signatureCost: 0, commissionCost: 0 };
        setEditingFinance({
            ...f,
            modulePowerW: f.modulePowerW || 0,
            moduleCount: f.moduleCount || 0,
            taxRate: f.taxRate || 5, // Default 5%
        } as ProjectFinance);
    };

    const handleSave = async () => {
        if (!selectedId || !editingFinance) return;
        setSaving(true);
        await updateProject(selectedId, { finance: editingFinance });
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!selectedId) return;
        if (window.confirm("Tem certeza que deseja excluir este projeto fechado permanentemente?")) {
            await deleteProject(selectedId);
            setSelectedId(null);
        }
    };

    const handleFinanceChange = (field: keyof ProjectFinance, val: string) => {
        if (!editingFinance) return;
        const num = Number(val);
        setEditingFinance({ ...editingFinance, [field]: num });
    };

    const finance = editingFinance || (selectedProject?.finance) || { 
        revenue: 0, kitCost: 0, installationCost: 0, materialCost: 0, signatureCost: 0, commissionCost: 0,
        modulePowerW: 0, moduleCount: 0, taxRate: 5
    };

    // Spreadsheet Math
    const kwpTotal = ((finance.modulePowerW || 0) * (finance.moduleCount || 0)) / 1000;
    const notaQK = finance.revenue - finance.kitCost;
    const impostoValue = notaQK * ((finance.taxRate || 5) / 100);
    const lucroBruto = notaQK;
    const deductions = finance.kitCost + finance.installationCost + finance.materialCost + finance.signatureCost + finance.commissionCost + impostoValue;
    const netProfit = finance.revenue - deductions;
    const profitMargin = finance.revenue > 0 ? (netProfit / finance.revenue) * 100 : 0;

    const distribution = [
        { name: 'Anderson (45%)', value: Math.max(0, netProfit * 0.45), color: '#84cc16' }, // lime-500
        { name: 'Arthur (45%)', value: Math.max(0, netProfit * 0.45), color: '#3b82f6' }, // blue-500
        { name: 'MKT Quark (10%)', value: Math.max(0, netProfit * 0.10), color: '#a855f7' }, // purple-500
    ];

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 shadow-xl">
                    <p className="text-sm font-bold" style={{ color: payload[0].payload.color }}>
                        {payload[0].name}: {fmt(payload[0].value)}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[600px] mt-4">
            {/* List of Projects */}
            <div className={`w-full ${selectedId ? 'hidden lg:block lg:w-1/3' : 'w-full'} flex flex-col gap-4 animate-enter`}>
                <div className="bg-[#0d1117] border border-white/5 rounded-2xl p-5 flex-1 overflow-y-auto custom-scrollbar">
                    <h2 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Briefcase size={18} className="text-lime-400" />
                        Projetos Fechados
                    </h2>
                    
                    <div className="space-y-2">
                        {projects.length === 0 && (
                            <p className="text-sm text-slate-500 text-center py-8">Nenhum projeto encontrado.</p>
                        )}
                        {projects.map(p => {
                            const pF = p.finance || { revenue: 0, kitCost: 0, installationCost: 0, materialCost: 0, signatureCost: 0, commissionCost: 0, taxRate: 5 };
                            const pNotaQK = pF.revenue - pF.kitCost;
                            const pImp = pNotaQK * ((pF.taxRate || 5) / 100);
                            const pNet = pF.revenue - (pF.kitCost + pF.installationCost + pF.materialCost + (pF.signatureCost || 0) + pF.commissionCost + pImp);
                            
                            return (
                                <button key={p.id} onClick={() => handleSelect(p)}
                                    className={`w-full text-left p-4 rounded-xl border transition-all ${selectedId === p.id ? 'bg-lime-500/10 border-lime-500/30' : 'bg-zinc-900/50 border-white/5 hover:bg-zinc-900'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="text-sm font-bold text-white">{p.clientName}</h3>
                                        <ChevronRight size={16} className={selectedId === p.id ? 'text-lime-400' : 'text-slate-600'} />
                                    </div>
                                    <p className="text-xs text-slate-500 mb-2">{p.city} • {p.systemSizeKw.toFixed(2)} kWp</p>
                                    
                                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5">
                                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Lucro Líquido</span>
                                        <span className={`text-xs font-bold font-mono ${pNet > 0 ? 'text-lime-400' : 'text-slate-400'}`}>{fmt(pNet)}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Details Panel */}
            {selectedProject && editingFinance && (
                <div className="w-full lg:w-2/3 flex flex-col bg-[#0d1117] border border-white/5 rounded-2xl overflow-hidden shadow-2xl animate-enter">
                    {/* Header */}
                    <div className="p-6 border-b border-white/5 bg-black/20 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-white">{selectedProject.clientName}</h2>
                            <p className="text-sm text-slate-500">Planilha de Rateio - Pro-labore</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleDelete} className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-sm font-bold transition-all" title="Excluir Projeto">
                                <Trash2 size={16} /> <span className="hidden sm:inline">Excluir</span>
                            </button>
                            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-lime-500 hover:bg-lime-400 text-black rounded-xl text-sm font-bold transition-all disabled:opacity-50">
                                <Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                            <button onClick={() => setSelectedId(null)} className="p-2 bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-slate-400 rounded-xl lg:hidden">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                        
                        {/* Seção 1 e 2: Grid dividida */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* Preencha Técnicos */}
                            <div>
                                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                                    <Zap size={16} className="text-lime-400" /> Dados Técnicos
                                </h3>
                                <div className="space-y-4">
                                    <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-xl flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Potência dos Módulos (W)</label>
                                        <input type="number" value={editingFinance.modulePowerW || ''} onChange={e => handleFinanceChange('modulePowerW', e.target.value)}
                                            className="w-24 bg-black/50 border border-white/10 rounded-lg p-2 text-white font-mono text-right outline-none focus:border-lime-500" placeholder="0" />
                                    </div>
                                    <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-xl flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Número de Módulos</label>
                                        <input type="number" value={editingFinance.moduleCount || ''} onChange={e => handleFinanceChange('moduleCount', e.target.value)}
                                            className="w-24 bg-black/50 border border-white/10 rounded-lg p-2 text-white font-mono text-right outline-none focus:border-lime-500" placeholder="0" />
                                    </div>
                                    <div className="bg-lime-500/10 border border-lime-500/20 p-4 rounded-xl flex items-center justify-between">
                                        <label className="text-xs font-bold text-lime-400 uppercase">kWp Total do Projeto</label>
                                        <span className="font-bold text-lime-400 font-mono text-lg">{kwpTotal.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Orçamento Serviços */}
                            <div>
                                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                                    <DollarSign size={16} className="text-lime-400" /> Orçamento & Serviços
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-4">
                                        <label className="text-xs font-bold text-slate-400 uppercase flex-1">Total Projeto (Receita)</label>
                                        <input type="number" value={editingFinance.revenue || ''} onChange={e => handleFinanceChange('revenue', e.target.value)}
                                            className="w-32 bg-black/50 border border-white/10 rounded-lg p-2 text-lime-400 font-bold font-mono text-right outline-none focus:border-lime-500" placeholder="0.00" />
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <label className="text-xs font-bold text-slate-400 uppercase flex-1">Kit Fotovoltaico</label>
                                        <input type="number" value={editingFinance.kitCost || ''} onChange={e => handleFinanceChange('kitCost', e.target.value)}
                                            className="w-32 bg-black/50 border border-white/10 rounded-lg p-2 text-red-400 font-mono text-right outline-none focus:border-red-400" placeholder="0.00" />
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <label className="text-xs font-bold text-slate-400 uppercase flex-1">Instalação</label>
                                        <input type="number" value={editingFinance.installationCost || ''} onChange={e => handleFinanceChange('installationCost', e.target.value)}
                                            className="w-32 bg-black/50 border border-white/10 rounded-lg p-2 text-red-400 font-mono text-right outline-none focus:border-red-400" placeholder="0.00" />
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <label className="text-xs font-bold text-slate-400 uppercase flex-1">Material</label>
                                        <input type="number" value={editingFinance.materialCost || ''} onChange={e => handleFinanceChange('materialCost', e.target.value)}
                                            className="w-32 bg-black/50 border border-white/10 rounded-lg p-2 text-red-400 font-mono text-right outline-none focus:border-red-400" placeholder="0.00" />
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <label className="text-xs font-bold text-slate-400 uppercase flex-1">Assinatura</label>
                                        <input type="number" value={editingFinance.signatureCost || ''} onChange={e => handleFinanceChange('signatureCost', e.target.value)}
                                            className="w-32 bg-black/50 border border-white/10 rounded-lg p-2 text-red-400 font-mono text-right outline-none focus:border-red-400" placeholder="0.00" />
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <label className="text-xs font-bold text-slate-400 uppercase flex-1">Comissão</label>
                                        <input type="number" value={editingFinance.commissionCost || ''} onChange={e => handleFinanceChange('commissionCost', e.target.value)}
                                            className="w-32 bg-black/50 border border-white/10 rounded-lg p-2 text-red-400 font-mono text-right outline-none focus:border-red-400" placeholder="0.00" />
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <label className="text-xs font-bold text-slate-400 uppercase flex-1">Imposto (%)</label>
                                        <input type="number" value={editingFinance.taxRate || ''} onChange={e => handleFinanceChange('taxRate', e.target.value)}
                                            className="w-24 bg-black/50 border border-white/10 rounded-lg p-2 text-yellow-400 font-mono text-right outline-none focus:border-yellow-400" placeholder="5" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr className="border-white/5" />

                        {/* Conferência de Lucro */}
                        <div>
                            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                                <Calculator size={16} className="text-lime-400" /> Conferência Lucro
                            </h3>

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                <div className="bg-zinc-900/50 border border-white/5 p-3 rounded-xl flex flex-col justify-center">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Projeto</span>
                                    <span className="text-sm font-bold font-mono text-white">{fmt(finance.revenue)}</span>
                                </div>
                                <div className="bg-zinc-900/50 border border-white/5 p-3 rounded-xl flex flex-col justify-center">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">TP - Kit (Nota QK)</span>
                                    <span className="text-sm font-bold font-mono text-white">{fmt(notaQK)}</span>
                                </div>
                                <div className="bg-zinc-900/50 border border-white/5 p-3 rounded-xl flex flex-col justify-center">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Imposto {finance.taxRate}%</span>
                                    <span className="text-sm font-bold font-mono text-red-400">{fmt(impostoValue)}</span>
                                </div>
                                <div className="bg-zinc-900/50 border border-white/5 p-3 rounded-xl flex flex-col justify-center">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Lucro Bruto</span>
                                    <span className="text-sm font-bold font-mono text-white">{fmt(lucroBruto)}</span>
                                </div>
                                <div className="bg-lime-500/10 border border-lime-500/20 p-3 rounded-xl flex flex-col justify-center">
                                    <span className="text-[10px] font-bold text-lime-500 uppercase tracking-wider mb-1">Lucro Líquido</span>
                                    <span className="text-sm font-bold font-mono text-lime-400">{fmt(netProfit)}</span>
                                </div>
                                <div className="bg-lime-500/10 border border-lime-500/20 p-3 rounded-xl flex flex-col justify-center">
                                    <span className="text-[10px] font-bold text-lime-500 uppercase tracking-wider mb-1">Lucro Líquido %</span>
                                    <span className="text-sm font-bold font-mono text-lime-400">{profitMargin.toFixed(2)}%</span>
                                </div>
                            </div>
                        </div>

                        <hr className="border-white/5" />

                        {/* Distribution Section */}
                        <div>
                            <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
                                <Target size={16} className="text-lime-400" /> Distribuição do Lucro Líquido
                            </h3>

                            <div className="flex flex-col md:flex-row items-center gap-8">
                                <div className="w-full md:w-1/2 flex flex-col gap-3">
                                    {distribution.map(d => (
                                        <div key={d.name} className="flex justify-between items-center p-4 rounded-xl border border-white/5 transition-all hover:bg-white/5" style={{ backgroundColor: `${d.color}10`, borderColor: `${d.color}20` }}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: d.color, boxShadow: `0 0 10px ${d.color}` }} />
                                                <span className="text-sm font-bold text-white uppercase tracking-wider">{d.name}</span>
                                            </div>
                                            <span className="text-lg font-bold font-mono" style={{ color: d.color }}>{fmt(d.value)}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="w-full md:w-1/2 h-[280px] relative">
                                    {netProfit > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={distribution} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value" stroke="none">
                                                    {distribution.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 border border-white/5 rounded-full bg-black/20 m-4">
                                            <PieChartIcon size={32} className="mb-2 opacity-20" />
                                            <p className="text-xs">Sem lucro para distribuir</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}
            
            {/* Empty State when no project is selected */}
            {!selectedProject && (
                <div className="hidden lg:flex w-2/3 bg-[#0d1117] border border-white/5 rounded-2xl items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-lime-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Target size={32} className="text-lime-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Planilha de Rateio</h3>
                        <p className="text-sm text-slate-500 max-w-xs mx-auto">Selecione um projeto fechado na lista ao lado para lançar os custos e visualizar a distribuição exata do Lucro Líquido.</p>
                    </div>
                </div>
            )}
        </div>
    );
};
