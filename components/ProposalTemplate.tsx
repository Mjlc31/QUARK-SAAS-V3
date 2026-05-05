import React from 'react';
import { Leaf } from 'lucide-react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer
} from 'recharts';

export interface ProposalProps {
  clientName: string;
  systemSizeKw: number;
  modulesCount: number;
  inverterSizeKw: number;
  areaM2: number;
  monthlyGeneration: number;
  annualGeneration: number;
  generationData: { name: string; consumption: number; generation: number }[];
  oldBill: number;
  newBill: number;
  investment: number;
  monthlySavings: number;
  paybackYears: number;
  roi25Years: number;
  isFinanced: boolean;
  loanTerm: number;
  monthlyPayment: number;
  cardOptions: { installments: number; value: number }[];
  city: string;
  state: string;
  authorName?: string;
  proposalId?: string;
  roofType?: string;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export const ProposalTemplate = React.forwardRef<HTMLDivElement, ProposalProps>(
  (props, ref) => {
    // 794x1123 is A4 size in pixels at 96 DPI
    const A4 = "w-[794px] h-[1123px] bg-white relative overflow-hidden flex-shrink-0";
    const darkBg = "bg-[#0B0A10]"; // Deep dark blue/purple as seen on images
    const textLight = "text-white";

    return (
      <div ref={ref} className="bg-gray-100 flex flex-col items-center gap-4 py-8 pointer-events-none" style={{ width: '794px' }}>
        
        {/* ========================================================= */}
        {/* PAGE 1: COVER */}
        {/* ========================================================= */}
        <div id="page-1" className={A4}>
          <div className={`absolute inset-0 ${darkBg}`}></div>
          
          {/* Top Right White Curved Shape */}
          <div className="absolute -top-10 -right-10 w-[400px] h-[300px] bg-white rounded-[100px] drop-shadow-xl z-10 flex pt-16 pr-16 items-start justify-end">
            <div className="flex items-center gap-1.5 translate-y-8 -translate-x-4">
              <Leaf className="text-[#0B0A10]" size={28} />
              <span className="text-[#0B0A10] font-black tracking-tight text-3xl">Quark<span className="text-lime-500">.</span></span>
            </div>
          </div>
          
          {/* Bottom Right Gray Curved Line */}
          <div className="absolute -bottom-20 right-0 w-[500px] h-[600px] border-[5px] border-slate-600/30 rounded-[150px] rotate-12 z-0 translate-x-32" />

          {/* Top Left ID */}
          <div className="absolute top-12 left-12 z-20">
            <p className="text-white/60 font-bold text-sm tracking-widest">
              ID: <span className="text-white">{props.proposalId || '82496'}</span>
            </p>
          </div>

          {/* Main Title Area */}
          <div className="absolute top-[45%] left-16 z-20">
            <h1 className="text-white font-bold text-[38px] leading-tight mb-2">Sr. Cliente,</h1>
            <h2 className="text-white font-medium text-[42px] leading-tight mb-4">seu sistema<br/>de energia solar:</h2>
            <h3 className="text-white font-black text-[64px]">{props.systemSizeKw.toLocaleString('pt-BR')} kWp</h3>
          </div>

          {/* Bottom Left Author */}
          <div className="absolute bottom-16 left-16 z-20">
            <p className="text-white/80 font-medium text-lg">{props.authorName || 'Consultor de Vendas'}</p>
          </div>
        </div>

        {/* ========================================================= */}
        {/* PAGE 2: COMO FUNCIONA */}
        {/* ========================================================= */}
        <div id="page-2" className={A4}>
          {/* Top Left Dark Rounded Shape */}
          <div className={`absolute top-0 left-0 w-[550px] h-[350px] ${darkBg} rounded-br-[180px] z-10 p-16 pt-24`}>
             <h2 className="text-white font-black text-[42px] leading-tight">
               Como funciona<br/>o sistema de<br/>geração de<br/>energia solar:
             </h2>
          </div>
          
          {/* Background gray curve blob */}
          <div className="absolute bottom-0 right-0 w-[600px] h-[800px] bg-slate-100/80 rounded-tl-[300px] z-0" />

          {/* Steps List */}
          <div className="absolute top-[380px] left-16 right-16 z-20 flex flex-col gap-10">
            {[
              { num: '01', title: 'Captação: Painel solar fotovoltaico', desc: 'Com painéis de última geração, a radiação solar é absorvida e transformada em energia elétrica.' },
              { num: '02', title: 'Conversão: Inversor', desc: 'É o equipamento que recebe a carga produzida pelos painéis, convertendo a energia solar em energia limpa pronta para o consumo. O inversor também controla automaticamente todo o funcionamento do sistema gerador.' },
              { num: '03', title: 'Consumo', desc: 'A energia gerada é utilizada na unidade consumidora instantaneamente. Caso não haja geração no momento, automaticamente passa-se à utilização da energia da rede.' },
              { num: '04', title: 'Compartilhamento', desc: 'O excedente da produção, ou seja, a energia produzida e não utilizada, será injetada na rede da concessionária e ficará em estoque por 60 meses. Na data específica é feita a leitura do medidor e apurada a diferença entre a energia consumida e a energia injetada.' },
              { num: '05', title: 'Segurança e monitoramento', desc: 'O sistema também conta com o string box (quadro elétrico de proteção), um sistema anti-surto e com o web box, equipamento integrado à rede Wi-Fi para monitoramento remoto via celular, tablet ou computador.' }
            ].map((step, i) => (
              <div key={i} className="flex gap-8 items-start">
                <div className="min-w-[70px]">
                  <span className="text-black font-black text-[48px] leading-none block border-b-4 border-black pb-2">{step.num}</span>
                </div>
                <div className="pt-2">
                  <h3 className="text-black font-bold text-lg mb-1">{step.title}</h3>
                  <p className="text-slate-700 text-sm leading-relaxed pr-8">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================= */}
        {/* PAGE 3: EQUIPAMENTOS E GARANTIAS */}
        {/* ========================================================= */}
        <div id="page-3" className={A4}>
           {/* Dark Left Sidebar Shape */}
           <div className={`absolute top-10 left-10 w-32 bottom-0 ${darkBg} rounded-tl-[80px] z-0`} />
           <div className={`absolute top-0 left-0 w-[350px] h-[350px] ${darkBg} rounded-br-[120px] z-0`} />

           <div className="absolute top-40 left-32 z-20 max-w-[400px]">
             <h2 className="text-black font-black text-[42px] leading-tight drop-shadow-sm">
               Equipamentos que compõem o seu sistema:
             </h2>
           </div>

           {/* Equipments Card */}
           <div className="absolute top-80 left-16 right-16 bg-white rounded-[30px] shadow-[0_15px_60px_-15px_rgba(0,0,0,0.1)] p-10 z-20 flex justify-between items-center text-center">
              <div>
                <span className="block text-[48px] font-black text-black leading-none mb-2">{props.modulesCount}</span>
                <span className="block text-sm font-bold text-black uppercase tracking-wide">Painéis Solares<br/>580 Wp</span>
                <span className="block text-xs text-slate-500 mt-1">Alta Eficiência</span>
              </div>
              <div className="w-px h-24 bg-slate-200" />
              <div>
                 <span className="block text-[48px] font-black text-black leading-none mb-2">1</span>
                 <span className="block text-sm font-bold text-black">Inversor<br/>{props.inverterSizeKw} kW</span>
                 <span className="block text-xs text-slate-500 mt-1">Smart</span>
              </div>
              <div className="w-px h-24 bg-slate-200" />
              <div>
                 <span className="block text-[28px] font-black text-black leading-tight mb-2">Telhado<br/>{props.roofType || 'Cerâmico'}</span>
                 <span className="block text-sm text-black">Estrutura de<br/>Fixação</span>
              </div>
              <div className="w-px h-24 bg-slate-200" />
              <div>
                 <span className="block text-[28px] font-black text-black leading-tight mb-2">{props.areaM2.toLocaleString('pt-BR')}m²</span>
                 <span className="block text-sm text-black">Área utilizada<br/>estimada</span>
              </div>
           </div>

           <div className="absolute top-[520px] right-24 text-right z-20">
             <h2 className="text-black font-black text-[42px] leading-tight">
               Garantias<br/>do seu sistema
             </h2>
           </div>

           {/* Warranties Card */}
           <div className="absolute top-[680px] left-16 right-16 bg-white rounded-[30px] border border-slate-100 shadow-[0_15px_60px_-15px_rgba(0,0,0,0.05)] p-12 z-20 grid grid-cols-2 gap-y-12 gap-x-8">
              <div className="text-center">
                <h3 className="text-xl font-black text-black mb-3">Painéis Fotovoltaicos:</h3>
                <p className="text-sm text-slate-700">Eficiência: 25 anos</p>
                <p className="text-sm text-slate-700">Fabricante: 12 anos</p>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black text-black mb-3">Inversores:</h3>
                <p className="text-sm text-slate-700">10 ano(s) de garantia</p>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black text-black mb-3">Estruturas:</h3>
                <p className="text-sm text-slate-700">10 ano(s) de garantia pelo fabricante</p>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black text-black mb-3">Mão de obra:</h3>
                <p className="text-sm text-slate-700">1 ano(s) de garantia</p>
              </div>
           </div>
           
           <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-slate-100/50 rounded-tl-[200px] z-0" />
        </div>

        {/* ========================================================= */}
        {/* PAGE 4: GERAÇÃO TOTAL & GRÁFICO */}
        {/* ========================================================= */}
        <div id="page-4" className={A4}>
           {/* Top Left Dark Shape */}
           <div className={`absolute top-10 left-10 w-[450px] h-[450px] ${darkBg} rounded-tl-[50px] rounded-br-[150px] rounded-bl-[50px] rounded-tr-[50px] z-10 p-12 flex flex-col justify-center`}>
              <p className="text-white text-xl mb-2">Geração Total Anual:</p>
              <p className="text-white font-black text-[56px] leading-none mb-4">{props.annualGeneration.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kWh</p>
           </div>

           {/* Right Middle Dark Shape */}
           <div className={`absolute top-[280px] right-10 w-[420px] h-[550px] ${darkBg} rounded-tl-[150px] rounded-tr-[50px] rounded-br-[50px] rounded-bl-[50px] z-0 p-12 pr-10 flex flex-col justify-center text-right shadow-2xl items-end`}>
              <p className="text-white text-xl mb-2 mt-40">Geração Média Mensal:</p>
              <p className="text-white font-black text-[48px] leading-none mb-4">{props.monthlyGeneration.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kWh</p>
              <p className="text-white/50 text-[10px]">* Fator de irradiação médio incluído</p>
           </div>

           {/* Chart Box */}
           <div className="absolute bottom-16 left-16 right-16 h-[380px] bg-white rounded-[30px] shadow-[0_15px_60px_-15px_rgba(0,0,0,0.1)] p-8 px-10 z-20">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={props.generationData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} dx={-10} />
                  <Bar dataKey="generation" fill="#1E1B4B" radius={[2, 2, 0, 0]} barSize={28} label={{ position: 'insideBottom', fill: '#fff', fontSize: 10, offset: 15, formatter: (val:any) => val }} />
                  <Line type="monotone" dataKey="consumption" stroke="#EF4444" strokeWidth={2} dot={{ r: 3, fill: '#EF4444', strokeWidth: 1, stroke: '#fff' }} />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="flex gap-6 mt-4 justify-center">
                 <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#1E1B4B]"></div><span className="text-xs text-slate-500 font-bold">Geração (kWh)</span></div>
                 <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#EF4444]"></div><span className="text-xs text-slate-500 font-bold">Consumo (kWh)</span></div>
              </div>
           </div>
        </div>

        {/* ========================================================= */}
        {/* PAGE 5: VALORES E CONDICOES */}
        {/* ========================================================= */}
        <div id="page-5" className={A4}>
          {/* Top curve detail */}
          <div className="absolute top-10 right-20 w-[400px] h-32 border-b-4 border-l-4 border-slate-300 rounded-bl-[80px] z-0" />
          
          <div className="absolute top-36 left-16 z-20">
            <p className="text-slate-700 text-xl font-medium mb-1">Valor do investimento:</p>
            <h2 className="text-[#1E1B4B] font-black text-[56px] leading-none mb-8">
              {fmt(props.investment)}
            </h2>
            
            <div className="flex gap-16">
               <div>
                  <p className="text-slate-700 text-lg mb-1">Sua conta vai sair de:</p>
                  <p className="text-[#1E1B4B] font-black text-2xl">{fmt(props.oldBill)}</p>
               </div>
               <div>
                  <p className="text-slate-700 text-lg mb-1">para apenas:</p>
                  <p className="text-[#1E1B4B] font-black text-2xl">{fmt(props.newBill)}</p>
               </div>
            </div>
          </div>

          {/* Big Huge Dark ROI Area */}
          <div className={`absolute bottom-10 left-10 right-10 top-[420px] ${darkBg} rounded-tl-[20px] rounded-tr-[150px] rounded-bl-[40px] rounded-br-[40px] z-10 p-16 flex flex-col`}>
             <div className="flex justify-between border-b border-white/20 pb-12">
               <div>
                 <p className="text-white font-bold text-xl mb-1">Economia Média Mensal*</p>
                 <p className="text-slate-300 text-lg">{fmt(props.monthlySavings)}</p>
                 <p className="text-white font-bold text-xl mb-1 mt-8">Economia até 10 anos</p>
                 <p className="text-slate-300 text-lg">{fmt(props.monthlySavings * 12 * 10)}</p>
               </div>
               <div className="text-right">
                 <p className="text-white font-bold text-xl mb-1">Payback</p>
                 <p className="text-slate-300 text-lg">{props.paybackYears < 3 ? `${Math.round(props.paybackYears * 12)} meses` : `${props.paybackYears.toFixed(1)} anos`}</p>
                 <p className="text-white font-bold text-xl mb-1 mt-8">Retorno anual em 25 anos</p>
                 <p className="text-slate-300 text-lg">{props.roi25Years}%</p>
               </div>
             </div>

             <div className="pt-12">
               <p className="text-white font-bold text-xl mb-2">Opções de Pagamento</p>
               <p className="text-slate-300 text-lg mb-8">Entrada: R$ 0,00 (Para financiamento e Cartão até 18x)</p>
               
               <div className="flex justify-between gap-12">
                  {props.isFinanced && props.monthlyPayment > 0 && (
                    <div className="flex-1 space-y-3">
                       <p className="text-slate-300 text-lg"><span className="text-white font-bold">{props.loanTerm}x:</span> {fmt(props.monthlyPayment)} no banco</p>
                    </div>
                  )}
                  {props.cardOptions && props.cardOptions.length > 0 && (
                     <div className="flex-1 space-y-3 text-right">
                        {props.cardOptions.map(c => (
                           <p key={c.installments} className="text-slate-300 text-lg"><span className="text-white font-bold">{c.installments}x:</span> {fmt(c.value)} no cartão</p>
                        ))}
                     </div>
                  )}
               </div>
             </div>
          </div>
        </div>

      </div>
    );
  }
);
