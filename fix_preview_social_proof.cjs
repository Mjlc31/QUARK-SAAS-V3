const fs = require('fs');

let content = fs.readFileSync('src/components/proposals/preview/PreviewSocialProof.tsx', 'utf8');

content = content.replace(
  `  const metrics = [
    { label: '+500', sub: 'Projetos Entregues', icon: CheckCircle2 },
    { label: '100%', sub: 'Satisfação', icon: ThumbsUp },
    { label: '25 Anos', sub: 'Garantia de Geração', icon: ShieldCheck },
  ];`,
  `  const fallbackMetrics = [
    { label: '+500', sub: 'Projetos Entregues' },
    { label: '100%', sub: 'Satisfação' },
    { label: '25 Anos', sub: 'Garantia de Geração' },
  ];
  
  const metricsToUse = content.metrics || fallbackMetrics;
  
  // Assign icons based on index
  const icons = [CheckCircle2, ThumbsUp, ShieldCheck];`
);

content = content.replace(
  `{metrics.map((m, i) => (`,
  `{metricsToUse.map((m, i) => {
          const Icon = icons[i % icons.length];
          return (`
);

content = content.replace(
  `            <m.icon className="w-6 h-6 text-lime-400 mb-3" />`,
  `            <Icon className="w-6 h-6 text-lime-400 mb-3" />`
);

content = content.replace(
  `          </div>
        ))}
      </div>`,
  `          </div>
        );
        })}
      </div>`
);

fs.writeFileSync('src/components/proposals/preview/PreviewSocialProof.tsx', content);
