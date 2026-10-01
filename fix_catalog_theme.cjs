const fs = require('fs');

let content = fs.readFileSync('src/components/proposal/catalog.ts', 'utf8');

// For social_proof
content = content.replace(
  /type: 'social_proof',\n\s+content: \{/,
  `type: 'social_proof',\n      content: {\n        metrics: theme?.socialMetrics || [{ label: '+500', sub: 'Projetos Entregues' }, { label: '100%', sub: 'Satisfação' }, { label: '25 Anos', sub: 'Garantia de Geração' }],`
);

// For contact
content = content.replace(
  /type: 'contact',\n\s+content: \{\n\s+companyName: 'Quark Energia',\n\s+companyCnpj: '00.000.000\/0001-00',\n\s+companyPhone: '\(00\) 00000-0000',\n\s+companyEmail: 'contato@quarkenergia.com.br',\n\s+companyAddress: 'Av. Principal, 1000 - Centro',/,
  `type: 'contact',\n      content: {\n        companyName: theme?.companyName || 'Quark Energia',\n        companyCnpj: theme?.companyCnpj || '00.000.000/0001-00',\n        companyPhone: theme?.companyPhone || '(00) 00000-0000',\n        companyEmail: theme?.companyEmail || 'contato@quarkenergia.com.br',\n        companyAddress: theme?.companyAddress || 'Av. Principal, 1000 - Centro',`
);

fs.writeFileSync('src/components/proposal/catalog.ts', content);
