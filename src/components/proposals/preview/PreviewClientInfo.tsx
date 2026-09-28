import React from 'react';
import { ClientInfoContent, ProposalTheme, ROOF_TYPE_LABELS } from '../../proposal/types';
import { User, FileText, Phone, Mail, MapPin, Building2, Zap, Home, Settings2 } from 'lucide-react';

interface Props {
  content: ClientInfoContent;
  theme: ProposalTheme;
}

export default function PreviewClientInfo({ content, theme }: Props) {
  const isDark = theme.mode !== 'light';
  
  const fields = [
    { label: 'Cliente', value: content.clientName, icon: User },
    { label: 'CPF/CNPJ', value: content.cpfCnpj, icon: FileText },
    { label: 'Telefone', value: content.phone, icon: Phone },
    { label: 'Email', value: content.email, icon: Mail },
    { label: 'Endereço', value: content.address, icon: MapPin },
    { label: 'Cidade/UF', value: `${content.city || '-'}${content.state ? ` - ${content.state}` : ''}`, icon: Building2 },
    { label: 'Concessionária', value: content.concessionaria, icon: Zap },
    { label: 'Consumo Médio', value: `${content.consumption || 0} kWh/mês`, icon: Zap },
    { label: 'Tipo de Ligação', value: content.connectionType ? content.connectionType.toUpperCase() : '-', icon: Settings2 },
    { label: 'Tipo de Telhado', value: content.roofType ? ROOF_TYPE_LABELS[content.roofType] : '-', icon: Home },
  ];

  return (
    <div className={`w-full aspect-[1/1.414] rounded-xl border border-white/10 ${isDark ? 'bg-[#09090b] text-white' : 'bg-white text-zinc-900'} p-12 flex flex-col gap-8 shadow-xl`}>
      <div className="flex items-center gap-4 border-b border-white/10 pb-6">
        <div className="p-3 bg-lime-400/10 rounded-xl">
          <User className="w-8 h-8 text-lime-400" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-lime-400">Dados do Cliente</h2>
          <p className="text-zinc-500">Informações cadastrais e detalhes da instalação.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-6 mt-4">
        {fields.map((f, i) => (
          <div key={i} className={`flex gap-4 p-5 rounded-xl border ${isDark ? 'bg-[#18181b] border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
            <div className="w-12 h-12 rounded-lg bg-lime-400/10 flex items-center justify-center shrink-0">
              <f.icon className="w-6 h-6 text-lime-400" />
            </div>
            <div className="flex flex-col justify-center overflow-hidden">
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">{f.label}</span>
              <span className="font-medium text-base truncate">{f.value || 'N/A'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
