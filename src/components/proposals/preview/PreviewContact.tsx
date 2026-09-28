import React from 'react';
import { ContactContent, ProposalTheme } from '../../proposal/types';
import { Phone, Mail, MapPin, Building, Clock, CheckCircle } from 'lucide-react';

interface Props {
  content: ContactContent;
  theme: ProposalTheme;
  editable?: boolean;
  onUpdate?: (c: Partial<ContactContent>) => void;
}

export default function PreviewContact({ content, theme, editable, onUpdate }: Props) {
  const isDark = theme.mode !== 'light';

  return (
    <div className={`w-full aspect-[1/1.414] rounded-xl border border-white/10 ${isDark ? 'bg-[#09090b] text-white' : 'bg-white text-zinc-900'} p-12 flex flex-col gap-10 shadow-xl`}>
      <div className="flex justify-between items-start border-b border-white/10 pb-8">
        <div>
          <h2 className="text-3xl font-bold text-lime-400 mb-2">Próximos Passos</h2>
          <p className="text-zinc-500 text-lg">Pronto para gerar sua própria energia?</p>
        </div>
        <div className="flex items-center gap-2 px-5 py-3 bg-lime-400/10 text-lime-400 rounded-xl border border-lime-400/20">
          <Clock className="w-5 h-5" />
          <span className="font-bold">Proposta válida por {content.validityDays || 15} dias</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 flex-1">
        <div className={`p-8 rounded-xl border flex flex-col gap-8 ${isDark ? 'bg-[#18181b] border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
          <h3 className="text-xl font-bold text-lime-400">Dados da Empresa</h3>
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-lime-400/10 flex items-center justify-center shrink-0">
                <Building className="w-5 h-5 text-lime-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase font-semibold">Empresa</p>
                <p className="font-medium">{theme.companyName || content.companyName || 'QUARK ENERGIA'}</p>
                <p className="text-sm text-zinc-500">{theme.companyCnpj || content.companyCnpj || '00.000.000/0001-00'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-lime-400/10 flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5 text-lime-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase font-semibold">Telefone</p>
                <p className="font-medium">{theme.companyPhone || content.companyPhone || '(00) 00000-0000'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-lime-400/10 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-lime-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase font-semibold">Email</p>
                <p className="font-medium truncate max-w-[200px]">{theme.companyEmail || content.companyEmail || 'contato@quarkenergia.com.br'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-lime-400/10 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-lime-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase font-semibold">Endereço</p>
                <p className="font-medium text-sm">{theme.companyAddress || content.companyAddress || 'Av. Principal, 1000 - Centro'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <div className={`p-8 rounded-xl border flex-1 ${isDark ? 'bg-[#18181b] border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-lime-400" /> Condições
            </h3>
            <div 
              className={`text-zinc-400 leading-relaxed text-sm h-full focus:outline-none ${editable ? 'cursor-pointer hover:bg-white/5 p-2 -m-2 rounded transition-colors' : ''}`}
              contentEditable={editable}
              suppressContentEditableWarning
              onBlur={(e) => onUpdate?.({ conditions: e.currentTarget.textContent || '' })}
            >
              {content.conditions || 'Pagamento conforme contrato. Aprovação sujeita à análise de crédito.'}
            </div>
          </div>
          
          <div className={`p-8 rounded-xl border text-center flex flex-col justify-end min-h-[160px] ${isDark ? 'bg-[#18181b] border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
            <div className="w-4/5 mx-auto border-t border-zinc-500 mb-4"></div>
            <p className="font-bold">Assinatura do Cliente</p>
            <p className="text-sm text-zinc-500">De acordo com os termos apresentados</p>
          </div>
        </div>
      </div>
    </div>
  );
}
