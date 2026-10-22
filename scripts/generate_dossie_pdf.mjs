import fs from 'fs';
import path from 'path';

const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>QUARK OS - Dossiê Executivo & Arquitetura do Sistema</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');

    @page {
      size: A4 portrait;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      background-color: #09090b;
      color: #f8fafc;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      width: 210mm;
      height: 297mm;
      max-height: 297mm;
      padding: 13mm 14mm 10mm 14mm;
      page-break-after: always;
      break-after: page;
      position: relative;
      overflow: hidden;
      background: #09090b;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    /* Subtle background grid pattern */
    .page::before {
      content: "";
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background-image: 
        linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px);
      background-size: 14mm 14mm;
      pointer-events: none;
      z-index: 0;
    }

    .page-content {
      position: relative;
      z-index: 1;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    /* Header Component */
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 3.5mm;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      margin-bottom: 4mm;
    }

    .doc-header-left {
      display: flex;
      align-items: center;
      gap: 3.5mm;
    }

    .doc-header-logo {
      height: 8.5mm;
      object-fit: contain;
    }

    .doc-header-meta {
      display: flex;
      flex-direction: column;
    }

    .doc-header-title {
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #84cc16;
    }

    .doc-header-sub {
      font-size: 6.5pt;
      color: #94a3b8;
    }

    .doc-header-badge {
      display: inline-flex;
      align-items: center;
      gap: 1.5mm;
      background: rgba(132, 204, 22, 0.1);
      border: 1px solid rgba(132, 204, 22, 0.3);
      padding: 1.2mm 2.8mm;
      border-radius: 9999px;
      font-size: 6.5pt;
      font-weight: 700;
      color: #a3e635;
      font-family: 'JetBrains Mono', monospace;
    }

    .badge-dot {
      width: 1.5mm;
      height: 1.5mm;
      border-radius: 50%;
      background: #84cc16;
      box-shadow: 0 0 6px #84cc16;
    }

    /* Footer Component */
    .doc-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 3mm;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 6.5pt;
      color: #64748b;
      font-family: 'JetBrains Mono', monospace;
      position: relative;
      z-index: 1;
    }

    .doc-footer-right {
      color: #84cc16;
      font-weight: 600;
    }

    /* Typography & Utilities */
    h1 {
      font-size: 16pt;
      font-weight: 800;
      line-height: 1.2;
      color: #ffffff;
      letter-spacing: -0.02em;
    }

    h2 {
      font-size: 11pt;
      font-weight: 700;
      color: #f1f5f9;
      letter-spacing: -0.01em;
      margin-bottom: 1.5mm;
    }

    h3 {
      font-size: 8.5pt;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.01em;
    }

    p {
      font-size: 7.2pt;
      line-height: 1.45;
      color: #94a3b8;
    }

    .highlight {
      color: #84cc16;
      font-weight: 600;
    }

    .pill {
      display: inline-block;
      font-size: 6pt;
      font-weight: 700;
      padding: 0.8mm 2.2mm;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-family: 'JetBrains Mono', monospace;
    }

    .pill-lime { background: rgba(132, 204, 22, 0.15); color: #a3e635; border: 1px solid rgba(132, 204, 22, 0.3); }
    .pill-cyan { background: rgba(6, 182, 212, 0.15); color: #22d3ee; border: 1px solid rgba(6, 182, 212, 0.3); }
    .pill-purple { background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }
    .pill-amber { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }

    /* Browser Mockup Container */
    .browser-frame {
      background: #111114;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
      margin-bottom: 3.5mm;
    }

    .browser-bar {
      background: #18181c;
      padding: 1.8mm 3mm;
      display: flex;
      align-items: center;
      gap: 2mm;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .browser-dots {
      display: flex;
      gap: 1.2mm;
    }

    .browser-dot {
      width: 2mm;
      height: 2mm;
      border-radius: 50%;
    }
    .dot-red { background: #ef4444; }
    .dot-yellow { background: #eab308; }
    .dot-green { background: #22c55e; }

    .browser-url {
      background: #09090b;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 3px;
      padding: 0.6mm 2.5mm;
      font-size: 5.8pt;
      color: #94a3b8;
      font-family: 'JetBrains Mono', monospace;
      flex: 1;
      max-width: 80mm;
      display: flex;
      align-items: center;
      gap: 1.5mm;
    }

    .browser-url span { color: #84cc16; }

    .browser-img {
      width: 100%;
      display: block;
      object-fit: cover;
      object-position: top;
    }

    /* Cards & Grids */
    .card {
      background: rgba(18, 18, 22, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 6px;
      padding: 3mm 3.5mm;
    }

    .card-glow-lime {
      border: 1px solid rgba(132, 204, 22, 0.35);
      box-shadow: 0 0 15px rgba(132, 204, 22, 0.08);
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3.5mm;
    }

    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 3mm;
    }

    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 2.5mm;
    }

    /* Feature Item */
    .feature-item {
      display: flex;
      align-items: flex-start;
      gap: 2.2mm;
      margin-bottom: 2mm;
    }

    .feature-icon {
      width: 4.5mm;
      height: 4.5mm;
      border-radius: 3px;
      background: rgba(132, 204, 22, 0.15);
      color: #84cc16;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 6.5pt;
      font-weight: 700;
      flex-shrink: 0;
      margin-top: 0.5mm;
    }

    .feature-text h4 {
      font-size: 7.2pt;
      font-weight: 700;
      color: #e2e8f0;
      margin-bottom: 0.5mm;
    }

    .feature-text p {
      font-size: 6.5pt;
      line-height: 1.35;
      color: #94a3b8;
    }

    /* Cover Page Specific */
    .cover-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 6mm 0;
    }

    .cover-hero-glow {
      position: absolute;
      top: -20mm;
      right: -20mm;
      width: 110mm;
      height: 110mm;
      background: radial-gradient(circle, rgba(132, 204, 22, 0.15) 0%, transparent 70%);
      pointer-events: none;
    }

    .cover-logo-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8mm;
    }

    .cover-main-logo {
      height: 13mm;
      object-fit: contain;
    }

    .cover-title-group {
      margin-bottom: 7mm;
    }

    .cover-eyebrow {
      font-size: 9pt;
      font-weight: 700;
      color: #84cc16;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      font-family: 'JetBrains Mono', monospace;
      margin-bottom: 2mm;
    }

    .cover-title {
      font-size: 26pt;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.1;
      letter-spacing: -0.03em;
      margin-bottom: 3.5mm;
    }

    .cover-title span {
      background: linear-gradient(135deg, #a3e635 0%, #84cc16 50%, #4ade80 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .cover-subtitle {
      font-size: 10pt;
      color: #94a3b8;
      line-height: 1.5;
      max-width: 160mm;
    }

    .stat-box {
      background: rgba(18, 18, 22, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 3.5mm;
      position: relative;
      overflow: hidden;
    }

    .stat-box::after {
      content: "";
      position: absolute;
      top: 0; left: 0; width: 100%; height: 2px;
      background: linear-gradient(90deg, #84cc16, transparent);
    }

    .stat-value {
      font-size: 14pt;
      font-weight: 800;
      color: #ffffff;
      font-family: 'JetBrains Mono', monospace;
      margin-bottom: 0.8mm;
    }

    .stat-label {
      font-size: 6.5pt;
      font-weight: 600;
      color: #84cc16;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .stat-desc {
      font-size: 5.8pt;
      color: #64748b;
      margin-top: 0.5mm;
    }

    .cover-footer-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4mm;
      padding-top: 4mm;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .meta-item h5 {
      font-size: 6.2pt;
      text-transform: uppercase;
      color: #64748b;
      font-family: 'JetBrains Mono', monospace;
      margin-bottom: 0.8mm;
    }

    .meta-item p {
      font-size: 7.2pt;
      color: #cbd5e1;
      font-weight: 600;
    }
  </style>
</head>
<body>

  <!-- ================= PAGE 1: COVER ================= -->
  <div class="page">
    <div class="cover-hero-glow"></div>
    <div class="page-content cover-container">
      <div>
        <div class="cover-logo-row">
          <img src="/brand/logo-h-color.png" alt="Quark Energia" class="cover-main-logo">
          <div class="doc-header-badge">
            <span class="badge-dot"></span>
            PRODUÇÃO HOMOLOGADA v3.5
          </div>
        </div>

        <div class="cover-title-group">
          <div class="cover-eyebrow">DOSSIÊ TÉCNICO & EXECUTIVO DO SISTEMA</div>
          <div class="cover-title">
            QUARK <span>OS</span>
          </div>
          <p class="cover-subtitle">
            Plataforma All-in-One de Inteligência Fotovoltaica, CRM Comercial com Agente IA SPIN Selling, Motor de Dimensionamento Solar, Acompanhamento de Obras em Tempo Real, Automação RPA de Faturas e Portal Exclusivo do Cliente com Programa de Fidelidade.
          </p>
        </div>

        <div class="grid-4" style="margin-bottom: 6mm;">
          <div class="stat-box">
            <div class="stat-value">65+</div>
            <div class="stat-label">Usinas Ativas</div>
            <div class="stat-desc">Monitoramento contínuo</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">R$ 1,39M</div>
            <div class="stat-label">Economia Gerada</div>
            <div class="stat-desc">Impacto financeiro real</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">74,4k</div>
            <div class="stat-label">kWh/mês Gerados</div>
            <div class="stat-desc">Potência limpa injetada</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">100%</div>
            <div class="stat-label">Automação Ponta a Ponta</div>
            <div class="stat-desc">Do lead ao pós-venda</div>
          </div>
        </div>

        <div class="card card-glow-lime" style="padding: 4mm 5mm; margin-bottom: 6mm;">
          <h3 style="font-size: 9.5pt; color: #a3e635; margin-bottom: 1.5mm;">Sumário de Engenharia & Visão Geral</h3>
          <p style="font-size: 7.4pt; color: #cbd5e1; line-height: 1.5;">
            O <strong>Quark OS</strong> é a infraestrutura digital proprietária desenvolvida para a <strong>Quark Engenharia & Energia</strong>. Ele unifica em uma única aplicação web de alto desempenho todo o ciclo de vida de projetos solares: prospecção B2B inteligente, qualificação por IA, simulação fotovoltaica em alta precisão, geração e assinatura digital de contratos/propostas, esteira física de engenharia (Follow-up Kanban), robôs RPA para scraping de concessionárias e um portal self-service para o consumidor final.
          </p>
        </div>
      </div>

      <div class="cover-footer-meta">
        <div class="meta-item">
          <h5>EMISSÃO & HOMOLOGAÇÃO</h5>
          <p>Outubro / 2026 · Quark Engenharia & Energia (Maceió - AL)</p>
        </div>
        <div class="meta-item">
          <h5>STACK TECNOLÓGICA</h5>
          <p>React 19 · Vite · TypeScript · Supabase PostgreSQL · Gemini 2.5 Flash · Express</p>
        </div>
      </div>
    </div>
    <div class="doc-footer">
      <div>QUARK ENERGIA & ENGENHARIA · CNPJ 48.244.593/0001-85 · DOCUMENTO CONFIDENCIAL</div>
      <div class="doc-footer-right">PÁG. 01 / 11</div>
    </div>
  </div>

  <!-- ================= PAGE 2: ARQUITETURA ================= -->
  <div class="page">
    <div class="page-content">
      <div class="doc-header">
        <div class="doc-header-left">
          <img src="/brand/logo-h-color.png" alt="Quark" class="doc-header-logo">
          <div class="doc-header-meta">
            <span class="doc-header-title">ECOSSISTEMA TECNOLÓGICO</span>
            <span class="doc-header-sub">Visão de Engenharia de Software e Pilares da Solução</span>
          </div>
        </div>
        <div class="doc-header-badge">ARQUITETURA UNIFICADA</div>
      </div>

      <div style="margin-bottom: 4mm;">
        <h2>Arquitetura Completa e Integrações do Quark OS</h2>
        <p>Uma visão em camadas projetada para alta disponibilidade, segurança de dados com isolamento por usuário (Row Level Security) e máxima velocidade operacional.</p>
      </div>

      <div class="card" style="margin-bottom: 4mm; background: #0c0c10; padding: 4mm;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3mm; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 2mm;">
          <h3 style="font-size: 8pt; color: #84cc16;">DIAGRAMA DAS 4 CAMADAS DA PLATAFORMA</h3>
          <span class="pill pill-lime">ALTA RESILIÊNCIA & RESPOSTA SUB-100MS</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 2.5mm;">
          <!-- Camada 1 -->
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 5px; padding: 2.5mm 3.5mm; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 7.2pt; font-weight: 700; color: #ffffff;">1. CAMADA DE APRESENTAÇÃO (FRONTEND CLIENT)</div>
              <div style="font-size: 6.2pt; color: #94a3b8;">React 19 + Vite + Tailwind CSS v4 + Dark Hacker Glass Theme + Recharts + React-PDF</div>
            </div>
            <span class="pill pill-cyan">Painel Admin & Portal PWA</span>
          </div>

          <!-- Camada 2 -->
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 5px; padding: 2.5mm 3.5mm; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 7.2pt; font-weight: 700; color: #ffffff;">2. CAMADA DE APLICAÇÃO & AGENTES IA (BACKEND SERVICES)</div>
              <div style="font-size: 6.2pt; color: #94a3b8;">Node.js Express + Gemini 2.5 Flash (SPIN Selling) + Evolution API WhatsApp + Socket.IO</div>
            </div>
            <span class="pill pill-purple">API REST & Webhooks</span>
          </div>

          <!-- Camada 3 -->
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 5px; padding: 2.5mm 3.5mm; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 7.2pt; font-weight: 700; color: #ffffff;">3. CAMADA DE BANCO DE DADOS & SEGURANÇA (DATABASE & RLS)</div>
              <div style="font-size: 6.2pt; color: #94a3b8;">Supabase PostgreSQL com Row Level Security (RLS) + Índices Otimizados + RPCs Transacionais</div>
            </div>
            <span class="pill pill-lime">PostgreSQL 15</span>
          </div>

          <!-- Camada 4 -->
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 5px; padding: 2.5mm 3.5mm; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 7.2pt; font-weight: 700; color: #ffffff;">4. CAMADA DE AUTOMAÇÃO EXTERNA & ROBÓTICA (RPA SCRAPING)</div>
              <div style="font-size: 6.2pt; color: #94a3b8;">QuarkBot RPA Python + Tesseract OCR + Scraper Equatorial Alagoas + Google Maps API</div>
            </div>
            <span class="pill pill-amber">Robô de Faturas RPA</span>
          </div>
        </div>
      </div>

      <div class="grid-2" style="margin-bottom: 4mm;">
        <div class="card">
          <h3 style="color: #a3e635; margin-bottom: 2mm;">Vertente Comercial & Vendas</h3>
          <div class="feature-item">
            <div class="feature-icon">⚡</div>
            <div class="feature-text">
              <h4>CRM Inteligente com SPIN Selling</h4>
              <p>Funil kanban de 7 fases integrado ao Gemini 2.5 Flash, que formula abordagens sob medida para cada objeção.</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">📄</div>
            <div class="feature-text">
              <h4>Propostas Digitais Interativas</h4>
              <p>Páginas públicas em <code>/p/:token</code> com aceite digital em um toque e envio instantâneo no WhatsApp.</p>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 style="color: #38bdf8; margin-bottom: 2mm;">Vertente Operações & Engenharia</h3>
          <div class="feature-item">
            <div class="feature-icon">🏗️</div>
            <div class="feature-text">
              <h4>Follow-up Kanban de Obras (5 Fases)</h4>
              <p>Acompanhamento milimétrico da compra do kit, projeto na Equatorial, instalação física e troca do medidor.</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">👥</div>
            <div class="feature-text">
              <h4>Catálogo de 65+ Usinas Solares</h4>
              <p>Auditoria completa da base de clientes com telemetria de consumo, potência instalada e alertas preventivos.</p>
            </div>
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <h3 style="color: #c084fc; margin-bottom: 2mm;">Vertente Financeira & Governança</h3>
          <div class="feature-item">
            <div class="feature-icon">📊</div>
            <div class="feature-text">
              <h4>DRE Auditado & Fluxo de Caixa</h4>
              <p>Apuração em tempo real de receita líquida, CPV e margem operacional sem interferência de dados simulados.</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">📝</div>
            <div class="feature-text">
              <h4>Emissão de Recibos A4 & Contratos</h4>
              <p>Geração automatizada de recibos em via dupla com assinatura digital e minutas contratuais completas.</p>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 style="color: #fbbf24; margin-bottom: 2mm;">Vertente Experiência & Fidelidade</h3>
          <div class="feature-item">
            <div class="feature-icon">📱</div>
            <div class="feature-text">
              <h4>Portal do Cliente Transparente</h4>
              <p>Área restrita por CPF onde o cliente monitora a evolução da sua obra em tempo real e abre chamados.</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">🎁</div>
            <div class="feature-text">
              <h4>Quark Points & Indique e Ganhe</h4>
              <p>Gamificação com resgate de limpezas de painéis, termografia e prêmios para cada indicação instalada.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="doc-footer">
      <div>QUARK ENERGIA & ENGENHARIA · ARQUITETURA DE SISTEMAS</div>
      <div class="doc-footer-right">PÁG. 02 / 11</div>
    </div>
  </div>

  <!-- ================= PAGE 3: DASHBOARD & CRM ================= -->
  <div class="page">
    <div class="page-content">
      <div class="doc-header">
        <div class="doc-header-left">
          <img src="/brand/logo-h-color.png" alt="Quark" class="doc-header-logo">
          <div class="doc-header-meta">
            <span class="doc-header-title">MÓDULO 01 · GESTÃO COMERCIAL</span>
            <span class="doc-header-sub">Dashboard Executivo & CRM Funnel com Inteligência Artificial</span>
          </div>
        </div>
        <div class="doc-header-badge">VISÃO GERAL & CRM</div>
      </div>

      <div style="margin-bottom: 3.5mm;">
        <h2>Cockpit de Comando Executivo & Funil de Oportunidades</h2>
        <p>Central de inteligência com dados unificados de vendas, margem de contribuição e rastreio completo do primeiro contato até o fechamento contratual.</p>
      </div>

      <!-- Screenshot 1: Dashboard -->
      <div class="browser-frame">
        <div class="browser-bar">
          <div class="browser-dots">
            <div class="browser-dot dot-red"></div>
            <div class="browser-dot dot-yellow"></div>
            <div class="browser-dot dot-green"></div>
          </div>
          <div class="browser-url">http://localhost:5174/ <span>(Dashboard Executivo)</span></div>
        </div>
        <img src="/docs_screenshots/01_dashboard.png" class="browser-img" style="height: 58mm;">
      </div>

      <!-- Screenshot 2: CRM -->
      <div class="browser-frame">
        <div class="browser-bar">
          <div class="browser-dots">
            <div class="browser-dot dot-red"></div>
            <div class="browser-dot dot-yellow"></div>
            <div class="browser-dot dot-green"></div>
          </div>
          <div class="browser-url">http://localhost:5174/crm <span>(Funil de Leads & Oportunidades)</span></div>
        </div>
        <img src="/docs_screenshots/02_crm.png" class="browser-img" style="height: 58mm;">
      </div>

      <div class="grid-2">
        <div class="card">
          <h3 style="color: #a3e635; margin-bottom: 1.5mm;">Destaques do Dashboard Executivo</h3>
          <p style="margin-bottom: 1.5mm;">Consolida métricas de faturamento em tempo real, evolução de receitas versus despesas e pendências operacionais.</p>
          <div style="font-size: 6.2pt; color: #cbd5e1;">
            • <strong>Relatório Executivo PDF:</strong> Emissão de dossiê analítico com 1 clique para sócios e diretoria.<br>
            • <strong>Atalhos Operacionais:</strong> Novo lead, proposta rápida e simulação solar acessíveis do topo.<br>
            • <strong>Alertas de Manutenção:</strong> Notificações dinâmicas sobre clientes que demandam revisão preventiva.
          </div>
        </div>

        <div class="card">
          <h3 style="color: #38bdf8; margin-bottom: 1.5mm;">Funil de Vendas Automatizado (CRM)</h3>
          <p style="margin-bottom: 1.5mm;">Estruturado em 7 estágios estratégicos alinhados à metodologia SPIN Selling com assistência de IA.</p>
          <div style="font-size: 6.2pt; color: #cbd5e1;">
            • <strong>7 Estágios:</strong> Novo Lead · Qualificação · Visita Técnica · Proposta · Negociação · Ganho · Perdido.<br>
            • <strong>Sincronização Automática:</strong> Lead Ganho é promovido instantaneamente para a carteira de clientes.<br>
            • <strong>Agente Gemini:</strong> Sugere argumentos persuasivos com base no consumo e perfil tarifário.
          </div>
        </div>
      </div>
    </div>
    <div class="doc-footer">
      <div>QUARK ENERGIA & ENGENHARIA · MÓDULO COMERCIAL</div>
      <div class="doc-footer-right">PÁG. 03 / 11</div>
    </div>
  </div>

  <!-- ================= PAGE 4: CALCULADORA & PROPOSTAS ================= -->
  <div class="page">
    <div class="page-content">
      <div class="doc-header">
        <div class="doc-header-left">
          <img src="/brand/logo-h-color.png" alt="Quark" class="doc-header-logo">
          <div class="doc-header-meta">
            <span class="doc-header-title">MÓDULO 02 · ENGENHARIA & ORÇAMENTAÇÃO</span>
            <span class="doc-header-sub">Motor Fotovoltaico de Dimensionamento & Central de Propostas</span>
          </div>
        </div>
        <div class="doc-header-badge">MOTOR SOLAR & PROPOSTAS</div>
      </div>

      <div style="margin-bottom: 3.5mm;">
        <h2>Dimensionamento Técnico Fotovoltaico & Propostas Digitais</h2>
        <p>Motor de cálculo calibrado com a irradiação solar de Alagoas (5.4 HSP) que transforma a conta de luz em um projeto executivo completo em menos de 30 segundos.</p>
      </div>

      <!-- Screenshot 1: Calculadora -->
      <div class="browser-frame">
        <div class="browser-bar">
          <div class="browser-dots">
            <div class="browser-dot dot-red"></div>
            <div class="browser-dot dot-yellow"></div>
            <div class="browser-dot dot-green"></div>
          </div>
          <div class="browser-url">http://localhost:5174/calculator <span>(Calculadora & Motor Solar)</span></div>
        </div>
        <img src="/docs_screenshots/04_calculadora.png" class="browser-img" style="height: 58mm;">
      </div>

      <!-- Screenshot 2: Propostas -->
      <div class="browser-frame">
        <div class="browser-bar">
          <div class="browser-dots">
            <div class="browser-dot dot-red"></div>
            <div class="browser-dot dot-yellow"></div>
            <div class="browser-dot dot-green"></div>
          </div>
          <div class="browser-url">http://localhost:5174/propostas <span>(Central de Propostas Solares)</span></div>
        </div>
        <img src="/docs_screenshots/03_propostas.png" class="browser-img" style="height: 58mm;">
      </div>

      <div class="grid-2">
        <div class="card">
          <h3 style="color: #a3e635; margin-bottom: 1.5mm;">Capacidades da Calculadora Solar</h3>
          <p style="margin-bottom: 1.5mm;">Dimensionamento de usinas residenciais, comerciais, industriais e rurais com precisão milimétrica.</p>
          <div style="font-size: 6.2pt; color: #cbd5e1;">
            • <strong>Cálculo Automático:</strong> Potência (kWp), número de módulos 550W+, inversor ideal e área de telhado (m²).<br>
            • <strong>Análise de Payback:</strong> Projeção de amortização em 2 a 3 anos e economia acumulada em 25 anos.<br>
            • <strong>Conexão Direta:</strong> Botão "SALVAR NO CRM" que cadastra a simulação como oportunidade qualificada.
          </div>
        </div>

        <div class="card">
          <h3 style="color: #38bdf8; margin-bottom: 1.5mm;">Propostas Comerciais Públicas</h3>
          <p style="margin-bottom: 1.5mm;">Links interativos exclusivos que aumentam a taxa de conversão comercial em mais de 30%.</p>
          <div style="font-size: 6.2pt; color: #cbd5e1;">
            • <strong>Link Público Exclusivo:</strong> Disponível em <code>/p/:token</code> para o cliente abrir no celular sem login.<br>
            • <strong>Transparência de Equipamentos:</strong> Lista marcas premium (Canadian, Deye, Growatt) e garantias.<br>
            • <strong>Tabela de Parcelamento:</strong> Simulação de financiamento bancário solar em até 84 parcelas.
          </div>
        </div>
      </div>
    </div>
    <div class="doc-footer">
      <div>QUARK ENERGIA & ENGENHARIA · MÓDULO DE ENGENHARIA</div>
      <div class="doc-footer-right">PÁG. 04 / 11</div>
    </div>
  </div>

  <!-- ================= PAGE 5: FOLLOW-UP & CLIENTES ================= -->
  <div class="page">
    <div class="page-content">
      <div class="doc-header">
        <div class="doc-header-left">
          <img src="/brand/logo-h-color.png" alt="Quark" class="doc-header-logo">
          <div class="doc-header-meta">
            <span class="doc-header-title">MÓDULO 03 · OPERAÇÕES DE CAMPO</span>
            <span class="doc-header-sub">Acompanhamento de Obras (Follow-up) & Catálogo de Clientes</span>
          </div>
        </div>
        <div class="doc-header-badge">OBRAS & CLIENTES</div>
      </div>

      <div style="margin-bottom: 3.5mm;">
        <h2>Esteira de Engenharia & Gestão Unificada de Carteira</h2>
        <p>Acompanhamento rigoroso das 5 etapas da instalação física e homologação, sincronizado em tempo real com a experiência do cliente e a equipe técnica.</p>
      </div>

      <!-- Screenshot 1: FollowUp -->
      <div class="browser-frame">
        <div class="browser-bar">
          <div class="browser-dots">
            <div class="browser-dot dot-red"></div>
            <div class="browser-dot dot-yellow"></div>
            <div class="browser-dot dot-green"></div>
          </div>
          <div class="browser-url">http://localhost:5174/follow-up <span>(Kanban de Obras & Engenharia)</span></div>
        </div>
        <img src="/docs_screenshots/05_followup.png" class="browser-img" style="height: 58mm;">
      </div>

      <!-- Screenshot 2: Clientes -->
      <div class="browser-frame">
        <div class="browser-bar">
          <div class="browser-dots">
            <div class="browser-dot dot-red"></div>
            <div class="browser-dot dot-yellow"></div>
            <div class="browser-dot dot-green"></div>
          </div>
          <div class="browser-url">http://localhost:5174/clientes <span>(Catálogo Unificado de Clientes)</span></div>
        </div>
        <img src="/docs_screenshots/06_clientes.png" class="browser-img" style="height: 58mm;">
      </div>

      <div class="grid-2">
        <div class="card">
          <h3 style="color: #a3e635; margin-bottom: 1.5mm;">As 5 Fases do Follow-Up de Obras</h3>
          <p style="margin-bottom: 1.5mm;">Esteira visual que impede gargalos operacionais e atrasos na ligação da usina.</p>
          <div style="font-size: 6.2pt; color: #cbd5e1;">
            • <strong>1. Dimensionamento:</strong> Elaboração do projeto elétrico, diagramas e emissão de ART.<br>
            • <strong>2. Compra do Kit & NF:</strong> Faturamento dos módulos e inversor junto ao distribuidor.<br>
            • <strong>3. Protocolo Equatorial:</strong> Entrada de solicitação de acesso e acompanhamento do parecer.<br>
            • <strong>4. Instalação & Montagem:</strong> Fixação das estruturas no telhado e testes de cabeamento CC/CA.<br>
            • <strong>5. Vistoria & Troca de Medidor:</strong> Aprovação na distribuidora e usina gerando créditos.
          </div>
        </div>

        <div class="card">
          <h3 style="color: #38bdf8; margin-bottom: 1.5mm;">Catálogo Central de Clientes</h3>
          <p style="margin-bottom: 1.5mm;">Repositório seguro com histórico de clientes, contratos e unidades consumidoras (UCs).</p>
          <div style="font-size: 6.2pt; color: #cbd5e1;">
            • <strong>Busca Instantânea:</strong> Localização por nome, CPF/CNPJ, cidade ou código de cliente.<br>
            • <strong>Drawer de Auditoria:</strong> Visualização lateral de histórico financeiro, telefone e potência instalada.<br>
            • <strong>Segurança & Soft Delete:</strong> Exclusão lógica com possibilidade de restauração imediata.<br>
            • <strong>Sincronização com o Portal:</strong> O cliente cadastrado recebe acesso direto por CPF.
          </div>
        </div>
      </div>
    </div>
    <div class="doc-footer">
      <div>QUARK ENERGIA & ENGENHARIA · MÓDULO OPERAÇÕES</div>
      <div class="doc-footer-right">PÁG. 05 / 11</div>
    </div>
  </div>

  <!-- ================= PAGE 6: FINANCEIRO & CONTRATOS ================= -->
  <div class="page">
    <div class="page-content">
      <div class="doc-header">
        <div class="doc-header-left">
          <img src="/brand/logo-h-color.png" alt="Quark" class="doc-header-logo">
          <div class="doc-header-meta">
            <span class="doc-header-title">MÓDULO 04 · CONTROLADORIA & JURÍDICO</span>
            <span class="doc-header-sub">Gestão Financeira, DRE Gerencial & Emissão de Documentos Legais</span>
          </div>
        </div>
        <div class="doc-header-badge">FINANCEIRO & CONTRATOS</div>
      </div>

      <div style="margin-bottom: 3.5mm;">
        <h2>Saúde Financeira da Empresa & Emissão de Documentos Oficiais</h2>
        <p>Demonstrativo de Resultado do Exercício (DRE) auditado, controle de recebimentos, emissão de contratos solares completos e recibos em via dupla com assinatura digital.</p>
      </div>

      <!-- Screenshot 1: Financeiro -->
      <div class="browser-frame">
        <div class="browser-bar">
          <div class="browser-dots">
            <div class="browser-dot dot-red"></div>
            <div class="browser-dot dot-yellow"></div>
            <div class="browser-dot dot-green"></div>
          </div>
          <div class="browser-url">http://localhost:5174/financeiro <span>(DRE & Fluxo de Caixa Auditado)</span></div>
        </div>
        <img src="/docs_screenshots/07_financeiro.png" class="browser-img" style="height: 58mm;">
      </div>

      <!-- Screenshot 2: Contratos -->
      <div class="browser-frame">
        <div class="browser-bar">
          <div class="browser-dots">
            <div class="browser-dot dot-red"></div>
            <div class="browser-dot dot-yellow"></div>
            <div class="browser-dot dot-green"></div>
          </div>
          <div class="browser-url">http://localhost:5174/contratos <span>(Central de Contratos Solares)</span></div>
        </div>
        <img src="/docs_screenshots/11_contratos.png" class="browser-img" style="height: 58mm;">
      </div>

      <div class="grid-2">
        <div class="card">
          <h3 style="color: #a3e635; margin-bottom: 1.5mm;">Controle Financeiro & DRE Real</h3>
          <p style="margin-bottom: 1.5mm;">Total transparência contábil sem dados simulados que poluem a tomada de decisão.</p>
          <div style="font-size: 6.2pt; color: #cbd5e1;">
            • <strong>DRE Gerencial Completo:</strong> Receita Bruta, Impostos, CPV (equipamentos e montagem), EBITDA e Lucro.<br>
            • <strong>Lançamento Rápido:</strong> Entrada de receitas e custos com categorização solar (inversores, cabos, ART).<br>
            • <strong>Filtros por Mês e Ano:</strong> Comparativo histórico e projeção de lucratividade acumulada.
          </div>
        </div>

        <div class="card">
          <h3 style="color: #38bdf8; margin-bottom: 1.5mm;">Central de Contratos & Recibos A4</h3>
          <p style="margin-bottom: 1.5mm;">Instrumentos jurídicos e fiscais prontos para impressão ou compartilhamento digital.</p>
          <div style="font-size: 6.2pt; color: #cbd5e1;">
            • <strong>Contrato Fotovoltaico:</strong> Minuta com cláusulas de garantia, prazos de entrega e forma de pagamento.<br>
            • <strong>Recibos A4 em Via Dupla:</strong> Layout executivo com assinatura oficial do Responsável Técnico.<br>
            • <strong>Ferramentas de Procuração:</strong> Preenchimento instantâneo da procuração exigida pela Equatorial.
          </div>
        </div>
      </div>
    </div>
    <div class="doc-footer">
      <div>QUARK ENERGIA & ENGENHARIA · MÓDULO CONTROLADORIA</div>
      <div class="doc-footer-right">PÁG. 06 / 11</div>
    </div>
  </div>

  <!-- ================= PAGE 7: RPA & PROSPECÇÃO ================= -->
  <div class="page">
    <div class="page-content">
      <div class="doc-header">
        <div class="doc-header-left">
          <img src="/brand/logo-h-color.png" alt="Quark" class="doc-header-logo">
          <div class="doc-header-meta">
            <span class="doc-header-title">MÓDULO 05 · AUTOMAÇÃO & INTELIGÊNCIA</span>
            <span class="doc-header-sub">QuarkBot RPA de Faturas da Distribuidora & Radar de Prospecção B2B</span>
          </div>
        </div>
        <div class="doc-header-badge">RPA & PROSPECÇÃO B2B</div>
      </div>

      <div style="margin-bottom: 3.5mm;">
        <h2>Automação Robótica de Processos (RPA) & Radar Comercial</h2>
        <p>Eliminação de tarefas manuais: o robô faz varreduras na distribuidora de energia para captura de faturas e o motor B2B localiza comércios com alta fatura para abordagem comercial.</p>
      </div>

      <!-- Screenshot 1: Utility Robot -->
      <div class="browser-frame">
        <div class="browser-bar">
          <div class="browser-dots">
            <div class="browser-dot dot-red"></div>
            <div class="browser-dot dot-yellow"></div>
            <div class="browser-dot dot-green"></div>
          </div>
          <div class="browser-url">http://localhost:5174/utility-robot <span>(QuarkBot RPA · Captura de Faturas)</span></div>
        </div>
        <img src="/docs_screenshots/08_utility_robot.png" class="browser-img" style="height: 58mm;">
      </div>

      <!-- Screenshot 2: Prospecção B2B -->
      <div class="browser-frame">
        <div class="browser-bar">
          <div class="browser-dots">
            <div class="browser-dot dot-red"></div>
            <div class="browser-dot dot-yellow"></div>
            <div class="browser-dot dot-green"></div>
          </div>
          <div class="browser-url">http://localhost:5174/prospeccao <span>(Radar de Prospecção B2B Solar)</span></div>
        </div>
        <img src="/docs_screenshots/12_prospeccao.png" class="browser-img" style="height: 58mm;">
      </div>

      <div class="grid-2">
        <div class="card">
          <h3 style="color: #a3e635; margin-bottom: 1.5mm;">QuarkBot RPA & Leitura OCR</h3>
          <p style="margin-bottom: 1.5mm;">Robô de automação conectado às concessionárias para alimentar a telemetria do sistema.</p>
          <div style="font-size: 6.2pt; color: #cbd5e1;">
            • <strong>Varredura Automática:</strong> Login com credenciais seguras na agência virtual da Equatorial.<br>
            • <strong>Download de Faturas em PDF:</strong> Captura mensal de contas sem intervenção do cliente.<br>
            • <strong>Extração OCR de Dados:</strong> Leitura de consumo (kWh), energia injetada, CIP e saldo de créditos.
          </div>
        </div>

        <div class="card">
          <h3 style="color: #38bdf8; margin-bottom: 1.5mm;">Motor de Prospecção B2B</h3>
          <p style="margin-bottom: 1.5mm;">Mapeamento geográfico de empresas de alto consumo em Maceió e região.</p>
          <div style="font-size: 6.2pt; color: #cbd5e1;">
            • <strong>Filtro por Segmentos:</strong> Padarias, supermercados, academias, clínicas, hotéis e oficinas.<br>
            • <strong>Dimensionamento Prévio:</strong> Estimativa de consumo médio mensal, área de telhado e economia.<br>
            • <strong>Exportação Direta:</strong> Envio imediato da empresa encontrada para o funil do CRM.
          </div>
        </div>
      </div>
    </div>
    <div class="doc-footer">
      <div>QUARK ENERGIA & ENGENHARIA · MÓDULO DE AUTOMAÇÃO</div>
      <div class="doc-footer-right">PÁG. 07 / 11</div>
    </div>
  </div>

  <!-- ================= PAGE 8: CRM INTELIGÊNCIA & BI ================= -->
  <div class="page">
    <div class="page-content">
      <div class="doc-header">
        <div class="doc-header-left">
          <img src="/brand/logo-h-color.png" alt="Quark" class="doc-header-logo">
          <div class="doc-header-meta">
            <span class="doc-header-title">MÓDULO 06 · INTELIGÊNCIA DE DADOS</span>
            <span class="doc-header-sub">CRM de Usinas Instaladas & Business Intelligence (BI) de Performance</span>
          </div>
        </div>
        <div class="doc-header-badge">CRM USINAS & BI</div>
      </div>

      <div style="margin-bottom: 3.5mm;">
        <h2>Monitoramento da Carteira Fotovoltaica & Business Intelligence</h2>
        <p>Acompanhamento contínuo da geração solar real de toda a carteira de clientes, identificação preditiva de usinas com queda de eficiência e métricas de CAC e LTV.</p>
      </div>

      <!-- Screenshot 1: CRM Inteligência -->
      <div class="browser-frame">
        <div class="browser-bar">
          <div class="browser-dots">
            <div class="browser-dot dot-red"></div>
            <div class="browser-dot dot-yellow"></div>
            <div class="browser-dot dot-green"></div>
          </div>
          <div class="browser-url">http://localhost:5174/intelligence <span>(CRM de Inteligência Fotovoltaica)</span></div>
        </div>
        <img src="/docs_screenshots/10_intelligence.png" class="browser-img" style="height: 58mm;">
      </div>

      <!-- Screenshot 2: Reports BI -->
      <div class="browser-frame">
        <div class="browser-bar">
          <div class="browser-dots">
            <div class="browser-dot dot-red"></div>
            <div class="browser-dot dot-yellow"></div>
            <div class="browser-dot dot-green"></div>
          </div>
          <div class="browser-url">http://localhost:5174/reports <span>(Business Intelligence & Análise de CAC/LTV)</span></div>
        </div>
        <img src="/docs_screenshots/09_reports.png" class="browser-img" style="height: 58mm;">
      </div>

      <div class="grid-2">
        <div class="card">
          <h3 style="color: #a3e635; margin-bottom: 1.5mm;">CRM de Usinas em Operação</h3>
          <p style="margin-bottom: 1.5mm;">Garante o pós-venda técnico e a geração esperada em contrato para todos os clientes.</p>
          <div style="font-size: 6.2pt; color: #cbd5e1;">
            • <strong>65 Usinas Monitoradas:</strong> Total de 74.427 kWh/mês e R$ 1,39 milhão em economia real calculada.<br>
            • <strong>Alertas Preventivos (> 6 meses):</strong> Sinalização automática de módulos que necessitam lavagem técnica.<br>
            • <strong>Histórico de Manutenções:</strong> Registro de visitas de reaperto, calibração e imagens termográficas.
          </div>
        </div>

        <div class="card">
          <h3 style="color: #38bdf8; margin-bottom: 1.5mm;">Métricas de Business Intelligence</h3>
          <p style="margin-bottom: 1.5mm;">Indicadores avançados para tomada de decisão estratégica de marketing e expansão.</p>
          <div style="font-size: 6.2pt; color: #cbd5e1;">
            • <strong>LTV Médio de R$ 30.733:</strong> Valor médio real gerado por cliente contratado na Quark.<br>
            • <strong>Canais de Aquisição:</strong> Mapeamento de origem (Indicações, Google Ads, Prospecção Ativa).<br>
            • <strong>Exportação CSV:</strong> Download instantâneo de dados operacionais e financeiros em planilha.
          </div>
        </div>
      </div>
    </div>
    <div class="doc-footer">
      <div>QUARK ENERGIA & ENGENHARIA · MÓDULO INTELIGÊNCIA</div>
      <div class="doc-footer-right">PÁG. 08 / 11</div>
    </div>
  </div>

  <!-- ================= PAGE 9: PORTAL DO CLIENTE ================= -->
  <div class="page">
    <div class="page-content">
      <div class="doc-header">
        <div class="doc-header-left">
          <img src="/brand/logo-h-color.png" alt="Quark" class="doc-header-logo">
          <div class="doc-header-meta">
            <span class="doc-header-title">MÓDULO 07 · EXPERIÊNCIA DO CONSUMIDOR</span>
            <span class="doc-header-sub">Portal do Cliente & Acompanhamento de Obra em Tempo Real</span>
          </div>
        </div>
        <div class="doc-header-badge">PORTAL DO CLIENTE</div>
      </div>

      <div style="margin-bottom: 3.5mm;">
        <h2>A Experiência do Cliente: Transparência e Empoderamento</h2>
        <p>Área restrita de alta fidelidade onde o cliente acompanha sua usina, a evolução da obra em tempo real, economia estimada, faturas e suporte direto via tickets integrados.</p>
      </div>

      <!-- Screenshot 1: Portal Dashboard -->
      <div class="browser-frame">
        <div class="browser-bar">
          <div class="browser-dots">
            <div class="browser-dot dot-red"></div>
            <div class="browser-dot dot-yellow"></div>
            <div class="browser-dot dot-green"></div>
          </div>
          <div class="browser-url">http://localhost:5174/portal <span>(Portal do Cliente · Visão Geral)</span></div>
        </div>
        <img src="/docs_screenshots/13_portal_dashboard.png" class="browser-img" style="height: 58mm;">
      </div>

      <!-- Screenshot 2: Portal Tracking -->
      <div class="browser-frame">
        <div class="browser-bar">
          <div class="browser-dots">
            <div class="browser-dot dot-red"></div>
            <div class="browser-dot dot-yellow"></div>
            <div class="browser-dot dot-green"></div>
          </div>
          <div class="browser-url">http://localhost:5174/portal/tracking <span>(Linha do Tempo da Obra)</span></div>
        </div>
        <img src="/docs_screenshots/14_portal_tracking.png" class="browser-img" style="height: 58mm;">
      </div>

      <div class="grid-2">
        <div class="card">
          <h3 style="color: #a3e635; margin-bottom: 1.5mm;">Dashboard Personalizado do Cliente</h3>
          <p style="margin-bottom: 1.5mm;">Interface clara que exibe a realidade técnica da usina de cada cliente cadastrado.</p>
          <div style="font-size: 6.2pt; color: #cbd5e1;">
            • <strong>Exemplo Real:</strong> Cliente <em>Luiz Flexeiras</em> visualizando sua usina de 3.72 kWp.<br>
            • <strong>Status da Obra:</strong> Mostra exatamente <em>"Compra do Kit & Emissão de NF (38% Concluído)"</em>.<br>
            • <strong>Economia Projetada:</strong> Aponta estimativa de economia anual de ~R$ 5.188,80.<br>
            • <strong>Acesso Simplificado:</strong> Login com CPF/CNPJ e senha dos 6 primeiros dígitos.
          </div>
        </div>

        <div class="card">
          <h3 style="color: #38bdf8; margin-bottom: 1.5mm;">Tracking Transparente da Obra</h3>
          <p style="margin-bottom: 1.5mm;">Elimina a ansiedade do cliente informando o avanço de cada uma das 9 etapas.</p>
          <div style="font-size: 6.2pt; color: #cbd5e1;">
            • <strong>Barra de Progresso (0 a 100%):</strong> Calculada dinamicamente conforme o engenheiro atualiza.<br>
            • <strong>Etapas Cumpridas:</strong> Contrato assinado (100%) e Dimensionamento concluído (100%).<br>
            • <strong>Etapa Atual:</strong> Compra de equipamentos com status "Em andamento".<br>
            • <strong>Próximas Fases:</strong> Parecer na Equatorial, entrega, fixação e vistoria final.
          </div>
        </div>
      </div>
    </div>
    <div class="doc-footer">
      <div>QUARK ENERGIA & ENGENHARIA · PORTAL DO CLIENTE</div>
      <div class="doc-footer-right">PÁG. 09 / 11</div>
    </div>
  </div>

  <!-- ================= PAGE 10: QUARK POINTS ================= -->
  <div class="page">
    <div class="page-content">
      <div class="doc-header">
        <div class="doc-header-left">
          <img src="/brand/logo-h-color.png" alt="Quark" class="doc-header-logo">
          <div class="doc-header-meta">
            <span class="doc-header-title">MÓDULO 08 · FIDELIDADE & GAMIFICAÇÃO</span>
            <span class="doc-header-sub">Programa Quark Points, Indique e Ganhe & Central de Chamados</span>
          </div>
        </div>
        <div class="doc-header-badge">QUARK POINTS & SUPORTE</div>
      </div>

      <div style="margin-bottom: 3.5mm;">
        <h2>Programa de Fidelidade Solar & Resgate de Benefícios</h2>
        <p>Motor de crescimento orgânico: clientes indicam amigos e ganham pontos para trocar por serviços técnicos reais, manutenções periódicas e kits exclusivos da marca.</p>
      </div>

      <!-- Screenshot 1: Portal Shop -->
      <div class="browser-frame">
        <div class="browser-bar">
          <div class="browser-dots">
            <div class="browser-dot dot-red"></div>
            <div class="browser-dot dot-yellow"></div>
            <div class="browser-dot dot-green"></div>
          </div>
          <div class="browser-url">http://localhost:5174/portal/shop <span>(Loja Quark Points & Indicação)</span></div>
        </div>
        <img src="/docs_screenshots/15_portal_shop.png" class="browser-img" style="height: 58mm;">
      </div>

      <!-- Screenshot 2: Portal Tickets -->
      <div class="browser-frame">
        <div class="browser-bar">
          <div class="browser-dots">
            <div class="browser-dot dot-red"></div>
            <div class="browser-dot dot-yellow"></div>
            <div class="browser-dot dot-green"></div>
          </div>
          <div class="browser-url">http://localhost:5174/portal/tickets <span>(Central de Chamados Técnicos)</span></div>
        </div>
        <img src="/docs_screenshots/16_portal_tickets.png" class="browser-img" style="height: 58mm;">
      </div>

      <div class="grid-2">
        <div class="card">
          <h3 style="color: #a3e635; margin-bottom: 1.5mm;">Sistema Indique & Ganhe</h3>
          <p style="margin-bottom: 1.5mm;">Mecanismo viral que transforma clientes satisfeitos em promotores ativos de vendas.</p>
          <div style="font-size: 6.2pt; color: #cbd5e1;">
            • <strong>Código Exclusivo:</strong> Cada cliente possui seu código (ex: <code>QUARK-C01260</code>).<br>
            • <strong>Recompensa de +1.000 Pontos:</strong> Creditados quando o projeto indicado é instalado.<br>
            • <strong>Catálogo de Recompensas:</strong> Limpeza de painéis (500 pts), desconto de R$ 100 (300 pts), termografia FLIR (800 pts) e manutenção preventiva (1.000 pts).
          </div>
        </div>

        <div class="card">
          <h3 style="color: #38bdf8; margin-bottom: 1.5mm;">Suporte Direto via Chamados</h3>
          <p style="margin-bottom: 1.5mm;">Canal formal de atendimento que garante resolução rápida de pendências.</p>
          <div style="font-size: 6.2pt; color: #cbd5e1;">
            • <strong>Abertura Ágil:</strong> Categorização por Inversor, Limpeza, Fatura ou Vistoria.<br>
            • <strong>Sincronização com o Painel Admin:</strong> O chamado aberto pelo cliente aparece instantaneamente na Central de Tickets interna.<br>
            • <strong>Integração WhatsApp:</strong> Notificações automáticas quando o chamado é respondido.
          </div>
        </div>
      </div>
    </div>
    <div class="doc-footer">
      <div>QUARK ENERGIA & ENGENHARIA · MÓDULO FIDELIDADE</div>
      <div class="doc-footer-right">PÁG. 10 / 11</div>
    </div>
  </div>

  <!-- ================= PAGE 11: GOVERNANÇA & CONCLUSÃO ================= -->
  <div class="page">
    <div class="page-content">
      <div class="doc-header">
        <div class="doc-header-left">
          <img src="/brand/logo-h-color.png" alt="Quark" class="doc-header-logo">
          <div class="doc-header-meta">
            <span class="doc-header-title">GOVERNANÇA & HOMOLOGAÇÃO</span>
            <span class="doc-header-sub">Conformidade Técnica, Segurança e Conclusão Executiva</span>
          </div>
        </div>
        <div class="doc-header-badge">HOMOLOGAÇÃO TÉCNICA</div>
      </div>

      <div style="margin-bottom: 3.5mm;">
        <h2>Maturidade Tecnológica & Termo de Conclusão</h2>
        <p>Auditoria de conformidade com os mais rigorosos padrões da indústria de software corporativo e segurança em nuvem.</p>
      </div>

      <div class="card" style="margin-bottom: 3.5mm; background: #0c0c10; padding: 3.5mm;">
        <h3 style="font-size: 8.5pt; color: #84cc16; margin-bottom: 2mm;">MATRIZ DE CONFORMIDADE E SEGURANÇA</h3>
        <table style="width: 100%; font-size: 6.2pt; color: #cbd5e1; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); text-align: left;">
              <th style="padding: 1.2mm 2mm; color: #94a3b8;">Requisito de Engenharia</th>
              <th style="padding: 1.2mm 2mm; color: #94a3b8;">Implementação Quark OS</th>
              <th style="padding: 1.2mm 2mm; color: #94a3b8;">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
              <td style="padding: 1.5mm 2mm; font-weight: 700;">Segurança de Dados Multi-Tenant</td>
              <td style="padding: 1.5mm 2mm;">Políticas Row Level Security (RLS) ativas em todas as 18 tabelas PostgreSQL</td>
              <td style="padding: 1.5mm 2mm;"><span class="pill pill-lime">100% SEGURO</span></td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
              <td style="padding: 1.5mm 2mm; font-weight: 700;">Confiabilidade Offline & Resiliência</td>
              <td style="padding: 1.5mm 2mm;">Cache local inteligente em caso de perda de sinal 4G em visitas de campo</td>
              <td style="padding: 1.5mm 2mm;"><span class="pill pill-lime">RESILIENTE</span></td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
              <td style="padding: 1.5mm 2mm; font-weight: 700;">Tipagem Estrita & Qualidade de Código</td>
              <td style="padding: 1.5mm 2mm;">TypeScript strict com zero erros de compilação em 3.268 módulos</td>
              <td style="padding: 1.5mm 2mm;"><span class="pill pill-cyan">0 ERROS</span></td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
              <td style="padding: 1.5mm 2mm; font-weight: 700;">Inteligência Artificial Generativa</td>
              <td style="padding: 1.5mm 2mm;">Google Gemini 2.5 Flash integrado para SPIN selling e respostas de suporte</td>
              <td style="padding: 1.5mm 2mm;"><span class="pill pill-purple">ATIVO</span></td>
            </tr>
            <tr>
              <td style="padding: 1.5mm 2mm; font-weight: 700;">Automação Robótica (RPA)</td>
              <td style="padding: 1.5mm 2mm;">QuarkBot RPA com download e OCR de faturas da concessionária Equatorial</td>
              <td style="padding: 1.5mm 2mm;"><span class="pill pill-amber">OPERACIONAL</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card card-glow-lime" style="margin-bottom: 4mm; padding: 3.5mm;">
        <h3 style="font-size: 8.5pt; color: #a3e635; margin-bottom: 1.5mm;">Comparativo de Impacto Operacional</h3>
        <div class="grid-2" style="font-size: 6.2pt; color: #cbd5e1;">
          <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 4px; padding: 2mm 2.5mm;">
            <div style="font-weight: 700; color: #f87171; margin-bottom: 1mm;">ANTES DO QUARK OS (FLUXOS MANUAIS):</div>
            • Orçamentos demoravam horas em planilhas Excel sujeitas a erro.<br>
            • Faturas dos clientes precisavam ser baixadas uma a uma manualmente.<br>
            • Cliente ligava constantemente sem saber em que etapa a obra estava.<br>
            • DRE e fluxo de caixa contaminados com dados imprecisos.
          </div>
          <div style="background: rgba(132, 204, 22, 0.08); border: 1px solid rgba(132, 204, 22, 0.2); border-radius: 4px; padding: 2mm 2.5mm;">
            <div style="font-weight: 700; color: #a3e635; margin-bottom: 1mm;">COM O QUARK OS (SISTEMA UNIFICADO):</div>
            • Dimensionamento e proposta pública gerados em menos de 30s.<br>
            • Robô RPA baixa e lê faturas da Equatorial automaticamente.<br>
            • Cliente acompanha a obra pelo celular com transparência total.<br>
            • DRE contábil 100% auditado com controle real de lucratividade.
          </div>
        </div>
      </div>

      <!-- Bloco de Conclusão e Assinatura -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 2mm; border-top: 1px solid rgba(255,255,255,0.08);">
        <div>
          <h3 style="font-size: 8.5pt; color: #ffffff; margin-bottom: 1mm;">Termo de Homologação e Entrega</h3>
          <p style="max-width: 110mm; font-size: 6.5pt; line-height: 1.4;">
            Atestamos que todas as funcionalidades descritas neste documento foram auditadas, testadas via Playwright MCP de ponta a ponta e encontram-se 100% operacionais na infraestrutura do <strong>Quark SaaS Enterprise</strong>.
          </p>
        </div>
        <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
          <img src="/brand/assinatura.png" alt="Assinatura" style="height: 11mm; object-fit: contain; margin-bottom: 1mm;">
          <div style="font-size: 6.8pt; font-weight: 700; color: #ffffff;">Arthur Duda de Moraes</div>
          <div style="font-size: 5.8pt; color: #84cc16;">Quark Engenharia & Energia</div>
          <div style="font-size: 5.2pt; color: #64748b; font-family: 'JetBrains Mono', monospace;">CREA/AL · Responsável Técnico</div>
        </div>
      </div>
    </div>
    <div class="doc-footer">
      <div>QUARK ENERGIA & ENGENHARIA · TERMO FINAL DE HOMOLOGAÇÃO</div>
      <div class="doc-footer-right">PÁG. 11 / 11</div>
    </div>
  </div>

</body>
</html>
`;

fs.writeFileSync(path.resolve('public/dossie_quark_saas.html'), htmlContent, 'utf-8');
console.log('✅ public/dossie_quark_saas.html gerado com sucesso!');
