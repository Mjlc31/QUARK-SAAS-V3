const fs = require('fs');

let content = fs.readFileSync('src/components/proposals/preview/PreviewSocialProof.tsx', 'utf8');
content = content.replace(
  "const metricsToUse = content.metrics || fallbackMetrics;",
  "const metricsToUse = theme.socialMetrics || content.metrics || fallbackMetrics;"
);
fs.writeFileSync('src/components/proposals/preview/PreviewSocialProof.tsx', content);

let pdf = fs.readFileSync('src/components/proposal/ProposalPDF.tsx', 'utf8');
pdf = pdf.replace(
  "const metrics = content.metrics || [",
  "const metrics = theme.socialMetrics || content.metrics || ["
);
fs.writeFileSync('src/components/proposal/ProposalPDF.tsx', pdf);

