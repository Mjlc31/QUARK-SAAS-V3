const fs = require('fs');
let content = fs.readFileSync('src/components/proposals/steps/StepPreview.tsx', 'utf8');

content = content.replace(
  `const newM = [...metrics];\n                     newM[i].label = e.target.value;\n                     onUpdateTheme({socialMetrics: newM});`,
  `const newM = [...metrics];\n                     newM[i] = { ...newM[i], label: e.target.value };\n                     onUpdateTheme({socialMetrics: newM});`
);
content = content.replace(
  `const newM = [...metrics];\n                     newM[i].sub = e.target.value;\n                     onUpdateTheme({socialMetrics: newM});`,
  `const newM = [...metrics];\n                     newM[i] = { ...newM[i], sub: e.target.value };\n                     onUpdateTheme({socialMetrics: newM});`
);
fs.writeFileSync('src/components/proposals/steps/StepPreview.tsx', content);
