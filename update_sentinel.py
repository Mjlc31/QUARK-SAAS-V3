import os
from datetime import datetime

# Atualizar Changelog
changelog_path = "/Users/arthurdemoraespd/Documents/obsidian/second brain/Quark SaaS/📋 Changelog/Changelog.md"
hoje = datetime.now().strftime("%Y-%m-%d %H:%M")

new_entry = f"""
- **{hoje} (Modo Sentinela)** — Atualizações detectadas no backend:
  - Adicionado `puppeteer` no `whatsapp-backend/index.js` para realizar Web Scraping (Crawler) na Agência Virtual da Equatorial.
  - Criada a rota `/api/audit/equatorial` para automatizar login, extração de fatura e envio para análise do `gemini-2.5-flash`.
  - Melhorias no `spinAgent.js` que agora pode enviar automaticamente links de propostas (`https://quark-saas.vercel.app/propostas/preview/uuid`) via WhatsApp Cloud API.
"""

with open(changelog_path, 'r') as f:
    content = f.read()

marker = "# 📋 Changelog — Histórico de Alterações"
if marker in content:
    content = content.replace(marker, f"{marker}\n{new_entry}")

with open(changelog_path, 'w') as f:
    f.write(content)

# Atualizar Nota do InvoiceAudit
invoice_audit_path = "/Users/arthurdemoraespd/Documents/obsidian/second brain/Quark SaaS/🎨 Frontend/Páginas/InvoiceAudit.md"
if os.path.exists(invoice_audit_path):
    with open(invoice_audit_path, 'a') as f:
        f.write("\n\n## Backend (Web Scraper Equatorial)\n")
        f.write("A funcionalidade agora conta com um robô em `puppeteer` rodando no backend (`whatsapp-backend/index.js` em `/api/audit/equatorial`). O robô entra na Agência Virtual, usa o CPF/CNPJ e Data de Nascimento, extrai a fatura e passa por uma auditoria do `gemini-2.5-flash` para identificar se a energia injetada abateu o consumo corretamente.\n")

# Atualizar Nota do WhatsApp Backend
wpp_backend_path = "/Users/arthurdemoraespd/Documents/obsidian/second brain/Quark SaaS/⚙️ Backend/WhatsApp Integration/WhatsApp Backend.md"
if os.path.exists(wpp_backend_path):
    with open(wpp_backend_path, 'a') as f:
        f.write("\n\n## Auditoria Equatorial (Puppeteer + Gemini)\n")
        f.write("O backend agora possui um scraper com `puppeteer` (`/api/audit/equatorial`) para automatizar o login na Equatorial, baixar faturas e enviá-las para o `gemini-2.5-flash`.\n")

print("Sentinel update completed.")
