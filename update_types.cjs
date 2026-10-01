const fs = require('fs');

let content = fs.readFileSync('src/components/proposal/types.ts', 'utf8');

// Update ProposalTheme
content = content.replace(
  /projectImages: string\[\];/,
  `projectImages: string[];
  companyName?: string;
  companyCnpj?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyAddress?: string;
  socialMetrics?: { label: string; sub: string; }[];`
);

fs.writeFileSync('src/components/proposal/types.ts', content);
