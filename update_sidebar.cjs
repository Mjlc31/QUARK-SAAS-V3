const fs = require('fs');

let content = fs.readFileSync('src/components/proposals/steps/StepPreview.tsx', 'utf8');

const targetStr = `        </div>

        <div className="flex gap-3 mt-auto">`;

const addition = `        
          {/* Informações da Empresa */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <h3 className="text-sm font-medium text-white">Dados da Empresa</h3>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Nome Fantasia</label>
              <input type="text" value={theme.companyName || ''} onChange={e => onUpdateTheme({companyName: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-lime-400" placeholder="Quark Energia" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">CNPJ</label>
              <input type="text" value={theme.companyCnpj || ''} onChange={e => onUpdateTheme({companyCnpj: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-lime-400" placeholder="00.000.000/0001-00" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Telefone</label>
              <input type="text" value={theme.companyPhone || ''} onChange={e => onUpdateTheme({companyPhone: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-lime-400" placeholder="(00) 00000-0000" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Email</label>
              <input type="text" value={theme.companyEmail || ''} onChange={e => onUpdateTheme({companyEmail: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-lime-400" placeholder="contato@quarkenergia.com.br" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Endereço</label>
              <input type="text" value={theme.companyAddress || ''} onChange={e => onUpdateTheme({companyAddress: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-lime-400" placeholder="Av. Principal, 1000" />
            </div>
          </div>

          {/* Prova Social */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <h3 className="text-sm font-medium text-white">Métricas (Prova Social)</h3>
            {[0,1,2].map(i => {
               const metrics = theme.socialMetrics || [{label: '+500', sub: 'Projetos Entregues'}, {label: '100%', sub: 'Satisfação'}, {label: '25 Anos', sub: 'Garantia de Geração'}];
               return (
                 <div key={i} className="flex gap-2">
                   <input type="text" value={metrics[i].label} onChange={e => {
                     const newM = [...metrics];
                     newM[i].label = e.target.value;
                     onUpdateTheme({socialMetrics: newM});
                   }} className="w-1/3 bg-zinc-900 border border-white/10 rounded-lg px-2 py-2 text-sm text-white font-bold text-center focus:ring-1 focus:ring-lime-400" placeholder="Dado" />
                   <input type="text" value={metrics[i].sub} onChange={e => {
                     const newM = [...metrics];
                     newM[i].sub = e.target.value;
                     onUpdateTheme({socialMetrics: newM});
                   }} className="w-2/3 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-lime-400" placeholder="Descrição" />
                 </div>
               )
            })}
          </div>
        </div>

        <div className="flex gap-3 mt-auto">`;

content = content.replace(targetStr, addition);
fs.writeFileSync('src/components/proposals/steps/StepPreview.tsx', content);
