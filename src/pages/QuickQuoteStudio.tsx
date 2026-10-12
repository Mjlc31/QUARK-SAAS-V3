import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Download,
  Share2,
  FileText,
  RotateCcw,
  Smartphone,
  LayoutGrid,
  Check,
  Zap,
  Building,
  User,
  Phone,
  ArrowRight,
  Loader2,
  Sun,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  Building2
} from 'lucide-react';
import { useCrm } from '../contexts/CrmContext';
import { useAuth } from '../contexts/AuthContext';
import {
  QuickQuoteInput,
  DEFAULT_QUICK,
  quickQuote,
  modulesFor,
  inverterFor,
  brl,
  fmtNum
} from '../lib/quick-quote';
import { OfferCard, STORY_W, STORY_H, OfferData, Highlight } from '../components/quick-quote/offer-card';
import { QuoteCard, CARD_W, CARD_H, QuoteCardData } from '../components/quick-quote/quote-card';
import { recordXpEvent } from '../lib/gamification';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

const HEADLINES = [
  ['Oportunidade', 'Imperdível'],
  ['Sua energia', 'Solar'],
  ['Adeus', 'Conta alta'],
  ['Economia', 'Garantida'],
  ['Oferta', 'Especial'],
  ['Investimento', 'Inteligente'],
];

const DEFAULT_INCLUDED = [
  'Kit fotovoltaico completo homologado',
  'Projeto de engenharia e homologação na rede',
  'Instalação profissional em até 30 dias',
  'Equipamentos premium com certificação INMETRO',
  'Monitoramento remoto em tempo real pelo app',
].join('\n');

