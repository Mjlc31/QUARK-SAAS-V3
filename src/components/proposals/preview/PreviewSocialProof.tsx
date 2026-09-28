import React from 'react';
import { SocialProofContent, ProposalTheme } from '../../proposal/types';
import { Image as ImageIcon, CheckCircle2, ShieldCheck, ThumbsUp } from 'lucide-react';

interface Props {
  content: SocialProofContent;
  theme: ProposalTheme;
}

export default function PreviewSocialProof({ content, theme }: Props) {
  const isDark = theme.mode !== 'light';

  const fallbackMetrics = [
    { label: '+500', sub: 'Projetos Entregues' },
    { label: '100%', sub: 'Satisfação' },
    { label: '25 Anos', sub: 'Garantia de Geração' },
  ];
  
  const metricsToUse = theme.socialMetrics || content.metrics || fallbackMetrics;
  
  // Assign icons based on index
  const icons = [CheckCircle2, ThumbsUp, ShieldCheck];

  return (
    <div className={`w-full aspect-[1/1.414] rounded-xl border border-white/10 ${isDark ? 'bg-[#09090b] text-white' : 'bg-white text-zinc-900'} p-12 flex flex-col gap-8 shadow-xl`}>
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-lime-400 mb-4">{content.headline || 'Quem Confia, Comprova'}</h2>
        <p className="text-zinc-500 text-lg max-w-lg mx-auto">{content.subheadline || 'Junte-se a centenas de clientes que já estão economizando e gerando sua própria energia.'}</p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {metricsToUse.map((m: any, i: number) => {
          const Icon = icons[i % icons.length];
          return (
          <div key={i} className={`p-6 rounded-xl border flex flex-col items-center text-center ${isDark ? 'bg-[#18181b] border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
            <Icon className="w-6 h-6 text-lime-400 mb-3" />
            <span className="text-2xl font-bold mb-1">{m.label}</span>
            <span className="text-sm text-zinc-500">{m.sub}</span>
          </div>
        );
        })}
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4">
        {content.images && content.images.length > 0 ? (
          content.images.slice(0, 4).map((img, i) => (
            <div key={img.id || i} className="relative rounded-xl overflow-hidden bg-zinc-900 group">
              <img src={img.url} alt={img.caption || `Projeto ${i+1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              {img.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <span className="text-white text-sm font-medium">{img.caption}</span>
                </div>
              )}
            </div>
          ))
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`rounded-xl flex items-center justify-center ${isDark ? 'bg-zinc-900/50 border border-white/5' : 'bg-zinc-100 border border-zinc-200'}`}>
              <ImageIcon className="w-10 h-10 text-zinc-700 opacity-50" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
