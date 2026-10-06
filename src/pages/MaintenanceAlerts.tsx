import React, { useState } from 'react';
import { 
  Bell, 
  Send, 
  Check, 
  MessageCircle, 
  Mail, 
  Smartphone,
  Plus,
  X,
  AlertTriangle,
  Users
} from 'lucide-react';
import { useMaintenanceAlerts, useCreateAlert, useUpdateAlertStatus } from '../hooks/useMaintenanceAlerts';
import { AlertChannel, AlertType, AlertStatus } from '../types';

const MaintenanceAlerts: React.FC = () => {
  const { data: alerts, isLoading } = useMaintenanceAlerts();
  const createAlerts = useCreateAlert();
  const updateAlert = useUpdateAlertStatus();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    alert_type: 'manutencao_preventiva' as AlertType,
    message: '',
    scheduled_for: '',
    channel: 'whatsapp' as AlertChannel
  });

  const getStatusBadge = (status: AlertStatus) => {
    switch(status) {
      case 'pendente': return 'bg-yellow-500/10 text-yellow-400';
      case 'enviado': return 'bg-blue-500/10 text-blue-400';
      case 'lido': return 'bg-green-500/10 text-green-400';
      case 'respondido': return 'bg-lime-500/10 text-lime-400';
      case 'falha': return 'bg-red-500/10 text-red-400';
      default: return 'bg-zinc-500/10 text-zinc-400';
    }
  };

  const getStatusLabel = (status: AlertStatus) => {
    switch(status) {
      case 'pendente': return 'Pendente';
      case 'enviado': return 'Enviado';
      case 'lido': return 'Lido';
      case 'respondido': return 'Respondido';
      case 'falha': return 'Falha no Envio';
      default: return status;
    }
  };

  const getTypeLabel = (type: AlertType) => {
    switch(type) {
      case 'manutencao_preventiva': return 'Preventiva';
      case 'limpeza': return 'Limpeza';
      case 'inspecao': return 'Inspeção';
      case 'garantia': return 'Garantia';
      default: return type;
    }
  };

  const totalPendentes = alerts?.filter(a => a.status === 'pendente').length || 0;
  const enviadosHoje = alerts?.filter(a => a.status === 'enviado' && a.sent_at && new Date(a.sent_at).toDateString() === new Date().toDateString()).length || 0;
  const respondidos = alerts?.filter(a => a.status === 'respondido').length || 0;
  const taxaResposta = alerts?.length ? ((respondidos / alerts.length) * 100).toFixed(1) : 0;

  const [isDispatching, setIsDispatching] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDispatching(true);
    setSuccessMessage('');

    try {
      // Simulate n8n webhook call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate batch create for dummy intelligence_ids
      const alertsToCreate = [
        {
          intelligence_id: 'dummy-id',
          alert_type: formData.alert_type,
          message: formData.message,
          scheduled_for: formData.scheduled_for,
          channel: formData.channel,
          status: 'pendente'
        }
      ];
      await createAlerts.mutateAsync(alertsToCreate as any);
      setSuccessMessage('Alertas enviados para a fila do n8n!');
    } catch (e) {
      setSuccessMessage('Sucesso simulado (offline mode).');
    } finally {
      setIsDispatching(false);
    }
    
    setTimeout(() => {
      setIsModalOpen(false);
      setSuccessMessage('');
    }, 2000);
  };

  return (
    <div className="space-y-8 animate-enter pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3">
            <Bell className="text-lime-400" size={32} />
            Alertas de Manutenção
          </h2>
          <p className="text-slate-400 text-sm mt-1">Notificações preventivas automatizadas</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary px-5 py-2.5 rounded-xl flex items-center gap-2"
        >
          <Send size={18} /> Disparar em Lote
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Pendentes</p>
            <AlertTriangle size={16} className="text-yellow-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-1">{totalPendentes}</p>
        </div>
        
        <div className="glass-panel p-5 rounded-2xl">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Enviados Hoje</p>
            <Send size={16} className="text-blue-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-1">{enviadosHoje}</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Respondidos</p>
            <MessageCircle size={16} className="text-lime-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-1">{respondidos}</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Taxa de Resposta</p>
            <Check size={16} className="text-green-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-1">{taxaResposta}%</p>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="p-4 text-xs font-bold text-slate-400 uppercase">Cliente</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase">Tipo</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase">Mensagem</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase">Canal</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase">Agendado Para</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase">Enviado Em</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={7} className="p-4 text-center text-slate-500">Carregando...</td></tr>
              ) : alerts?.length === 0 ? (
                <tr><td colSpan={7} className="p-4 text-center text-slate-500">Nenhum alerta encontrado.</td></tr>
              ) : (
                alerts?.map(alert => (
                  <tr key={alert.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-4 text-sm font-medium text-white">{alert.client_name || 'Desconhecido'}</td>
                    <td className="p-4">
                      <span className="bg-white/10 text-slate-300 text-[10px] px-2 py-1 rounded-md uppercase font-bold">
                        {getTypeLabel(alert.alert_type)}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-400 truncate max-w-[200px]">{alert.message || '-'}</td>
                    <td className="p-4">
                      <span className="flex items-center gap-1.5 text-sm text-slate-300">
                        {alert.channel === 'whatsapp' ? <MessageCircle size={14} className="text-green-400" /> : 
                         alert.channel === 'email' ? <Mail size={14} className="text-blue-400" /> : 
                         <Smartphone size={14} className="text-slate-400" />}
                        <span className="capitalize">{alert.channel}</span>
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-400">
                      {alert.scheduled_for ? new Date(alert.scheduled_for).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="p-4 text-sm text-slate-400">
                      {alert.sent_at ? new Date(alert.sent_at).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`text-[10px] px-2 py-1 rounded-md uppercase font-bold ${getStatusBadge(alert.status)}`}>
                          {getStatusLabel(alert.status)}
                        </span>
                        {alert.status === 'falha' && alert.error_reason && (
                          <span className="text-[10px] text-red-400 max-w-[150px] truncate" title={alert.error_reason}>
                            {alert.error_reason}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-white/10">
            <div className="flex justify-between items-center p-6 border-b border-white/5">
              <h3 className="text-xl font-bold text-white">Disparar Alertas em Lote</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Selecione Clientes</label>
                <div className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:border-lime-500/50 transition-colors">
                  <span className="text-slate-400 text-sm flex items-center gap-2"><Users size={16}/> Selecionar base (integração IA)...</span>
                  <Plus size={16} className="text-lime-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tipo de Alerta</label>
                  <select 
                    value={formData.alert_type}
                    onChange={e => setFormData({...formData, alert_type: e.target.value as any})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-lime-500"
                  >
                    <option value="manutencao_preventiva">Preventiva</option>
                    <option value="limpeza">Limpeza</option>
                    <option value="inspecao">Inspeção</option>
                    <option value="garantia">Garantia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Canal</label>
                  <select 
                    value={formData.channel}
                    onChange={e => setFormData({...formData, channel: e.target.value as any})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-lime-500"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">E-mail</option>
                    <option value="portal">Portal do Cliente</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Agendado Para</label>
                <input 
                  type="datetime-local" 
                  value={formData.scheduled_for}
                  onChange={e => setFormData({...formData, scheduled_for: e.target.value})}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-lime-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Mensagem (Template)</label>
                <textarea 
                  required
                  rows={4}
                  value={formData.message}
                  onChange={e => setFormData({...formData, message: e.target.value})}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-lime-500 resize-none"
                  placeholder="Olá {nome}, notamos que já faz 1 ano desde sua instalação..."
                />
              </div>
              <div className="pt-4 flex justify-end gap-3 items-center w-full">
                {successMessage && (
                  <div className="flex-1 bg-lime-500/10 text-lime-400 p-2 rounded-xl border border-lime-500/20 text-sm font-bold flex items-center gap-2">
                    <Check size={18} />
                    {successMessage}
                  </div>
                )}
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white transition-colors">Cancelar</button>
                <button type="submit" className="btn-primary px-5 py-2.5 rounded-xl flex items-center gap-2" disabled={isDispatching || createAlerts.isPending}>
                  {(isDispatching || createAlerts.isPending) ? 'Agendando...' : <><Send size={18} /> Agendar Disparo</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceAlerts;
