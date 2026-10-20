import React, { useState, useRef, useEffect, useMemo, forwardRef } from 'react';
import {
  Receipt,
  Plus,
  FileDown,
  Printer,
  Share2,
  ImageDown,
  Loader2,
  Search,
  User,
  Copy,
  Trash2,
  CheckCircle2,
  Calendar,
  DollarSign,
  Building2,
  CreditCard,
  Scissors
} from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas-pro';
import { useReceipts, useCreateReceipt, useUpdateReceipt, useDeleteReceipt } from '../hooks/useReceipts';
import { useLeads } from '../hooks/useLeads';
import {
  RECEIPT_METHODS,
  RECEIPT_REASONS,
  docLabel,
  formatDoc,
  formatBrl,
  longDate,
  moneyToWords,
  receiptStatement,
  type ReceiptData,
  type ReceiptRow
} from '../lib/receipt';
import { dataUrlToBytes, jpegToPdf } from '../lib/pdf-image';

const PAGE_W = 794; // A4 em 96 DPI
const PAGE_H = 1123;

const today = () => new Date().toISOString().split('T')[0];

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'cliente';

const DEFAULT_COMPANY = 'Quark Engenharia & Energia';
const DEFAULT_CNPJ = '48.244.593/0001-85';
const DEFAULT_ADDRESS = 'Maceió - AL';
const DEFAULT_PHONE = '(82) 99999-9999';
const DEFAULT_EMAIL = 'contato@quarkengenharia.com.br';
const DEFAULT_INSTAGRAM = 'quarkenergia';
const DEFAULT_SIGNATURE = '/brand/assinatura.png';

