const fs = require('fs');

let content = fs.readFileSync('src/components/proposal/solarCalc.ts', 'utf8');

// Fix Fio B cost calculation
content = content.replace(
  /const fioBCost = compensatedEnergy \* \(fiobEffective > 0 \? fiobEffective : fioBRate\);/,
  `// O custo do Fio B incide sobre a energia que foi injetada e compensada (apenas o % do ano)
  const actualFiobRate = (fiobEffective > 0 ? fiobEffective : tariffRate * 0.28) * fioBPercent;
  const fioBCost = compensatedEnergy * actualFiobRate;`
);

// Fix ROI, Payback, and Cashflow (incorporate degradation)
const cashFlowTarget = `  const adjustRate = tariffAdjustmentRate / 100;
  const tmaRate = tma / 100;
  const cashFlowsArray: number[] = [-finalPrice]; // Ano 0 = investimento
  const cashFlow: CashFlowYear[] = [];
  let cumulativeSavings = 0;
  let cumulativeNet = -finalPrice;
  let cumulativeDiscounted = -finalPrice;
  let paybackMonths = -1;
  let paybackDiscountedYears = 0;

  for (let year = 1; year <= systemLifeYears; year++) {
    // Economia cresce com reajuste tarifário
    const yearSavings = annualSavings * Math.pow(1 + adjustRate, year - 1);
    cumulativeSavings += yearSavings;
    cumulativeNet += yearSavings;

    const discountFactor = Math.pow(1 + tmaRate, year);
    const discountedCF = yearSavings / discountFactor;
    cumulativeDiscounted += discountedCF;

    cashFlowsArray.push(yearSavings);
    cashFlow.push({
      year,
      annualSavings: yearSavings,
      cumulativeSavings,
      cumulativeNet,
      discountedCashFlow: discountedCF,
    });

    // Payback simples (quando saldo fica positivo)
    if (paybackMonths < 0 && cumulativeNet >= 0) {
      // Interpolação para meses
      const prevNet = cumulativeNet - yearSavings;
      const fraction = -prevNet / yearSavings;
      paybackMonths = Math.round((year - 1 + fraction) * 12);
    }

    // Payback descontado
    if (paybackDiscountedYears === 0 && cumulativeDiscounted >= 0) {
      paybackDiscountedYears = year;
    }
  }`;

const cashFlowReplacement = `  const adjustRate = tariffAdjustmentRate / 100;
  const tmaRate = tma / 100;
  const degradationRate = 0.005; // 0.5% ao ano de perda de eficiência
  const cashFlowsArray: number[] = [-finalPrice]; // Ano 0 = investimento
  const cashFlow: CashFlowYear[] = [];
  
  let cumulativeSavings = 0;
  let cumulativeNet = -finalPrice;
  let cumulativeDiscounted = -finalPrice;
  let paybackMonths = -1;
  let paybackDiscountedYears = 0;

  for (let year = 1; year <= systemLifeYears; year++) {
    // Geração cai 0.5% ao ano. A economia real é proporcional à geração.
    // Tarifa sobe conforme o reajuste tarifário.
    const degradation = Math.pow(1 - degradationRate, year - 1);
    const yearSavings = annualSavings * degradation * Math.pow(1 + adjustRate, year - 1);
    
    cumulativeSavings += yearSavings;
    cumulativeNet += yearSavings;

    const discountFactor = Math.pow(1 + tmaRate, year);
    const discountedCF = yearSavings / discountFactor;
    cumulativeDiscounted += discountedCF;

    cashFlowsArray.push(yearSavings);
    cashFlow.push({
      year,
      annualSavings: yearSavings,
      cumulativeSavings,
      cumulativeNet,
      discountedCashFlow: discountedCF,
    });

    // Payback simples (quando saldo fica positivo)
    if (paybackMonths < 0 && cumulativeNet >= 0) {
      // Interpolação para meses
      const prevNet = cumulativeNet - yearSavings;
      const fraction = -prevNet / yearSavings;
      paybackMonths = Math.round((year - 1 + fraction) * 12);
    }

    // Payback descontado
    if (paybackDiscountedYears === 0 && cumulativeDiscounted >= 0) {
      paybackDiscountedYears = year;
    }
  }`;

content = content.replace(cashFlowTarget, cashFlowReplacement);

fs.writeFileSync('src/components/proposal/solarCalc.ts', content);
