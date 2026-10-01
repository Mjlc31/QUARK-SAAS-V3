const fs = require('fs');
let content = fs.readFileSync('src/components/proposal/types.ts', 'utf8');

content = content.replace(
  /export interface SocialProofContent extends BaseBlockContent \{\n\s+headline\?: string;\n\s+subheadline\?: string;\n\s+images\?: \{ id: string; url: string; caption\?: string \}\[\];\n\}/,
  `export interface SocialProofContent extends BaseBlockContent {
  headline?: string;
  subheadline?: string;
  images?: { id: string; url: string; caption?: string }[];
  metrics?: { label: string; sub: string }[];
}`
);
fs.writeFileSync('src/components/proposal/types.ts', content);
