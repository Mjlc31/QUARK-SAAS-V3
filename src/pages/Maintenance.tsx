import React, { useState } from 'react';
import { 
  Wrench, 
  Search, 
  Plus, 
  Calendar, 
  LayoutGrid, 
  List as ListIcon, 
  Filter, 
  DollarSign,
  TrendingUp,
  Percent,
  X,
  Check
} from 'lucide-react';
import { useMaintenance, useMaintenanceStats, useCreateMaintenance, useUpdateMaintenance } from '../hooks/useMaintenance';
import { MaintenanceService, MaintenanceServiceStatus, MaintenanceServiceType } from '../types';

const Maintenance: React.FC = () => {
  const { data: services, isLoading } = useMaintenance();
  const { data: stats } = useMaintenanceStats();
  const createService = useCreateMaintenance();
  const updateService = useUpdateMaintenance();

  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<MaintenanceServiceStatus | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    client_name: '',
    service_type: 'manutencao' as MaintenanceServiceType,
    scheduled_date: '',
    price: 0,
    cost: 0,
    technician: '',
    notes: ''
  });

  const MONTHLY_REVENUE_GOAL = 10000;
  const MONTHLY_SERVICE_GOAL = 20;

  const currentRevenue = stats?.revenueThisMonth || 0;
  const currentServices = stats?.completedThisMonth || 0;
  
  const revenueProgress = Math.min((currentRevenue / MONTHLY_REVENUE_GOAL) * 100, 100);
  const serviceProgress = Math.min((currentServices / MONTHLY_SERVICE_GOAL) * 100, 100);

  const getStatusBadge = (status: MaintenanceServiceStatus) => {
    switch(status) {
      case 'pendente': return 'bg-yellow-500/10 text-yellow-400';
      case 'agendado': return 'bg-blue-500/10 text-blue-400';
      case 'em_campo': return 'bg-purple-500/10 text-purple-400';
      case 'concluido': return 'bg-green-500/10 text-green-400';
      default: return 'bg-zinc-500/10 text-zinc-400';
    }
  };

  const getStatusLabel = (status: MaintenanceServiceStatus) => {
    switch(status) {
      case 'pendente': return 'Pendente';
      case 'agendado': return 'Agendado';
      case 'em_campo': return 'Em Campo';
      case 'concluido': return 'Concluído';
      default: return status;
    }
  };

  const filteredServices = services?.filter(s => {
    const matchesSearch = s.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchesSearch && matchesStatus;
  }) || [];

  const kanbanColumns: MaintenanceServiceStatus[] = ['pendente', 'agendado', 'em_campo', 'concluido'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createService.mutateAsync({
      service_type: formData.service_type,
      status: 'pendente',
      scheduled_date: formData.scheduled_date,
      price: formData.price,
      cost: formData.cost,
      technician: formData.technician,
      notes: formData.notes,
      client_name: formData.client_name,
      before_photos: [],
      after_photos: []
    } as any);
    setIsModalOpen(false);
    setFormData({
      client_name: '',
      service_type: 'manutencao',
      scheduled_date: '',
      price: 0,
      cost: 0,
      technician: '',
      notes: ''
    });
  };

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-8 animate-enter pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3">
            <Wrench className="text-lime-400" size={32} />
            Manutenção & Limpeza
          </h2>
          <p className="text-slate-400 text-sm mt-1">Receita Recorrente</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary px-5 py-2.5 rounded-xl flex items-center gap-2"
        >
          <Plus size={18} /> Novo Serviço
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Serviços do Mês</p>
            <Wrench size={16} className="text-lime-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mb-2">{currentServices} <span className="text-sm text-slate-500 font-sans">/ 20</span></p>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-lime-500 transition-all duration-1000" style={{ width: `${serviceProgress}%` }} />
          </div>
        </div>
        
        <div className="glass-panel p-5 rounded-2xl">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Faturamento do Mês</p>
            <DollarSign size={16} className="text-lime-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mb-2">{fmt(currentRevenue)} <span className="text-sm text-slate-500 font-sans">/ 10k</span></p>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-lime-500 transition-all duration-1000" style={{ width: `${revenueProgress}%` }} />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Lucro Líquido</p>
            <TrendingUp size={16} className="text-blue-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-blue-400 mt-1">{fmt(stats?.profitThisMonth || 0)}</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Margem Média</p>
            <Percent size={16} className="text-lime-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-lime-400 mt-1">{fmt(stats?.avgProfitPerService || 0)}</p>
        </div>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-lime-500 outline-none"
            />
          </div>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-lime-500 outline-none"
          >
            <option value="all">Todos os Status</option>
            <option value="pendente">Pendente</option>
            <option value="agendado">Agendado</option>
            <option value="em_campo">Em Campo</option>
            <option value="concluido">Concluído</option>
          </select>
        </div>
        
        <div className="flex gap-1 bg-zinc-900/50 p-1 border border-white/5 rounded-xl">
          <button 
            onClick={() => setViewMode('kanban')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'kanban' ? 'bg-zinc-800 text-lime-400' : 'text-slate-500 hover:text-white'}`}
          >
            <LayoutGrid size={18} />
          </button>
          <button 
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-zinc-800 text-lime-400' : 'text-slate-500 hover:text-white'}`}
          >
            <ListIcon size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-64 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 overflow-x-auto pb-4">
          {kanbanColumns.map(status => (
            <div key={status} className="bg-zinc-900/30 rounded-2xl p-4 min-w-[300px] border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white capitalize">{getStatusLabel(status)}</h3>
                <span className="bg-white/10 text-white text-xs px-2 py-1 rounded-full">
                  {filteredServices.filter(s => s.status === status).length}
                </span>
              </div>
              <div className="space-y-3">
                {filteredServices.filter(s => s.status === status).map(service => (
                  <div key={service.id} className="glass-panel p-4 rounded-xl cursor-pointer hover:border-lime-500/30 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-white text-sm truncate">{service.client_name}</p>
                      <span className={`text-[10px] px-2 py-1 rounded-md uppercase font-bold ${getStatusBadge(service.status)}`}>
                        {getStatusLabel(service.status)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mb-3 space-y-1">
                      <p className="capitalize">{service.service_type}</p>
                      <p className="flex items-center gap-1"><Calendar size={12}/> {service.scheduled_date ? new Date(service.scheduled_date).toLocaleDateString('pt-BR') : 'Sem data'}</p>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-white/5">
                      <div>
                        <p className="text-xs text-slate-500">{service.technician || 'Não alocado'}</p>
                        {service.status !== 'concluido' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); updateService.mutate({ id: service.id, status: 'concluido' }); }}
                            className="mt-1 text-[10px] text-lime-400 hover:text-lime-300 flex items-center gap-1 font-bold uppercase"
                          >
                            <Check size={10} /> Concluir
                          </button>
                        )}
                      </div>
                      <p className="text-sm font-bold text-lime-400">{fmt(service.price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase">Cliente</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase">Tipo</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase">Agendado</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase">Preço</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase">Lucro</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase">Técnico</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredServices.map(service => (
                  <tr key={service.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-4 text-sm font-medium text-white">{service.client_name}</td>
                    <td className="p-4 text-sm text-slate-300 capitalize">{service.service_type}</td>
                    <td className="p-4">
                      <span className={`text-[10px] px-2 py-1 rounded-md uppercase font-bold ${getStatusBadge(service.status)}`}>
                        {getStatusLabel(service.status)}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-400">
                      {service.scheduled_date ? new Date(service.scheduled_date).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="p-4 text-sm font-bold text-lime-400 font-mono">{fmt(service.price)}</td>
                    <td className="p-4 text-sm font-bold text-blue-400 font-mono">{fmt(service.price - service.cost)}</td>
                    <td className="p-4 text-sm text-slate-400">{service.technician || '-'}</td>
                    <td className="p-4 text-right">
                      {service.status !== 'concluido' && (
                        <button 
                          onClick={() => updateService.mutate({ id: service.id, status: 'concluido' })}
                          className="p-1.5 rounded-lg bg-lime-500/10 text-lime-400 hover:bg-lime-500/20 transition-colors inline-flex"
                          title="Marcar como Concluído"
                        >
                          <Check size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-white/10">
            <div className="flex justify-between items-center p-6 border-b border-white/5">
              <h3 className="text-xl font-bold text-white">Novo Serviço</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome do Cliente</label>
                <input 
                  required
                  type="text" 
                  value={formData.client_name}
                  onChange={e => setFormData({...formData, client_name: e.target.value})}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-lime-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tipo de Serviço</label>
                  <select 
                    value={formData.service_type}
                    onChange={e => setFormData({...formData, service_type: e.target.value as any})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-lime-500"
                  >
                    <option value="manutencao">Manutenção</option>
                    <option value="limpeza">Limpeza</option>
                    <option value="inspecao">Inspeção</option>
                    <option value="reparo">Reparo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Data Agendada</label>
                  <input 
                    type="date" 
                    value={formData.scheduled_date}
                    onChange={e => setFormData({...formData, scheduled_date: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-lime-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Preço Cobrado</label>
                  <input 
                    required
                    type="number" 
                    value={formData.price || ''}
                    onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-lime-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Custo Estimado</label>
                  <input 
                    required
                    type="number" 
                    value={formData.cost || ''}
                    onChange={e => setFormData({...formData, cost: Number(e.target.value)})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-lime-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Técnico Responsável</label>
                <input 
                  type="text" 
                  value={formData.technician}
                  onChange={e => setFormData({...formData, technician: e.target.value})}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-lime-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Observações</label>
                <textarea 
                  rows={3}
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-lime-500 resize-none"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white transition-colors">Cancelar</button>
                <button type="submit" className="btn-primary px-5 py-2.5 rounded-xl flex items-center gap-2" disabled={createService.isPending}>
                  {createService.isPending ? 'Salvando...' : <><Check size={18} /> Salvar Serviço</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maintenance;
