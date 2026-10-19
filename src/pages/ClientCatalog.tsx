import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Users, Plus, Search, MapPin, Zap, X, ShieldCheck, Mail, Phone, 
  Calendar, User, Edit2, Trash2, RotateCcw, MessageCircle, 
  Building2, Activity, Check, Copy, Shield, 
  Sparkles, ExternalLink, FileText, ChevronLeft, ChevronRight,
  LayoutGrid, List, ArrowUpDown, Filter, ChevronDown
} from 'lucide-react';
import { 
  useClients, 
  useCreateClient, 
  useUpdateClient, 
  useDeleteClient, 
  useRestoreClient, 
  useHardDeleteClient, 
  ClientData 
} from '../hooks/useClients';
import toast from 'react-hot-toast';
import { formatPhone, whatsappUrl, initials, formatDate } from '../lib/format';
import { formatDoc, formatCep } from '../lib/br';
import { useNavigate } from 'react-router-dom';

// ─── COMPONENTE MEMOIZADO: CARD DE CLIENTE ──────────────────────────────────
interface ClientCardProps {
  client: ClientData;
  isTrash: boolean;
  onSelect: (c: ClientData) => void;
  onEdit: (c: ClientData) => void;
  onDelete: (id: string, name: string) => void;
  onRestore: (id: string, name: string) => void;
  onHardDelete: (id: string, name: string) => void;
}

