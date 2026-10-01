const fs = require('fs');

// PreviewSocialProof
let content = fs.readFileSync('src/components/proposals/preview/PreviewSocialProof.tsx', 'utf8');
content = content.replace(/\{metricsToUse\.map\(\(m, i\) \=\> \{/, '{metricsToUse.map((m: any, i: number) => {');
fs.writeFileSync('src/components/proposals/preview/PreviewSocialProof.tsx', content);

// ProposalPDF
let content2 = fs.readFileSync('src/components/proposal/ProposalPDF.tsx', 'utf8');
content2 = content2.replace(/\{metrics\.map\(\(m, i\) \=\> \(/, '{metrics.map((m: any, i: number) => (');
fs.writeFileSync('src/components/proposal/ProposalPDF.tsx', content2);
