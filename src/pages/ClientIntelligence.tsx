import React, { useState, useMemo } from 'react';
import { 
  Users, Zap, Calendar, TrendingUp, Search, Plus, 
  Settings, X, ShieldAlert, CheckCircle, Save
} from 'lucide-react';
import { useClientIntelligence, useCreateIntelligence } from '../hooks/useClientIntelligence';
import { ClientIntelligenceRecord } from '../types';
import { SkeletonPage } from '../components/SkeletonLoader';

const ClientIntelligence: React.FC = () => {
  const { data: records = [], isLoading: loading = false } = useClientIntelligence() || {};
  const createIntelligence = useCreateIntelligence();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProvider, setFilterProvider] = useState<'all' | 'quark' | 'terceiro'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState<Partial<ClientIntelligenceRecord>>({
    client_name: '',
    system_size_kw: 0,
    installed_by: 'quark',
    is_active: true,
  });

  // KPIs
  const kpis = useMemo(() => {
    const activeClients = records.filter((r: ClientIntelligenceRecord) => r.is_active).length;
    const totalSavings = records.reduce((acc: number, r: ClientIntelligenceRecord) => acc + (Number(r.total_savings_brl) || 0), 0);
    const totalGen = records.reduce((acc: number, r: ClientIntelligenceRecord) => acc + (Number(r.monthly_generation_kwh) || 0), 0);
    
    // proximas manutencoes
    const now = new Date();
    const future30 = new Date();
    future30.setDate(now.getDate() + 30);
    
    const nextMaintenance = records.filter((r: ClientIntelligenceRecord) => {
      if (!r.next_maintenance_date) return false;
      const mDate = new Date(r.next_maintenance_date);
      return mDate >= now && mDate <= future30;
    }).length;

    return { activeClients, totalSavings, totalGen, nextMaintenance };
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((r: ClientIntelligenceRecord) => {
      const matchSearch = r.client_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchProvider = filterProvider === 'all' || r.installed_by === filterProvider;
      return matchSearch && matchProvider;
    });
  }, [records, searchTerm, filterProvider]);

  const handleSave = async () => {
    if (!formData.client_name) return;
    
    await createIntelligence.mutateAsync({
      client_name: formData.client_name,
      system_size_kw: Number(formData.system_size_kw),
      installed_by: formData.installed_by as 'quark' | 'terceiro',
      is_active: formData.is_active ?? true,
      total_savings_brl: 0
    });
    
    setIsModalOpen(false);
    setFormData({ client_name: '', system_size_kw: 0, installed_by: 'quark', is_active: true });
  };

  const isOver6Months = (dateStr?: string) => {
    if (!dateStr) return true;
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 180;
  };
  if (loading) return <div className="p-8"><SkeletonPage /></div>;

  return (
    <div className="space-y-6 pb-20 animate-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Users className="text-lime-400" /> Inteligência de Clientes
          </h1>
          <p className="text-sm text-slate-400 mt-1">Banco central de dados da carteira fotovoltaica.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-lime-500 hover:bg-lime-400 text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-lime-500/20"
        >
          <Plus size={18} /> Novo Cliente
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-center">
          <div className="w-10 h-10 rounded-xl bg-lime-500/10 flex items-center justify-center mb-3">
            <CheckCircle className="text-lime-400" size={20} />
          </div>
          <p className="text-xs text-slate-500 font-bold uppercase">Clientes Ativos</p>
          <p className="text-2xl font-bold font-mono text-white mt-1">{kpis.activeClients}</p>
        </div>
        
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-center">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mb-3">
            <TrendingUp className="text-green-400" size={20} />
          </div>
          <p className="text-xs text-slate-500 font-bold uppercase">Economia Acumulada</p>
          <p className="text-xl font-bold font-mono text-green-400 mt-1">
            R$ {kpis.totalSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-center">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center mb-3">
            <Zap className="text-yellow-400" size={20} />
          </div>
          <p className="text-xs text-slate-500 font-bold uppercase">Geração Total</p>
          <p className="text-xl font-bold font-mono text-white mt-1">
            {kpis.totalGen.toLocaleString()} <span className="text-sm text-slate-500">kWh/mês</span>
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-center">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-3">
            <Settings className="text-orange-400" size={20} />
          </div>
          <p className="text-xs text-slate-500 font-bold uppercase">Próx. Manutenções</p>
          <p className="text-2xl font-bold font-mono text-white mt-1">{kpis.nextMaintenance}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Buscar por nome do cliente..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-lime-500 outline-none placeholder-slate-500 transition-all"
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <select 
            value={filterProvider} 
            onChange={e => setFilterProvider(e.target.value as any)}
            className="bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none cursor-pointer"
          >
            <option value="all">Todos Instaladores</option>
            <option value="quark">Instalado pela Quark</option>
            <option value="terceiro">Instalado por Terceiros</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-zinc-900/80 border-b border-white/5 text-xs uppercase font-bold text-slate-500 tracking-wider">
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Sistema (kWp)</th>
                <th className="px-6 py-4">Data Instalação</th>
                <th className="px-6 py-4">Última Manutenção</th>
                <th className="px-6 py-4">Próxima Manut.</th>
                <th className="px-6 py-4">Economia (R$)</th>
                <th className="px-6 py-4">Origem</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">Carregando...</td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">Nenhum registro encontrado.</td>
                </tr>
              ) : (
                filteredRecords.map((r: ClientIntelligenceRecord) => {
                  const needsMaintenance = isOver6Months(r.last_maintenance_date);
                  
                  return (
                    <tr 
                      key={r.id} 
                      className={`hover:bg-white/5 transition-colors relative group ${needsMaintenance ? 'border-l-2 border-l-red-500/50' : 'border-l-2 border-l-transparent'}`}
                    >
                      <td className="px-6 py-4 text-sm font-bold text-white pl-4">
                        {r.client_name}
                        {needsMaintenance && (
                           <ShieldAlert size={14} className="inline ml-2 text-red-400" aria-label="Alerta de manutenção > 6 meses" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-lime-400">{r.system_size_kw || 0} kWp</td>
                      <td className="px-6 py-4 text-xs text-slate-300">
                        {r.install_start_date ? new Date(r.install_start_date).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className={`px-6 py-4 text-xs ${needsMaintenance ? 'text-red-400 font-bold' : 'text-slate-300'}`}>
                        {r.last_maintenance_date ? new Date(r.last_maintenance_date).toLocaleDateString('pt-BR') : 'Nunca'}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-300">
                        {r.next_maintenance_date ? new Date(r.next_maintenance_date).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-green-400 font-bold">
                        R$ {Number(r.total_savings_brl || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-[10px] rounded uppercase font-bold tracking-wider ${
                          r.installed_by === 'quark' 
                            ? 'bg-lime-500/10 text-lime-400' 
                            : 'bg-purple-500/10 text-purple-400'
                        }`}>
                          {r.installed_by}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`flex items-center gap-1.5 text-xs font-bold ${r.is_active ? 'text-green-400' : 'text-zinc-500'}`}>
                          <span className={`w-2 h-2 rounded-full ${r.is_active ? 'bg-green-400' : 'bg-zinc-500'}`}></span>
                          {r.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Record Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-scale">
          <div className="glass-panel p-8 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Novo Cliente Intel</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white"><X size={20}/></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Cliente</label>
                <input 
                  type="text" 
                  value={formData.client_name}
                  onChange={e => setFormData({...formData, client_name: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-lime-500 outline-none" 
                  placeholder="Nome ou Empresa" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Potência (kWp)</label>
                  <input 
                    type="number" 
                    value={formData.system_size_kw}
                    onChange={e => setFormData({...formData, system_size_kw: Number(e.target.value)})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-lime-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Instalador</label>
                  <select 
                    value={formData.installed_by}
                    onChange={e => setFormData({...formData, installed_by: e.target.value as any})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-lime-500 outline-none appearance-none" 
                  >
                    <option value="quark">Quark Energia</option>
                    <option value="terceiro">Terceirizado</option>
                  </select>
                </div>
              </div>
              
              <button 
                onClick={handleSave}
                className="w-full mt-4 bg-lime-500 hover:bg-lime-400 text-black py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <Save size={18} /> Salvar Cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientIntelligence;
