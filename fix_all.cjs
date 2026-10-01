const fs = require('fs');

// 1. types.ts
let types = fs.readFileSync('src/components/proposal/types.ts', 'utf8');
types = types.replace(
  /export interface SocialProofContent extends BaseBlockContent \{([\s\S]*?)\}/,
  \`export interface SocialProofContent extends BaseBlockContent {$1  metrics?: { label: string; sub: string }[];\n}\`
);
fs.writeFileSync('src/components/proposal/types.ts', types);

// 2. ClientCatalog.tsx
let client = fs.readFileSync('src/pages/ClientCatalog.tsx', 'utf8');
if (!client.includes('User,')) {
  client = client.replace('import { Users, Plus, Search, MapPin, Building, Activity, FileText } from \\'lucide-react\\';', 'import { Users, Plus, Search, MapPin, Building, Activity, FileText, User } from \\'lucide-react\\';');
}
// Try a broader regex for lucide-react imports if first failed
client = client.replace(/import \{(.*?)\} from 'lucide-react';/, (match, p1) => {
  if (p1.includes('User,')) return match;
  return \`import {\${p1}, User} from 'lucide-react';\`;
});
fs.writeFileSync('src/pages/ClientCatalog.tsx', client);

