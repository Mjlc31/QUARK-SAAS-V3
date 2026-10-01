import fs from 'fs';
let content = fs.readFileSync('src/components/proposals/preview/PreviewTechSpecs.tsx', 'utf8');

// Decrease sizes slightly
content = content.replace(/text-3xl/g, 'text-2xl');
content = content.replace(/text-2xl/g, 'text-xl');
content = content.replace(/w-8 h-8/g, 'w-6 h-6');

fs.writeFileSync('src/components/proposals/preview/PreviewTechSpecs.tsx', content);
