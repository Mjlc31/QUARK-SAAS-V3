import React, { useState } from 'react';
import { Users, Plus, Search, MapPin, Zap, X, ShieldCheck, Mail, Phone, Calendar, User } from 'lucide-react';
import { useClients, useCreateClient, useDeleteClient, ClientData } from '../hooks/useClients';
import toast from 'react-hot-toast';

export default function ClientCatalog() {
  const { data: clients = [], isLoading } = useClients();
  const createClient = useCreateClient();
  const deleteClient = useDeleteClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<ClientData>>({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    birth_date: '',
    install_date: '',
    system_size_kw: 0,
  });

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.cpf && c.cpf.includes(searchTerm))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createClient.mutateAsync(formData);
      setIsModalOpen(false);
      setFormData({
        name: '', email: '', phone: '', cpf: '', birth_date: '', install_date: '', system_size_kw: 0
      });
      toast.success('Cliente adicionado com sucesso! Ele já pode acessar o Portal usando CPF e Email.');
    } catch (err: any) {
      toast.error(`Erro ao adicionar cliente: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col h-full animate-enter">
      <div className="max-w-7xl mx-auto w-full space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl md:text-3xl font-bold text-white font-display flex items-center gap-3">
              <div className="p-2.5 bg-lime-500/10 rounded-xl border border-lime-500/20">
                <Users className="w-6 h-6 text-lime-400" />
              </div>
              Clientes
            </h1>
            <p className="text-zinc-400 text-sm md:text-base max-w-2xl">
              Gerencie todos os clientes ativos. Os clientes cadastrados aqui terão acesso automático ao Portal do Cliente.
            </p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 h-12 bg-lime-500 hover:bg-lime-400 text-black font-bold rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-lime-500/20"
          >
            <Plus className="w-5 h-5" />
            Novo Cliente
          </button>
        </div>

        {/* Toolbar */}
        <div className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Buscar por nome, email ou CPF..."
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 pl-12 pr-4 text-white focus:border-lime-500/50 outline-none transition-all placeholder-zinc-600"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <span className="flex h-2 w-2 rounded-full bg-lime-500"></span>
            {clients.length} Clientes Cadastrados
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-500"></div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center glass-panel rounded-3xl border border-white/5 animate-enter">
            <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Nenhum cliente encontrado</h3>
            <p className="text-zinc-400 max-w-sm mb-6">
              {searchTerm 
                ? 'Sua busca não retornou nenhum resultado. Tente buscar por outros termos.'
                : 'Seu catálogo está vazio. Adicione seu primeiro cliente para que ele possa acessar o portal.'}
            </p>
            {!searchTerm && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Cadastrar Cliente
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map(client => (
              <div key={client.id} className="glass-panel p-5 rounded-2xl border border-white/5 hover:border-lime-500/30 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-white text-lg truncate pr-2">{client.name}</h3>
                    {(client as any).auth_user_id ? (
                      <p className="text-zinc-400 text-xs mt-1 flex items-center gap-1.5 bg-lime-500/10 px-2 py-0.5 rounded-full inline-flex border border-lime-500/20">
                        <ShieldCheck className="w-3 h-3 text-lime-500" /> <span className="text-lime-400 font-medium">Portal Ativo</span>
                      </p>
                    ) : (
                      <p className="text-zinc-500 text-xs mt-1 flex items-center gap-1.5 bg-zinc-800/50 px-2 py-0.5 rounded-full inline-flex border border-zinc-700/50">
                        <User className="w-3 h-3 text-zinc-500" /> <span>Convite Pendente</span>
                      </p>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold border border-zinc-700 shrink-0">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                
                <div className="space-y-2 mt-6">
                  <div className="flex items-center gap-3 text-zinc-400 text-sm">
                    <Mail className="w-4 h-4 shrink-0" />
                    <span className="truncate" title={client.email}>{client.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-zinc-400 text-sm">
                    <Phone className="w-4 h-4 shrink-0" />
                    <span>{client.phone || 'Sem telefone'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-zinc-400 text-sm">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>CPF: {client.cpf || 'Não informado'}</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex gap-2">
                  <button 
                    onClick={() => toast.success('Painel de detalhes do cliente em construção.')}
                    className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold transition-colors">
                    Ver Detalhes
                  </button>
                  <button 
                    onClick={() => {
                      if (confirm('Remover este cliente do catálogo? O acesso dele ao portal será revogado.')) {
                        deleteClient.mutate(client.id);
                      }
                    }}
                    className="py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-bold transition-colors"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Novo Cliente */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center sticky top-0 bg-zinc-950/80 backdrop-blur-md z-10">
                <h2 className="text-xl font-bold text-white font-display">Adicionar Cliente</h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Dados Pessoais */}
                  <div className="space-y-4 md:col-span-2">
                    <h3 className="text-sm font-bold text-lime-400 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
                      <Users className="w-4 h-4" /> Dados Pessoais (Acesso ao Portal)
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm text-zinc-400">Nome Completo</label>
                        <input 
                          type="text" required
                          value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-lime-500 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-zinc-400">Email (Usado p/ login no portal)</label>
                        <input 
                          type="email" required
                          value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-lime-500 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-zinc-400">CPF</label>
                        <input 
                          type="text" required placeholder="000.000.000-00"
                          value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-lime-500 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-zinc-400">Telefone (WhatsApp)</label>
                        <input 
                          type="text" required placeholder="(00) 00000-0000"
                          value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-lime-500 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-zinc-400">Data de Nascimento</label>
                        <input 
                          type="date"
                          value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-lime-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dados da Instalação */}
                  <div className="space-y-4 md:col-span-2 mt-4">
                    <h3 className="text-sm font-bold text-lime-400 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
                      <Zap className="w-4 h-4" /> Dados do Sistema
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm text-zinc-400">Potência do Sistema (kWp)</label>
                        <input 
                          type="number" step="0.01"
                          value={formData.system_size_kw || ''} onChange={e => setFormData({...formData, system_size_kw: Number(e.target.value)})}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-lime-500 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-zinc-400">Data da Instalação</label>
                        <input 
                          type="date"
                          value={formData.install_date || ''} onChange={e => setFormData({...formData, install_date: e.target.value})}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-lime-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={createClient.isPending}
                    className="px-8 py-3 bg-lime-500 hover:bg-lime-400 text-black font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {createClient.isPending ? 'Salvando...' : 'Salvar e Criar Acesso'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
