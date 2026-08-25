import os
from datetime import datetime

# Definir caminho do Changelog
changelog_path = "/Users/arthurdemoraespd/Documents/obsidian/second brain/Quark SaaS/📋 Changelog/Changelog.md"
hoje = datetime.now().strftime("%Y-%m-%d")

# Novo conteúdo para adicionar ao Changelog
new_entry = f"""
- **{hoje}** — Modificações de Engenharia e Features Novas:
  - Criação da página `InvoiceAudit.tsx` (nova auditoria de faturas da Equatorial).
  - Atualização do banco de dados (Nova migração `20260825_refresh_financial_view.sql` criando gatilhos para auto-refresh da materialized view financeira).
  - Atualizações nos cálculos solares (`solarCalc.ts`) e relatórios em PDF (`ProposalPDF.tsx`).
  - Ajustes no `SPIN Agent` (agente WhatsApp) e no frontend (`Conversations.tsx`, `Financial.tsx`, `LoginScreen.tsx`).
  - Geração de novos relatórios de auditoria de código para os subagentes no repositório `.agents/`.
"""

# Ler arquivo existente
with open(changelog_path, 'r') as f:
    content = f.read()

# Inserir após a linha inicial do histórico
marker = "# 📋 Changelog — Histórico de Alterações"
if marker in content:
    content = content.replace(marker, f"{marker}\n{new_entry}")
else:
    content += new_entry

# Salvar
with open(changelog_path, 'w') as f:
    f.write(content)

# Também criar a nota da nova página "InvoiceAudit"
invoice_audit_path = "/Users/arthurdemoraespd/Documents/obsidian/second brain/Quark SaaS/🎨 Frontend/Páginas/InvoiceAudit.md"
invoice_content = """---
tags: [quark, frontend, page, audit, invoice]
created: {hoje}
updated: {hoje}
status: active
area: frontend
---
# Invoice Audit (Auditoria Equatorial)
- **Route:** `/invoice-audit` (ou similar inserida no App.tsx)
- **Purpose:** Tela para realizar a auditoria automática de faturas de energia (especificamente da Equatorial) a partir do CPF/CNPJ e Data de Nascimento.
- **Features:** 
  - Mock da API `/api/audit/equatorial`
  - Estados de Loading, Erro e Sucesso.
- **Uses:** Ícones do `lucide-react` (FileText, Loader2, CheckCircle, AlertTriangle, ShieldCheck).
""".format(hoje=hoje)

with open(invoice_audit_path, 'w') as f:
    f.write(invoice_content)

print("Obsidian atualizado com sucesso!")
