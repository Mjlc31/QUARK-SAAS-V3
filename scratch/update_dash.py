import re

with open('src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

# Add User to lucide-react imports if not there
if 'User' not in content.split('lucide-react')[0]:
    content = content.replace("CheckSquare, FileText } from 'lucide-react';", "CheckSquare, FileText, User } from 'lucide-react';")

# The block to insert
acoes = """      </div>

      {/* Foco de Hoje (Ações Pendentes) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4 flex items-start gap-3 relative overflow-hidden group hover:bg-orange-500/10 transition-colors cursor-pointer" onClick={() => navigate('/tasks')}>
          <div className="p-2 bg-orange-500/20 text-orange-400 rounded-lg shrink-0">
            <CheckSquare size={20} />
          </div>
          <div>
            <h3 className="text-orange-400 font-bold text-sm">Tarefas Pendentes</h3>
            <p className="text-orange-400/80 text-xs mt-0.5">Você possui 3 tarefas agendadas para hoje.</p>
          </div>
        </div>
        
        <div className="bg-lime-500/5 border border-lime-500/20 rounded-2xl p-4 flex items-start gap-3 relative overflow-hidden group hover:bg-lime-500/10 transition-colors cursor-pointer" onClick={() => navigate('/crm')}>
          <div className="p-2 bg-lime-500/20 text-lime-400 rounded-lg shrink-0">
            <User size={20} />
          </div>
          <div>
            <h3 className="text-lime-400 font-bold text-sm">Leads Recentes</h3>
            <p className="text-lime-400/80 text-xs mt-0.5">2 leads chegaram hoje e ainda não foram atendidos.</p>
          </div>
        </div>

        <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3 relative overflow-hidden group hover:bg-blue-500/10 transition-colors cursor-pointer" onClick={() => navigate('/proposals')}>
          <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="text-blue-400 font-bold text-sm">Propostas em Aberto</h3>
            <p className="text-blue-400/80 text-xs mt-0.5">1 proposta aguardando assinatura do cliente.</p>
          </div>
        </div>
      </div>

      {/* Bento Grid Layout */}"""

content = content.replace("      </div>\n\n      {/* Bento Grid Layout */}", acoes)

with open('src/pages/Dashboard.tsx', 'w') as f:
    f.write(content)

