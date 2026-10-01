const fs = require('fs');

let content = fs.readFileSync('src/components/proposals/preview/PreviewContact.tsx', 'utf8');

content = content.replace(/\{content\.companyName \|\| 'QUARK ENERGIA'\}/g, "{theme.companyName || content.companyName || 'QUARK ENERGIA'}");
content = content.replace(/\{content\.companyCnpj\}/g, "{theme.companyCnpj || content.companyCnpj || '00.000.000/0001-00'}");
content = content.replace(/\{content\.companyPhone\}/g, "{theme.companyPhone || content.companyPhone || '(00) 00000-0000'}");
content = content.replace(/\{content\.companyEmail\}/g, "{theme.companyEmail || content.companyEmail || 'contato@quarkenergia.com.br'}");
content = content.replace(/\{content\.companyAddress\}/g, "{theme.companyAddress || content.companyAddress || 'Av. Principal, 1000 - Centro'}");

fs.writeFileSync('src/components/proposals/preview/PreviewContact.tsx', content);

let pdf = fs.readFileSync('src/components/proposal/ProposalPDF.tsx', 'utf8');
// Assuming ProposalPDF also needs fixing:
pdf = pdf.replace(/\{content\.companyName\}/g, "{theme.companyName || content.companyName || 'QUARK ENERGIA'}");
pdf = pdf.replace(/\{content\.companyCnpj\}/g, "{theme.companyCnpj || content.companyCnpj || '00.000.000/0001-00'}");
pdf = pdf.replace(/\{content\.companyPhone\}/g, "{theme.companyPhone || content.companyPhone || '(00) 00000-0000'}");
pdf = pdf.replace(/\{content\.companyEmail\}/g, "{theme.companyEmail || content.companyEmail || 'contato@quarkenergia.com.br'}");
pdf = pdf.replace(/\{content\.companyAddress\}/g, "{theme.companyAddress || content.companyAddress || 'Av. Principal, 1000 - Centro'}");

fs.writeFileSync('src/components/proposal/ProposalPDF.tsx', pdf);

