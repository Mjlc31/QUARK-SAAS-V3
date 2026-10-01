const fs = require('fs');

// 1. types.ts
let types = fs.readFileSync('src/components/proposal/types.ts', 'utf8');
types = types.replace(
  /export interface SocialProofContent extends BaseBlockContent \{([\s\S]*?)\}/,
  "export interface SocialProofContent extends BaseBlockContent {$1  metrics?: { label: string; sub: string }[];\n}"
);
fs.writeFileSync('src/components/proposal/types.ts', types);

// 2. ClientCatalog.tsx
let client = fs.readFileSync('src/pages/ClientCatalog.tsx', 'utf8');
client = client.replace(/import \{(.*?)\} from 'lucide-react';/, (match, p1) => {
  if (p1.includes('User')) return match;
  return "import {" + p1 + ", User} from 'lucide-react';";
});
fs.writeFileSync('src/pages/ClientCatalog.tsx', client);

