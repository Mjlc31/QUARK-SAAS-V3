const fs = require('fs');

let types = fs.readFileSync('src/components/proposal/types.ts', 'utf8');
types = types.replace(
  /export interface SocialProofContent \{([\s\S]*?)\}/,
  "export interface SocialProofContent {$1  metrics?: { label: string; sub: string }[];\n}"
);
fs.writeFileSync('src/components/proposal/types.ts', types);

