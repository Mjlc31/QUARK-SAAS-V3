const fs = require('fs');
let content = fs.readFileSync('src/components/proposals/preview/PreviewCover.tsx', 'utf8');
content = content.replace(
  /<h1 className="text-2xl font-bold tracking-tighter" style=\{\{ color: theme\.primaryColor \|\| '#a3e635' \}\}>QUARK ENERGIA<\/h1>/,
  '<h1 className="text-2xl font-bold tracking-tighter" style={{ color: theme.primaryColor || \\'#a3e635\\' }}>{theme.companyName || \\'QUARK ENERGIA\\'}</h1>'
);
fs.writeFileSync('src/components/proposals/preview/PreviewCover.tsx', content);
