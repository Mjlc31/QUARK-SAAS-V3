const fs = require('fs');

let content = fs.readFileSync('src/components/proposals/preview/PreviewEconomy.tsx', 'utf8');
content = content.replace(/p-8/g, 'p-5');
content = content.replace(/text-2xl font-bold text-lime-400/g, 'text-xl font-bold text-lime-400');
content = content.replace(/Economia em 25 anos/g, 'Em 25 anos'); // Make label shorter
fs.writeFileSync('src/components/proposals/preview/PreviewEconomy.tsx', content);
