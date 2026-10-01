const fs = require('fs');

let content = fs.readFileSync('src/components/proposals/preview/PreviewROI.tsx', 'utf8');

content = content.replace(/grid grid-cols-4 gap-4/, "grid grid-cols-2 md:grid-cols-4 gap-4");
content = content.replace(/p-5 rounded-xl/g, "p-4 rounded-xl");
content = content.replace(/text-2xl font-bold/g, "text-xl md:text-2xl font-bold truncate");

fs.writeFileSync('src/components/proposals/preview/PreviewROI.tsx', content);

