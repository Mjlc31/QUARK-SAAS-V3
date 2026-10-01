import fs from 'fs';
let content = fs.readFileSync('src/components/proposals/preview/PreviewSocialProof.tsx', 'utf8');

// Decrease sizes slightly
content = content.replace(/text-4xl/g, 'text-3xl');
content = content.replace(/text-3xl/g, 'text-2xl');
content = content.replace(/w-8 h-8/g, 'w-6 h-6');

fs.writeFileSync('src/components/proposals/preview/PreviewSocialProof.tsx', content);
