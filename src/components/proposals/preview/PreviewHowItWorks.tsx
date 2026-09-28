import React from 'react';
import { HowItWorksContent, ProposalTheme } from '../../proposal/types';
import { Sun, Zap, Home } from 'lucide-react';

interface Props {
  content: HowItWorksContent;
  theme: ProposalTheme;
  editable?: boolean;
  onUpdate?: (c: Partial<HowItWorksContent>) => void;
}

export default function PreviewHowItWorks({ content, theme, editable, onUpdate }: Props) {
  const isDark = theme.mode !== 'light';

  const pillars = [
    { title: 'Captação', desc: 'Painéis solares captam a luz do sol e geram energia em corrente contínua.', icon: Sun },
    { title: 'Conversão', desc: 'O inversor transforma a energia em corrente alternada para uso na rede.', icon: Zap },
    { title: 'Consumo', desc: 'Você consome a energia gerada e injeta o excedente na rede da concessionária.', icon: Home },
  ];

  return (
    <div className={`w-full aspect-[1/1.414] rounded-xl border border-white/10 ${isDark ? 'bg-[#09090b] text-white' : 'bg-white text-zinc-900'} p-12 flex flex-col shadow-xl`}>
      <div className="mb-10 text-center">
        <h2 
          className={`text-3xl font-bold text-lime-400 mb-2 ${editable ? 'cursor-pointer hover:bg-white/5 rounded transition-colors' : ''}`}
          contentEditable={editable}
          suppressContentEditableWarning
          onBlur={(e) => onUpdate?.({ title: e.currentTarget.textContent || '' })}
        >
          {content.title || 'Como Funciona a Energia Solar'}
        </h2>
        <p className="text-zinc-400">{content.subtitle || 'Entenda o processo de geração na sua residência ou empresa.'}</p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-12">
        {pillars.map((p, i) => (
          <div key={i} className={`p-6 rounded-xl border flex flex-col items-center text-center ${isDark ? 'bg-[#18181b] border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
            <div className="w-16 h-16 rounded-full bg-lime-400/10 flex items-center justify-center mb-4 text-lime-400">
              <p.icon className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold mb-2">{p.title}</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>

      <div className={`p-8 rounded-xl border flex-1 ${isDark ? 'bg-[#18181b] border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
        <h3 className="text-xl font-bold mb-6">Cronograma de Implantação</h3>
        <div className="space-y-6">
          {content.steps?.map((step, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-lime-400 text-[#09090b] flex items-center justify-center font-bold text-sm shrink-0">
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-sm">{step.label}</span>
                  <span className="text-xs text-lime-400 font-medium">{step.duration}</span>
                </div>
                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-lime-400 rounded-full" 
                    style={{ width: `${Math.max(20, ((i + 1) / (content.steps?.length || 1)) * 100)}%` }} 
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
