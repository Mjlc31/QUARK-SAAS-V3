import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, Loader2, Sparkles, X, Sun, Battery, Shield, Zap, Image as ImageIcon } from 'lucide-react';

export interface ProposalData {
  id?: string;
  clientName: string;
  city: string;
  consumption: number;
  systemSizeKw: number;
  moduleBrand: string;
  modulePower: number;
  modulesCount: number;
  inverterBrand: string;
  inverterPower: number;
  inverterCount: number;
  pricePerModule: number;
  priceKit: number;
  priceCA: number;
  taxPercentage: number;
  profitPercentage: number;
  additionalCosts: number;
  finalPrice: number;
}

interface Props {
  data: ProposalData;
  onClose: () => void;
  onSave?: (data: ProposalData) => void;
}

export const ProposalEditor: React.FC<Props> = ({ data, onClose, onSave }) => {
  const [isExporting, setIsExporting] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);
  
  const [themeName, setThemeName] = useState<'lime' | 'blue' | 'yellow' | 'purple'>('lime');
  const [fontTitle, setFontTitle] = useState<'font-display' | 'font-serif' | 'font-mono'>('font-display');
  
  const [imgSocial1, setImgSocial1] = useState('https://images.unsplash.com/photo-1509391366360-1e97b524c5bb?auto=format&fit=crop&q=80&w=800');
  const [imgSocial2, setImgSocial2] = useState('https://images.unsplash.com/photo-1613665813446-82a78c468a1d?auto=format&fit=crop&q=80&w=800');

  const themeClasses = {
      lime: { text: 'text-lime-500', bg: 'bg-lime-500', border: 'border-lime-500', glow: 'shadow-[0_0_30px_rgba(163,230,53,0.3)]', gradient: 'from-lime-500/20 to-lime-500/5' },
      blue: { text: 'text-blue-500', bg: 'bg-blue-500', border: 'border-blue-500', glow: 'shadow-[0_0_30px_rgba(59,130,246,0.3)]', gradient: 'from-blue-500/20 to-blue-500/5' },
      yellow: { text: 'text-yellow-500', bg: 'bg-yellow-500', border: 'border-yellow-500', glow: 'shadow-[0_0_30px_rgba(234,179,8,0.3)]', gradient: 'from-yellow-500/20 to-yellow-500/5' },
      purple: { text: 'text-purple-500', bg: 'bg-purple-500', border: 'border-purple-500', glow: 'shadow-[0_0_30px_rgba(168,85,247,0.3)]', gradient: 'from-purple-500/20 to-purple-500/5' }
  }[themeName];

  const generatePDF = async () => {
    if (!pdfRef.current) return;
    setIsExporting(true);

    try {
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#000000',
        windowWidth: 794,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Proposta_${data.clientName.replace(/\s+/g, '_')}_Quark.pdf`);
      
      if (onSave) onSave({ ...data, id: Date.now().toString() });

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erro ao gerar o PDF. Revise o console.');
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[150] flex flex-col pt-16 md:pt-4 overflow-hidden animate-enter">
      
      {/* Floating Toolbar PRO MAX */}
      <div className="fixed top-24 md:top-6 left-1/2 -translate-x-1/2 bg-zinc-900/90 backdrop-blur-3xl border border-white/10 shadow-2xl rounded-full px-6 py-3 flex flex-wrap justify-center items-center gap-6 z-[200] animate-slide-up">
          <div className="flex gap-3 items-center border-r border-white/10 pr-6">
             <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest hidden md:inline">Tema</span>
             <button onClick={() => setThemeName('lime')} className={`w-6 h-6 rounded-full bg-lime-500 ring-2 ring-offset-2 ring-offset-black ${themeName === 'lime' ? 'ring-lime-500' : 'ring-transparent'} hover:scale-110 transition-all`}></button>
             <button onClick={() => setThemeName('blue')} className={`w-6 h-6 rounded-full bg-blue-500 ring-2 ring-offset-2 ring-offset-black ${themeName === 'blue' ? 'ring-blue-500' : 'ring-transparent'} hover:scale-110 transition-all`}></button>
             <button onClick={() => setThemeName('yellow')} className={`w-6 h-6 rounded-full bg-yellow-500 ring-2 ring-offset-2 ring-offset-black ${themeName === 'yellow' ? 'ring-yellow-500' : 'ring-transparent'} hover:scale-110 transition-all`}></button>
             <button onClick={() => setThemeName('purple')} className={`w-6 h-6 rounded-full bg-purple-500 ring-2 ring-offset-2 ring-offset-black ${themeName === 'purple' ? 'ring-purple-500' : 'ring-transparent'} hover:scale-110 transition-all`}></button>
          </div>
          <div className="flex gap-4 items-center">
             <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest hidden md:inline">Fonte</span>
             <button onClick={() => setFontTitle('font-display')} className={`text-sm font-display transition-colors ${fontTitle === 'font-display' ? 'text-white font-bold' : 'text-zinc-500 hover:text-white'}`}>Inter</button>
             <button onClick={() => setFontTitle('font-serif')} className={`text-sm font-serif transition-colors ${fontTitle === 'font-serif' ? 'text-white font-bold' : 'text-zinc-500 hover:text-white'}`}>Playfair</button>
             <button onClick={() => setFontTitle('font-mono')} className={`text-sm font-mono transition-colors ${fontTitle === 'font-mono' ? 'text-white font-bold' : 'text-zinc-500 hover:text-white'}`}>JetBrains</button>
          </div>
      </div>

      {/* Header NavBar */}
      <div className="flex items-center justify-between px-6 py-4 bg-zinc-900/50 border-b border-white/10 shrink-0 relative z-[190]">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles size={20} className={themeClasses.text} />
            Editor VIP de Propostas
          </h2>
          <p className="text-xs text-zinc-400 hidden md:block">Clique em qualquer texto para editar, suba fotos reais de obras e altere as cores.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={generatePDF}
            disabled={isExporting}
            className={`px-6 py-2.5 ${themeClasses.bg} text-black font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 hover:brightness-110`}
          >
            {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            <span className="hidden md:inline">{isExporting ? 'Renderizando HD...' : 'Exportar PDF VIP'}</span>
          </button>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-lg transition-colors bg-white/5 border border-white/10">
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Editor/Preview Container - Estilo Figma */}
      <div className="flex-1 overflow-y-auto bg-zinc-950 p-6 md:p-12 custom-scrollbar flex justify-center pb-40">
        
        {/* A4 Wrapper for scale */}
        <div 
          className="w-full max-w-[794px] bg-black shadow-2xl relative transition-colors duration-500"
          ref={pdfRef}
          style={{ minHeight: '1123px' }}
        >
          {/* ----- CAPA ----- */}
          <div className="h-[1123px] relative bg-[#09090b] text-white flex flex-col justify-between overflow-hidden">
             <div className={`absolute top-0 right-0 w-[600px] h-[600px] opacity-20 rounded-full blur-[120px] -mr-40 -mt-20 ${themeClasses.bg} transition-colors duration-700`}></div>
             
             <div className="p-16 flex-1 flex flex-col justify-center relative z-10">
                <div className="mb-20">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-black mb-6 ${themeClasses.bg} ${themeClasses.glow} transition-colors duration-500`}>
                     <Zap size={32} strokeWidth={3} />
                  </div>
                  <h1 className={`text-6xl ${fontTitle} font-bold tracking-tighter leading-none mb-4 transition-all duration-300 outline-none`} contentEditable suppressContentEditableWarning>
                    Projeto<br/>Solar<span className={themeClasses.text}>.</span>
                  </h1>
                  <p className="text-2xl text-zinc-400 font-light outline-none" contentEditable suppressContentEditableWarning>SEU PASSAPORTE PARA INDEPENDÊNCIA ENERGÉTICA</p>
                </div>

                <div className={`border-l-4 ${themeClasses.border} pl-8 transition-colors duration-500`}>
                  <p className="text-sm text-zinc-500 uppercase font-bold tracking-widest mb-2 outline-none" contentEditable suppressContentEditableWarning>Preparado Exclusivamente Para</p>
                  <h2 className="text-4xl font-bold mb-2 outline-none" contentEditable suppressContentEditableWarning>{data.clientName}</h2>
                  <p className="text-lg text-zinc-400 flex items-center gap-2 outline-none" contentEditable suppressContentEditableWarning>{data.city} • {new Date().toLocaleDateString('pt-BR')}</p>
                </div>
             </div>

             <div className="p-16 border-t border-white/10 flex justify-between items-center relative z-10 bg-black/50 backdrop-blur-md">
                <div>
                  <p className="font-bold text-lg outline-none" contentEditable suppressContentEditableWarning>Quark Tecnologia em Energia</p>
                  <p className="text-zinc-500 outline-none" contentEditable suppressContentEditableWarning>Engenharia de Ponta • Foco Absoluto em Resultados</p>
                </div>
                <p className={`${themeClasses.text} font-bold border ${themeClasses.border} px-4 py-2 rounded-full text-sm tracking-widest transition-colors duration-500 outline-none`} contentEditable suppressContentEditableWarning>ALTAMENTE CONFIDENCIAL</p>
             </div>
          </div>

          {/* ----- QUEM É A QUARK / PROVA SOCIAL ----- */}
          <div className="min-h-[1123px] relative bg-[#09090b] text-white p-16 flex flex-col">
             <div className="mb-12 border-b border-white/10 pb-8">
               <h2 className={`text-5xl ${fontTitle} font-bold mb-6 outline-none transition-all`} contentEditable suppressContentEditableWarning>
                 Por que os clientes mais exigentes escolhem a <span className={themeClasses.text}>Quark</span>?
               </h2>
               <p className="text-xl text-zinc-400 font-light leading-relaxed outline-none" contentEditable suppressContentEditableWarning>Não vendemos apenas placas solares. Nossa missão é blindar o seu caixa contra os aumentos tarifários predatórios, entregando tecnologia classe A, engenharia cirúrgica e retorno garantido a cada ciclo de sol.</p>
             </div>

             <div className="grid grid-cols-2 gap-8 mb-12">
               {/* Upload Image Card 1 */}
               <div className="relative group overflow-hidden rounded-3xl h-72 border border-white/10 flex flex-col justify-end bg-zinc-900">
                   <img src={imgSocial1} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Obra Quark" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                   <div className="relative z-10 p-6">
                      <h3 className={`text-xl font-bold mb-1 text-white outline-none ${themeClasses.text} transition-colors`} contentEditable suppressContentEditableWarning>+500 Projetos Entregues</h3>
                      <p className="text-zinc-300 font-light text-sm outline-none" contentEditable suppressContentEditableWarning>Usina de 50kWp entregue no prazo absoluto. Economia mensal gerada: R$ 8.500,00.</p>
                   </div>
                   <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none text-white">
                      <ImageIcon size={16} />
                   </div>
                   <input type="file" accept="image/*" onChange={e => {
                       const file = e.target.files?.[0];
                       if (file) setImgSocial1(URL.createObjectURL(file));
                   }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" title="Clique para trocar imagem" />
               </div>

               {/* Upload Image Card 2 */}
               <div className="relative group overflow-hidden rounded-3xl h-72 border border-white/10 flex flex-col justify-end bg-zinc-900">
                   <img src={imgSocial2} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Obra Quark 2" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                   <div className="relative z-10 p-6">
                      <h3 className={`text-xl font-bold mb-1 text-white outline-none ${themeClasses.text} transition-colors`} contentEditable suppressContentEditableWarning>Zero Dor de Cabeça</h3>
                      <p className="text-zinc-300 font-light text-sm outline-none" contentEditable suppressContentEditableWarning>Instalação padrão Vale do Silício, com acabamento premium. Cliente focado no negócio, nós na energia.</p>
                   </div>
                   <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none text-white">
                      <ImageIcon size={16} />
                   </div>
                   <input type="file" accept="image/*" onChange={e => {
                       const file = e.target.files?.[0];
                       if (file) setImgSocial2(URL.createObjectURL(file));
                   }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" title="Clique para trocar imagem" />
               </div>
             </div>

             <div className="flex-1 mt-auto">
                <h3 className={`text-2xl font-bold mb-6 ${fontTitle} outline-none`} contentEditable suppressContentEditableWarning>A Nova Lei 14.300 e a Urgência da Sua Ação</h3>
                <div className="bg-zinc-900/80 rounded-3xl p-8 border border-white/5 backdrop-blur-md">
                  <p className="text-zinc-400 leading-relaxed mb-6 outline-none" contentEditable suppressContentEditableWarning>
                    Com a taxação da injeção baseada na componente Fio B, cada dia de demora significa perda direta de dinheiro para a concessionária.
                  </p>
                  <p className="text-zinc-400 leading-relaxed outline-none" contentEditable suppressContentEditableWarning>
                    Nossa modelagem atesta o retorno rápido para sua demanda. O investimento inicial não é um gasto; ele substitui um passivo eterno por um ativo gerador de caixa pelas próximas 3 décadas.
                  </p>
                </div>
             </div>
          </div>

          {/* ----- ORÇAMENTO E DADOS TÉCNICOS ----- */}
          <div className="min-h-[1123px] relative bg-[#0c121a] text-white p-16 flex flex-col">
              <h2 className={`text-5xl ${fontTitle} font-bold mb-10 border-b border-white/10 pb-6 outline-none`} contentEditable suppressContentEditableWarning>
                 Estudo Especializado: <span className={themeClasses.text}>Dimensionamento</span>
              </h2>

              {/* Tabela de Dimensionamento */}
              <div className="bg-black/50 border border-white/10 rounded-3xl p-8 mb-8 backdrop-blur-sm">
                 <h3 className={`text-xl font-bold mb-6 ${themeClasses.text} outline-none transition-colors duration-500`} contentEditable suppressContentEditableWarning>Premissas Validadas</h3>
                 <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                    <div>
                      <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-1 outline-none" contentEditable suppressContentEditableWarning>Consumo de Referência (Média)</p>
                      <p className="text-3xl font-display font-bold outline-none" contentEditable suppressContentEditableWarning>{data.consumption} <span className="text-base text-zinc-500">kWh/mês</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-1 outline-none" contentEditable suppressContentEditableWarning>Potência Instalada Entregue</p>
                      <p className="text-3xl font-display font-bold outline-none" contentEditable suppressContentEditableWarning>{data.systemSizeKw.toFixed(2)} <span className="text-base text-zinc-500">kWp Real</span></p>
                    </div>
                 </div>
              </div>

              {/* Lista de Materiais */}
              <div className="mb-10">
                 <h3 className="text-xl font-bold mb-6 outline-none" contentEditable suppressContentEditableWarning>Hardware Premium & Escopo Inclusos</h3>
                 <div className="space-y-4">
                    <div className="flex justify-between items-center bg-zinc-900 border border-white/5 p-6 rounded-2xl group hover:border-white/20 transition-colors">
                       <div className="flex gap-4 items-center">
                          <div className={`w-12 h-12 bg-black rounded-xl flex items-center justify-center ${themeClasses.text} transition-colors duration-500`}>
                             <Sun size={24} />
                          </div>
                          <div>
                            <p className="font-bold text-lg outline-none" contentEditable suppressContentEditableWarning>{data.moduleBrand}</p>
                            <p className="text-sm text-zinc-400 outline-none" contentEditable suppressContentEditableWarning>Módulo Tier 1 Ultra-efficiency Half-Cell {data.modulePower}W</p>
                          </div>
                       </div>
                       <div className="text-right">
                         <p className="text-2xl font-display font-bold outline-none" contentEditable suppressContentEditableWarning>{data.modulesCount} <span className="text-sm text-zinc-500">un.</span></p>
                       </div>
                    </div>

                    <div className="flex justify-between items-center bg-zinc-900 border border-white/5 p-6 rounded-2xl group hover:border-white/20 transition-colors">
                       <div className="flex gap-4 items-center">
                          <div className={`w-12 h-12 bg-black rounded-xl flex items-center justify-center ${themeClasses.text} transition-colors duration-500`}>
                             <Battery size={24} />
                          </div>
                          <div>
                            <p className="font-bold text-lg outline-none" contentEditable suppressContentEditableWarning>{data.inverterBrand}</p>
                            <p className="text-sm text-zinc-400 outline-none" contentEditable suppressContentEditableWarning>Inversor Solar Inteligente Alta Performance {data.inverterPower}kW</p>
                          </div>
                       </div>
                       <div className="text-right">
                         <p className="text-2xl font-display font-bold outline-none" contentEditable suppressContentEditableWarning>{data.inverterCount} <span className="text-sm text-zinc-500">un.</span></p>
                       </div>
                    </div>

                    <div className={`flex justify-between items-center bg-gradient-to-r ${themeClasses.gradient} border ${themeClasses.border} p-6 rounded-2xl transition-colors duration-500`}>
                       <div className="flex gap-4 items-center">
                          <div className={`w-12 h-12 bg-black/50 rounded-xl flex items-center justify-center ${themeClasses.text} transition-colors duration-500`}>
                             <Shield size={24} />
                          </div>
                          <div>
                            <p className={`font-bold text-lg ${themeClasses.text} outline-none transition-colors duration-500`} contentEditable suppressContentEditableWarning>Serviços Inclusos (Turn-key)</p>
                            <p className="text-sm text-zinc-400 outline-none" contentEditable suppressContentEditableWarning>Projeto Executivo + Homologação + Suporte 24/7 incluso no valor final</p>
                          </div>
                       </div>
                       <div className="text-right">
                         <p className={`text-xl font-display font-bold ${themeClasses.text} tracking-widest outline-none transition-colors duration-500`} contentEditable suppressContentEditableWarning>INCLUSO</p>
                       </div>
                    </div>

                 </div>
              </div>

              {/* Investimento Final */}
              <div className={`mt-auto border ${themeClasses.border} bg-gradient-to-br ${themeClasses.gradient} rounded-3xl p-10 flex flex-col items-center text-center relative overflow-hidden transition-colors duration-500`}>
                 <p className={`relative z-10 ${themeClasses.text} font-bold tracking-widest uppercase mb-4 outline-none transition-colors duration-500`} contentEditable suppressContentEditableWarning>Aporte Financeiro Total (Turn-Key)</p>
                 <h2 className="relative z-10 text-6xl md:text-7xl font-display font-bold text-white mb-6 outline-none tracking-tighter" contentEditable suppressContentEditableWarning>
                    {formatCurrency(data.finalPrice)}
                 </h2>
                 <p className="relative z-10 text-zinc-400 text-sm max-w-md outline-none" contentEditable suppressContentEditableWarning>Sistema entregue completamente funcional. Zero surpresas durante a instalação.</p>
                 <div className="relative z-10 mt-8 flex flex-col md:flex-row gap-4 w-full justify-center">
                    <div className="bg-black/80 border border-white/20 px-8 py-4 rounded-2xl backdrop-blur-md">
                       <p className="text-xs text-zinc-500 uppercase font-bold outline-none" contentEditable suppressContentEditableWarning>À Vista (-5%)</p>
                       <p className={`text-xl font-bold ${themeClasses.text} outline-none transition-colors duration-500`} contentEditable suppressContentEditableWarning>{formatCurrency(data.finalPrice * 0.95)}</p>
                    </div>
                    <div className="bg-black/80 border border-white/20 px-8 py-4 rounded-2xl backdrop-blur-md">
                       <p className="text-xs text-zinc-500 uppercase font-bold outline-none" contentEditable suppressContentEditableWarning>Financiamento</p>
                       <p className={`text-xl font-bold ${themeClasses.text} outline-none transition-colors duration-500`} contentEditable suppressContentEditableWarning>Até 96x (Consulte)</p>
                    </div>
                 </div>
              </div>
          </div>
        </div>

      </div>
    </div>
  );
};