export default function ReceiptsPage() {
  const { data: receipts = [], isLoading: isLoadingReceipts } = useReceipts();
  const { data: leads = [] } = useLeads();
  const createReceipt = useCreateReceipt();
  const updateReceipt = useUpdateReceipt();
  const deleteReceipt = useDeleteReceipt();

  const [r, setR] = useState<ReceiptData>({
    number: null,
    payerName: '',
    payerDoc: '',
    amount: 0,
    description: '',
    method: 'PIX',
    installment: '',
    paidAt: today(),
    city: 'Maceió/AL',
  });

  const [leadId, setLeadId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(true);
  const [copies, setCopies] = useState<1 | 2>(2);
  const [withSignature, setWithSignature] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [suggest, setSuggest] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  const paperRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.65);

  const set = <K extends keyof ReceiptData>(k: K, v: ReceiptData[K]) => {
    setR((prev) => ({ ...prev, [k]: v }));
    setDirty(true);
  };

  // Ajusta a escala da folha A4 proporcionalmente à coluna de pré-visualização
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const inner = el.clientWidth - 32;
      setScale(Math.min(1, Math.max(0.35, inner / PAGE_W)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Selecionar lead via busca/autocomplete
  const pickLead = (l: { id: string; name: string; phone?: string; cpfCnpj?: string }) => {
    setLeadId(l.id);
    setR((prev) => ({
      ...prev,
      payerName: l.name,
      payerDoc: l.cpfCnpj || prev.payerDoc,
    }));
    setDirty(true);
    setSuggest(false);
  };

  const matches = useMemo(() => {
    const q = r.payerName.trim().toLowerCase();
    if (q.length < 2) return [];
    return leads
      .filter((l) => l.name.toLowerCase().includes(q))
      .slice(0, 5);
  }, [leads, r.payerName]);

  const activeLead = leads.find((l) => l.id === leadId);

  const ready = r.payerName.trim().length > 1 && r.amount > 0 && r.description.trim().length > 2;

  /* Salvar ou Atualizar Recibo */
  const ensureSaved = async (): Promise<ReceiptData | null> => {
    if (!ready) {
      toast.error('Preencha o pagador, o valor e o referente do recibo.');
      return null;
    }

    if (savedId && !dirty) return r;

    try {
      if (savedId) {
        const updated = await updateReceipt.mutateAsync({
          id: savedId,
          ...r,
          lead_id: leadId,
        });
        setDirty(false);
        toast.success(`Recibo nº ${String(updated.number).padStart(4, '0')} atualizado.`);
        return updated;
      } else {
        const created = await createReceipt.mutateAsync({
          ...r,
          lead_id: leadId,
        });
        setR((prev) => ({ ...prev, number: created.number }));
        setSavedId(created.id);
        setDirty(false);
        toast.success(`Recibo nº ${String(created.number).padStart(4, '0')} emitido com sucesso!`);
        return created;
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao salvar recibo.');
      return null;
    }
  };

  /* Renderizar Imagem A4 */
  const render = async (kind: 'png' | 'jpeg'): Promise<string> => {
    await new Promise((ok) => setTimeout(ok, 80));
    if (!paperRef.current) throw new Error('Elemento A4 não encontrado');

    const canvas = await html2canvas(paperRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: PAGE_W,
      height: PAGE_H,
    });

    return kind === 'png'
      ? canvas.toDataURL('image/png')
      : canvas.toDataURL('image/jpeg', 0.95);
  };

  const fileName = (d: ReceiptData) =>
    `recibo-${d.number ? String(d.number).padStart(4, '0') + '-' : ''}${slug(d.payerName)}`;

  const pdfBlob = async () => {
    const dataUrl = await render('jpeg');
    const bytes = dataUrlToBytes(dataUrl);
    const pdfBytes = jpegToPdf(bytes, PAGE_W * 2, PAGE_H * 2);
    return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  };

  const downloadFile = (href: string, name: string) => {
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    a.click();
  };

  const runWithBusy = async (key: string, fn: (d: ReceiptData) => Promise<void>) => {
    setBusy(key);
    try {
      const d = await ensureSaved();
      if (d) await fn(d);
    } catch (e) {
      console.error(e);
      toast.error('Falha ao processar exportação do recibo.');
    } finally {
      setBusy(null);
    }
  };

  const savePdf = () =>
    runWithBusy('pdf', async (d) => {
      const blob = await pdfBlob();
      const url = URL.createObjectURL(blob);
      downloadFile(url, `${fileName(d)}.pdf`);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success('PDF do recibo baixado com sucesso!');
    });

  const savePng = () =>
    runWithBusy('png', async (d) => {
      const dataUrl = await render('png');
      downloadFile(dataUrl, `${fileName(d)}.png`);
      toast.success('Imagem PNG baixada com sucesso!');
    });

  const print = () =>
    runWithBusy('print', async () => {
      const img = await render('jpeg');
      const w = window.open('', '_blank');
      if (!w) {
        toast.error('Permita popups no navegador para imprimir o recibo.');
        return;
      }
      w.document.write(`
        <html>
          <head>
            <title>Recibo Quark Energia</title>
            <style>
              @page { size: A4; margin: 0; }
              body { margin: 0; padding: 0; background: #fff; }
              img { width: 100%; display: block; }
            </style>
          </head>
          <body>
            <img src="${img}" onload="setTimeout(()=>{window.print();}, 200);" />
          </body>
        </html>
      `);
      w.document.close();
    });

  const shareWhatsapp = () =>
    runWithBusy('share', async (d) => {
      const blob = await pdfBlob();
      const file = new File([blob], `${fileName(d)}.pdf`, { type: 'application/pdf' });
      const text = `Olá, ${d.payerName.split(' ')[0]}! Segue o seu recibo nº ${d.number ? String(d.number).padStart(4, '0') : ''} no valor de ${formatBrl(d.amount)} referente a ${d.description.trim()}. Agradecemos pela confiança na Quark Energia! ☀️`;

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text });
          return;
        } catch {
          // Fallback para download e WhatsApp Web
        }
      }

      const url = URL.createObjectURL(blob);
      downloadFile(url, file.name);
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      const phoneRaw = activeLead?.phone?.replace(/\D/g, '') || '';
      const waUrl = phoneRaw
        ? `https://wa.me/55${phoneRaw}?text=${encodeURIComponent(text + '\n\n(O comprovante em PDF foi baixado, basta anexá-lo aqui)')}`
        : `https://wa.me/?text=${encodeURIComponent(text + '\n\n(O comprovante em PDF foi baixado, basta anexá-lo aqui)')}`;

      window.open(waUrl, '_blank', 'noopener,noreferrer');
    });

  const loadReceipt = (row: ReceiptRow, duplicate = false) => {
    setR({
      number: duplicate ? null : row.number,
      payerName: row.payerName,
      payerDoc: row.payerDoc,
      amount: row.amount,
      description: row.description,
      method: row.method,
      installment: row.installment,
      paidAt: duplicate ? today() : row.paidAt,
      city: row.city || 'Maceió/AL',
    });
    setLeadId(row.lead_id || null);
    setSavedId(duplicate ? null : row.id);
    setDirty(duplicate);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.info(duplicate ? 'Recibo duplicado: pronto para nova emissão.' : `Recibo nº ${String(row.number).padStart(4, '0')} carregado.`);
  };

  const resetForm = () => {
    setR({
      number: null,
      payerName: '',
      payerDoc: '',
      amount: 0,
      description: '',
      method: 'PIX',
      installment: '',
      paidAt: today(),
      city: 'Maceió/AL',
    });
    setLeadId(null);
    setSavedId(null);
    setDirty(true);
  };

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return receipts;
    const q = historySearch.toLowerCase();
    return receipts.filter(
      (rc: ReceiptRow) =>
        rc.payerName.toLowerCase().includes(q) ||
        rc.description.toLowerCase().includes(q) ||
        String(rc.number).includes(q)
    );
  }, [receipts, historySearch]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-lime-500/10 border border-lime-500/20 text-lime-400">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Recibos Financeiros
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-lime-500/10 text-lime-400 border border-lime-500/20">
                A4 Via Dupla
              </span>
            </h1>
            <p className="text-xs text-zinc-400">
              Emissão de comprovantes de pagamento com assinatura digital oficial e exportação PDF / WhatsApp
            </p>
          </div>
        </div>

        <button
          onClick={resetForm}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold border border-white/5 transition"
        >
          <Plus className="w-4 h-4 text-lime-400" />
          Novo Recibo
        </button>
      </div>

      {/* Grid Principal: Formulário + Preview A4 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Formulário (5 cols no Desktop) */}
        <div className="lg:col-span-5 space-y-5 bg-zinc-900/50 border border-white/5 backdrop-blur-xl rounded-2xl p-5 sm:p-6 shadow-xl">
          {/* Pagador */}
          <div className="relative">
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Recebido de (Pagador) *
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={r.payerName}
                onChange={(e) => {
                  set('payerName', e.target.value);
                  setLeadId(null);
                  setSuggest(true);
                }}
                onFocus={() => setSuggest(true)}
                onBlur={() => setTimeout(() => setSuggest(false), 200)}
                placeholder="Nome do cliente ou razão social"
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-lime-500/50 transition"
              />
            </div>

            {/* Autocomplete de Leads */}
            {suggest && matches.length > 0 && (
              <div className="absolute inset-x-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl bg-zinc-900 border border-zinc-700/80 shadow-2xl p-1 backdrop-blur-xl">
                {matches.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onMouseDown={() => pickLead(l)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-zinc-800 transition"
                  >
                    <Search className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white">{l.name}</p>
                      <p className="truncate text-[11px] text-zinc-400">
                        {[l.phone, l.cpfCnpj].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {activeLead && (
              <p className="mt-1.5 text-[11px] font-medium text-lime-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Vinculado ao lead no CRM: {activeLead.name}
              </p>
            )}
          </div>

          {/* CPF / CNPJ e Valor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                CPF ou CNPJ
                <span className="text-[10px] text-zinc-500 font-normal ml-1">
                  {r.payerDoc ? `(${docLabel(r.payerDoc)})` : '(Opcional)'}
                </span>
              </label>
              <input
                type="text"
                value={r.payerDoc}
                onChange={(e) => set('payerDoc', e.target.value)}
                placeholder="000.000.000-00"
                className="w-full px-3.5 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-lime-500/50 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Valor Recebido (R$) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={r.amount || ''}
                  onChange={(e) => set('amount', parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="w-full pl-9 pr-4 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-sm text-lime-400 font-semibold placeholder-zinc-500 focus:outline-none focus:border-lime-500/50 transition"
                />
              </div>
            </div>
          </div>

          {/* Por extenso live */}
          {r.amount > 0 && (
            <div className="p-2.5 rounded-xl bg-lime-500/5 border border-lime-500/10 text-xs text-zinc-300">
              <span className="font-semibold text-lime-400">Por extenso: </span>
              {moneyToWords(r.amount)}
            </div>
          )}

          {/* Referente a */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Referente a (Motivo) *
            </label>
            <textarea
              rows={2}
              value={r.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Ex: Sinal de entrada do sistema solar de 7,2 kWp ou Parcela de instalação"
              className="w-full px-3.5 py-2 bg-zinc-950/80 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-lime-500/50 transition resize-none"
            />
            {/* Atalhos Rápidos */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {RECEIPT_REASONS.slice(0, 4).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => set('description', m)}
                  className="text-[10px] font-medium px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                >
                  {m.length > 32 ? m.substring(0, 32) + '...' : m}
                </button>
              ))}
            </div>
          </div>

          {/* Forma de Pagamento */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Forma de Pagamento
            </label>
            <div className="flex flex-wrap gap-1.5">
              {RECEIPT_METHODS.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => set('method', method)}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${
                    r.method === method
                      ? 'bg-lime-500/20 text-lime-400 border-lime-500/40 shadow-sm shadow-lime-500/10'
                      : 'bg-zinc-950/60 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Parcela, Data e Cidade */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Parcela
                <span className="text-[10px] text-zinc-500 font-normal ml-1">(Opcional)</span>
              </label>
              <input
                type="text"
                value={r.installment}
                onChange={(e) => set('installment', e.target.value)}
                placeholder="Ex: 2 de 6"
                className="w-full px-3 py-2 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-lime-500/50 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Data do Pagamento
              </label>
              <input
                type="date"
                value={r.paidAt}
                onChange={(e) => set('paidAt', e.target.value)}
                className="w-full px-2.5 py-2 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-lime-500/50 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Cidade / UF
              </label>
              <input
                type="text"
                value={r.city}
                onChange={(e) => set('city', e.target.value)}
                placeholder="Maceió/AL"
                className="w-full px-3 py-2 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-lime-500/50 transition"
              />
            </div>
          </div>

          {/* Opções de Impressão e Assinatura */}
          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-white/5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-300">Formato:</span>
              <button
                type="button"
                onClick={() => setCopies(2)}
                className={`text-xs px-2.5 py-1 rounded-md font-semibold transition ${
                  copies === 2
                    ? 'bg-lime-500 text-zinc-950'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                2 Vias (Cliente + Empresa)
              </button>
              <button
                type="button"
                onClick={() => setCopies(1)}
                className={`text-xs px-2.5 py-1 rounded-md font-semibold transition ${
                  copies === 1
                    ? 'bg-lime-500 text-zinc-950'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                1 Via Integral
              </button>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={withSignature}
                onChange={(e) => setWithSignature(e.target.checked)}
                className="accent-lime-500 rounded w-4 h-4"
              />
              Assinatura do Resp. Técnico
            </label>
          </div>
        </div>

        {/* Pré-visualização A4 ao Vivo (7 cols no Desktop) */}
        <div className="lg:col-span-7 space-y-4">
          <div
            ref={boxRef}
            className="w-full overflow-hidden rounded-2xl bg-zinc-950/90 border border-white/10 p-3 flex flex-col items-center justify-center shadow-2xl relative"
          >
            {/* Folha A4 escalonada */}
            <div
              className="relative shadow-2xl rounded-sm overflow-hidden"
              style={{
                width: PAGE_W * scale,
                height: PAGE_H * scale,
              }}
            >
              <div
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  width: PAGE_W,
                  height: PAGE_H,
                }}
              >
                <A4Paper
                  ref={paperRef}
                  r={r}
                  copies={copies}
                  company={DEFAULT_COMPANY}
                  cnpj={DEFAULT_CNPJ}
                  address={DEFAULT_ADDRESS}
                  phone={DEFAULT_PHONE}
                  email={DEFAULT_EMAIL}
                  instagram={DEFAULT_INSTAGRAM}
                  signature={withSignature ? DEFAULT_SIGNATURE : null}
                />
              </div>
            </div>
          </div>

          {/* Barra de Ações de Exportação */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              onClick={savePdf}
              disabled={!!busy}
              className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-zinc-950 font-bold text-xs transition disabled:opacity-50 shadow-lg shadow-lime-500/10"
            >
              {busy === 'pdf' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              {savedId && !dirty ? 'Baixar PDF' : 'Emitir & Baixar PDF'}
            </button>

            <button
              onClick={shareWhatsapp}
              disabled={!!busy}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-semibold text-xs border border-emerald-500/30 transition disabled:opacity-50"
            >
              {busy === 'share' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              WhatsApp
            </button>

            <button
              onClick={print}
              disabled={!!busy}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-200 font-semibold text-xs border border-white/5 transition disabled:opacity-50"
            >
              {busy === 'print' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              Imprimir
            </button>

            <button
              onClick={savePng}
              disabled={!!busy}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-semibold text-xs border border-white/5 transition disabled:opacity-50"
            >
              {busy === 'png' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImageDown className="w-4 h-4" />
              )}
              PNG
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
            <span>
              {savedId
                ? dirty
                  ? '⚠️ Há alterações não salvas no recibo emitido.'
                  : `✓ Recibo nº ${String(r.number).padStart(4, '0')} salvo no sistema.`
                : 'O número oficial sequencial é gerado ao emitir.'}
            </span>
            {r.amount > 0 && (
              <span className="font-mono text-lime-400 font-bold">
                {formatBrl(r.amount)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Histórico de Recibos Emitidos */}
      <div className="pt-6 border-t border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Histórico de Recibos Emitidos
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                {receipts.length}
              </span>
            </h2>
            <p className="text-xs text-zinc-500">
              Consulte, reabra ou duplique qualquer recibo emitido anteriormente
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Buscar por cliente ou nº..."
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-lime-500/40"
            />
          </div>
        </div>

        {isLoadingReceipts ? (
          <div className="p-8 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-lime-400" />
            Carregando histórico...
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-zinc-900/40 border border-white/5 text-zinc-500 text-xs">
            Nenhum recibo emitido ainda. Preencha o formulário acima para gerar o primeiro recibo oficial!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredHistory.map((rc: ReceiptRow) => (
              <div
                key={rc.id}
                className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 hover:border-lime-500/30 transition flex flex-col justify-between gap-3 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-lime-500/10 text-lime-400 border border-lime-500/20">
                      Nº {String(rc.number).padStart(4, '0')}
                    </span>
                    <span className="text-xs font-bold text-white font-mono">
                      {formatBrl(rc.amount)}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-zinc-100 mt-2 truncate">
                    {rc.payerName}
                  </h3>
                  <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5">
                    {rc.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(`${rc.paidAt}T12:00:00`).toLocaleDateString('pt-BR')}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                    {rc.method}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => loadReceipt(rc, false)}
                      title="Abrir no editor"
                      className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-300 hover:text-white transition"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => loadReceipt(rc, true)}
                      title="Duplicar para novo"
                      className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-300 hover:text-white transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Excluir recibo nº ${rc.number}?`)) {
                          deleteReceipt.mutate(rc.id);
                        }
                      }}
                      title="Excluir"
                      className="p-1.5 rounded-md hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Folha A4 Renderizável (com 1 ou 2 vias)                            */
/* ------------------------------------------------------------------ */

interface PaperProps {
  r: ReceiptData;
  copies: 1 | 2;
  company: string;
  cnpj: string;
  address: string;
  phone: string;
  email: string;
  instagram: string;
  signature: string | null;
}

const A4Paper = forwardRef<HTMLDivElement, PaperProps>(function A4Paper(props, ref) {
  return (
    <div
      ref={ref}
      className="flex flex-col bg-white text-[#1C1234] select-none"
      style={{
        width: PAGE_W,
        height: PAGE_H,
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {props.copies === 2 ? (
        <>
          <ViaView {...props} label="Via do Cliente" half />
          {/* Linha serrilhada de recorte */}
          <div className="relative mx-10 border-t-2 border-dashed border-[#cfccdc]">
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-white px-3 text-[10px] font-bold tracking-[0.25em] text-[#868399] uppercase flex items-center gap-1.5">
              <Scissors className="w-3 h-3" /> recortar aqui
            </span>
          </div>
          <ViaView {...props} label="Via da Empresa" half />
        </>
      ) : (
        <ViaView {...props} label="" />
      )}
    </div>
  );
});

function ViaView({
  r,
  company,
  cnpj,
  address,
  phone,
  email,
  instagram,
  signature,
  label,
  half,
}: PaperProps & { label: string; half?: boolean }) {
  const statement = receiptStatement(r, company);
  const num = r.number ? String(r.number).padStart(4, '0') : '----';

  return (
    <div
      className={`relative flex flex-col ${
        half ? 'h-[555px] px-12 pt-7 pb-6' : 'flex-1 px-16 pt-12 pb-10'
      }`}
    >
      {/* Barra superior de gradiente Quark */}
      <div
        className="absolute inset-x-0 top-0 h-[6px] bg-gradient-to-r from-[#F3EA3B] via-[#9BD373] to-[#6CC690]"
        style={{ display: half && label === 'Via da Empresa' ? 'none' : undefined }}
      />

      {/* Topo: Logo + Empresa + Título do Recibo */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <img
            src="/brand/logo-h-color.png"
            alt={company}
            className={half ? 'h-10 w-auto object-contain' : 'h-14 w-auto object-contain'}
            onError={(e) => {
              // Fallback para texto se a imagem falhar
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          <p className="mt-1 text-[11px] font-semibold text-[#1C1234]">
            {company}
          </p>
          <p className="text-[10px] text-[#6d6985]">
            {cnpj ? `CNPJ ${cnpj}` : ''} · Engenharia e Energia Solar
          </p>
        </div>

        <div className="text-right">
          <p
            className={`font-black tracking-[0.3em] text-[#1C1234] ${
              half ? 'text-[22px]' : 'text-[30px]'
            }`}
          >
            RECIBO
          </p>
          <p className="mt-0.5 font-mono text-[13px] font-bold text-[#6d6985]">
            Nº {num}
          </p>
          {label && (
            <p className="mt-1.5 inline-block rounded-full bg-[#f0eff5] px-2.5 py-0.5 text-[9.5px] font-bold tracking-[0.15em] text-[#4b4766] uppercase">
              {label}
            </p>
          )}
        </div>
      </div>

      {/* Valor em destaque + Extenso */}
      <div className={`flex items-stretch gap-4 ${half ? 'mt-4' : 'mt-8'}`}>
        <div className="flex-1 rounded-xl bg-[#f7f6fa] px-5 py-3.5 ring-1 ring-[#e5e3ee]">
          <p className="text-[10px] font-bold tracking-[0.2em] text-[#9a97ae] uppercase">
            Valor por extenso
          </p>
          <p className={`mt-0.5 font-semibold text-[#1C1234] leading-snug ${half ? 'text-[12.5px]' : 'text-[15px]'}`}>
            {r.amount > 0 ? moneyToWords(r.amount).replace(/^./, (c) => c.toUpperCase()) : '—'}
          </p>
        </div>

        <div className="flex min-w-[200px] flex-col justify-center rounded-xl bg-gradient-to-br from-[#2a1d4d] to-[#1C1234] px-5 py-3.5 text-right shadow-md">
          <p className="text-[10px] font-bold tracking-[0.2em] text-white/60 uppercase">
            Valor Total
          </p>
          <p className={`font-black text-[#F3EA3B] tabular-nums ${half ? 'text-[24px]' : 'text-[32px]'}`}>
            {formatBrl(r.amount || 0)}
          </p>
        </div>
      </div>

      {/* Declaração de quitação oficial */}
      <p
        className={`text-justify leading-relaxed text-[#2a2046] ${
          half ? 'mt-3 text-[12.5px]' : 'mt-7 text-[14.5px]'
        }`}
      >
        {statement}
      </p>

      {/* Metadados: Pagador, Documento, Método, Data */}
      <div
        className={`grid grid-cols-4 overflow-hidden rounded-xl ring-1 ring-[#e5e3ee] bg-[#fbfafc] ${
          half ? 'mt-3.5' : 'mt-7'
        }`}
      >
        {[
          ['Pagador', r.payerName || '—'],
          [r.payerDoc ? docLabel(r.payerDoc) : 'CPF / CNPJ', r.payerDoc ? formatDoc(r.payerDoc) : '—'],
          ['Pagamento', [r.method, r.installment && `parcela ${r.installment}`].filter(Boolean).join(' · ') || '—'],
          ['Data', r.paidAt ? new Date(`${r.paidAt}T12:00:00`).toLocaleDateString('pt-BR') : '—'],
        ].map(([k, v], i) => (
          <div key={k} className={`px-3 py-2 ${i > 0 ? 'border-l border-[#e5e3ee]' : ''}`}>
            <p className="text-[9px] font-bold tracking-[0.2em] text-[#9a97ae] uppercase">{k}</p>
            <p className="mt-0.5 truncate text-[11.5px] font-semibold text-[#1C1234]">{v}</p>
          </div>
        ))}
      </div>

      {/* Rodapé: Cidade/Data + Assinatura Digital Oficial */}
      <div className={`mt-auto flex items-end justify-between gap-6 ${half ? 'pt-2' : 'pt-8'}`}>
        <div className="pb-1 text-[11.5px] text-[#4b4766]">
          <p className="font-bold text-[#1C1234]">{longDate(r.paidAt, r.city)}</p>
          <p className="mt-0.5 text-[9.5px] text-[#9a97ae]">
            {[address, phone, email, instagram && `@${instagram}`].filter(Boolean).join(' · ')}
          </p>
        </div>

        <div className="w-[260px] shrink-0 text-center">
          <div className={`flex items-end justify-center mb-1 ${half ? 'h-[65px]' : 'h-[95px]'}`}>
            {signature && (
              <img
                src={signature}
                alt="Assinatura"
                className="max-h-full w-auto max-w-full object-contain"
              />
            )}
          </div>
          <div className="border-t border-[#1C1234]/70 pt-1">
            <p className="text-[11px] font-bold text-[#1C1234]">{company}</p>
            {cnpj && <p className="text-[9.5px] text-[#6d6985]">CNPJ {cnpj}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
