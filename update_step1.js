const fs = require('fs');

let content = fs.readFileSync('src/components/proposals/steps/StepClientData.tsx', 'utf8');

const targetStr = `          <div>
            <label className={labelClass}>Tipo de Ligação</label>`;

const replacementStr = `          <div>
            <label className={labelClass}>Fator de Geração (Mensal)</label>
            <div className="relative">
              <Zap className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
              <input 
                type="number"
                value={data.generationFactor || 125}
                onChange={e => handleChange('generationFactor', parseFloat(e.target.value))}
                className={\`\${inputClass} pl-10\`}
                placeholder="Ex: 125"
              />
            </div>
            <p className="text-xs text-zinc-500 mt-1">Estimativa de geração em kWh/kWp ao mês.</p>
          </div>
          <div>
            <label className={labelClass}>Tipo de Ligação</label>`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('src/components/proposals/steps/StepClientData.tsx', content);
