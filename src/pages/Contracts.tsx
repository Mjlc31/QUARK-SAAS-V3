import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ScrollText,
  Plus,
  Sun,
  ShieldCheck,
  ChevronRight,
  Search,
  Copy,
  Share2,
  Trash2,
  CheckCircle2,
  Clock,
  Building2,
  Zap,
  DollarSign,
  FileText,
  User,
  X,
  Loader2,
  ExternalLink,
  Eye,
  Sparkles,
  Layers,
  FileCheck2,
  Check,
  RefreshCw,
  SlidersHorizontal,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { useContracts, useCreateContract, useUpdateContractStatus, useDeleteContract, type ContractRow } from '../hooks/useContracts';
import { useLeads } from '../hooks/useLeads';
import { contractKwp, type ContratoData, defaultContrato, type Equipment, contratoBlocks } from '../lib/documents';
import { formatBrl } from '../lib/receipt';
import { DocumentView } from '../components/docs/document-view';
import { supabase } from '../lib/supabaseClient';

type FilterType = 'todos' | 'rascunho' | 'enviado' | 'assinado';

// Função para identificar clientes na fase de Venda Fechada ou Fechamento
function isClosedDeal(lead: any): boolean {
  if (!lead) return false;
  const statusStr = String(lead.status || '').toLowerCase();
  if (
    statusStr.includes('fechad') ||
    statusStr.includes('fechament') ||
    statusStr.includes('ganh') ||
    statusStr.includes('venda') ||
    statusStr === 'closed' ||
    statusStr === 'won'
  ) {
    return true;
  }

  // Verifica dentro de pipelines
  if (Array.isArray(lead.pipelineEntries)) {
    const hasClosedPipeline = lead.pipelineEntries.some((entry: any) => {
      const stageStr = String(entry.stage || '').toLowerCase();
      return (
        stageStr.includes('fechad') ||
        stageStr.includes('fechament') ||
        stageStr.includes('ganh') ||
        stageStr.includes('venda')
      );
    });
    if (hasClosedPipeline) return true;
  }

  // Verifica tags
  if (Array.isArray(lead.tags)) {
    const hasClosedTag = lead.tags.some((tag: any) => {
      const tagStr = String(tag.name || '').toLowerCase();
      return tagStr.includes('fechad') || tagStr.includes('fechament') || tagStr.includes('ganh');
    });
    if (hasClosedTag) return true;
  }

  return false;
}

