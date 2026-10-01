const fs = require('fs');
let content = fs.readFileSync('src/components/proposal/catalog.ts', 'utf8');

const targetStr = `        data: Array.from({ length: 12 }).map((_, i) => ({
          month: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][i],
          generation: generationMonthly,
          consumption: consumptionBase,
          balance: generationMonthly - consumptionBase,
        }))`;

const replacementStr = `        data: Array.from({ length: 12 }).map((_, i) => {
          // Curva de sazonalidade típica de irradiação solar no Brasil (Verão alta, Inverno baixa)
          const seasonalFactors = [1.08, 1.05, 1.03, 0.98, 0.92, 0.88, 0.89, 0.95, 1.00, 1.04, 1.07, 1.11];
          const actualGen = Math.round(generationMonthly * seasonalFactors[i]);
          return {
            month: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][i],
            generation: actualGen,
            consumption: consumptionBase,
            balance: actualGen - consumptionBase,
          };
        })`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('src/components/proposal/catalog.ts', content);
