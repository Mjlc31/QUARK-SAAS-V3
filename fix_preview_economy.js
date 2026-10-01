import fs from 'fs';
let content = fs.readFileSync('src/components/proposals/preview/PreviewEconomy.tsx', 'utf8');

// Decrease sizes slightly
content = content.replace(/text-5xl/g, 'text-4xl');
content = content.replace(/text-4xl font-bold text-lime-400 mb-4/g, 'text-3xl font-bold text-lime-400 mb-2'); // Main title
content = content.replace(/w-12 h-12 rounded-lg bg-lime-400\/10 flex items-center justify-center/g, 'w-10 h-10 rounded-lg bg-lime-400/10 flex items-center justify-center');
content = content.replace(/w-6 h-6/g, 'w-5 h-5'); // Internal icons
content = content.replace(/text-3xl font-bold/g, 'text-2xl font-bold');

fs.writeFileSync('src/components/proposals/preview/PreviewEconomy.tsx', content);