const QuickQuoteStudio: React.FC = () => {
  const { leads, addLeadLog } = useCrm();
  const { user } = useAuth();

  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [client, setClient] = useState({
    name: '',
    city: 'Maceió - AL',
    roof: 'Telhado Cerâmico',
    phone: '',
  });

  const [q, setQ] = useState<QuickQuoteInput>(DEFAULT_QUICK);
  const [template, setTemplate] = useState<'story' | 'feed'>('story');
  const [validityDays, setValidityDays] = useState(7);
  const [brands, setBrands] = useState({ module: 'Canadian Solar', inverter: 'Growatt' });

  // Customização de copy e oferta
  const [headlineIdx, setHeadlineIdx] = useState(0);
  const [customHeadline, setCustomHeadline] = useState({ h1: '', h2: '' });
  const [campaign, setCampaign] = useState('');
  const [highlight, setHighlight] = useState<Highlight>('cartao');
  const [moduleWarranty, setModuleWarranty] = useState(15);
  const [inverterWarranty, setInverterWarranty] = useState(10);
  const [efficiency, setEfficiency] = useState(22.5);
  const [includedText, setIncludedText] = useState(DEFAULT_INCLUDED);
  const [footer1, setFooter1] = useState('Parcelado em até 18x no cartão de crédito');
  const [footer2, setFooter2] = useState('Financiamento em até 72x sem entrada, 1ª parcela em 120 dias');

  const [busy, setBusy] = useState<'png' | 'pdf' | 'share' | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);

  // Número identificador da proposta
  const [proposalNumber, setProposalNumber] = useState('');
  useEffect(() => {
    setProposalNumber(`${new Date().getFullYear()}${String(Date.now()).slice(-5)}`);
  }, []);

  // Quando seleciona um lead do CRM, preenche automaticamente os dados
  useEffect(() => {
    if (!selectedLeadId) return;
    const l = leads.find((x) => x.id === selectedLeadId);
    if (!l) return;
    setClient({
      name: l.name || '',
      city: l.city ? `${l.city}${l.state ? ` - ${l.state}` : ''}` : 'Maceió - AL',
      roof: 'Telhado Cerâmico',
      phone: l.phone || '',
    });
    if (l.monthlyConsumption && l.monthlyConsumption > 0) {
      setQ((prev) => ({ ...prev, consumptionKwh: l.monthlyConsumption, modules: 0 }));
    }
  }, [selectedLeadId, leads]);

  // Redimensionamento responsivo do card no navegador
  const currentW = template === 'story' ? STORY_W : CARD_W;
  const currentH = template === 'story' ? STORY_H : CARD_H;

  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;
    const handleResize = () => {
      const containerWidth = el.clientWidth - 32; // margem
      const scale = Math.min(1, Math.max(0.35, containerWidth / currentW));
      setPreviewScale(scale);
    };
    handleResize();
    const observer = new ResizeObserver(handleResize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [currentW, currentH]);

  const quoteResult = useMemo(() => quickQuote(q), [q]);

  const activeH1 = customHeadline.h1.trim() || HEADLINES[headlineIdx][0];
  const activeH2 = customHeadline.h2.trim() || HEADLINES[headlineIdx][1];

  const offerData: OfferData = {
    client: client.name || 'Cliente',
    city: client.city,
    headline1: activeH1,
    headline2: activeH2,
    campaign,
    moduleW: q.moduleW,
    moduleBrand: brands.module,
    moduleType: 'Bifacial N-Type',
    efficiency,
    moduleWarranty,
    inverterBrand: brands.inverter,
    inverterKw: quoteResult.inverterKw,
    inverterWarranty,
    included: includedText.split('\n').filter(Boolean),
    footer1,
    footer2,
    highlight,
    financingMonths: q.financingMonths,
    cardInstallments: q.cardInstallments,
    validityDays,
    company: 'QUARK ENERGIA',
    seller: user?.name?.split(' ')[0] || 'Consultor Quark',
    sellerPhone: '82 99999-9999',
    number: proposalNumber,
  };

  const quoteCardData: QuoteCardData = {
    client: client.name || 'Cliente',
    city: client.city,
    roof: client.roof,
    moduleBrand: brands.module,
    inverterBrand: brands.inverter,
    moduleW: q.moduleW,
    financingMonths: q.financingMonths,
    cardInstallments: q.cardInstallments,
    cashDiscountPct: q.cashDiscountPct,
    validityDays,
    company: 'QUARK ENERGIA',
    seller: user?.name?.split(' ')[0] || 'Consultor Quark',
    sellerPhone: '82 99999-9999',
    number: proposalNumber,
  };

  // Renderizador em Canvas via html2canvas
  const generateCanvas = async () => {
    if (!cardRef.current) throw new Error('Card element not found');
    const element = cardRef.current;
    return await html2canvas(element, {
      scale: 2, // 2x para nitidez cinematográfica (1080px wide)
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#07060F',
      onclone: (_clonedDoc, clonedElement) => {
        // Remove qualquer escala de preview para garantir resolução pura nativa
        clonedElement.style.transform = 'none';
        if (clonedElement.parentElement) {
          clonedElement.parentElement.style.transform = 'none';
        }
      },
    });
  };

  const handleDownloadPng = async () => {
    setBusy('png');
    try {
      const canvas = await generateCanvas();
      const link = document.createElement('a');
      link.download = `oferta-${(client.name || 'solar').toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      if (user?.id) recordXpEvent(user.id, 'proposta', { kwp: quoteResult.kwp });
      if (selectedLeadId) {
        addLeadLog(
          selectedLeadId,
          'Orçamento Rápido (PNG)',
          `Gerou arte ${template === 'story' ? 'Story' : 'Feed'} com ${quoteResult.kwp.toFixed(2)} kWp e economia de ${brl(quoteResult.monthlySavings, 0)}/mês`
        );
      }
      toast.success('Imagem salva com sucesso em alta definição (1080px)!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar imagem');
    } finally {
      setBusy(null);
    }
  };

  const handleDownloadPdf = async () => {
    setBusy('pdf');
    try {
      const canvas = await generateCanvas();
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const isStory = template === 'story';

      // Cria PDF nas proporções exatas do elemento
      const pdf = new jsPDF({
        orientation: isStory ? 'portrait' : 'portrait',
        unit: 'px',
        format: [currentW, currentH],
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, currentW, currentH);
      pdf.save(`oferta-${(client.name || 'solar').toLowerCase().replace(/\s+/g, '-')}.pdf`);

      if (user?.id) recordXpEvent(user.id, 'proposta', { kwp: quoteResult.kwp });
      toast.success('PDF exportado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar PDF');
    } finally {
      setBusy(null);
    }
  };

  const handleShareWhatsApp = async () => {
    setBusy('share');
    try {
      const canvas = await generateCanvas();
      const link = document.createElement('a');
      const filename = `oferta-${(client.name || 'solar').toLowerCase().replace(/\s+/g, '-')}.png`;
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();

      const firstName = client.name.split(' ')[0] || 'tudo bem';
      const text = `Olá ${firstName}! ☀️ Preparei uma simulação exclusiva de energia solar para você:\n\n⚡ Sistema: ${quoteResult.kwp.toFixed(2)} kWp (${quoteResult.modules} placas)\n💰 Economia estimada: ${brl(quoteResult.monthlySavings, 0)}/mês\n${highlight === 'cartao' ? `💳 Parcela no cartão: ${q.cardInstallments}x de ${brl(quoteResult.card, 0)}\n` : ''}${highlight === 'financiamento' ? `🏦 Parcela no financiamento: ${q.financingMonths}x de ${brl(quoteResult.financing, 0)}\n` : ''}💎 Valor à vista: ${brl(quoteResult.cashPrice, 0)}\n\nA imagem da proposta foi baixada no seu dispositivo. Posso te apresentar os detalhes?`;

      const phoneDigits = client.phone.replace(/\D/g, '');
      const fullPhone = phoneDigits.startsWith('55') ? phoneDigits : `55${phoneDigits}`;
      const waUrl = phoneDigits
        ? `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`
        : `https://wa.me/?text=${encodeURIComponent(text)}`;

      window.open(waUrl, '_blank');

      if (user?.id) recordXpEvent(user.id, 'proposta', { kwp: quoteResult.kwp });
      if (selectedLeadId) {
        addLeadLog(
          selectedLeadId,
          'Orçamento Rápido (WhatsApp)',
          `Disparou proposta rápida no WhatsApp com mensagem de oferta e arte baixada.`
        );
      }
      toast.success('Imagem salva e WhatsApp aberto com texto pronto!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao compartilhar');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      {/* ── Topo do Estúdio ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-lime-500/10 text-lime-400 border border-lime-500/20 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Estúdio de Vendas
            </span>
            <span className="text-xs text-zinc-500 font-mono">Nº {proposalNumber}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Estúdio de Oferta Rápida
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Gere artes cinematográficas (Story 9:16 ou Feed 4:5) para WhatsApp e Instagram em segundos.
          </p>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleDownloadPng}
            disabled={busy !== null}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
          >
            {busy === 'png' ? <Loader2 className="w-4 h-4 animate-spin text-lime-400" /> : <Download className="w-4 h-4 text-lime-400" />}
            Baixar PNG
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={busy !== null}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
          >
            {busy === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin text-lime-400" /> : <FileText className="w-4 h-4 text-lime-400" />}
            Baixar PDF
          </button>
          <button
            onClick={handleShareWhatsApp}
            disabled={busy !== null}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-zinc-950 text-xs font-black transition shadow-[0_0_20px_rgba(132,204,22,0.3)] disabled:opacity-50"
          >
            {busy === 'share' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            Enviar no WhatsApp
          </button>
        </div>
      </div>

      {/* ── Grid Principal: Configurações na Esquerda & Preview à Direita ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* COLUNA ESQUERDA: CONTROLES (5 colunas) */}
        <div className="lg:col-span-5 space-y-5">
          {/* 1. SELETOR DE FORMATO */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2.5">
              Formato da Arte
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTemplate('story')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition border ${
                  template === 'story'
                    ? 'bg-lime-500/15 border-lime-500/50 text-lime-400 shadow-[0_0_15px_rgba(132,204,22,0.15)]'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4" /> Story 9:16 (Status / Insta)
              </button>
              <button
                type="button"
                onClick={() => setTemplate('feed')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition border ${
                  template === 'feed'
                    ? 'bg-lime-500/15 border-lime-500/50 text-lime-400 shadow-[0_0_15px_rgba(132,204,22,0.15)]'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-4 h-4" /> Feed 4:5 (Post / Catálogo)
              </button>
            </div>
          </div>

          {/* 2. DADOS DO CLIENTE & LEAD */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-lime-400" /> Cliente & Contato
              </span>
              {leads.length > 0 && (
                <span className="text-[11px] text-zinc-500 font-mono">
                  {leads.length} leads no CRM
                </span>
              )}
            </div>

            {/* Puxar do CRM */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                Puxar Lead do CRM (opcional)
              </label>
              <select
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-500 transition"
              >
                <option value="">Digitar manualmente abaixo...</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} {l.city ? `(${l.city})` : ''} {l.monthlyConsumption ? `· ${l.monthlyConsumption} kWh` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Nome no Orçamento</label>
                <input
                  type="text"
                  value={client.name}
                  onChange={(e) => setClient((c) => ({ ...c, name: e.target.value }))}
                  placeholder="Ex: Dra. Juliana Santos"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-500 transition"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Cidade e UF</label>
                <input
                  type="text"
                  value={client.city}
                  onChange={(e) => setClient((c) => ({ ...c, city: e.target.value }))}
                  placeholder="Maceió - AL"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-500 transition"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">WhatsApp</label>
                <input
                  type="text"
                  value={client.phone}
                  onChange={(e) => setClient((c) => ({ ...c, phone: e.target.value }))}
                  placeholder="(82) 99999-9999"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-500 transition"
                />
              </div>
            </div>
          </div>

          {/* 3. DIMENSIONAMENTO & PREÇO */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Sun className="w-3.5 h-3.5 text-lime-400" /> Sistema & Financeiro
              </span>
              <span className="text-[11px] font-mono text-lime-400 font-bold">
                {quoteResult.kwp.toFixed(2)} kWp · {quoteResult.modules} placas
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Consumo Médio (kWh)</label>
                <input
                  type="number"
                  value={q.consumptionKwh}
                  onChange={(e) => setQ((prev) => ({ ...prev, consumptionKwh: Number(e.target.value) || 0 }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-lime-500 transition"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Potência da Placa (W)</label>
                <input
                  type="number"
                  value={q.moduleW}
                  onChange={(e) => setQ((prev) => ({ ...prev, moduleW: Number(e.target.value) || 550 }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-lime-500 transition"
                />
              </div>
            </div>

            {/* Preço e Modo */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                  Modo de Preço
                </label>
                <select
                  value={q.priceMode}
                  onChange={(e) => setQ((prev) => ({ ...prev, priceMode: e.target.value as 'wp' | 'total' }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-500 transition"
                >
                  <option value="wp">R$/Wp (por Watt)</option>
                  <option value="total">Valor Total (R$)</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                  {q.priceMode === 'wp' ? 'Valor R$/Wp' : 'Valor Total (R$)'}
                </label>
                <input
                  type="number"
                  step={q.priceMode === 'wp' ? '0.05' : '100'}
                  value={q.price}
                  onChange={(e) => setQ((prev) => ({ ...prev, price: Number(e.target.value) || 0 }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-lime-500 transition"
                />
              </div>
            </div>

            {/* Condições de Pagamento */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60">
              <div>
                <label className="text-[10px] font-semibold text-zinc-400 block mb-1">Desconto À Vista</label>
                <input
                  type="number"
                  value={q.cashDiscountPct}
                  onChange={(e) => setQ((prev) => ({ ...prev, cashDiscountPct: Number(e.target.value) || 0 }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-zinc-400 block mb-1">Cartão (Parcelas)</label>
                <input
                  type="number"
                  max={24}
                  value={q.cardInstallments}
                  onChange={(e) => setQ((prev) => ({ ...prev, cardInstallments: Number(e.target.value) || 12 }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-zinc-400 block mb-1">Financ. (Meses)</label>
                <input
                  type="number"
                  max={84}
                  value={q.financingMonths}
                  onChange={(e) => setQ((prev) => ({ ...prev, financingMonths: Number(e.target.value) || 72 }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* 4. VISUAL & COPY DA OFERTA */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-lime-400" /> Copy & Destaques
              </span>
            </div>

            {/* Destaque Principal do Preço */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 block mb-1.5">
                Destaque Principal no Card
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cartao', label: 'Cartão 18x' },
                  { id: 'financiamento', label: 'Financ. 72x' },
                  { id: 'avista', label: 'À Vista' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setHighlight(opt.id as Highlight)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition border ${
                      highlight === opt.id
                        ? 'bg-lime-500/15 border-lime-500/60 text-lime-400'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Headlines */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 block mb-1.5">
                Título de Impacto
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {HEADLINES.map(([h1, h2], idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setHeadlineIdx(idx);
                      setCustomHeadline({ h1: '', h2: '' });
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition border ${
                      headlineIdx === idx && !customHeadline.h1
                        ? 'bg-lime-500 text-zinc-950 border-lime-500'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {h1} {h2}
                  </button>
                ))}
              </div>
            </div>

            {/* Selo de Campanha */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                Tag de Campanha (opcional)
              </label>
              <input
                type="text"
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                placeholder="Ex: Semana da Energia Solar"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-500 transition"
              />
            </div>

            {/* Itens Inclusos */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                Itens Inclusos (1 por linha)
              </label>
              <textarea
                rows={4}
                value={includedText}
                onChange={(e) => setIncludedText(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-500 transition leading-relaxed font-mono"
              />
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: LIVE PREVIEW & EXPORT (7 colunas) */}
        <div className="lg:col-span-7 sticky top-6">
          <div className="p-4 rounded-3xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md flex flex-col items-center">
            {/* Toolbar do Preview */}
            <div className="w-full flex items-center justify-between px-3 py-2 mb-4 border-b border-zinc-800/60">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-lime-500 animate-pulse" />
                <span className="text-xs font-bold text-zinc-300">
                  Prévia em Tempo Real ({template === 'story' ? 'Story 9:16' : 'Feed 4:5'})
                </span>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">
                {currentW} × {currentH} px (HD 2x)
              </span>
            </div>

            {/* Container escalonado para caber na tela */}
            <div
              ref={previewContainerRef}
              className="w-full flex items-center justify-center overflow-hidden py-2"
              style={{ minHeight: `${currentH * previewScale + 20}px` }}
            >
              <div
                style={{
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top center',
                  width: `${currentW}px`,
                  height: `${currentH}px`,
                }}
                className="transition-transform duration-200"
              >
                {template === 'story' ? (
                  <OfferCard ref={cardRef} q={quoteResult} d={offerData} />
                ) : (
                  <QuoteCard ref={cardRef} q={quoteResult} d={quoteCardData} />
                )}
              </div>
            </div>

            {/* Resumo da Oferta Embaixo do Preview */}
            <div className="w-full mt-4 pt-3 border-t border-zinc-800/60 grid grid-cols-3 gap-3 text-center">
              <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                <p className="text-[10px] text-zinc-400 font-semibold uppercase">Economia Mensal</p>
                <p className="text-base font-black text-lime-400 font-mono">{brl(quoteResult.monthlySavings, 0)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                <p className="text-[10px] text-zinc-400 font-semibold uppercase">À Vista com Desconto</p>
                <p className="text-base font-black text-white font-mono">{brl(quoteResult.cashPrice, 0)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                <p className="text-[10px] text-zinc-400 font-semibold uppercase">Parcela Cartão</p>
                <p className="text-base font-black text-yellow-400 font-mono">
                  {q.cardInstallments}x {brl(quoteResult.card, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickQuoteStudio;