export default function ContractsPage() {
  const { data: contracts = [], isLoading } = useContracts('contrato');
  const { data: leads = [] } = useLeads();
  const createContract = useCreateContract();
  const updateStatus = useUpdateContractStatus();
  const deleteContract = useDeleteContract();

  const [filter, setFilter] = useState<FilterType>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filtros de seleção de Leads no Modal
  const [leadFilterMode, setLeadFilterMode] = useState<'fechados' | 'todos'>('fechados');
  const [modalTab, setModalTab] = useState<'form' | 'preview'>('form');
  const [previewMode, setPreviewMode] = useState<'visual' | 'texto'>('visual');

  // Form State para Novo Contrato
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientDoc, setClientDoc] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientCity, setClientCity] = useState('Maceió');
  const [clientState, setClientState] = useState('AL');
  const [clientCep, setClientCep] = useState('');

  // Equipamentos
  const [moduleBrand, setModuleBrand] = useState('Canadian Solar');
  const [moduleModel, setModuleModel] = useState('HiKu6 550W');
  const [modulePower, setModulePower] = useState(550);
  const [moduleQty, setModuleQty] = useState(14);

  const [inverterBrand, setInverterBrand] = useState('Deye');
  const [inverterModel, setInverterModel] = useState('SUN-8K-G');
  const [inverterPower, setInverterPower] = useState(8);
  const [inverterQty, setInverterQty] = useState(1);

  const [structureType, setStructureType] = useState('Telhado Cerâmico');
  const [supplierName, setSupplierName] = useState('Fortlev Solar');
  const [utilityName, setUtilityName] = useState('Equatorial AL');
  const [forumCity, setForumCity] = useState('Maceió');
  const [forumState, setForumState] = useState('Alagoas');

  // Financeiro e Pagamento
  const [totalPrice, setTotalPrice] = useState(28900);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao' | 'entrada' | 'financiamento' | 'personalizado'>('pix');
  const [installments, setInstallments] = useState(18);
  const [withInterest, setWithInterest] = useState(true);
  const [entryPrice, setEntryPrice] = useState(0);
  const [customPaymentText, setCustomPaymentText] = useState('');

  // Separação de Leads fechados vs todos
  const closedLeads = useMemo(() => leads.filter(isClosedDeal), [leads]);
  const otherLeads = useMemo(() => leads.filter((l) => !isClosedDeal(l)), [leads]);

  // Combobox pesquisável de clientes com digitação e ordenação alfabética (A-Z)
  const [leadSearchText, setLeadSearchText] = useState('');
  const [isLeadDropdownOpen, setIsLeadDropdownOpen] = useState(false);
  const leadComboboxRef = useRef<HTMLDivElement>(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (leadComboboxRef.current && !leadComboboxRef.current.contains(event.target as Node)) {
        setIsLeadDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Leads ordenados alfabeticamente (A-Z) e filtrados pela digitação
  const sortedAndFilteredLeads = useMemo(() => {
    const base = leadFilterMode === 'fechados'
      ? (closedLeads.length > 0 ? closedLeads : leads)
      : leads;

    // Ordenação estrita alfabética A-Z por nome
    const sorted = [...base].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));

    if (!leadSearchText.trim()) return sorted;
    const q = leadSearchText.toLowerCase();
    return sorted.filter((l) =>
      (l.name && l.name.toLowerCase().includes(q)) ||
      (l.cpfCnpj && l.cpfCnpj.includes(q)) ||
      (l.city && l.city.toLowerCase().includes(q)) ||
      (l.phone && l.phone.includes(q))
    );
  }, [leadFilterMode, closedLeads, leads, leadSearchText]);

  // Cálculos de KPIs da tela principal
  const allContracts = contracts;
  const filteredContracts = useMemo(() => {
    return allContracts
      .filter((c) => (filter === 'todos' ? true : c.status === filter))
      .filter((c) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          c.data?.client?.name?.toLowerCase().includes(q) ||
          c.data?.supplier?.name?.toLowerCase().includes(q)
        );
      });
  }, [allContracts, filter, searchTerm]);

  const signedContracts = allContracts.filter((c) => c.status === 'assinado');
  const waitingContracts = allContracts.filter((c) => c.status === 'enviado');
  const totalSignedValue = signedContracts.reduce((sum, c) => sum + (Number(c.data?.price) || 0), 0);
  const totalSignedKwp = signedContracts.reduce((sum, c) => {
    return sum + (c.data?.equipment ? contractKwp(c.data) : 0);
  }, 0);

  // Monta objeto ContratoData em tempo real para a Pré-visualização ao Vivo
  const liveContratoData = useMemo<ContratoData>(() => {
    const equipments: Equipment[] = [
      {
        id: 'eq_modulo',
        kind: 'modulo',
        qty: Number(moduleQty) || 0,
        power: Number(modulePower) || 0,
        brand: moduleBrand || 'Canadian Solar',
        model: moduleModel || '',
        description: `${moduleQty}x Módulos Fotovoltaicos ${moduleBrand} ${modulePower}W`,
      },
      {
        id: 'eq_inversor',
        kind: 'inversor',
        qty: Number(inverterQty) || 1,
        power: Number(inverterPower) || 0,
        brand: inverterBrand || 'Deye',
        model: inverterModel || '',
        description: `Inversor Solar ${inverterBrand} ${inverterPower}kW`,
      },
    ];

    const base = defaultContrato({
      contractor: {
        name: 'Quark Energia',
        doc: '55.138.256/0001-51',
        address: 'Rua Paulo Henrique Mendes',
        city: 'Maceió',
        state: 'AL',
        cep: '57.081-520',
        repName: 'José Anderson da Silva Alves',
        repDoc: '084.960.164-98',
        repRole: 'Diretor Técnico',
        repNationality: 'brasileiro',
        repMarital: '',
      },
      place: `${clientCity || 'Maceió'}/${clientState || 'AL'}`,
    });

    base.client = {
      kind: clientDoc.replace(/\D/g, '').length === 14 ? 'pj' : 'pf',
      name: clientName || '',
      doc: clientDoc || '',
      rg: '',
      nationality: 'brasileiro(a)',
      marital: 'solteiro(a)',
      profession: 'Empresário(a) / Autônomo(a)',
      repName: '',
      repDoc: '',
      address: clientAddress || '',
      city: clientCity || 'Maceió',
      state: clientState || 'AL',
      cep: clientCep || '',
      email: '',
      phone: clientPhone || '',
    };

    base.equipment = equipments;
    base.structure = structureType;
    base.supplier = {
      name: supplierName || 'Fortlev Solar',
      doc: '',
    };
    base.utility = utilityName || 'Equatorial AL';
    base.price = Number(totalPrice) || 0;
    base.forum = forumCity || 'Maceió';
    base.forumState = forumState || 'Alagoas';
    base.payment = {
      method: paymentMethod,
      installments: Number(installments) || 12,
      withInterest: Boolean(withInterest),
      multipleCards: true,
      entry: Number(entryPrice) || 0,
      balanceWhen: 'na conclusão da instalação',
      bank: '',
      custom: customPaymentText || '',
    };

    return base;
  }, [
    clientName, clientDoc, clientAddress, clientCity, clientState, clientCep, clientPhone,
    moduleBrand, moduleModel, modulePower, moduleQty,
    inverterBrand, inverterModel, inverterPower, inverterQty,
    structureType, supplierName, utilityName, forumCity, forumState, totalPrice, paymentMethod,
    installments, withInterest, entryPrice, customPaymentText
  ]);

  const liveKwp = useMemo(() => contractKwp(liveContratoData), [liveContratoData]);
  const liveBlocks = useMemo(() => contratoBlocks(liveContratoData), [liveContratoData]);

  // Manipular seleção de lead
  const handleSelectLead = async (leadId: string) => {
    setSelectedLeadId(leadId);
    if (!leadId) return;

    const l = leads.find((x) => x.id === leadId);
    if (l) {
      setLeadSearchText(l.name || '');
      setIsLeadDropdownOpen(false);
      setClientName(l.name || '');
      setClientDoc(l.cpfCnpj || '');
      setClientPhone(l.phone || '');
      setClientAddress([l.street, l.neighborhood].filter(Boolean).join(', ') || '');
      setClientCity(l.city || 'Maceió');
      setClientState(l.state || 'AL');
      setClientCep(l.zipCode || '');
      if (l.value && Number(l.value) > 0) {
        setTotalPrice(Number(l.value));
      }

      // Tenta buscar dados de proposta mais recente deste lead no Supabase
      try {
        const { data: propRow } = await supabase
          .from('proposals')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const pData = propRow?.data || propRow;
        if (pData) {
          const inp = pData.inputs || {};
          const finalVal = pData.final_price || pData.totalPrice || pData.price || inp.finalPrice;
          if (finalVal) setTotalPrice(Number(finalVal));
          if (pData.moduleBrand || inp.moduleBrand) setModuleBrand(pData.moduleBrand || inp.moduleBrand);
          if (pData.modulePower || inp.modulePowerW) setModulePower(Number(pData.modulePower || inp.modulePowerW));
          if (pData.moduleCount || pData.moduleQty || inp.moduleQty) setModuleQty(Number(pData.moduleCount || pData.moduleQty || inp.moduleQty));
          if (pData.inverterBrand || inp.inverterBrand) setInverterBrand(pData.inverterBrand || inp.inverterBrand);
          if (pData.inverterPower || pData.systemSizeKw || inp.inverterPowerKw || pData.power_kwp) setInverterPower(Number(pData.inverterPower || pData.systemSizeKw || inp.inverterPowerKw || pData.power_kwp));
          if (pData.structureType || inp.structureType) setStructureType(pData.structureType || inp.structureType);
        }
      } catch (err) {
        console.warn('Busca de proposta opcional falhou:', err);
      }

      toast.success(`Cliente "${l.name}" selecionado! Dados preenchidos.`);
    }
  };

  // Submeter novo contrato
  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || totalPrice <= 0) {
      toast.error('Informe o nome do cliente e o valor total do contrato.');
      return;
    }

    try {
      const created = await createContract.mutateAsync({
        title: `Contrato Solar - ${clientName.trim()}`,
        lead_id: selectedLeadId || null,
        data: liveContratoData,
      });

      toast.success('Contrato gerado com sucesso! Link de assinatura pronto para envio.');
      setIsModalOpen(false);

      // Copiar link de assinatura do cliente automaticamente
      const clientSigner = created.signers?.find((s: any) => s.role === 'contratante') || created.signers?.[0];
      if (clientSigner?.token) {
        const link = `${window.location.origin}/assinar/${clientSigner.token}`;
        navigator.clipboard?.writeText(link);
        toast.info('Link de assinatura digital do cliente copiado para a área de transferência.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao gerar contrato.');
    }
  };

  const copySignLink = (token: string) => {
    const link = `${window.location.origin}/assinar/${token}`;
    navigator.clipboard?.writeText(link);
    toast.success('Link de assinatura copiado!');
  };

  const shareViaWhatsApp = (c: ContractRow) => {
    const signer = c.signers?.find((s) => s.role === 'contratante') || c.signers?.[0];
    const link = signer?.token ? `${window.location.origin}/assinar/${signer.token}` : `${window.location.origin}/contratos`;
    const name = c.data?.client?.name?.split(' ')[0] || 'Cliente';
    const text = `Olá, ${name}! Seu contrato de fornecimento e instalação do sistema solar da Quark Energia já está pronto para assinatura digital pelo celular:\n\n🔗 ${link}\n\nÉ rápido, 100% seguro e com validade jurídica. Qualquer dúvida estamos à disposição! ☀️`;

    const phoneRaw = c.data?.client?.phone?.replace(/\D/g, '') || '';
    const waUrl = phoneRaw
      ? `https://wa.me/55${phoneRaw}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const selectedLeadObj = leads.find((l) => l.id === selectedLeadId);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-lime-500/10 border border-lime-500/20 text-lime-400">
            <ScrollText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Central de Contratos
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-lime-500/10 text-lime-400 border border-lime-500/20">
                Assinatura Digital
              </span>
            </h1>
            <p className="text-xs text-zinc-400">
              Contratos de engenharia, fornecimento e instalação solar com assinatura digital pelo celular
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/templates/MODELO_CONTRATO_SOLAR_QUARK.docx"
            download="MODELO_CONTRATO_SOLAR_QUARK.docx"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold text-xs transition"
            title="Baixar arquivo de modelo de contrato em Word (.docx)"
          >
            <Download className="w-4 h-4 text-lime-400" />
            Baixar Modelo (.docx)
          </a>

          <button
            onClick={() => {
              setLeadFilterMode(closedLeads.length > 0 ? 'fechados' : 'todos');
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-zinc-950 font-bold text-xs shadow-lg shadow-lime-500/10 transition"
          >
            <Plus className="w-4 h-4" />
            Novo Contrato Solar
          </button>
        </div>
      </div>

      {/* Banner de Chamada para Ação */}
      <div
        onClick={() => {
          setLeadFilterMode(closedLeads.length > 0 ? 'fechados' : 'todos');
          setIsModalOpen(true);
        }}
        className="group relative cursor-pointer overflow-hidden rounded-2xl bg-zinc-900/80 border border-white/5 p-5 sm:p-6 text-white shadow-xl hover:border-lime-500/30 transition-all duration-200"
      >
        <div className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-lime-500/10 blur-3xl group-hover:bg-lime-500/20 transition" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-lime-500/10 border border-lime-500/20 text-lime-400">
              <Sun className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold tracking-widest text-lime-400 uppercase">
                  Minuta Oficial Quark · Venda Fechada
                </p>
                {closedLeads.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {closedLeads.length} cliente(s) aguardando contrato
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-zinc-100 mt-0.5">
                Emitir Contrato com Pré-visualização ao Vivo
              </h2>
              <p className="text-xs text-zinc-400 max-w-xl mt-1">
                Selecione os clientes em fase de fechamento e veja em tempo real o contrato timbrado sendo preenchido automaticamente com dados, valores e kit solar.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-lime-400 group-hover:translate-x-1 transition shrink-0">
            Criar Contrato Agora <ChevronRight className="w-4 h-4" />
          </span>
        </div>
      </div>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 backdrop-blur-md">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            Total de Contratos
          </p>
          <p className="text-xl font-bold font-mono text-white mt-1">
            {allContracts.length}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 backdrop-blur-md">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
            Aguardando Assinatura
          </p>
          <p className="text-xl font-bold font-mono text-amber-400 mt-1">
            {waitingContracts.length}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 backdrop-blur-md">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
            Valor Assinado
          </p>
          <p className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {formatBrl(totalSignedValue)}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 backdrop-blur-md">
          <p className="text-[10px] font-bold text-lime-400 uppercase tracking-wider">
            Potência Assinada
          </p>
          <p className="text-xl font-bold font-mono text-lime-400 mt-1">
            {totalSignedKwp.toFixed(2)} kWp
          </p>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs w-fit">
          {(
            [
              { id: 'todos', label: 'Todos' },
              { id: 'rascunho', label: 'Rascunho' },
              { id: 'enviado', label: 'Aguardando' },
              { id: 'assinado', label: 'Assinados' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                filter === tab.id
                  ? 'bg-zinc-800 text-lime-400 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente ou título..."
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-lime-500/40"
          />
        </div>
      </div>

      {/* Lista de Contratos */}
      {isLoading ? (
        <div className="p-12 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-lime-400" />
          Carregando contratos...
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-white/5 text-zinc-500 text-xs space-y-2">
          <p className="font-semibold text-zinc-300">Nenhum contrato encontrado</p>
          <p>Clique em "Novo Contrato Solar" para gerar a primeira minuta com assinatura digital.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredContracts.map((d) => {
            const kwp = d.data?.equipment ? contractKwp(d.data) : 0;
            const signers = d.signers || [];
            const signedCount = signers.filter((s) => s.signed_at).length;
            const clientSigner = signers.find((s) => s.role === 'contratante') || signers[0];

            return (
              <div
                key={d.id}
                className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-zinc-700/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group shadow-md"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="p-2.5 rounded-xl bg-lime-500/10 border border-lime-500/20 text-lime-400 shrink-0">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-zinc-100 truncate">
                        {d.data?.client?.name || d.title}
                      </h3>
                      {d.status === 'assinado' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <ShieldCheck className="w-3 h-3" /> Assinado
                        </span>
                      ) : d.status === 'enviado' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock className="w-3 h-3" /> Aguardando Assinatura
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400">
                          Rascunho
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-x-3 gap-y-1 mt-1 text-xs text-zinc-400 flex-wrap">
                      {kwp > 0 && (
                        <span className="font-semibold text-lime-400">
                          {kwp.toFixed(2)} kWp
                        </span>
                      )}
                      {Number(d.data?.price) > 0 && (
                        <span>· {formatBrl(Number(d.data.price))}</span>
                      )}
                      {d.data?.supplier?.name && (
                        <span>· {d.data.supplier.name}</span>
                      )}
                      <span>
                        · Criado em {new Date(d.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    {/* Barra de Progresso de Signatários */}
                    {signers.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex gap-1">
                          {signers.map((s, idx) => (
                            <span
                              key={idx}
                              title={`${s.role}: ${s.signed_at ? 'Assinado' : 'Pendente'}`}
                              className={`h-1.5 w-6 rounded-full ${
                                s.signed_at
                                  ? 'bg-emerald-500'
                                  : s.viewed_at
                                  ? 'bg-amber-400'
                                  : 'bg-zinc-700'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] font-semibold text-zinc-400">
                          {signedCount}/{signers.length} assinaturas
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-white/5 shrink-0">
                  {clientSigner?.token && (
                    <>
                      <button
                        onClick={() => copySignLink(clientSigner.token)}
                        title="Copiar link de assinatura pública"
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => shareViaWhatsApp(d)}
                        title="Enviar contrato no WhatsApp"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        WhatsApp
                      </button>

                      <a
                        href={`/assinar/${clientSigner.token}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Abrir tela de assinatura"
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </>
                  )}

                  {d.status !== 'assinado' && (
                    <button
                      onClick={() =>
                        updateStatus.mutate({ id: d.id, status: 'assinado' })
                      }
                      title="Marcar como Assinado"
                      className="p-2 rounded-xl bg-zinc-800 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-400 transition"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (confirm(`Excluir o contrato "${d.title}"?`)) {
                        deleteContract.mutate(d.id);
                      }
                    }}
                    title="Excluir contrato"
                    className="p-2 rounded-xl hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Expandido com Pré-visualização ao Vivo e Filtro de Fechamento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-7xl bg-zinc-950 border border-white/10 rounded-2xl p-4 sm:p-6 shadow-2xl max-h-[95vh] flex flex-col overflow-hidden">
            
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-lime-500/10 border border-lime-500/20 text-lime-400">
                  <ScrollText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">
                      Emissão de Contrato Solar
                    </h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-lime-500/10 text-lime-400 border border-lime-500/20">
                      Minuta Oficial Quark Energia
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Selecione o cliente de fechamento para auto-preenchimento ou edite com preview ao vivo
                  </p>
                </div>
              </div>

              {/* Botões Mobile (Tabs) e Fechar */}
              <div className="flex items-center gap-2">
                <div className="lg:hidden flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setModalTab('form')}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
                      modalTab === 'form' ? 'bg-zinc-800 text-lime-400' : 'text-zinc-400'
                    }`}
                  >
                    Formulário
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab('preview')}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
                      modalTab === 'preview' ? 'bg-zinc-800 text-lime-400' : 'text-zinc-400'
                    }`}
                  >
                    Preview ({liveKwp.toFixed(2)} kWp)
                  </button>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Corpo em 2 Colunas (Formulário à Esquerda | Preview à Direita) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0 overflow-hidden">
              
              {/* COLUNA ESQUERDA: Formulário com Dados e Seleção do Funil */}
              <div
                className={`lg:col-span-6 flex flex-col space-y-4 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar ${
                  modalTab === 'preview' ? 'hidden lg:flex' : 'flex'
                }`}
              >
                {/* 1. Selecionar Cliente do Funil (com Foco em Fechamento) */}
                <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-lime-400" />
                      Puxar Cliente do Funil de Vendas
                    </label>

                    {/* Filtro: Fechamento vs Todos */}
                    <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setLeadFilterMode('fechados')}
                        className={`px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1 ${
                          leadFilterMode === 'fechados'
                            ? 'bg-lime-500/20 text-lime-400 border border-lime-500/30'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        ⭐ Venda Fechada / Fechamento ({closedLeads.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeadFilterMode('todos')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition ${
                          leadFilterMode === 'todos'
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-500 hover:text-white'
                        }`}
                      >
                        Todos ({leads.length})
                      </button>
                    </div>
                  </div>

                  {/* Combobox Pesquisável com Digitação e Ordem Alfabética (A-Z) */}
                  <div ref={leadComboboxRef} className="relative">
                    <div className="relative">
                      <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={leadSearchText}
                        onChange={(e) => {
                          setLeadSearchText(e.target.value);
                          setIsLeadDropdownOpen(true);
                        }}
                        onFocus={() => setIsLeadDropdownOpen(true)}
                        placeholder="Escreva o nome do cliente para buscar (A-Z)..."
                        className="w-full pl-9 pr-9 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-lime-500/50 shadow-inner"
                      />
                      {leadSearchText && (
                        <button
                          type="button"
                          onClick={() => {
                            setLeadSearchText('');
                            setSelectedLeadId('');
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                          title="Limpar busca"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Menu Dropdown com Scroll e Clientes em Ordem Alfabética */}
                    {isLeadDropdownOpen && (
                      <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl custom-scrollbar py-1 divide-y divide-zinc-900/60">
                        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-900/60 flex items-center justify-between">
                          <span>Clientes em Ordem Alfabética ({sortedAndFilteredLeads.length})</span>
                          {leadFilterMode === 'fechados' && (
                            <span className="text-lime-400 font-semibold">Foco: Fechamento</span>
                          )}
                        </div>

                        {sortedAndFilteredLeads.length === 0 ? (
                          <div className="px-4 py-3 text-xs text-zinc-500 text-center">
                            Nenhum cliente encontrado com "{leadSearchText}"
                          </div>
                        ) : (
                          sortedAndFilteredLeads.map((l) => {
                            const isSelected = selectedLeadId === l.id;
                            const isClosed = isClosedDeal(l);
                            return (
                              <button
                                key={l.id}
                                type="button"
                                onClick={() => handleSelectLead(l.id)}
                                className={`w-full text-left px-3 py-2.5 flex items-center justify-between text-xs transition ${
                                  isSelected
                                    ? 'bg-lime-500/15 text-lime-400 font-bold'
                                    : 'text-zinc-200 hover:bg-zinc-900 hover:text-white'
                                }`}
                              >
                                <div className="flex flex-col min-w-0 pr-2">
                                  <div className="flex items-center gap-1.5">
                                    {isClosed && <span className="text-yellow-400 text-xs">⭐</span>}
                                    <span className="truncate font-semibold text-zinc-100">{l.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                                    <span className="px-1.5 py-0.2 rounded bg-zinc-800/80 text-zinc-300">
                                      {l.status || 'Lead'}
                                    </span>
                                    {l.city && <span>· {l.city}</span>}
                                    {l.cpfCnpj && <span>· Doc: {l.cpfCnpj}</span>}
                                  </div>
                                </div>

                                {l.value && Number(l.value) > 0 && (
                                  <span className="text-xs font-mono font-bold text-lime-400 shrink-0">
                                    {formatBrl(Number(l.value))}
                                  </span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {selectedLeadObj && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          <b>{selectedLeadObj.name}</b> · Status: <b>{selectedLeadObj.status || 'Fechamento'}</b>
                          {selectedLeadObj.value ? ` · Proposta: ${formatBrl(Number(selectedLeadObj.value))}` : ''}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLeadId('');
                          setLeadSearchText('');
                        }}
                        className="text-[11px] underline hover:text-emerald-300 ml-2"
                      >
                        Limpar
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Dados do Cliente / Contratante */}
                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 space-y-3">
                  <p className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-lime-400" /> Dados do Contratante
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                        Nome do Contratante *
                      </label>
                      <input
                        type="text"
                        required
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Nome completo ou Razão Social"
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-lime-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                        CPF ou CNPJ
                      </label>
                      <input
                        type="text"
                        value={clientDoc}
                        onChange={(e) => setClientDoc(e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-lime-500/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                        Endereço de Instalação
                      </label>
                      <input
                        type="text"
                        value={clientAddress}
                        onChange={(e) => setClientAddress(e.target.value)}
                        placeholder="Rua, número, bairro"
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-lime-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                        Telefone WhatsApp
                      </label>
                      <input
                        type="text"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        placeholder="(82) 99999-9999"
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-lime-500/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Cidade</label>
                      <input
                        type="text"
                        value={clientCity}
                        onChange={(e) => setClientCity(e.target.value)}
                        placeholder="Maceió"
                        className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Estado (UF)</label>
                      <input
                        type="text"
                        value={clientState}
                        onChange={(e) => setClientState(e.target.value)}
                        placeholder="AL"
                        className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">CEP</label>
                      <input
                        type="text"
                        value={clientCep}
                        onChange={(e) => setClientCep(e.target.value)}
                        placeholder="57000-000"
                        className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Equipamentos do Sistema Solar */}
                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-lime-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" /> Equipamentos do Sistema Solar
                    </p>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-lime-500/10 text-lime-400 border border-lime-500/20">
                      Potência Total: {liveKwp.toFixed(2)} kWp
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Módulos (Marca)</label>
                      <input
                        type="text"
                        value={moduleBrand}
                        onChange={(e) => setModuleBrand(e.target.value)}
                        placeholder="Canadian Solar"
                        className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Potência (W)</label>
                      <input
                        type="number"
                        value={modulePower}
                        onChange={(e) => setModulePower(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Qtd. Módulos</label>
                      <input
                        type="number"
                        value={moduleQty}
                        onChange={(e) => setModuleQty(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Inversor (kW)</label>
                      <input
                        type="number"
                        value={inverterPower}
                        onChange={(e) => setInverterPower(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Marca Inversor</label>
                      <input
                        type="text"
                        value={inverterBrand}
                        onChange={(e) => setInverterBrand(e.target.value)}
                        placeholder="Deye / SolPlanet / Growatt"
                        className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Tipo de Estrutura</label>
                      <input
                        type="text"
                        value={structureType}
                        onChange={(e) => setStructureType(e.target.value)}
                        placeholder="Telhado Cerâmico / Metálico / Laje"
                        className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Distribuidora / Fornecedor</label>
                      <input
                        type="text"
                        value={supplierName}
                        onChange={(e) => setSupplierName(e.target.value)}
                        placeholder="Fortlev Solar / Sou Energy"
                        className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Valores e Forma de Pagamento */}
                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 space-y-3">
                  <p className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-lime-400" /> Valores e Forma de Pagamento
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                        Valor Total do Contrato (R$) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={totalPrice}
                        onChange={(e) => setTotalPrice(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-lime-400 font-bold focus:outline-none focus:border-lime-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                        Forma de Pagamento
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-lime-500/50"
                      >
                        <option value="pix">PIX / Transferência À Vista</option>
                        <option value="cartao">Cartão de Crédito Parcelado</option>
                        <option value="entrada">Entrada + Saldo na Conclusão</option>
                        <option value="financiamento">Financiamento Solar Bancário</option>
                        <option value="personalizado">Condição Personalizada</option>
                      </select>
                    </div>
                  </div>

                  {paymentMethod === 'cartao' && (
                    <div className="grid grid-cols-2 gap-3 p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs">
                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-1">Parcelas (Vezes)</label>
                        <input
                          type="number"
                          value={installments}
                          onChange={(e) => setInstallments(Number(e.target.value))}
                          className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-white"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-4">
                        <input
                          type="checkbox"
                          id="withInterest"
                          checked={withInterest}
                          onChange={(e) => setWithInterest(e.target.checked)}
                          className="rounded border-zinc-800 bg-zinc-900 text-lime-500 focus:ring-0"
                        />
                        <label htmlFor="withInterest" className="text-zinc-300 text-[11px]">
                          Com juros da máquina
                        </label>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'entrada' && (
                    <div className="grid grid-cols-2 gap-3 p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs">
                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-1">Valor da Entrada (R$)</label>
                        <input
                          type="number"
                          value={entryPrice}
                          onChange={(e) => setEntryPrice(Number(e.target.value))}
                          placeholder="Ex: 10000"
                          className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-white"
                        />
                      </div>
                      <div className="text-[11px] text-zinc-400 pt-3">
                        Saldo restante: <b className="text-lime-400">{formatBrl(Math.max(0, totalPrice - entryPrice))}</b>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'personalizado' && (
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1">Texto da Condição Personalizada</label>
                      <textarea
                        rows={2}
                        value={customPaymentText}
                        onChange={(e) => setCustomPaymentText(e.target.value)}
                        placeholder="Ex: R$ 10.000 de entrada via PIX e saldo em 18x no boleto..."
                        className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white"
                      />
                    </div>
                  )}
                </div>

                {/* 5. Concessionária & Foro */}
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-zinc-900/60 border border-white/5">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      Concessionária Local
                    </label>
                    <input
                      type="text"
                      value={utilityName}
                      onChange={(e) => setUtilityName(e.target.value)}
                      placeholder="Equatorial AL"
                      className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      Comarca do Foro
                    </label>
                    <input
                      type="text"
                      value={forumCity}
                      onChange={(e) => setForumCity(e.target.value)}
                      placeholder="Maceió"
                      className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* COLUNA DIREITA: Pré-visualização do Contrato em Tempo Real */}
              <div
                className={`lg:col-span-6 flex flex-col bg-zinc-900/70 border border-white/10 rounded-2xl p-4 overflow-hidden ${
                  modalTab === 'form' ? 'hidden lg:flex' : 'flex'
                }`}
              >
                {/* Cabeçalho do Preview */}
                <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-500"></span>
                      </span>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-lime-400" />
                        Preview do Contrato em Tempo Real
                      </h3>
                    </div>
                  </div>

                  {/* Alternador de Modo: Folha Impressa vs Texto */}
                  <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setPreviewMode('visual')}
                      className={`px-2 py-0.5 rounded font-semibold transition ${
                        previewMode === 'visual' ? 'bg-zinc-800 text-lime-400' : 'text-zinc-500'
                      }`}
                    >
                      Folha Oficial
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('texto')}
                      className={`px-2 py-0.5 rounded font-semibold transition ${
                        previewMode === 'texto' ? 'bg-zinc-800 text-lime-400' : 'text-zinc-500'
                      }`}
                    >
                      Minuta Texto
                    </button>
                  </div>
                </div>

                {/* Banner de Resumo Rápido da Minuta */}
                <div className="grid grid-cols-3 gap-2 mb-3 shrink-0 text-center">
                  <div className="p-2 rounded-lg bg-zinc-950/80 border border-white/5">
                    <p className="text-[10px] text-zinc-500 uppercase">Potência</p>
                    <p className="text-xs font-bold font-mono text-lime-400">{liveKwp.toFixed(2)} kWp</p>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-950/80 border border-white/5">
                    <p className="text-[10px] text-zinc-500 uppercase">Valor</p>
                    <p className="text-xs font-bold font-mono text-emerald-400">{formatBrl(totalPrice || 0)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-950/80 border border-white/5">
                    <p className="text-[10px] text-zinc-500 uppercase">Kit Solar</p>
                    <p className="text-xs font-bold font-mono text-zinc-300">{moduleQty} mods · {inverterPower} kW</p>
                  </div>
                </div>

                {/* Área Scrollável do Documento */}
                <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 sm:p-4 shadow-inner custom-scrollbar">
                  {previewMode === 'visual' ? (
                    <div className="origin-top transition-all">
                      <DocumentView
                        kind="contrato"
                        data={liveContratoData}
                        company={{ company_name: 'Quark Energia', logo_url: '/brand/logo-h-color.png' }}
                      />
                    </div>
                  ) : (
                    <div className="space-y-4 text-xs font-mono text-zinc-300 leading-relaxed p-2">
                      <div className="p-3 rounded-lg bg-zinc-900 border border-white/5">
                        <p className="font-bold text-white uppercase text-center mb-1">
                          CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MICROGERAÇÃO SOLAR
                        </p>
                        <p className="text-[11px] text-zinc-400 text-center">
                          Quark Energia · CNPJ 55.138.256/0001-51
                        </p>
                      </div>

                      {liveBlocks.map((block, idx) => {
                        if (block.t === 'title' || block.t === 'sub') return null;
                        if (block.t === 'h') {
                          return (
                            <h4 key={idx} className="font-bold text-lime-400 uppercase pt-2 border-b border-zinc-800 pb-1">
                              {block.text}
                            </h4>
                          );
                        }
                        if (block.t === 'li') {
                          return (
                            <p key={idx} className="pl-3 text-zinc-300 border-l border-zinc-800">
                              {block.text}
                            </p>
                          );
                        }
                        return (
                          <p key={idx} className="text-zinc-300">
                            {block.text}
                          </p>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Rodapé com Ações */}
            <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-3 shrink-0 mt-4">
              <div className="text-xs text-zinc-400 hidden sm:block">
                {clientName ? (
                  <span>
                    Contrato para <b className="text-white">{clientName}</b> ({liveKwp.toFixed(2)} kWp · {formatBrl(totalPrice)})
                  </span>
                ) : (
                  <span>Preencha o nome do contratante para finalizar.</span>
                )}
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateContract}
                  disabled={createContract.isPending || !clientName.trim() || totalPrice <= 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-zinc-950 font-bold text-xs transition disabled:opacity-50 shadow-lg shadow-lime-500/20"
                >
                  {createContract.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  Gerar Contrato & Criar Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