const ClientCard = React.memo(function ClientCard({
  client,
  isTrash,
  onSelect,
  onEdit,
  onDelete,
  onRestore,
  onHardDelete
}: ClientCardProps) {
  const hasPortalAuth = Boolean(client.auth_user_id);
  const systemPower = client.system_size_kw ? Number(client.system_size_kw) : null;
  const firstName = client.name.split(' ')[0] || 'Cliente';
  const directWhatsapp = whatsappUrl(client.phone, `Olá ${firstName}, tudo bem? Aqui é da Quark Energia Solar.`);

  return (
    <div 
      className={`glass-panel p-5 rounded-2xl border transition-all duration-200 group flex flex-col justify-between relative overflow-hidden ${
        isTrash 
          ? 'border-rose-500/20 bg-rose-950/10' 
          : 'border-white/5 hover:border-lime-500/30 hover:bg-zinc-900/40 hover:shadow-lg hover:shadow-lime-500/5'
      }`}
    >
      {/* Glow de fundo sutil */}
      <div className="pointer-events-none absolute -top-12 -right-12 h-28 w-28 rounded-full bg-lime-500/5 blur-2xl group-hover:bg-lime-500/10 transition-all" />

      {/* Conteúdo Superior */}
      <div>
        <div className="flex justify-between items-start gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center text-lime-400 font-bold font-display shrink-0 shadow-inner">
              {initials(client.name)}
            </div>
            <div className="min-w-0 flex-1">
              <h3 
                className="font-bold text-white text-base truncate group-hover:text-lime-300 transition-colors cursor-pointer" 
                title={client.name}
                onClick={() => onSelect(client)}
              >
                {client.name}
              </h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {hasPortalAuth ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" /> Portal Ativo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 bg-zinc-800/80 border border-zinc-700/50 px-2 py-0.5 rounded-full">
                    <User className="w-3 h-3 text-zinc-500" /> Aguardando Acesso
                  </span>
                )}

                {Boolean(client.quark_points) && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    <Sparkles className="w-2.5 h-2.5" /> {client.quark_points} pts
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Botão de WhatsApp Direto */}
          {client.phone && (
            <a 
              href={directWhatsapp}
              target="_blank"
              rel="noreferrer"
              title="Conversar no WhatsApp"
              className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all hover:scale-105 active:scale-95 shrink-0"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* Informações Técnicas e Localização */}
        <div className="grid grid-cols-2 gap-2 mb-4 p-3 rounded-xl bg-zinc-950/60 border border-white/5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-lime-500/10 text-lime-400 shrink-0">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Potência</p>
              <p className="text-xs font-bold text-white truncate">
                {systemPower ? `${systemPower.toFixed(2)} kWp` : 'Não informada'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Cidade</p>
              <p className="text-xs font-bold text-white truncate" title={client.city || ''}>
                {client.city ? `${client.city}${client.state ? ` - ${client.state}` : ''}` : 'Maceió - AL'}
              </p>
            </div>
          </div>

          {(client.utility_company || client.utility_account) && (
            <div className="col-span-2 flex items-center gap-2 pt-2 border-t border-white/5 min-w-0">
              <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <p className="text-xs text-zinc-300 truncate">
                <span className="font-semibold text-zinc-400">{client.utility_company || 'Concessionária'}:</span>{' '}
                {client.utility_account ? `UC ${client.utility_account}` : 'Sem conta informada'}
              </p>
            </div>
          )}
        </div>

        {/* Dados de Contato e Documentos */}
        <div className="space-y-1.5 text-xs text-zinc-400">
          <div className="flex items-center gap-2.5 min-w-0">
            <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span className="truncate" title={client.email}>{client.email || 'Sem email'}</span>
          </div>

          <div className="flex items-center gap-2.5 min-w-0">
            <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span className="font-mono text-zinc-300">{formatPhone(client.phone) || 'Sem telefone'}</span>
          </div>

          {client.cpf && (
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="font-mono text-zinc-300">CPF: {formatDoc(client.cpf)}</span>
            </div>
          )}

          {client.install_date && (
            <div className="flex items-center gap-2.5 min-w-0">
              <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="text-zinc-400">Instalação: {formatDate(client.install_date)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Ações Inferiores */}
      <div className="mt-5 pt-3 border-t border-white/5 flex items-center gap-2">
        {!isTrash ? (
          <>
            <button 
              onClick={() => onSelect(client)}
              className="flex-1 py-2 px-3 bg-zinc-800/90 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95 border border-white/5"
            >
              Ver Detalhes
            </button>
            <button 
              onClick={() => onEdit(client)}
              title="Editar Cliente"
              className="p-2 bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs transition-all border border-white/5 active:scale-95"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => onDelete(client.id, client.name)}
              title="Mover para lixeira"
              className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs transition-all border border-rose-500/20 active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={() => onRestore(client.id, client.name)}
              className="flex-1 py-2 px-3 bg-lime-500 hover:bg-lime-400 text-zinc-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restaurar
            </button>
            <button 
              onClick={() => onHardDelete(client.id, client.name)}
              title="Excluir Definitivamente"
              className="py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-1 active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" /> Excluir
            </button>
          </>
        )}
      </div>
    </div>
  );
});

// ─── PÁGINA PRINCIPAL ───────────────────────────────────────────────────────
export default function ClientCatalog() {
  const navigate = useNavigate();

  // Estados de navegação e filtros
  const [currentTab, setCurrentTab] = useState<'active' | 'trash'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUtility, setFilterUtility] = useState<string>('all');
  const [filterPortal, setFilterPortal] = useState<'all' | 'connected' | 'pending'>('all');
  const [sortOrder, setSortOrder] = useState<'name_asc' | 'name_desc' | 'power_desc' | 'power_asc' | 'recent'>('name_asc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(12);

  // Query TanStack Unificada (único fetch otimizado para toda a base)
  const { 
    data: allClients = [], 
    isLoading, 
    isError, 
    error: clientError, 
    refetch 
  } = useClients({ includeDeleted: true });

  const { activeClients, trashClients } = useMemo(() => {
    const active: ClientData[] = [];
    const trash: ClientData[] = [];
    allClients.forEach(c => {
      if (c.deleted_at == null) active.push(c);
      else trash.push(c);
    });
    return { activeClients: active, trashClients: trash };
  }, [allClients]);

  const currentList = currentTab === 'active' ? activeClients : trashClients;

  // Mutations
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const restoreClient = useRestoreClient();
  const hardDeleteClient = useHardDeleteClient();

  // Modais e Detalhes
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Fechar com teclado (ESC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isModalOpen) setIsModalOpen(false);
        else if (selectedClient) setSelectedClient(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, selectedClient]);

  // Form State
  const initialFormState: Partial<ClientData> = {
    name: '',
    email: '',
    phone: '',
    cpf: '',
    birth_date: '',
    city: '',
    state: 'AL',
    address: '',
    cep: '',
    utility_company: 'Equatorial',
    utility_account: '',
    system_size_kw: undefined,
    install_date: '',
    monthly_avg_kwh: undefined,
    notes: '',
  };

  const [formData, setFormData] = useState<Partial<ClientData>>(initialFormState);

  // Estatísticas Rápidas da Carteira Ativa
  const stats = useMemo(() => {
    let totalKw = 0;
    let portalCount = 0;
    let validPowerCount = 0;

    activeClients.forEach(c => {
      if (c.auth_user_id) portalCount++;
      if (c.system_size_kw && !isNaN(Number(c.system_size_kw))) {
        totalKw += Number(c.system_size_kw);
        validPowerCount++;
      }
    });

    const avgPower = validPowerCount > 0 ? (totalKw / validPowerCount) : 0;

    return {
      total: activeClients.length,
      totalKw: totalKw.toFixed(1),
      portalCount,
      avgPower: avgPower.toFixed(2),
    };
  }, [activeClients]);

  // Filtragem e Ordenação
  const processedClients = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    let list = currentList.filter(c => {
      // Busca textual
      if (term) {
        const matchesName = c.name?.toLowerCase().includes(term);
        const matchesEmail = c.email?.toLowerCase().includes(term);
        const matchesCpf = c.cpf?.includes(term);
        const matchesCity = c.city?.toLowerCase().includes(term);
        const matchesPhone = c.phone?.includes(term);
        const matchesUc = c.utility_account?.includes(term);
        if (!matchesName && !matchesEmail && !matchesCpf && !matchesCity && !matchesPhone && !matchesUc) {
          return false;
        }
      }

      // Filtro de Concessionária
      if (filterUtility !== 'all') {
        const util = (c.utility_company || '').toLowerCase();
        if (filterUtility === 'Equatorial' && !util.includes('equatorial')) return false;
        if (filterUtility === 'Enel' && !util.includes('enel')) return false;
        if (filterUtility === 'Outra' && (util.includes('equatorial') || util.includes('enel'))) return false;
      }

      // Filtro de Status do Portal
      if (filterPortal === 'connected' && !c.auth_user_id) return false;
      if (filterPortal === 'pending' && c.auth_user_id) return false;

      return true;
    });

    // Ordenação
    list = [...list].sort((a, b) => {
      if (sortOrder === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      if (sortOrder === 'name_desc') return (b.name || '').localeCompare(a.name || '');
      if (sortOrder === 'power_desc') return (Number(b.system_size_kw) || 0) - (Number(a.system_size_kw) || 0);
      if (sortOrder === 'power_asc') return (Number(a.system_size_kw) || 0) - (Number(b.system_size_kw) || 0);
      if (sortOrder === 'recent') {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      }
      return 0;
    });

    return list;
  }, [currentList, searchTerm, filterUtility, filterPortal, sortOrder]);

  // Reset de página ao alterar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterUtility, filterPortal, sortOrder, currentTab, pageSize]);

  // Paginação dos clientes
  const totalPages = Math.ceil(processedClients.length / pageSize) || 1;
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedClients.slice(start, start + pageSize);
  }, [processedClients, currentPage, pageSize]);

  // Handlers
  const handleOpenCreateModal = useCallback(() => {
    setEditingClient(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((client: ClientData) => {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      cpf: client.cpf || '',
      birth_date: client.birth_date || '',
      city: client.city || '',
      state: client.state || 'AL',
      address: client.address || '',
      cep: client.cep || '',
      utility_company: client.utility_company || 'Equatorial',
      utility_account: client.utility_account || '',
      system_size_kw: client.system_size_kw ?? undefined,
      install_date: client.install_date || '',
      monthly_avg_kwh: client.monthly_avg_kwh ?? undefined,
      notes: client.notes || '',
    });
    setIsModalOpen(true);
  }, []);

  const handleSelectClient = useCallback((client: ClientData) => {
    setSelectedClient(client);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast.error('Informe o nome completo do cliente.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingClient) {
        await updateClient.mutateAsync({
          id: editingClient.id,
          ...formData,
        });
        toast.success('Cliente atualizado com sucesso!');
        if (selectedClient?.id === editingClient.id) {
          setSelectedClient(prev => prev ? ({ ...prev, ...formData } as ClientData) : null);
        }
      } else {
        await createClient.mutateAsync(formData);
        toast.success('Cliente cadastrado com sucesso! Ele já pode acessar o Portal.');
      }
      setIsModalOpen(false);
      setFormData(initialFormState);
      setEditingClient(null);
    } catch (err: any) {
      console.error('[ClientCatalog] Erro ao salvar:', err);
      toast.error(`Falha ao salvar cliente: ${err.message || 'Erro inesperado'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = useCallback(async (id: string, name: string) => {
    if (!confirm(`Deseja mover o cliente "${name}" para a lixeira? O acesso dele ao portal será suspenso temporariamente.`)) {
      return;
    }

    try {
      await deleteClient.mutateAsync(id);
      toast.success(`Cliente "${name}" movido para a lixeira.`);
      setSelectedClient(prev => prev?.id === id ? null : prev);
    } catch (err: any) {
      console.error('[ClientCatalog] Erro ao excluir:', err);
      toast.error(`Erro ao excluir: ${err.message || 'Verifique sua conexão'}`);
    }
  }, [deleteClient]);

  const handleRestore = useCallback(async (id: string, name: string) => {
    try {
      await restoreClient.mutateAsync(id);
      toast.success(`Cliente "${name}" restaurado com sucesso!`);
    } catch (err: any) {
      toast.error(`Erro ao restaurar: ${err.message}`);
    }
  }, [restoreClient]);

  const handleHardDelete = useCallback(async (id: string, name: string) => {
    if (!confirm(`ATENÇÃO: Deseja EXCLUIR DEFINITIVAMENTE o cliente "${name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await hardDeleteClient.mutateAsync(id);
      toast.success(`Cliente "${name}" excluído definitivamente.`);
      setSelectedClient(prev => prev?.id === id ? null : prev);
    } catch (err: any) {
      toast.error(`Erro ao excluir definitivamente: ${err.message}`);
    }
  }, [hardDeleteClient]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`${label} copiado!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="flex flex-col h-full animate-enter">
      <div className="max-w-7xl mx-auto w-full space-y-6 pb-16">
        
        {/* ─── CABEÇALHO ─── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl md:text-3xl font-bold text-white font-display flex items-center gap-3">
              <div className="p-2.5 bg-lime-500/10 rounded-xl border border-lime-500/20 text-lime-400">
                <Users className="w-6 h-6" />
              </div>
              Catálogo de Clientes
            </h1>
            <p className="text-zinc-400 text-sm md:text-base max-w-2xl">
              Gerencie a base de clientes, acompanhe potências instaladas, dados de concessionária e libere o Portal do Cliente.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={handleOpenCreateModal}
              className="flex-1 md:flex-none px-6 h-12 bg-lime-500 hover:bg-lime-400 text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_20px_rgba(163,230,53,0.25)]"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              Novo Cliente
            </button>
          </div>
        </div>

        {/* ─── CARDS DE INTELIGÊNCIA / KPIS DA BASE (Visíveis na aba de Ativos) ─── */}
        {currentTab === 'active' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="glass-panel p-4 rounded-2xl border border-white/5 bg-zinc-900/30">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-medium">Clientes Ativos</span>
                <Users className="w-4 h-4 text-lime-400" />
              </div>
              <p className="text-2xl font-bold text-white font-display">{stats.total}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Cadastrados no sistema</p>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-white/5 bg-zinc-900/30">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-medium">Potência Total</span>
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-white font-display">{stats.totalKw} <span className="text-sm font-normal text-zinc-400">kWp</span></p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Gerando energia limpa</p>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-white/5 bg-zinc-900/30">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-medium">Portal Ativo</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-white font-display">
                {stats.portalCount} <span className="text-sm font-normal text-zinc-400">({stats.total > 0 ? Math.round((stats.portalCount / stats.total) * 100) : 0}%)</span>
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Acessam o aplicativo</p>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-white/5 bg-zinc-900/30">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-medium">Potência Média</span>
                <Activity className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-white font-display">{stats.avgPower} <span className="text-sm font-normal text-zinc-400">kWp</span></p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Por usina instalada</p>
            </div>
          </div>
        )}

        {/* ─── TOOLBAR, FILTROS & ABAS ─── */}
        <div className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col gap-4">
          
          {/* Linha 1: Abas + Campo de Busca + Visualização */}
          <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
            
            {/* Seletor de Abas (Ativos x Lixeira) */}
            <div className="flex items-center bg-zinc-900/80 p-1 rounded-xl border border-zinc-800 shrink-0">
              <button
                onClick={() => setCurrentTab('active')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  currentTab === 'active' 
                    ? 'bg-lime-500 text-zinc-950 shadow-sm' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Ativos ({activeClients.length})
              </button>
              <button
                onClick={() => setCurrentTab('trash')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  currentTab === 'trash' 
                    ? 'bg-rose-500 text-white shadow-sm' 
                    : 'text-zinc-400 hover:text-rose-400'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Lixeira ({trashClients.length})
              </button>
            </div>

            {/* Campo de Busca Rápida */}
            <div className="relative flex-1 md:max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Buscar por nome, email, CPF, cidade ou UC..."
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-2 pl-10 pr-16 text-sm text-white focus:border-lime-500/50 outline-none transition-all placeholder-zinc-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs px-1.5 py-0.5 rounded bg-zinc-800"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Alternador de Visualização (Grid x Tabela) */}
            <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800 shrink-0 self-end md:self-auto">
              <button
                onClick={() => setViewMode('grid')}
                title="Visualização em Cards"
                className={`p-2 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-zinc-800 text-lime-400 shadow-sm' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                title="Visualização em Tabela Compacta"
                className={`p-2 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'table' 
                    ? 'bg-zinc-800 text-lime-400 shadow-sm' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* Linha 2: Filtros Avançados & Ordenação */}
          <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-white/5 text-xs">
            <span className="text-zinc-500 flex items-center gap-1 font-semibold">
              <Filter className="w-3.5 h-3.5" /> Filtros:
            </span>

            {/* Distribuidora */}
            <select
              value={filterUtility}
              onChange={e => setFilterUtility(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-zinc-300 focus:border-lime-500 outline-none"
            >
              <option value="all">Todas Distribuidoras</option>
              <option value="Equatorial">Equatorial</option>
              <option value="Enel">Enel</option>
              <option value="Outra">Outras</option>
            </select>

            {/* Portal */}
            <select
              value={filterPortal}
              onChange={e => setFilterPortal(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-zinc-300 focus:border-lime-500 outline-none"
            >
              <option value="all">Status do Portal (Todos)</option>
              <option value="connected">Portal Conectado</option>
              <option value="pending">Aguardando Acesso</option>
            </select>

            {/* Ordenação */}
            <div className="flex items-center gap-1.5 ml-auto">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as any)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-zinc-300 focus:border-lime-500 outline-none"
              >
                <option value="name_asc">Nome (A - Z)</option>
                <option value="name_desc">Nome (Z - A)</option>
                <option value="power_desc">Potência (Maior)</option>
                <option value="power_asc">Potência (Menor)</option>
                <option value="recent">Mais Recentes</option>
              </select>
            </div>
          </div>

        </div>

        {/* ─── LISTAGEM PRINCIPAL ─── */}
        {isLoading ? (
          <div className="flex flex-col justify-center items-center py-24 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-lime-500 border-t-transparent"></div>
            <p className="text-zinc-500 text-sm">Carregando catálogo de clientes...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center glass-panel rounded-3xl border border-rose-500/20 bg-rose-950/10 animate-enter">
            <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mb-3 text-rose-400">
              <RotateCcw className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Falha ao carregar clientes</h3>
            <p className="text-zinc-400 text-xs max-w-sm mb-4">
              {(clientError as any)?.message || 'Não foi possível se comunicar com o banco de dados.'}
            </p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 border border-white/10 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Tentar novamente
            </button>
          </div>
        ) : processedClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center glass-panel rounded-3xl border border-white/5 animate-enter">
            <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {currentTab === 'trash' ? 'Lixeira Vazia' : 'Nenhum cliente encontrado'}
            </h3>
            <p className="text-zinc-400 max-w-sm mb-6 text-sm">
              {searchTerm || filterUtility !== 'all' || filterPortal !== 'all'
                ? 'Nenhum cliente corresponde aos filtros selecionados. Tente ajustar os termos ou filtros.'
                : currentTab === 'trash'
                  ? 'Nenhum cliente excluído no momento.'
                  : 'Nenhum cliente ativo no catálogo. Adicione seu primeiro cliente agora!'}
            </p>
            {!searchTerm && filterUtility === 'all' && filterPortal === 'all' && currentTab === 'active' && (
              <button 
                onClick={handleOpenCreateModal}
                className="px-6 py-2.5 bg-lime-500 hover:bg-lime-400 text-black font-semibold rounded-xl transition-all shadow-md flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" /> Cadastrar Cliente
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* MODO GRID */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedClients.map(client => (
              <ClientCard 
                key={client.id}
                client={client}
                isTrash={currentTab === 'trash'}
                onSelect={handleSelectClient}
                onEdit={handleOpenEditModal}
                onDelete={handleDelete}
                onRestore={handleRestore}
                onHardDelete={handleHardDelete}
              />
            ))}
          </div>
        ) : (
          /* MODO TABELA COMPACTA */
          <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/80 text-zinc-400 uppercase tracking-wider font-semibold border-b border-white/5">
                  <tr>
                    <th className="py-3.5 px-4">Cliente</th>
                    <th className="py-3.5 px-4">Contato</th>
                    <th className="py-3.5 px-4">Localização</th>
                    <th className="py-3.5 px-4">Potência</th>
                    <th className="py-3.5 px-4">Concessionária</th>
                    <th className="py-3.5 px-4">Portal</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-zinc-300">
                  {paginatedClients.map(client => {
                    const hasPortal = Boolean(client.auth_user_id);
                    const power = client.system_size_kw ? Number(client.system_size_kw) : null;
                    const directWhatsapp = whatsappUrl(client.phone, `Olá ${client.name.split(' ')[0]}, tudo bem?`);

                    return (
                      <tr 
                        key={client.id} 
                        className="hover:bg-zinc-900/40 transition-colors group cursor-pointer"
                        onClick={() => handleSelectClient(client)}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-zinc-800 text-lime-400 font-bold flex items-center justify-center shrink-0">
                              {initials(client.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-white group-hover:text-lime-300 transition-colors truncate max-w-[200px]">
                                {client.name}
                              </p>
                              {client.cpf && (
                                <p className="text-[11px] text-zinc-500 font-mono">{formatDoc(client.cpf)}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-zinc-300">{formatPhone(client.phone) || '—'}</span>
                            {client.phone && (
                              <a 
                                href={directWhatsapp} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-emerald-400 hover:text-emerald-300"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span>{client.city ? `${client.city}${client.state ? ` - ${client.state}` : ''}` : 'Maceió - AL'}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-white">
                            {power ? `${power.toFixed(2)} kWp` : '—'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="min-w-0">
                            <p className="text-zinc-200">{client.utility_company || 'Equatorial'}</p>
                            {client.utility_account && (
                              <p className="text-[11px] text-zinc-500 font-mono">UC {client.utility_account}</p>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {hasPortal ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                              <ShieldCheck className="w-3 h-3" /> Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded-full">
                              Pendente
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {currentTab === 'active' ? (
                              <>
                                <button
                                  onClick={() => handleSelectClient(client)}
                                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white"
                                  title="Ver Detalhes"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditModal(client)}
                                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white"
                                  title="Editar"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(client.id, client.name)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                                  title="Mover para lixeira"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleRestore(client.id, client.name)}
                                  className="px-2 py-1 bg-lime-500 text-zinc-950 font-bold rounded-lg text-xs"
                                >
                                  Restaurar
                                </button>
                                <button
                                  onClick={() => handleHardDelete(client.id, client.name)}
                                  className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── CONTROLE DE PAGINAÇÃO ─── */}
        {processedClients.length > 0 && (
          <div className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            
            <div className="flex items-center gap-2 text-zinc-400">
              <span>
                Exibindo <span className="text-white font-semibold">{(currentPage - 1) * pageSize + 1}</span> a{' '}
                <span className="text-white font-semibold">{Math.min(currentPage * pageSize, processedClients.length)}</span> de{' '}
                <span className="text-white font-semibold">{processedClients.length}</span> clientes
              </span>

              <div className="hidden sm:flex items-center gap-1.5 ml-4 pl-4 border-l border-zinc-800">
                <span className="text-zinc-500">Por página:</span>
                <select
                  value={pageSize}
                  onChange={e => setPageSize(Number(e.target.value))}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-zinc-300 focus:border-lime-500 outline-none"
                >
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                  <option value={48}>48</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  title="Página Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map((page, idx, arr) => {
                      const prev = arr[idx - 1];
                      const showEllipsis = prev && page - prev > 1;

                      return (
                        <React.Fragment key={page}>
                          {showEllipsis && <span className="px-1 text-zinc-600">...</span>}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 rounded-lg font-medium transition-all ${
                              currentPage === page
                                ? 'bg-lime-500 text-zinc-950 font-bold shadow-sm'
                                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  title="Próxima Página"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>
        )}

        {/* ─── PAINEL LATERAL DE DETALHES DO CLIENTE (Drawer) ─── */}
        {selectedClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
            <div 
              className="absolute inset-0" 
              onClick={() => setSelectedClient(null)} 
            />

            <div className="relative w-full max-w-xl bg-zinc-950 border-l border-white/10 h-full overflow-y-auto shadow-2xl flex flex-col z-10 custom-scrollbar animate-slide-in-right">
              
              {/* Header do Drawer */}
              <div className="p-6 border-b border-white/10 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-20 flex justify-between items-start">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-lime-500 to-emerald-600 text-zinc-950 font-bold font-display text-lg flex items-center justify-center shadow-lg shadow-lime-500/20 shrink-0">
                    {initials(selectedClient.name)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-white font-display truncate">
                      {selectedClient.name}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedClient.auth_user_id ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" /> Acesso ao Portal Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 bg-zinc-800 border border-zinc-700 px-2.5 py-0.5 rounded-full">
                          <User className="w-3 h-3 text-zinc-500" /> Convite Pendente
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedClient(null)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Corpo de Detalhes */}
              <div className="p-6 space-y-6 flex-1">
                
                {/* Cards de Métricas Principais */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="glass-panel p-3.5 rounded-xl border border-white/5 bg-zinc-900/40">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold flex items-center gap-1 mb-1">
                      <Zap className="w-3 h-3 text-lime-400" /> Potência
                    </p>
                    <p className="text-base font-bold text-white">
                      {selectedClient.system_size_kw ? `${Number(selectedClient.system_size_kw).toFixed(2)} kWp` : '—'}
                    </p>
                  </div>

                  <div className="glass-panel p-3.5 rounded-xl border border-white/5 bg-zinc-900/40">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold flex items-center gap-1 mb-1">
                      <Activity className="w-3 h-3 text-blue-400" /> Consumo Médio
                    </p>
                    <p className="text-base font-bold text-white">
                      {selectedClient.monthly_avg_kwh ? `${selectedClient.monthly_avg_kwh} kWh/mês` : '—'}
                    </p>
                  </div>

                  <div className="glass-panel p-3.5 rounded-xl border border-white/5 bg-zinc-900/40 col-span-2 sm:col-span-1">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold flex items-center gap-1 mb-1">
                      <Sparkles className="w-3 h-3 text-amber-400" /> Pontos Quark
                    </p>
                    <p className="text-base font-bold text-amber-300">
                      {selectedClient.quark_points || 0} pts
                    </p>
                  </div>
                </div>

                {/* Seção 1: Dados Cadastrais & Contato */}
                <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-3">
                  <h3 className="text-xs font-bold text-lime-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                    <User className="w-3.5 h-3.5" /> Informações de Contato
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-zinc-500 mb-0.5">Email</p>
                      <div className="flex items-center gap-2 text-zinc-200">
                        <span className="truncate">{selectedClient.email || 'Não informado'}</span>
                        {selectedClient.email && (
                          <button onClick={() => handleCopy(selectedClient.email, 'Email')} className="text-zinc-500 hover:text-white">
                            {copiedField === 'Email' ? <Check className="w-3 h-3 text-lime-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-zinc-500 mb-0.5">WhatsApp / Telefone</p>
                      <div className="flex items-center gap-2 text-zinc-200">
                        <span className="font-mono">{formatPhone(selectedClient.phone) || 'Não informado'}</span>
                        {selectedClient.phone && (
                          <a 
                            href={whatsappUrl(selectedClient.phone, `Olá ${selectedClient.name.split(' ')[0]}, tudo bem?`)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 font-semibold"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> Abrir
                          </a>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-zinc-500 mb-0.5">CPF / CNPJ</p>
                      <p className="text-zinc-200 font-mono">{formatDoc(selectedClient.cpf) || 'Não informado'}</p>
                    </div>

                    <div>
                      <p className="text-zinc-500 mb-0.5">Data de Nascimento</p>
                      <p className="text-zinc-200">{formatDate(selectedClient.birth_date) || 'Não informada'}</p>
                    </div>
                  </div>
                </div>

                {/* Seção 2: Localização & Endereço */}
                <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-3">
                  <h3 className="text-xs font-bold text-lime-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                    <MapPin className="w-3.5 h-3.5" /> Endereço & Localização
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="sm:col-span-2">
                      <p className="text-zinc-500 mb-0.5">Endereço Completo</p>
                      <p className="text-zinc-200">{selectedClient.address || 'Não cadastrado'}</p>
                    </div>

                    <div>
                      <p className="text-zinc-500 mb-0.5">Cidade / UF</p>
                      <p className="text-zinc-200">
                        {selectedClient.city ? `${selectedClient.city} - ${selectedClient.state || 'AL'}` : 'Maceió - AL'}
                      </p>
                    </div>

                    <div>
                      <p className="text-zinc-500 mb-0.5">CEP</p>
                      <p className="text-zinc-200 font-mono">{formatCep(selectedClient.cep) || 'Não informado'}</p>
                    </div>
                  </div>
                </div>

                {/* Seção 3: Concessionária & Dados Técnicos */}
                <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-3">
                  <h3 className="text-xs font-bold text-lime-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                    <Building2 className="w-3.5 h-3.5" /> Concessionária & Usina Solar
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-zinc-500 mb-0.5">Distribuidora</p>
                      <p className="text-zinc-200 font-semibold">{selectedClient.utility_company || 'Equatorial Alagoas'}</p>
                    </div>

                    <div>
                      <p className="text-zinc-500 mb-0.5">Conta Contrato / UC</p>
                      <p className="text-zinc-200 font-mono font-semibold">{selectedClient.utility_account || 'Não cadastrada'}</p>
                    </div>

                    <div>
                      <p className="text-zinc-500 mb-0.5">Potência do Sistema</p>
                      <p className="text-zinc-200">{selectedClient.system_size_kw ? `${selectedClient.system_size_kw} kWp` : 'Em dimensionamento'}</p>
                    </div>

                    <div>
                      <p className="text-zinc-500 mb-0.5">Data de Instalação</p>
                      <p className="text-zinc-200">{formatDate(selectedClient.install_date) || 'Pendente'}</p>
                    </div>
                  </div>
                </div>

                {/* Seção 4: Portal do Cliente & Indicação */}
                <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-3 bg-zinc-900/30">
                  <h3 className="text-xs font-bold text-lime-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                    <Shield className="w-3.5 h-3.5" /> Acesso ao Portal do Cliente
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Código de Indicação:</span>
                      <span className="font-mono font-bold text-white bg-zinc-800 px-2.5 py-1 rounded-md">
                        {selectedClient.referral_code || 'QUARK-' + selectedClient.id.slice(0, 6).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Link de Acesso:</span>
                      <button 
                        onClick={() => handleCopy(`${window.location.origin}/portal/login`, 'Link do Portal')}
                        className="text-lime-400 hover:text-lime-300 font-semibold flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Copiar Link
                      </button>
                    </div>
                  </div>
                </div>

                {/* Observações */}
                {selectedClient.notes && (
                  <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-2">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Observações</p>
                    <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">{selectedClient.notes}</p>
                  </div>
                )}
              </div>

              {/* Rodapé com Ações do Cliente */}
              <div className="p-6 border-t border-white/10 bg-zinc-950 flex flex-wrap gap-2.5">
                <button
                  onClick={() => {
                    navigate(`/orcamento-rapido?cliente=${selectedClient.id}&nome=${encodeURIComponent(selectedClient.name)}&potencia=${selectedClient.system_size_kw || ''}`);
                  }}
                  className="flex-1 py-3 px-4 bg-lime-500 hover:bg-lime-400 text-zinc-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-lime-500/20 active:scale-95"
                >
                  <Sparkles className="w-4 h-4" /> Oferta Rápida
                </button>

                <button 
                  onClick={() => {
                    handleOpenEditModal(selectedClient);
                  }}
                  className="py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-2 border border-white/5"
                >
                  <Edit2 className="w-4 h-4" /> Editar
                </button>

                <button 
                  onClick={() => handleDelete(selectedClient.id, selectedClient.name)}
                  className="py-3 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold rounded-xl text-xs transition-all flex items-center gap-2 border border-rose-500/20"
                >
                  <Trash2 className="w-4 h-4" /> Excluir
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ─── MODAL DE NOVO CLIENTE / EDIÇÃO ─── */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col custom-scrollbar animate-fade-scale">
              
              {/* Header do Modal */}
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center sticky top-0 bg-zinc-950/90 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-lime-500/10 rounded-xl text-lime-400 border border-lime-500/20">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white font-display">
                      {editingClient ? 'Editar Cliente' : 'Adicionar Novo Cliente'}
                    </h2>
                    <p className="text-xs text-zinc-400">
                      {editingClient ? 'Atualize as informações cadastrais e técnicas do cliente.' : 'Preencha os dados do cliente para liberar o acesso ao sistema.'}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Formulário */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1">
                
                {/* 1. Dados Pessoais */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-lime-400 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
                    <User className="w-3.5 h-3.5" /> 1. Dados Pessoais & Acesso
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-zinc-300 font-medium">Nome Completo *</label>
                      <input 
                        type="text" required
                        placeholder="Ex: João da Silva Santos"
                        value={formData.name || ''} 
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-lime-500 outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-zinc-300 font-medium">Email * (Login no Portal)</label>
                      <input 
                        type="email" required
                        placeholder="cliente@email.com"
                        value={formData.email || ''} 
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-lime-500 outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-zinc-300 font-medium">Telefone / WhatsApp</label>
                      <input 
                        type="text" 
                        placeholder="(82) 99999-9999"
                        value={formData.phone || ''} 
                        onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-lime-500 outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-zinc-300 font-medium">CPF ou CNPJ</label>
                      <input 
                        type="text" 
                        placeholder="000.000.000-00"
                        value={formData.cpf || ''} 
                        onChange={e => setFormData({ ...formData, cpf: formatDoc(e.target.value) })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-lime-500 outline-none transition-colors font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-zinc-300 font-medium">Data de Nascimento</label>
                      <input 
                        type="date"
                        value={formData.birth_date || ''} 
                        onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-lime-500 outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Endereço & Localização */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-lime-400 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
                    <MapPin className="w-3.5 h-3.5" /> 2. Localização & Endereço
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="text-zinc-300 font-medium">Cidade</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Maceió"
                        value={formData.city || ''} 
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-lime-500 outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-zinc-300 font-medium">Estado (UF)</label>
                      <input 
                        type="text" maxLength={2}
                        placeholder="AL"
                        value={formData.state || ''} 
                        onChange={e => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-lime-500 outline-none transition-colors uppercase font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-zinc-300 font-medium">CEP</label>
                      <input 
                        type="text" 
                        placeholder="00000-000"
                        value={formData.cep || ''} 
                        onChange={e => setFormData({ ...formData, cep: formatCep(e.target.value) })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-lime-500 outline-none transition-colors font-mono"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-3">
                      <label className="text-zinc-300 font-medium">Endereço / Bairro</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Rua das Palmeiras, 120, Ponta Verde"
                        value={formData.address || ''} 
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-lime-500 outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Dados Técnicos & Concessionária */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-lime-400 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
                    <Building2 className="w-3.5 h-3.5" /> 3. Usina Solar & Concessionária
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="text-zinc-300 font-medium">Distribuidora / Concessionária</label>
                      <select 
                        value={formData.utility_company || 'Equatorial'}
                        onChange={e => setFormData({ ...formData, utility_company: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-lime-500 outline-none transition-colors"
                      >
                        <option value="Equatorial">Equatorial Energia</option>
                        <option value="Enel">Enel</option>
                        <option value="Neoenergia">Neoenergia</option>
                        <option value="Cemig">Cemig</option>
                        <option value="CPFL">CPFL</option>
                        <option value="Outra">Outra</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-zinc-300 font-medium">Conta Contrato / Código UC</label>
                      <input 
                        type="text" 
                        placeholder="Ex: 100984521"
                        value={formData.utility_account || ''} 
                        onChange={e => setFormData({ ...formData, utility_account: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-lime-500 outline-none transition-colors font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-zinc-300 font-medium">Potência do Sistema (kWp)</label>
                      <input 
                        type="number" step="0.01" min="0"
                        placeholder="Ex: 8.5"
                        value={formData.system_size_kw ?? ''} 
                        onChange={e => setFormData({ ...formData, system_size_kw: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-lime-500 outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-zinc-300 font-medium">Consumo Médio Mensal (kWh)</label>
                      <input 
                        type="number" step="1" min="0"
                        placeholder="Ex: 650"
                        value={formData.monthly_avg_kwh ?? ''} 
                        onChange={e => setFormData({ ...formData, monthly_avg_kwh: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-lime-500 outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-zinc-300 font-medium">Data de Instalação / Conexão</label>
                      <input 
                        type="date"
                        value={formData.install_date || ''} 
                        onChange={e => setFormData({ ...formData, install_date: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-lime-500 outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Observações */}
                <div className="space-y-2 text-xs">
                  <label className="text-zinc-300 font-medium">Observações Internas</label>
                  <textarea 
                    rows={3}
                    placeholder="Histórico do cliente, particularidades da instalação ou orientações técnicas..."
                    value={formData.notes || ''} 
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:border-lime-500 outline-none transition-colors resize-none"
                  />
                </div>

                {/* Botões do Formulário */}
                <div className="pt-4 border-t border-zinc-800 flex justify-end gap-3 sticky bottom-0 bg-zinc-950/90 py-2">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-lime-500 hover:bg-lime-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-lime-500/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'
                    )}
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
