const fs = require('fs');

let content = fs.readFileSync('src/components/proposals/steps/StepTechConfig.tsx', 'utf8');

const targetStr = `      {/* Seção 2 — Módulos Fotovoltaicos */}
      <div className="border-t border-white/5 pt-6">
        <h3 className={sectionTitleClass}><Sun className="w-5 h-5 text-lime-400" /> Módulos Fotovoltaicos</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Marca do Módulo</label>
            <input 
              type="text" 
              value={data.moduleBrand || 'Jinko Solar'} 
              onChange={e => handleChange('moduleBrand', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Potência (Wp) *</label>
            <div className="relative">
              <Zap className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
              <input 
                type="number" 
                value={modulePower || ''} 
                onChange={e => handleChange('modulePower', Number(e.target.value))}
                className={\`\${inputClass} pl-10 \${errors.modulePower ? 'border-red-500 ring-red-500/20' : ''}\`}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Quantidade *</label>
            <div className="relative">
              <Hash className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
              <input 
                type="number" 
                value={modulesCount || ''} 
                onChange={e => handleChange('modulesCount', Number(e.target.value))}
                className={\`\${inputClass} pl-10 \${errors.modulesCount ? 'border-red-500 ring-red-500/20' : ''}\`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Seção 3 — Inversores */}
      <div className="border-t border-white/5 pt-6">
        <h3 className={sectionTitleClass}><Battery className="w-5 h-5 text-lime-400" /> Inversores</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Marca do Inversor</label>
            <input 
              type="text" 
              value={data.inverterBrand || 'Growatt'} 
              onChange={e => handleChange('inverterBrand', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Potência Total (kW) *</label>
            <div className="relative">
              <Gauge className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
              <input 
                type="number" 
                value={inverterPower || ''} 
                onChange={e => handleChange('inverterPower', Number(e.target.value))}
                className={\`\${inputClass} pl-10 \${errors.inverterPower ? 'border-red-500 ring-red-500/20' : ''}\`}
                step="0.1"
              />
            </div>
          </div>`;

const replacementStr = `      {/* Datalists for Autocomplete */}
      <datalist id="module-brands">
        {['Jinko Solar', 'Canadian Solar', 'Trina Solar', 'Risen Energy', 'DAH Solar', 'JA Solar', 'Longi', 'Osda', 'GCL'].map(b => <option key={b} value={b} />)}
      </datalist>
      <datalist id="module-powers">
        {[460, 500, 545, 550, 555, 575, 600, 630, 650, 660, 690].map(p => <option key={p} value={p} />)}
      </datalist>
      <datalist id="inverter-brands">
        {['Sungrow', 'Huawei', 'Solis', 'SunPower', 'Growatt', 'Deye', 'FoxESS', 'Fronius', 'WEG', 'Dapsolar'].map(b => <option key={b} value={b} />)}
      </datalist>
      <datalist id="inverter-powers">
        {[2, 3, 4, 5, 6, 7, 8, 10, 15, 20, 25, 30, 40, 50, 60, 75, 110].map(p => <option key={p} value={p} />)}
      </datalist>

      {/* Seção 2 — Módulos Fotovoltaicos */}
      <div className="border-t border-white/5 pt-6">
        <h3 className={sectionTitleClass}><Sun className="w-5 h-5 text-lime-400" /> Módulos Fotovoltaicos</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Marca do Módulo</label>
            <input 
              type="text" 
              list="module-brands"
              value={data.moduleBrand || ''}
              onChange={e => handleChange('moduleBrand', e.target.value)}
              className={inputClass}
              placeholder="Ex: Jinko Solar"
            />
          </div>
          <div>
            <label className={labelClass}>Potência (Wp) *</label>
            <div className="relative">
              <Zap className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
              <input 
                type="number" 
                list="module-powers"
                value={modulePower || ''} 
                onChange={e => handleChange('modulePower', Number(e.target.value))}
                className={\`\${inputClass} pl-10 \${errors.modulePower ? 'border-red-500 ring-red-500/20' : ''}\`}
                placeholder="Ex: 550"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Quantidade *</label>
            <div className="relative">
              <Hash className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
              <input 
                type="number" 
                value={modulesCount || ''} 
                onChange={e => handleChange('modulesCount', Number(e.target.value))}
                className={\`\${inputClass} pl-10 \${errors.modulesCount ? 'border-red-500 ring-red-500/20' : ''}\`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Seção 3 — Inversores */}
      <div className="border-t border-white/5 pt-6">
        <h3 className={sectionTitleClass}><Battery className="w-5 h-5 text-lime-400" /> Inversores</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Marca do Inversor</label>
            <input 
              type="text" 
              list="inverter-brands"
              value={data.inverterBrand || ''} 
              onChange={e => handleChange('inverterBrand', e.target.value)}
              className={inputClass}
              placeholder="Ex: Sungrow"
            />
          </div>
          <div>
            <label className={labelClass}>Potência Total (kW) *</label>
            <div className="relative">
              <Gauge className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
              <input 
                type="number" 
                list="inverter-powers"
                value={inverterPower || ''} 
                onChange={e => handleChange('inverterPower', Number(e.target.value))}
                className={\`\${inputClass} pl-10 \${errors.inverterPower ? 'border-red-500 ring-red-500/20' : ''}\`}
                step="0.1"
                placeholder="Ex: 5"
              />
            </div>
          </div>`;

content = content.replace(targetStr, replacementStr);

fs.writeFileSync('src/components/proposals/steps/StepTechConfig.tsx', content);
