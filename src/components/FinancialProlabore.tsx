import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Target, DollarSign, Briefcase, ChevronRight, X, Save, PieChart as PieChartIcon, Zap, Calculator, Search, Check, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { supabase } from '../lib/supabaseClient';
import { ProjectFinance } from '../types';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export interface ProlaboreProject {
    id: string;
    clientId: string;
    clientName: string;
    clientPhone?: string;
    city: string;
    systemSizeKw: number;
    status: string;
    updatedAt: string;
    settlementDate?: string;
    finance: ProjectFinance;
}

interface FinancialProlaboreProps {
    filterMonth?: number;
    filterYear?: number;
}

const MONTHS_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const STORAGE_FINANCE_KEY = 'quark_prolabore_finances_v4';

function getStoredFinances(): Record<string, ProjectFinance> {
    try {
        const raw = localStorage.getItem(STORAGE_FINANCE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function saveStoredFinance(id: string, finance: ProjectFinance) {
    try {
        const current = getStoredFinances();
        current[id] = finance;
        localStorage.setItem(STORAGE_FINANCE_KEY, JSON.stringify(current));
    } catch (_) {}
}

export const FinancialProlabore: React.FC<FinancialProlaboreProps> = ({ filterMonth, filterYear }) => {
    const [projects, setProjects] = useState<ProlaboreProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editingFinance, setEditingFinance] = useState<ProjectFinance | null>(null);
    const [saving, setSaving] = useState(false);
    const [savedSuccess, setSavedSuccess] = useState(false);
    const [search, setSearch] = useState('');
    const [periodScope, setPeriodScope] = useState<'month' | 'all'>('month');

    const loadClosedProjects = useCallback(async () => {
        try {
            setLoading(true);
            const savedFinances = getStoredFinances();

            // 1. Tenta buscar da tabela oficial de Pró-labore (prolabore_settlements)
            const { data: dbSettlements, error: settErr } = await supabase
                .from('prolabore_settlements')
                .select('*')
                .is('deleted_at', null)
                .order('contract_revenue', { ascending: false });

            if (!settErr && dbSettlements && dbSettlements.length > 0) {
                const list: ProlaboreProject[] = dbSettlements.map((s: any) => ({
                    id: s.id,
                    clientId: s.opportunity_id,
                    clientName: s.client_name,
                    clientPhone: '',
                    city: s.city || 'Maceió',
                    systemSizeKw: Number(s.system_size_kw || 0),
                    status: 'Venda Fechada',
                    updatedAt: s.updated_at || s.created_at || new Date().toISOString(),
                    settlementDate: s.settlement_date || (s.updated_at ? s.updated_at.split('T')[0] : s.created_at ? s.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
                    finance: {
                        revenue: Number(s.contract_revenue || 0),
                        kitCost: Number(s.kit_cost || 0),
                        installationCost: Number(s.installation_cost || 0),
                        materialCost: Number(s.material_cost || 0),
                        signatureCost: Number(s.signature_cost || 0),
                        commissionCost: Number(s.commission_cost || 0),
                        taxRate: Number(s.tax_rate !== undefined ? s.tax_rate : 5),
                        modulePowerW: Number(s.module_power_w || 550),
                        moduleCount: Number(s.module_count || 0)
                    }
                }));

                setProjects(list);
                if (list.length > 0 && !selectedId) {
                    setSelectedId(list[0].id);
                    setEditingFinance(list[0].finance);
                }
                return;
            }

            // Fallback: Busca oportunidades ganhas (fonte primária oficial do CRM)
            const oppsPromise = supabase
                .from('opportunities')
                .select('id, title, client_name, amount, system_power, city, phone, created_at, updated_at')
                .eq('status', 'Ganho')
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            // 2. Busca catálogo de clientes (dados técnicos consolidados)
            const clientsPromise = supabase
                .from('client_portal_users')
                .select('id, name, opportunity_id, contract_value, system_size_kw, city, phone')
                .is('deleted_at', null);

            // 3. Busca tabela projects para overrides salvos
            const projectsDbPromise = supabase
                .from('projects')
                .select('*');

            const [oppsRes, clientsRes, projDbRes] = await Promise.all([
                oppsPromise,
                clientsPromise,
                projectsDbPromise
            ]);

            const opps = oppsRes.data || [];
            const clients = clientsRes.data || [];
            const dbProjects = projDbRes.data || [];

            const dbFinanceMap = new Map<string, ProjectFinance>();
            dbProjects.forEach((row: any) => {
                if (row.data?.finance) {
                    dbFinanceMap.set(row.id, row.data.finance);
                }
            });

            const mergedList: ProlaboreProject[] = opps.map((o) => {
                const name = (o.client_name || o.title || 'Cliente').trim();
                const matchedClient = clients.find(
                    (c) => c.opportunity_id === o.id || (c.name && c.name.toLowerCase().includes(name.toLowerCase()))
                );

                const rev = Number(o.amount || matchedClient?.contract_value || 0);
                const kwpRaw = Number(o.system_power || matchedClient?.system_size_kw || (rev > 0 ? rev / 3500 : 5));
                const kwp = Number(kwpRaw.toFixed(2));
                const modCount = kwp > 0 ? Math.round((kwp * 1000) / 550) : 0;

                // Prioridade: override do banco -> override local -> cálculo padrão
                const customFin = dbFinanceMap.get(o.id) || savedFinances[o.id];
                const finance: ProjectFinance = customFin ? {
                    ...customFin,
                    revenue: customFin.revenue || rev,
                    modulePowerW: customFin.modulePowerW || 550,
                    moduleCount: customFin.moduleCount || modCount,
                    taxRate: customFin.taxRate !== undefined ? customFin.taxRate : 5
                } : {
                    revenue: rev,
                    kitCost: Math.round(rev * 0.45),
                    installationCost: Math.round(rev * 0.10),
                    materialCost: 0,
                    signatureCost: 0,
                    commissionCost: Math.round(rev * 0.05),
                    modulePowerW: 550,
                    moduleCount: modCount,
                    taxRate: 5
                };

                return {
                    id: o.id,
                    clientId: o.id,
                    clientName: name,
                    clientPhone: o.phone || matchedClient?.phone || '',
                    city: o.city || matchedClient?.city || 'Maceió',
                    systemSizeKw: kwp,
                    status: 'Venda Fechada',
                    updatedAt: o.updated_at || o.created_at || new Date().toISOString(),
                    settlementDate: o.created_at ? o.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
                    finance
                };
            });

            setProjects(mergedList);
            if (mergedList.length > 0 && !selectedId) {
                setSelectedId(mergedList[0].id);
                setEditingFinance(mergedList[0].finance);
            }
        } catch (err) {
            console.error('[FinancialProlabore] Erro ao carregar projetos fechados:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedId]);

    useEffect(() => {
        loadClosedProjects();

        const handleUpdate = () => loadClosedProjects();
        window.addEventListener('quark_crm_updated', handleUpdate);
        window.addEventListener('quark_prolabore_updated', handleUpdate);
        return () => {
            window.removeEventListener('quark_crm_updated', handleUpdate);
            window.removeEventListener('quark_prolabore_updated', handleUpdate);
        };
    }, [loadClosedProjects]);

    const scopedProjects = useMemo(() => {
        if (periodScope === 'all' || !filterMonth || !filterYear) return projects;
        const targetPrefix = `${filterYear}-${String(filterMonth).padStart(2, '0')}`;
        return projects.filter(p => p.settlementDate && p.settlementDate.startsWith(targetPrefix));
    }, [projects, periodScope, filterMonth, filterYear]);

    useEffect(() => {
        if (scopedProjects.length > 0) {
            const exists = scopedProjects.some(p => p.id === selectedId);
            if (!exists) {
                setSelectedId(scopedProjects[0].id);
                setEditingFinance(scopedProjects[0].finance);
            }
        } else {
            setSelectedId(null);
            setEditingFinance(null);
        }
    }, [scopedProjects, selectedId]);

    const filteredProjects = useMemo(() => {
        if (!search.trim()) return scopedProjects;
        const q = search.toLowerCase();
        return scopedProjects.filter(p => p.clientName.toLowerCase().includes(q) || p.city.toLowerCase().includes(q));
    }, [scopedProjects, search]);

    const selectedProject = useMemo(() => {
        return scopedProjects.find(p => p.id === selectedId) || projects.find(p => p.id === selectedId);
    }, [scopedProjects, projects, selectedId]);

    const handleSelect = (p: ProlaboreProject) => {
        setSelectedId(p.id);
        setEditingFinance({ ...p.finance });
        setSavedSuccess(false);
    };

    const handleFinanceChange = (field: keyof ProjectFinance, val: string) => {
        if (!editingFinance) return;
        const num = Number(val) || 0;
        setEditingFinance(prev => prev ? { ...prev, [field]: num } : null);
        setSavedSuccess(false);
    };

    const handleSave = async () => {
        if (!selectedId || !editingFinance) return;
        setSaving(true);
        try {
            // 1. Salva no localStorage imediatamente
            saveStoredFinance(selectedId, editingFinance);

            // 2. Atualiza estado em memória
            setProjects(prev => prev.map(p => p.id === selectedId ? { ...p, finance: editingFinance } : p));

            // 3. Tenta salvar no Supabase na tabela dedicada prolabore_settlements
            const oppId = selectedProject?.clientId || selectedId;
            await Promise.resolve(supabase.from('prolabore_settlements').upsert({
                opportunity_id: oppId,
                client_name: selectedProject?.clientName || 'Cliente',
                city: selectedProject?.city || 'Maceió',
                system_size_kw: selectedProject?.systemSizeKw || 0,
                module_power_w: editingFinance.modulePowerW || 550,
                module_count: editingFinance.moduleCount || 0,
                contract_revenue: editingFinance.revenue || 0,
                kit_cost: editingFinance.kitCost || 0,
                installation_cost: editingFinance.installationCost || 0,
                material_cost: editingFinance.materialCost || 0,
                signature_cost: editingFinance.signatureCost || 0,
                commission_cost: editingFinance.commissionCost || 0,
                tax_rate: editingFinance.taxRate !== undefined ? editingFinance.taxRate : 5,
                updated_at: new Date().toISOString()
            }, { onConflict: 'opportunity_id' })).catch(() => {});

            // Mantém compatibilidade com tabela projects
            const projToSave = {
                id: selectedId,
                clientName: selectedProject?.clientName,
                city: selectedProject?.city,
                systemSizeKw: selectedProject?.systemSizeKw,
                finance: editingFinance,
                updatedAt: new Date().toISOString()
            };

            await Promise.resolve(supabase.from('projects').upsert({
                id: selectedId,
                data: projToSave,
                updated_at: new Date().toISOString()
            })).catch(() => {});

            setSavedSuccess(true);
            setTimeout(() => setSavedSuccess(false), 3000);
        } catch (e) {
            console.warn('[FinancialProlabore] Aviso ao salvar no banco:', e);
        } finally {
            setSaving(false);
        }
    };

    const finance = editingFinance || (selectedProject?.finance) || { 
        revenue: 0, kitCost: 0, installationCost: 0, materialCost: 0, signatureCost: 0, commissionCost: 0,
        modulePowerW: 550, moduleCount: 0, taxRate: 5
    };

    // Cálculos de Rateio Solar
    const kwpTotal = ((finance.modulePowerW || 550) * (finance.moduleCount || 0)) / 1000;
    const notaQK = finance.revenue - finance.kitCost;
    const impostoValue = Math.max(0, notaQK * ((finance.taxRate || 5) / 100));
    const lucroBruto = notaQK;
    const deductions = finance.kitCost + finance.installationCost + finance.materialCost + finance.signatureCost + finance.commissionCost + impostoValue;
    const netProfit = finance.revenue - deductions;
    const profitMargin = finance.revenue > 0 ? (netProfit / finance.revenue) * 100 : 0;

    const distribution = [
        { name: 'Anderson (45%)', value: Math.max(0, netProfit * 0.45), color: '#84cc16' },
        { name: 'Arthur (45%)', value: Math.max(0, netProfit * 0.45), color: '#3b82f6' },
        { name: 'MKT Quark (10%)', value: Math.max(0, netProfit * 0.10), color: '#a855f7' },
    ];

    // Totais Consolidados (Filtrado pelo escopo selecionado)
    const globalTotals = useMemo(() => {
        let totalRev = 0;
        let totalNet = 0;
        scopedProjects.forEach(p => {
            const f = p.finance;
            const nQK = f.revenue - f.kitCost;
            const imp = Math.max(0, nQK * ((f.taxRate || 5) / 100));
            const ded = f.kitCost + f.installationCost + f.materialCost + (f.signatureCost || 0) + f.commissionCost + imp;
            const net = f.revenue - ded;
            totalRev += f.revenue;
            totalNet += net;
        });

        return {
            totalRevenue: totalRev,
            totalNetProfit: totalNet,
            andersonTotal: totalNet * 0.45,
            arthurTotal: totalNet * 0.45,
            mktTotal: totalNet * 0.10,
            count: scopedProjects.length
        };
    }, [scopedProjects]);

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

    const monthlyCount = useMemo(() => {
        if (!filterMonth || !filterYear) return 0;
        const targetPrefix = `${filterYear}-${String(filterMonth).padStart(2, '0')}`;
        return projects.filter(p => p.settlementDate && p.settlementDate.startsWith(targetPrefix)).length;
    }, [projects, filterMonth, filterYear]);

    return (
        <div className="space-y-6 animate-enter">
            {/* Scope Filter Header */}
            <div className="flex items-center justify-between flex-wrap gap-3 pb-1">
                <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Calculator size={16} className="text-lime-400" />
                        Pró-labore & Rateio de Sócios
                    </h3>
                    <p className="text-xs text-slate-400">
                        {periodScope === 'month' && filterMonth ? `Fechamentos de ${MONTHS_NAMES[filterMonth - 1]} de ${filterYear}` : 'Todos os contratos fechados no sistema'}
                    </p>
                </div>
                {filterMonth && filterYear && (
                    <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-xl text-xs">
                        <button
                            onClick={() => setPeriodScope('month')}
                            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${periodScope === 'month' ? 'bg-lime-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                        >
                            {MONTHS_NAMES[filterMonth - 1]} {filterYear} ({monthlyCount})
                        </button>
                        <button
                            onClick={() => setPeriodScope('all')}
                            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${periodScope === 'all' ? 'bg-lime-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                        >
                            Acumulado Geral ({projects.length})
                        </button>
                    </div>
                )}
            </div>

            {/* Top Global KPI Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-[#0d1117] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fechamentos</span>
                    <span className="text-xl font-bold font-mono text-white mt-1">{globalTotals.count} contratos</span>
                    <span className="text-[10px] text-lime-400 mt-1 font-semibold">100% Venda Fechada</span>
                </div>
                <div className="bg-[#0d1117] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Faturamento Total</span>
                    <span className="text-xl font-bold font-mono text-white mt-1">{fmt(globalTotals.totalRevenue)}</span>
                    <span className="text-[10px] text-slate-400 mt-1">Receita Realizada</span>
                </div>
                <div className="bg-lime-500/10 border border-lime-500/20 rounded-2xl p-4 flex flex-col justify-between">
                    <span className="text-[11px] font-bold text-lime-400 uppercase tracking-wider">Lucro Líquido Global</span>
                    <span className="text-xl font-bold font-mono text-lime-400 mt-1">{fmt(globalTotals.totalNetProfit)}</span>
                    <span className="text-[10px] text-lime-300 mt-1">Margem Realizada</span>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex flex-col justify-between">
                    <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Arthur (45%)</span>
                    <span className="text-xl font-bold font-mono text-blue-400 mt-1">{fmt(globalTotals.arthurTotal)}</span>
                    <span className="text-[10px] text-blue-300 mt-1">Rateio Acumulado</span>
                </div>
                <div className="bg-lime-500/10 border border-lime-500/20 rounded-2xl p-4 flex flex-col justify-between">
                    <span className="text-[11px] font-bold text-lime-400 uppercase tracking-wider">Anderson (45%)</span>
                    <span className="text-xl font-bold font-mono text-lime-400 mt-1">{fmt(globalTotals.andersonTotal)}</span>
                    <span className="text-[10px] text-lime-300 mt-1">Rateio Acumulado</span>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 flex flex-col justify-between">
                    <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">MKT Quark (10%)</span>
                    <span className="text-xl font-bold font-mono text-purple-400 mt-1">{fmt(globalTotals.mktTotal)}</span>
                    <span className="text-[10px] text-purple-300 mt-1">Fundo de Marketing</span>
                </div>
            </div>

            {/* Main Interactive Rateio Panel */}
            <div className="flex flex-col lg:flex-row gap-6 min-h-[640px]">
                {/* List of Closed Projects */}
                <div className={`w-full ${selectedId ? 'hidden lg:block lg:w-1/3' : 'w-full'} flex flex-col gap-4 animate-enter`}>
                    <div className="bg-[#0d1117] border border-white/5 rounded-2xl p-5 flex-1 flex flex-col overflow-hidden shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-white flex items-center gap-2">
                                <Briefcase size={18} className="text-lime-400" />
                                Clientes Fechados
                            </h2>
                            <button onClick={loadClosedProjects} title="Recarregar do CRM" className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="relative mb-3">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar por cliente ou cidade..."
                                className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-lime-500 placeholder:text-slate-600 transition-colors"
                            />
                        </div>

                        <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-1">
                            {loading && projects.length === 0 && (
                                <p className="text-sm text-slate-500 text-center py-8 flex items-center justify-center gap-2">
                                    <RefreshCw size={16} className="animate-spin text-lime-400" /> Carregando vendas fechadas...
                                </p>
                            )}
                            {!loading && filteredProjects.length === 0 && (
                                <p className="text-sm text-slate-500 text-center py-8">Nenhum fechamento encontrado.</p>
                            )}
                            {filteredProjects.map((p) => {
                                const pF = p.finance;
                                const pNotaQK = pF.revenue - pF.kitCost;
                                const pImp = Math.max(0, pNotaQK * ((pF.taxRate || 5) / 100));
                                const pNet = pF.revenue - (pF.kitCost + pF.installationCost + pF.materialCost + (pF.signatureCost || 0) + pF.commissionCost + pImp);
                                const isSel = selectedId === p.id;

                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => handleSelect(p)}
                                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                                            isSel
                                                ? 'bg-lime-500/10 border-lime-500/40 shadow-[0_0_15px_rgba(132,204,34,0.1)]'
                                                : 'bg-zinc-900/50 border-white/5 hover:bg-zinc-900 hover:border-white/10'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="text-sm font-bold text-white truncate max-w-[200px]">{p.clientName}</h3>
                                            <ChevronRight size={16} className={isSel ? 'text-lime-400' : 'text-slate-600'} />
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
                                            <span>{p.city} • {p.systemSizeKw.toFixed(2)} kWp</span>
                                            <span className="font-mono text-slate-300 font-semibold">{fmt(pF.revenue)}</span>
                                        </div>

                                        <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Lucro Líquido</span>
                                            <span className={`text-xs font-bold font-mono ${pNet > 0 ? 'text-lime-400' : 'text-slate-400'}`}>
                                                {fmt(pNet)}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Details & Rateio Panel */}
                {selectedProject && editingFinance && (
                    <div className="w-full lg:w-2/3 flex flex-col bg-[#0d1117] border border-white/5 rounded-2xl overflow-hidden shadow-2xl animate-enter">
                        {/* Header */}
                        <div className="p-5 border-b border-white/5 bg-black/30 flex justify-between items-center flex-wrap gap-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold text-white">{selectedProject.clientName}</h2>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-lime-500/20 text-lime-400 border border-lime-500/30">
                                        Venda Fechada
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {selectedProject.city} • {selectedProject.systemSizeKw.toFixed(2)} kWp • Planilha de Rateio Oficial
                                </p>
                            </div>
                            <div className="flex gap-2 items-center">
                                {savedSuccess && (
                                    <span className="text-xs text-lime-400 flex items-center gap-1 font-semibold animate-enter">
                                        <Check size={14} /> Salvo!
                                    </span>
                                )}
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-lime-500 to-lime-400 hover:opacity-90 text-black rounded-xl text-xs font-bold transition-all disabled:opacity-50 min-h-[40px] shadow-[0_0_15px_rgba(132,204,34,0.2)]"
                                >
                                    <Save size={14} /> {saving ? 'Salvando...' : 'Salvar Rateio'}
                                </button>
                                <button onClick={() => setSelectedId(null)} className="p-2 bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-slate-400 rounded-xl lg:hidden">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                            {/* Grid Dados Técnicos e Orçamento */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Dados Técnicos */}
                                <div>
                                    <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                                        <Zap size={14} className="text-lime-400" /> Dados Técnicos
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="bg-zinc-900/50 border border-white/5 p-3.5 rounded-xl flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-400 uppercase">Potência Módulos (W)</label>
                                            <input
                                                type="number"
                                                value={editingFinance.modulePowerW || 550}
                                                onChange={(e) => handleFinanceChange('modulePowerW', e.target.value)}
                                                className="w-24 bg-black/60 border border-white/10 rounded-lg p-2 text-white font-mono text-right outline-none focus:border-lime-500 text-sm"
                                                placeholder="550"
                                            />
                                        </div>
                                        <div className="bg-zinc-900/50 border border-white/5 p-3.5 rounded-xl flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-400 uppercase">Qtd de Módulos</label>
                                            <input
                                                type="number"
                                                value={editingFinance.moduleCount || ''}
                                                onChange={(e) => handleFinanceChange('moduleCount', e.target.value)}
                                                className="w-24 bg-black/60 border border-white/10 rounded-lg p-2 text-white font-mono text-right outline-none focus:border-lime-500 text-sm"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="bg-lime-500/10 border border-lime-500/20 p-3.5 rounded-xl flex items-center justify-between">
                                            <label className="text-xs font-bold text-lime-400 uppercase">kWp Calculado</label>
                                            <span className="font-bold text-lime-400 font-mono text-base">{kwpTotal > 0 ? kwpTotal.toFixed(2) : selectedProject.systemSizeKw.toFixed(2)} kWp</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Orçamento e Custos */}
                                <div>
                                    <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                                        <DollarSign size={14} className="text-lime-400" /> Orçamento & Custos
                                    </h3>
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between gap-4">
                                            <label className="text-xs font-bold text-slate-400 uppercase flex-1">Receita Total</label>
                                            <input
                                                type="number"
                                                value={editingFinance.revenue || ''}
                                                onChange={(e) => handleFinanceChange('revenue', e.target.value)}
                                                className="w-32 bg-black/60 border border-white/10 rounded-lg p-2 text-lime-400 font-bold font-mono text-right outline-none focus:border-lime-500 text-sm"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <label className="text-xs font-bold text-slate-400 uppercase flex-1">Kit Fotovoltaico</label>
                                            <input
                                                type="number"
                                                value={editingFinance.kitCost || ''}
                                                onChange={(e) => handleFinanceChange('kitCost', e.target.value)}
                                                className="w-32 bg-black/60 border border-white/10 rounded-lg p-2 text-red-400 font-mono text-right outline-none focus:border-red-400 text-sm"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <label className="text-xs font-bold text-slate-400 uppercase flex-1">Instalação</label>
                                            <input
                                                type="number"
                                                value={editingFinance.installationCost || ''}
                                                onChange={(e) => handleFinanceChange('installationCost', e.target.value)}
                                                className="w-32 bg-black/60 border border-white/10 rounded-lg p-2 text-red-400 font-mono text-right outline-none focus:border-red-400 text-sm"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <label className="text-xs font-bold text-slate-400 uppercase flex-1">Material Adicional</label>
                                            <input
                                                type="number"
                                                value={editingFinance.materialCost || ''}
                                                onChange={(e) => handleFinanceChange('materialCost', e.target.value)}
                                                className="w-32 bg-black/60 border border-white/10 rounded-lg p-2 text-red-400 font-mono text-right outline-none focus:border-red-400 text-sm"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <label className="text-xs font-bold text-slate-400 uppercase flex-1">Homologação / Assinatura</label>
                                            <input
                                                type="number"
                                                value={editingFinance.signatureCost || ''}
                                                onChange={(e) => handleFinanceChange('signatureCost', e.target.value)}
                                                className="w-32 bg-black/60 border border-white/10 rounded-lg p-2 text-red-400 font-mono text-right outline-none focus:border-red-400 text-sm"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <label className="text-xs font-bold text-slate-400 uppercase flex-1">Comissão Vendedor</label>
                                            <input
                                                type="number"
                                                value={editingFinance.commissionCost || ''}
                                                onChange={(e) => handleFinanceChange('commissionCost', e.target.value)}
                                                className="w-32 bg-black/60 border border-white/10 rounded-lg p-2 text-red-400 font-mono text-right outline-none focus:border-red-400 text-sm"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <label className="text-xs font-bold text-slate-400 uppercase flex-1">Imposto (%)</label>
                                            <input
                                                type="number"
                                                value={editingFinance.taxRate !== undefined ? editingFinance.taxRate : 5}
                                                onChange={(e) => handleFinanceChange('taxRate', e.target.value)}
                                                className="w-24 bg-black/60 border border-white/10 rounded-lg p-2 text-yellow-400 font-mono text-right outline-none focus:border-yellow-400 text-sm"
                                                placeholder="5"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-white/5" />

                            {/* Conferência do Lucro do Projeto */}
                            <div>
                                <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                                    <Calculator size={14} className="text-lime-400" /> Resumo do Projeto
                                </h3>

                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                    <div className="bg-zinc-900/50 border border-white/5 p-3 rounded-xl flex flex-col justify-center">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Receita Total</span>
                                        <span className="text-sm font-bold font-mono text-white">{fmt(finance.revenue)}</span>
                                    </div>
                                    <div className="bg-zinc-900/50 border border-white/5 p-3 rounded-xl flex flex-col justify-center">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nota QK (Rec - Kit)</span>
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
                                        <span className="text-[10px] font-bold text-lime-400 uppercase tracking-wider mb-1">Lucro Líquido</span>
                                        <span className="text-sm font-bold font-mono text-lime-400">{fmt(netProfit)}</span>
                                    </div>
                                    <div className="bg-lime-500/10 border border-lime-500/20 p-3 rounded-xl flex flex-col justify-center">
                                        <span className="text-[10px] font-bold text-lime-400 uppercase tracking-wider mb-1">Margem Líquida</span>
                                        <span className="text-sm font-bold font-mono text-lime-400">{profitMargin.toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-white/5" />

                            {/* Distribuição de Lucro: Arthur (45%) / Anderson (45%) / MKT (10%) */}
                            <div>
                                <h3 className="text-xs font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
                                    <Target size={14} className="text-lime-400" /> Distribuição do Lucro Líquido (Pró-labore)
                                </h3>

                                <div className="flex flex-col md:flex-row items-center gap-8">
                                    <div className="w-full md:w-1/2 flex flex-col gap-3">
                                        {distribution.map((d) => (
                                            <div
                                                key={d.name}
                                                className="flex justify-between items-center p-4 rounded-xl border border-white/5 transition-all hover:bg-white/5"
                                                style={{ backgroundColor: `${d.color}10`, borderColor: `${d.color}25` }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: d.color, boxShadow: `0 0 10px ${d.color}` }} />
                                                    <span className="text-sm font-bold text-white uppercase tracking-wider">{d.name}</span>
                                                </div>
                                                <span className="text-lg font-bold font-mono" style={{ color: d.color }}>{fmt(d.value)}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="w-full md:w-1/2 h-[260px] relative">
                                        {netProfit > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={distribution} cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={4} dataKey="value" stroke="none">
                                                        {distribution.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip content={<CustomTooltip />} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 border border-white/5 rounded-2xl bg-black/20 m-4">
                                                <PieChartIcon size={32} className="mb-2 opacity-20" />
                                                <p className="text-xs">Sem lucro positivo para distribuir</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!selectedProject && (
                    <div className="hidden lg:flex w-2/3 bg-[#0d1117] border border-white/5 rounded-2xl items-center justify-center p-8">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-lime-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-lime-500/20">
                                <Target size={32} className="text-lime-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Planilha de Rateio - Pró-labore</h3>
                            <p className="text-sm text-slate-500 max-w-sm mx-auto">
                                Selecione um dos clientes fechados ao lado para conferir e editar os custos, margens e a divisão exata de 45% Anderson, 45% Arthur e 10% MKT Quark.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
