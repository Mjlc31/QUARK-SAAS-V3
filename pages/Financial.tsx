import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
    TrendingUp, TrendingDown, Plus, Trash2, Download,
    DollarSign, BarChart3, FileText, ChevronDown, ChevronUp,
    ArrowUpRight, ArrowDownRight, Calendar, Filter, X, AlertTriangle,
    PieChart, Activity, Target, Loader2, Edit3, Check
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { jsPDF } from 'jspdf';

// ─── Types ─────────────────────────────────────────────────────────────────────
type TransactionType = 'receita' | 'custo' | 'despesa';

type ReceitaCategory = 'instalacao_residencial' | 'instalacao_comercial' | 'manutencao' | 'outros_receita';
type CustoCategory = 'equipamentos' | 'mao_de_obra' | 'frete' | 'outros_cpv';
type DespesaCategory = 'salarios' | 'marketing' | 'aluguel' | 'combustivel' | 'software' | 'imposto' | 'outras_despesas';
type Category = ReceitaCategory | CustoCategory | DespesaCategory;

interface Transaction {
    id: string;
    description: string;
    type: TransactionType;
    category: Category;
    amount: number;
    date: string;
    note?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<Category, string> = {
    instalacao_residencial: 'Instalação Residencial',
    instalacao_comercial: 'Instalação Comercial',
    manutencao: 'Manutenção / Serviços',
    outros_receita: 'Outras Receitas',
    equipamentos: 'Equipamentos',
    mao_de_obra: 'Mão de Obra',
    frete: 'Frete e Logística',
    outros_cpv: 'Outros Custos',
    salarios: 'Salários e Encargos',
    marketing: 'Marketing',
    aluguel: 'Aluguel',
    combustivel: 'Combustível',
    software: 'Software e Tech',
    imposto: 'Impostos e Taxas',
    outras_despesas: 'Outras Despesas',
};

const CATEGORIES_BY_TYPE: Record<TransactionType, Category[]> = {
    receita: ['instalacao_residencial', 'instalacao_comercial', 'manutencao', 'outros_receita'],
    custo: ['equipamentos', 'mao_de_obra', 'frete', 'outros_cpv'],
    despesa: ['salarios', 'marketing', 'aluguel', 'combustivel', 'software', 'imposto', 'outras_despesas'],
};

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const PIE_COLORS = ['#84cc16', '#22d3ee', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#64748b'];

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtShort = (v: number) => {
    if (Math.abs(v) >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `R$${(v / 1_000).toFixed(1)}k`;
    return `R$${v.toFixed(0)}`;
};

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 shadow-xl">
            <p className="text-xs text-slate-400 mb-2 font-semibold">{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} className="text-sm font-bold" style={{ color: p.color }}>
                    {p.name}: {fmt(p.value)}
                </p>
            ))}
        </div>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const Financial: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [allYearTx, setAllYearTx] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingError, setSavingError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'dre' | 'lancamentos'>('dashboard');
    const [viewMode, setViewMode] = useState<'monthly' | 'ytd'>('monthly');

    // Filters
    const now = new Date();
    const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
    const [filterYear, setFilterYear] = useState(now.getFullYear());

    // Form
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        description: '',
        type: 'receita' as TransactionType,
        category: 'instalacao_residencial' as Category,
        amount: '',
        date: new Date().toISOString().split('T')[0],
        note: '',
    });

    // DRE expand
    const [expanded, setExpanded] = useState({ receitas: true, cpv: true, despesas: true, impostos: true });

    // ─── Fetch monthly data ───────────────────────────────────────────────────
    useEffect(() => {
        const fetchMonthly = async () => {
            setLoading(true);
            setSavingError(null);
            const firstDay = `${filterYear}-${String(filterMonth).padStart(2, '0')}-01`;
            const lastDay = new Date(filterYear, filterMonth, 0).toISOString().split('T')[0];
            const { data, error } = await supabase
                .from('financial_transactions')
                .select('id, description, type, category, amount, date, note')
                .gte('date', firstDay).lte('date', lastDay)
                .order('date', { ascending: false });
            if (error) { setSavingError('Erro ao carregar. Verifique conexão com Supabase.'); }
            else { setTransactions((data || []).map(mapRow)); }
            setLoading(false);
        };
        fetchMonthly();
    }, [filterMonth, filterYear]);

    // ─── Fetch full year for charts ──────────────────────────────────────────
    useEffect(() => {
        const fetchYear = async () => {
            const { data } = await supabase
                .from('financial_transactions')
                .select('id, description, type, category, amount, date, note')
                .gte('date', `${filterYear}-01-01`)
                .lte('date', `${filterYear}-12-31`)
                .order('date', { ascending: true });
            setAllYearTx((data || []).map(mapRow));
        };
        fetchYear();
    }, [filterYear]);

    const mapRow = (r: any): Transaction => ({
        id: r.id, description: r.description, type: r.type as TransactionType,
        category: r.category as Category, amount: Number(r.amount), date: r.date, note: r.note || undefined,
    });

    const filtered = viewMode === 'monthly' ? transactions : allYearTx;

    // ─── DRE Calculations ─────────────────────────────────────────────────────
    const dre = useMemo(() => {
        const sum = (type: TransactionType, cats?: Category[]) =>
            filtered.filter(t => t.type === type && (cats ? cats.includes(t.category) : true))
                .reduce((acc, t) => acc + t.amount, 0);

        const recRes = sum('receita', ['instalacao_residencial']);
        const recCom = sum('receita', ['instalacao_comercial']);
        const recMan = sum('receita', ['manutencao']);
        const recOut = sum('receita', ['outros_receita']);
        const receitaBruta = recRes + recCom + recMan + recOut;

        const cpvEq = sum('custo', ['equipamentos']);
        const cpvMO = sum('custo', ['mao_de_obra']);
        const cpvFr = sum('custo', ['frete']);
        const cpvOut = sum('custo', ['outros_cpv']);
        const cpv = cpvEq + cpvMO + cpvFr + cpvOut;

        const lucroBruto = receitaBruta - cpv;
        const margemBruta = receitaBruta === 0 ? 0 : (lucroBruto / receitaBruta) * 100;

        const depSal = sum('despesa', ['salarios']);
        const depMkt = sum('despesa', ['marketing']);
        const depAlq = sum('despesa', ['aluguel']);
        const depCom = sum('despesa', ['combustivel']);
        const depSof = sum('despesa', ['software']);
        const depOut = sum('despesa', ['outras_despesas']);
        const despOp = depSal + depMkt + depAlq + depCom + depSof + depOut;

        const ebit = lucroBruto - despOp;
        const impostos = sum('despesa', ['imposto']);
        const lucroLiquido = ebit - impostos;
        const margemLiquida = receitaBruta === 0 ? 0 : (lucroLiquido / receitaBruta) * 100;

        return {
            recRes, recCom, recMan, recOut, receitaBruta,
            cpvEq, cpvMO, cpvFr, cpvOut, cpv,
            lucroBruto, margemBruta,
            depSal, depMkt, depAlq, depCom, depSof, depOut, despOp,
            ebit, impostos, lucroLiquido, margemLiquida,
        };
    }, [filtered]);

    // ─── Monthly chart data (last 6 months of year) ───────────────────────────
    const monthlyChartData = useMemo(() => {
        const months = Array.from({ length: 12 }, (_, i) => i + 1);
        return months.map(m => {
            const mTx = allYearTx.filter(t => {
                const d = new Date(t.date + 'T00:00:00');
                return d.getMonth() + 1 === m;
            });
            const receitas = mTx.filter(t => t.type === 'receita').reduce((a, t) => a + t.amount, 0);
            const custos = mTx.filter(t => t.type === 'custo' || t.type === 'despesa').reduce((a, t) => a + t.amount, 0);
            return { name: MONTHS_SHORT[m - 1], receitas: Math.round(receitas), custos: Math.round(custos), lucro: Math.round(receitas - custos) };
        });
    }, [allYearTx]);

    // ─── Pie chart: top spending categories ─────────────────────────────────
    const pieData = useMemo(() => {
        const groups: Record<string, number> = {};
        filtered.filter(t => t.type !== 'receita').forEach(t => {
            const k = CATEGORY_LABELS[t.category];
            groups[k] = (groups[k] || 0) + t.amount;
        });
        return Object.entries(groups)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([name, value]) => ({ name, value: Math.round(value) }));
    }, [filtered]);

    // ─── Cumulative balance sparkline ─────────────────────────────────────────
    const balanceData = useMemo(() => {
        let acc = 0;
        return [...filtered]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(t => {
                acc += t.type === 'receita' ? t.amount : -t.amount;
                return { date: t.date, balance: Math.round(acc) };
            });
    }, [filtered]);

    // ─── PDF Report Generation ───────────────────────────────────────────────
    const generatePDFReport = () => {
        const doc = new jsPDF();
        
        // Background and Header Bar
        doc.setFillColor(10, 14, 24);
        doc.rect(0, 0, 210, 297, 'F');
        doc.setFillColor(132, 204, 22);
        doc.rect(0, 0, 210, 8, 'F');

        // Logo
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.text('QUARK ENERGIA', 20, 25);
        doc.setFontSize(10);
        doc.setTextColor(132, 204, 22);
        doc.text('RELATÓRIO FINANCEIRO EXECUTIVO', 20, 31);

        // Period & Metrics
        doc.setTextColor(140, 150, 165);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Período: ${periodLabel}`, 20, 38);
        doc.text(`Data de Geração: ${new Date().toLocaleDateString('pt-BR')}`, 140, 38);
        
        doc.setDrawColor(50, 60, 80);
        doc.setLineWidth(0.3);
        doc.line(20, 42, 190, 42);

        let y = 50;
        
        // Metric Box helper
        const drawMetricBox = (xStart: number, title: string, value: string, color: number[]) => {
            doc.setFillColor(22, 32, 48);
            doc.roundedRect(xStart, y, 50, 22, 2, 2, 'F');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(170, 180, 195);
            doc.text(title.toUpperCase(), xStart + 4, y + 8);
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(color[0], color[1], color[2]);
            doc.text(value, xStart + 4, y + 18);
        };

        drawMetricBox(20, 'Receita Bruta', fmt(dre.receitaBruta), [132, 204, 22]);
        drawMetricBox(75, 'Lucro Bruto', fmt(dre.lucroBruto), [59, 130, 246]);
        drawMetricBox(130, 'Lucro Líquido', dre.lucroLiquido < 0 ? `(${fmt(Math.abs(dre.lucroLiquido))})` : fmt(dre.lucroLiquido), dre.lucroLiquido >= 0 ? [132, 204, 22] : [239, 68, 68]);

        y += 35;

        // DRE Section
        doc.setFillColor(132, 204, 22);
        doc.rect(20, y, 170, 7, 'F');
        doc.setTextColor(10, 14, 24);
        doc.setFontSize(9);
        doc.text('DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO (DRE)', 22, y + 5);
        y += 12;

        const addRow = (label: string, value: number, isBold: boolean, isRed: boolean, isGreen: boolean) => {
            if (y > 270) {
                doc.addPage();
                doc.setFillColor(10, 14, 24);
                doc.rect(0, 0, 210, 297, 'F');
                y = 20;
            }
            doc.setFont('helvetica', isBold ? 'bold' : 'normal');
            doc.setFontSize(9);
            doc.setTextColor(170, 180, 195);
            doc.text(label, 22, y);
            
            if (isGreen) doc.setTextColor(132, 204, 22);
            else if (isRed) doc.setTextColor(239, 68, 68);
            else if (isBold) doc.setTextColor(255, 255, 255);
            
            doc.text(fmt(value), 188, y, { align: 'right' });
            y += 7;
        };

        addRow('1. Receita Bruta', dre.receitaBruta, true, false, true);
        addRow('   Instalações Residenciais', dre.recRes, false, false, false);
        addRow('   Instalações Comerciais', dre.recCom, false, false, false);
        addRow('   Manutenção / Serviços', dre.recMan, false, false, false);
        addRow('   Outras Receitas', dre.recOut, false, false, false);
        
        y += 2;
        doc.setDrawColor(30, 40, 60);
        doc.line(20, y, 190, y);
        y += 6;

        addRow('2. Custos dos Produtos Vendidos (CPV)', -dre.cpv, true, true, false);
        addRow('   Equipamentos', dre.cpvEq, false, false, false);
        addRow('   Mão de Obra', dre.cpvMO, false, false, false);
        addRow('   Frete', dre.cpvFr, false, false, false);
        addRow('   Outros Custos', dre.cpvOut, false, false, false);

        y += 2;
        doc.line(20, y, 190, y);
        y += 6;

        addRow('(=) Lucro Bruto', dre.lucroBruto, true, dre.lucroBruto < 0, dre.lucroBruto >= 0);

        y += 2;
        doc.line(20, y, 190, y);
        y += 6;

        addRow('3. Despesas Operacionais', -dre.despOp, true, true, false);
        addRow('   Salários e Encargos', dre.depSal, false, false, false);
        addRow('   Marketing', dre.depMkt, false, false, false);
        addRow('   Aluguel', dre.depAlq, false, false, false);
        addRow('   Combustível', dre.depCom, false, false, false);
        addRow('   Software e Tech', dre.depSof, false, false, false);
        addRow('   Outras Despesas', dre.depOut, false, false, false);

        y += 2;
        doc.line(20, y, 190, y);
        y += 6;

        addRow('(=) Resultado Op. (EBIT)', dre.ebit, true, dre.ebit < 0, dre.ebit >= 0);
        addRow('4. Impostos', -dre.impostos, true, true, false);

        y += 2;
        doc.line(20, y, 190, y);
        y += 6;

        addRow('(=) LUCRO LÍQUIDO', dre.lucroLiquido, true, dre.lucroLiquido < 0, dre.lucroLiquido >= 0);

        // Footer
        doc.setFillColor(132, 204, 22);
        doc.rect(0, 285, 210, 12, 'F');
        doc.setTextColor(5, 11, 20);
        doc.setFont('helvetica', 'bold');
        doc.text('Quark Energia  |  Relatório Financeiro', 105, 292.5, { align: 'center' });

        doc.save(`Quark_Relatorio_Financeiro_${periodLabel.replace(/\s/g, '_')}.pdf`);
    };

    // ─── Add ─────────────────────────────────────────────────────────────────
    const handleAdd = async () => {
        if (!form.description || !form.amount) return;
        setSaving(true); setSavingError(null);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setSavingError('Faça login para adicionar lançamentos.'); setSaving(false); return; }
        const payload = {
            description: form.description, type: form.type, category: form.category,
            amount: parseFloat(form.amount), date: form.date, note: form.note || null, user_id: user.id,
        };
        const { data, error } = await supabase.from('financial_transactions').insert([payload]).select().single();
        if (error) { setSavingError('Erro ao salvar. Tente novamente.'); }
        else if (data) {
            const t = mapRow(data);
            const d = new Date(t.date + 'T00:00:00');
            if (d.getMonth() + 1 === filterMonth && d.getFullYear() === filterYear) {
                setTransactions(prev => [t, ...prev]);
            }
            setAllYearTx(prev => [t, ...prev]);
            setForm({ description: '', type: 'receita', category: 'instalacao_residencial', amount: '', date: new Date().toISOString().split('T')[0], note: '' });
            setShowForm(false);
        }
        setSaving(false);
    };

    // ─── Delete ───────────────────────────────────────────────────────────────
    const handleDelete = async (id: string) => {
        setTransactions(prev => prev.filter(t => t.id !== id));
        setAllYearTx(prev => prev.filter(t => t.id !== id));
        const { error } = await supabase.from('financial_transactions').delete().eq('id', id);
        if (error) setSavingError('Erro ao excluir. Verifique a conexão.');
    };

    // ─── Export CSV ───────────────────────────────────────────────────────────
    const handleExport = () => {
        const rows = [
            ['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor (R$)', 'Nota'],
            ...filtered.map(t => [t.date, t.description, t.type, CATEGORY_LABELS[t.category], t.amount.toFixed(2), t.note || ''])
        ];
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `quark_financeiro_${filterYear}_${viewMode === 'ytd' ? 'ytd' : String(filterMonth).padStart(2, '0')}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    // ─── UI sub-components ────────────────────────────────────────────────────
    const typeColors: Record<TransactionType, string> = {
        receita: 'text-lime-400 bg-lime-400/10 border-lime-400/20',
        custo: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
        despesa: 'text-red-400 bg-red-400/10 border-red-400/20',
    };
    const typeLabels: Record<TransactionType, string> = { receita: 'Receita', custo: 'Custo', despesa: 'Despesa' };

    const DRERow = ({ label, value, indent = 0, bold = false, green = false, red = false, sub = false }: {
        label: string; value: number; indent?: number; bold?: boolean; green?: boolean; red?: boolean; sub?: boolean;
    }) => (
        <div className={`flex items-center justify-between py-2 ${indent > 0 ? `pl-${indent * 4}` : ''} ${sub ? 'border-t border-white/5 mt-1' : ''}`}>
            <span className={`text-sm ${bold ? 'font-bold text-white' : 'text-slate-400'}`}>{label}</span>
            <span className={`text-sm font-mono ${bold ? 'font-bold' : ''} ${green ? 'text-lime-400' : red ? 'text-red-400' : 'text-slate-200'}`}>
                {value < 0 ? `(${fmt(Math.abs(value))})` : fmt(value)}
            </span>
        </div>
    );

    const SectionHeader = ({ title, k, count }: { title: string; k: keyof typeof expanded; count?: number }) => (
        <button onClick={() => setExpanded(p => ({ ...p, [k]: !p[k] }))}
            className="w-full flex items-center justify-between py-2.5 px-3 bg-zinc-900/50 border border-white/5 rounded-lg hover:bg-zinc-900 transition-colors">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</span>
            <div className="flex items-center gap-2">
                {count !== undefined && <span className="text-xs text-slate-600">{count}</span>}
                {expanded[k] ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
            </div>
        </button>
    );

    const periodLabel = viewMode === 'ytd' ? `Jan–${MONTHS_SHORT[filterMonth - 1]} ${filterYear}` : `${MONTHS[filterMonth - 1]} ${filterYear}`;

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen pb-16">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <DollarSign className="text-lime-400" size={24} />
                        Financeiro
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Controle de caixa, DRE e análises — Quark Energia</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* View mode */}
                    <div className="flex gap-1 bg-zinc-900/50 border border-white/5 p-1 rounded-xl">
                        {(['monthly', 'ytd'] as const).map(m => (
                            <button key={m} onClick={() => setViewMode(m)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === m ? 'bg-lime-500 text-black' : 'text-slate-400 hover:text-white'}`}>
                                {m === 'monthly' ? 'Mensal' : 'Acumulado'}
                            </button>
                        ))}
                    </div>
                    {/* Period filter */}
                    <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2">
                        <Calendar size={14} className="text-slate-500" />
                        <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}
                            className="bg-transparent text-sm text-white focus:outline-none cursor-pointer">
                            {MONTHS.map((m, i) => <option key={i} value={i + 1} className="bg-zinc-900">{m}</option>)}
                        </select>
                        <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
                            className="bg-transparent text-sm text-white focus:outline-none cursor-pointer">
                            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y} className="bg-zinc-900">{y}</option>)}
                        </select>
                    </div>
                    <button onClick={generatePDFReport} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-white/10 text-slate-300 rounded-xl text-sm hover:border-white/20 transition-colors">
                        <FileText size={14} /> Relatório PDF
                    </button>
                    <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-lime-500 hover:bg-lime-400 text-black rounded-xl text-sm font-bold transition-colors">
                        <Plus size={16} /> Lançamento Rápido
                    </button>
                </div>
            </div>

            {savingError && (
                <div className="mb-6 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                    <AlertTriangle size={16} /> {savingError}
                    <button onClick={() => setSavingError(null)} className="ml-auto"><X size={14} /></button>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 size={32} className="animate-spin text-lime-500" />
                </div>
            ) : (
                <>
                    {/* ─── KPI Cards ─────────────────────────────────────────────── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[
                            { label: 'Receita Bruta', value: dre.receitaBruta, icon: ArrowUpRight, color: 'text-lime-400', bg: 'bg-lime-400/10', sub: `${filtered.filter(t => t.type === 'receita').length} receitas` },
                            { label: 'Lucro Bruto', value: dre.lucroBruto, icon: BarChart3, color: dre.lucroBruto >= 0 ? 'text-lime-400' : 'text-red-400', bg: dre.lucroBruto >= 0 ? 'bg-lime-400/10' : 'bg-red-400/10', sub: `Margem ${dre.margemBruta.toFixed(1)}%` },
                            { label: 'EBIT', value: dre.ebit, icon: TrendingUp, color: dre.ebit >= 0 ? 'text-blue-400' : 'text-red-400', bg: dre.ebit >= 0 ? 'bg-blue-400/10' : 'bg-red-400/10', sub: 'Resultado Operacional' },
                            { label: 'Lucro Líquido', value: dre.lucroLiquido, icon: dre.lucroLiquido >= 0 ? TrendingUp : TrendingDown, color: dre.lucroLiquido >= 0 ? 'text-lime-400' : 'text-red-400', bg: dre.lucroLiquido >= 0 ? 'bg-lime-400/10' : 'bg-red-400/10', sub: `Margem ${dre.margemLiquida.toFixed(1)}%` },
                        ].map(card => (
                            <div key={card.label} className="bg-[#0d1117] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
                                <div className={`w-9 h-9 ${card.bg} rounded-xl flex items-center justify-center mb-3`}>
                                    <card.icon size={18} className={card.color} />
                                </div>
                                <p className="text-xs text-slate-500 font-medium mb-1">{card.label}</p>
                                <p className={`text-xl font-bold font-mono ${card.color}`}>{fmt(card.value)}</p>
                                <p className="text-[11px] text-slate-600 mt-1">{card.sub} · {periodLabel}</p>
                            </div>
                        ))}
                    </div>

                    {/* ─── Tabs ──────────────────────────────────────────────────── */}
                    <div className="flex gap-1 bg-zinc-900/50 border border-white/5 p-1 rounded-xl w-fit mb-6">
                        {([
                            { id: 'dashboard', icon: Activity, label: 'Dashboard' },
                            { id: 'dre', icon: FileText, label: 'DRE' },
                            { id: 'lancamentos', icon: Filter, label: 'Lançamentos' },
                        ] as const).map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-lime-500 text-black font-bold' : 'text-slate-400 hover:text-white'}`}>
                                <tab.icon size={14} />{tab.label}
                            </button>
                        ))}
                    </div>

                    {/* ─── Dashboard Tab ────────────────────────────────────────── */}
                    {activeTab === 'dashboard' && (
                        <div className="space-y-6">
                            {/* Revenue vs Cost chart */}
                            <div className="bg-[#0d1117] border border-white/5 rounded-2xl p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="font-bold text-white">Receitas vs Despesas mensais — {filterYear}</h2>
                                        <p className="text-xs text-slate-500 mt-0.5">Visão comparativa mês a mês do ano selecionado</p>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-slate-400">
                                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-lime-500 inline-block" />Receitas</span>
                                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" />Despesas</span>
                                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-400 inline-block" />Lucro</span>
                                    </div>
                                </div>
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={monthlyChartData} barSize={16} barGap={4}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis dataKey="name" stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} />
                                        <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={11} tickFormatter={fmtShort} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="receitas" name="Receitas" fill="#84cc16" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="custos" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="lucro" name="Lucro" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Balance evolution */}
                                <div className="bg-[#0d1117] border border-white/5 rounded-2xl p-6">
                                    <h2 className="font-bold text-white mb-1">Evolução do Saldo</h2>
                                    <p className="text-xs text-slate-500 mb-5">Saldo acumulado no período selecionado</p>
                                    {balanceData.length === 0 ? (
                                        <div className="h-[220px] flex items-center justify-center text-slate-600 text-sm">Sem lançamentos no período</div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height={220}>
                                            <AreaChart data={balanceData}>
                                                <defs>
                                                    <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={dre.lucroLiquido >= 0 ? '#84cc16' : '#ef4444'} stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#84cc16" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                                <XAxis dataKey="date" stroke="#64748b" tickLine={false} axisLine={false} fontSize={10} tickFormatter={d => d.slice(5)} />
                                                <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={10} tickFormatter={fmtShort} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Area type="monotone" dataKey="balance" name="Saldo" stroke={dre.lucroLiquido >= 0 ? '#84cc16' : '#ef4444'} fill="url(#balGrad)" strokeWidth={2} dot={false} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>

                                {/* Pie chart */}
                                <div className="bg-[#0d1117] border border-white/5 rounded-2xl p-6">
                                    <h2 className="font-bold text-white mb-1">Distribuição de Custos</h2>
                                    <p className="text-xs text-slate-500 mb-5">Breakdown de onde o dinheiro vai</p>
                                    {pieData.length === 0 ? (
                                        <div className="h-[220px] flex items-center justify-center text-slate-600 text-sm">Sem custos no período</div>
                                    ) : (
                                        <div className="flex items-center gap-4">
                                            <ResponsiveContainer width={180} height={200}>
                                                <RechartsPie>
                                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                                                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                                    </Pie>
                                                    <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ backgroundColor: '#0d1117', borderColor: '#ffffff1a', borderRadius: '12px' }} />
                                                </RechartsPie>
                                            </ResponsiveContainer>
                                            <div className="flex-1 space-y-2">
                                                {pieData.map((d, i) => (
                                                    <div key={d.name} className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                                            <span className="text-xs text-slate-400 truncate max-w-[100px]">{d.name}</span>
                                                        </div>
                                                        <span className="text-xs font-mono font-bold text-slate-300">{fmtShort(d.value)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Summary metrics bar */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'Total Receitas', value: dre.receitaBruta, color: 'text-lime-400' },
                                    { label: 'Total CPV', value: dre.cpv, color: 'text-orange-400' },
                                    { label: 'Total Despesas', value: dre.despOp, color: 'text-red-400' },
                                    { label: 'Impostos', value: dre.impostos, color: 'text-purple-400' },
                                ].map(m => (
                                    <div key={m.label} className="bg-zinc-900/60 border border-white/5 rounded-xl p-4">
                                        <p className="text-xs text-slate-500 mb-1">{m.label}</p>
                                        <p className={`text-base font-bold font-mono ${m.color}`}>{fmt(m.value)}</p>
                                        <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full bg-current opacity-60" style={{ width: `${dre.receitaBruta > 0 ? Math.min(100, (m.value / dre.receitaBruta) * 100) : 0}%`, backgroundColor: 'currentColor' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ─── DRE Tab ──────────────────────────────────────────────── */}
                    {activeTab === 'dre' && (
                        <div className="bg-[#0d1117] border border-white/5 rounded-2xl p-6 space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-white/5">
                                <div>
                                    <h2 className="font-bold text-white text-lg">Demonstração do Resultado do Exercício</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">{periodLabel} — Quark Energia</p>
                                </div>
                                <span className="text-xs text-slate-600 border border-white/5 rounded-lg px-2 py-1">{filtered.length} lançamentos</span>
                            </div>

                            <div className="space-y-1">
                                <SectionHeader title="1. Receita Bruta" k="receitas" count={filtered.filter(t => t.type === 'receita').length} />
                                {expanded.receitas && (<div className="pl-4 space-y-0.5">
                                    <DRERow label="Instalações Residenciais" value={dre.recRes} indent={1} />
                                    <DRERow label="Instalações Comerciais" value={dre.recCom} indent={1} />
                                    <DRERow label="Manutenção / Serviços" value={dre.recMan} indent={1} />
                                    <DRERow label="Outras Receitas" value={dre.recOut} indent={1} />
                                </div>)}
                                <DRERow label="(=) Receita Bruta Total" value={dre.receitaBruta} bold green />
                            </div>
                            <hr className="border-white/5" />
                            <div className="space-y-1">
                                <SectionHeader title="2. Custos dos Produtos Vendidos (CPV)" k="cpv" count={filtered.filter(t => t.type === 'custo').length} />
                                {expanded.cpv && (<div className="pl-4 space-y-0.5">
                                    <DRERow label="Equipamentos" value={dre.cpvEq} indent={1} />
                                    <DRERow label="Mão de Obra" value={dre.cpvMO} indent={1} />
                                    <DRERow label="Frete e Logística" value={dre.cpvFr} indent={1} />
                                    <DRERow label="Outros CPV" value={dre.cpvOut} indent={1} />
                                </div>)}
                                <DRERow label="(-) CPV Total" value={-dre.cpv} red />
                                <DRERow label="(=) Lucro Bruto" value={dre.lucroBruto} bold green={dre.lucroBruto >= 0} red={dre.lucroBruto < 0} sub />
                                <div className="text-right text-xs text-slate-600 pr-1">Margem Bruta: {dre.margemBruta.toFixed(1)}%</div>
                            </div>
                            <hr className="border-white/5" />
                            <div className="space-y-1">
                                <SectionHeader title="3. Despesas Operacionais" k="despesas" count={filtered.filter(t => t.type === 'despesa' && t.category !== 'imposto').length} />
                                {expanded.despesas && (<div className="pl-4 space-y-0.5">
                                    <DRERow label="Salários e Encargos" value={dre.depSal} indent={1} />
                                    <DRERow label="Marketing e Publicidade" value={dre.depMkt} indent={1} />
                                    <DRERow label="Aluguel e Infraestrutura" value={dre.depAlq} indent={1} />
                                    <DRERow label="Combustível e Transporte" value={dre.depCom} indent={1} />
                                    <DRERow label="Software e Tecnologia" value={dre.depSof} indent={1} />
                                    <DRERow label="Outras Despesas" value={dre.depOut} indent={1} />
                                </div>)}
                                <DRERow label="(-) Total Despesas Operacionais" value={-dre.despOp} red />
                                <DRERow label="(=) Resultado Operacional (EBIT)" value={dre.ebit} bold green={dre.ebit >= 0} red={dre.ebit < 0} sub />
                            </div>
                            <hr className="border-white/5" />
                            <div className="space-y-1">
                                <SectionHeader title="4. Imposto de Renda e CSLL" k="impostos" count={filtered.filter(t => t.category === 'imposto').length} />
                                {expanded.impostos && <DRERow label="IR / CSLL / Simples Nacional" value={dre.impostos} indent={1} />}
                                <DRERow label="(-) Impostos Total" value={-dre.impostos} red />
                            </div>
                            <hr className="border-white/5" />
                            <div className={`rounded-xl p-5 ${dre.lucroLiquido >= 0 ? 'bg-lime-500/10 border border-lime-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Lucro Líquido do Período</p>
                                        <p className={`text-3xl font-bold font-mono mt-1 ${dre.lucroLiquido >= 0 ? 'text-lime-400' : 'text-red-400'}`}>
                                            {dre.lucroLiquido < 0 ? `(${fmt(Math.abs(dre.lucroLiquido))})` : fmt(dre.lucroLiquido)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500">Margem Líquida</p>
                                        <p className={`text-2xl font-bold ${dre.margemLiquida >= 15 ? 'text-lime-400' : dre.margemLiquida >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                                            {dre.margemLiquida.toFixed(1)}%
                                        </p>
                                    </div>
                                </div>
                                {dre.lucroLiquido < 0 && (
                                    <div className="flex items-center gap-2 mt-3 text-xs text-red-400">
                                        <AlertTriangle size={12} /> Resultado negativo — verifique os custos e despesas do período
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ─── Lançamentos Tab ─────────────────────────────────────── */}
                    {activeTab === 'lancamentos' && (
                        <div className="bg-[#0d1117] border border-white/5 rounded-2xl overflow-hidden">
                            <div className="p-5 border-b border-white/5 flex justify-between items-center">
                                <p className="text-sm font-semibold text-white">{filtered.length} lançamentos · {periodLabel}</p>
                                <div className="flex gap-2 text-xs">
                                    <span className="text-lime-400 font-bold">{fmt(dre.receitaBruta)} entrada</span>
                                    <span className="text-slate-600">/</span>
                                    <span className="text-red-400 font-bold">{fmt(dre.cpv + dre.despOp + dre.impostos)} saída</span>
                                </div>
                            </div>
                            <div className="divide-y divide-white/5">
                                {filtered.length === 0 ? (
                                    <div className="p-14 text-center text-slate-600">
                                        <DollarSign size={32} className="mx-auto mb-3 opacity-30" />
                                        <p>Nenhum lançamento neste período.</p>
                                        <p className="text-sm mt-1">Clique em "+ Lançamento" para adicionar.</p>
                                    </div>
                                ) : (
                                    [...filtered]
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .map(t => (
                                            <div key={t.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors group">
                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.type === 'receita' ? 'bg-lime-500' : t.type === 'custo' ? 'bg-orange-500' : 'bg-red-500'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-white truncate">{t.description}</p>
                                                    <p className="text-xs text-slate-500">{CATEGORY_LABELS[t.category]} · {new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}{t.note ? ` · ${t.note}` : ''}</p>
                                                </div>
                                                <span className={`text-[10px] px-2 py-0.5 rounded border font-bold flex-shrink-0 ${typeColors[t.type]}`}>
                                                    {typeLabels[t.type]}
                                                </span>
                                                <span className={`text-sm font-bold font-mono flex-shrink-0 w-32 text-right ${t.type === 'receita' ? 'text-lime-400' : 'text-red-400'}`}>
                                                    {t.type === 'receita' ? '+' : '-'} {fmt(t.amount)}
                                                </span>
                                                <button onClick={() => handleDelete(t.id)} className="p-1.5 text-slate-700 hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ─── Add Form Drawer (Slide-over) ─────────────────────────────────── */}
            {showForm && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex justify-end" onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
                    <div className="bg-[#0b0f15] border-l border-white/10 w-full max-w-md h-full shadow-2xl flex flex-col animate-slide-in-right relative">
                        {/* Glow effect */}
                        <div className="absolute top-0 right-0 w-full h-full bg-lime-500/5 blur-[120px] pointer-events-none" />
                        
                        <div className="flex items-center justify-between p-6 border-b border-white/5 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-lime-500/10 rounded-lg flex items-center justify-center">
                                    <Plus size={16} className="text-lime-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">Lançamento Rápido</h3>
                                    <p className="text-xs text-slate-500">Registre sua movimentação em segundos.</p>
                                </div>
                            </div>
                            <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"><X size={16} /></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-5 relative z-10">
                            {/* Type selector */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider">Tipo de Movimentação</label>
                                <div className="flex gap-2">
                                    {(['receita', 'custo', 'despesa'] as TransactionType[]).map(t => (
                                        <button key={t} onClick={() => setForm(f => ({ ...f, type: t, category: CATEGORIES_BY_TYPE[t][0] }))}
                                            className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${form.type === t ? typeColors[t] : 'bg-zinc-800/40 border-white/5 text-slate-500 hover:text-slate-300 hover:bg-zinc-800/80'}`}>
                                            {t === 'receita' ? <TrendingUp size={16} /> : t === 'custo' ? <Activity size={16} /> : <TrendingDown size={16} />}
                                            {typeLabels[t]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Descrição Curta</label>
                                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    autoFocus
                                    placeholder="Ex: Almoço Cliente ou Venda João"
                                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-lime-500 transition-colors shadow-inner" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Categoria</label>
                                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))}
                                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-lime-500 transition-colors appearance-none shadow-inner">
                                        {CATEGORIES_BY_TYPE[form.type].map(c => <option key={c} value={c} className="bg-zinc-900">{CATEGORY_LABELS[c]}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Valor (R$)</label>
                                    <div className="relative">
                                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">R$</div>
                                        <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                            placeholder="0,00" min="0" step="0.01"
                                            className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-lime-500 transition-colors shadow-inner" />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Data do Lançamento</label>
                                    <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-lime-500 transition-colors shadow-inner" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Nota Adicional</label>
                                    <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                                        placeholder="Ex: Financiado 24x"
                                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-lime-500 transition-colors shadow-inner" />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/5 bg-black/40 relative z-10 flex gap-3">
                            <button onClick={() => setShowForm(false)} className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-colors">
                                Cancelar
                            </button>
                            <button onClick={handleAdd} disabled={!form.description || !form.amount || saving}
                                className="flex-1 py-3.5 bg-gradient-to-r from-lime-500 to-lime-400 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-black shadow-[0_0_15px_rgba(132,204,34,0.3)] rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
                                {saving ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : <><Check size={18} /> Salvar Lançamento</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Financial;
