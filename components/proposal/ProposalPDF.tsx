// ============================================================
// PROPOSAL ENGINE — DOCUMENTO PDF (react-pdf/renderer)
// Fase 3: Exportação profissional em A4
// ============================================================
import React from 'react';
import {
  Document, Page, View, Text, Image, StyleSheet, Font,
} from '@react-pdf/renderer';
import {
  ProposalBlock, ProposalTheme,
  CoverContent, SocialProofContent, TechSpecsContent, FinancialContent, TextContent,
} from './types';

// ── Registro de fontes ──────────────────────────────────────
// Usando fontes built-in padrão PDF (Helvetica) via hyphenationCallback
// para máxima compatibilidade sem dependência de rede.
// Fallback adicional: Inter via GitHub/jsDelivr (URLs confiáveis)
Font.register({
  family: 'Inter',
  fonts: [
    {
      src: 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-400-normal.woff',
      fontWeight: 400,
    },
    {
      src: 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-700-normal.woff',
      fontWeight: 700,
    },
    {
      src: 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-800-normal.woff',
      fontWeight: 800,
    },
  ],
});

// Desabilita hifenização automática para evitar quebras inesperadas
Font.registerHyphenationCallback((word) => [word]);

// ── Funções auxiliares ──────────────────────────────────────
function fmtCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

// ── StyleSheet ─────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    backgroundColor: '#ffffff',
    paddingTop: 0,
    paddingBottom: 0,
  },
  // ── Cover ──
  coverBg: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  coverOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#0d1a2e',
    opacity: 0.88,
  },
  coverContent: {
    padding: 52,
    minHeight: 400,
  },
  coverBadge: {
    fontSize: 8, fontWeight: 700, color: '#c4a050',
    borderColor: '#c4a050', borderWidth: 1, borderStyle: 'solid',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  coverH1: {
    fontSize: 52, fontWeight: 800, color: '#ffffff',
    lineHeight: 1, letterSpacing: -1.5, marginTop: 32,
  },
  coverAccent: { color: '#c4a050' },
  coverTagline: {
    fontSize: 10, color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2, textTransform: 'uppercase', marginTop: 10,
  },
  coverClientLabel: {
    fontSize: 8, fontWeight: 700, color: '#c4a050',
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6, marginTop: 32,
  },
  coverClientName: {
    fontSize: 32, fontWeight: 800, color: '#ffffff', letterSpacing: -0.5,
  },
  coverMeta: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
  kpiRow: { flexDirection: 'row', gap: 12, marginTop: 28 },
  kpiCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12, padding: 16,
    borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
  },
  kpiLabel: { fontSize: 8, color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  kpiValue: { fontSize: 18, fontWeight: 800, color: '#c4a050' },
  coverFooter: {
    paddingHorizontal: 52, paddingVertical: 14,
    borderTopColor: 'rgba(255,255,255,0.07)', borderTopWidth: 1,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  coverFooterText: { fontSize: 9, color: 'rgba(255,255,255,0.3)' },

  // ── Section comum ──
  section: { padding: '40 48' },
  sectionLabel: { fontSize: 8, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  sectionH2: { fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: -0.5, marginBottom: 10 },
  sectionSubtitle: { fontSize: 11, color: '#64748b', lineHeight: 1.6, marginBottom: 24 },

  // ── TechSpecs ──
  kpiGrid3: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  kpiBox: { flex: 1, borderRadius: 10, padding: 16 },
  kpiBoxValue: { fontSize: 18, fontWeight: 800, marginBottom: 4 },
  kpiBoxLabel: { fontSize: 8, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#94a3b8' },
  table: { borderRadius: 10, borderColor: '#e8edf5', borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: '10 16', backgroundColor: '#f8fafc', borderBottomColor: '#e8edf5', borderBottomWidth: 1 },
  tableHeaderText: { fontSize: 8, fontWeight: 700, color: '#94a3b8', letterSpacing: 1.5, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '12 16', borderBottomColor: '#f1f5f9', borderBottomWidth: 1 },
  tableRowLabel: { fontSize: 11, color: '#334155' },
  tableRowValue: { fontSize: 12, fontWeight: 700, color: '#0f172a' },
  darkBanner: { backgroundColor: '#0f172a', borderRadius: 12, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  darkBannerLabel: { fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  darkBannerSub: { fontSize: 10, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 },
  darkBannerBadge: { borderRadius: 8, padding: '10 16', alignItems: 'center' },

  // ── Financial ──
  kpiFinancialGrid: { flexDirection: 'row', borderColor: '#e8edf5', borderWidth: 1, borderRadius: 12, overflow: 'hidden', marginBottom: 20 },
  kpiFinancialCell: { flex: 1, padding: 20, borderRightColor: '#e8edf5', borderRightWidth: 1 },
  kpiFinancialLabel: { fontSize: 8, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 8 },
  kpiFinancialValue: { fontSize: 30, fontWeight: 800, lineHeight: 1 },
  kpiFinancialUnit: { fontSize: 13, fontWeight: 700, opacity: 0.7 },
  kpiFinancialSub: { fontSize: 9, color: '#94a3b8', marginTop: 4 },
  iOSPanel: {
    backgroundColor: '#f8fafc', borderColor: '#e8edf5', borderWidth: 1, borderRadius: 14,
    padding: '16 20', flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20,
  },
  iOSPanelTitle: { fontSize: 11, fontWeight: 700, color: '#0f172a', marginBottom: 2 },
  iOSPanelSub: { fontSize: 10, color: '#64748b' },
  iOSPanelValue: { fontSize: 22, fontWeight: 800, color: '#0f172a' },
  investmentPanel: {
    backgroundColor: '#0f172a', borderRadius: 16, padding: '32 36',
    alignItems: 'center', marginTop: 8,
  },
  investmentLabel: { fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 },
  investmentValue: { fontSize: 44, fontWeight: 800, color: '#ffffff', letterSpacing: -1.5, lineHeight: 1, marginBottom: 18 },
  investmentOptions: { flexDirection: 'row', gap: 12 },
  investmentOption: { borderRadius: 10, padding: '12 20', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  investmentOptionLabel: { fontSize: 8, color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  investmentOptionValue: { fontSize: 16, fontWeight: 800 },

  // ── SocialProof ──
  heroImage: { width: '100%', height: 200 },
  metricsRow: { flexDirection: 'row' },
  metricCell: { flex: 1, padding: '20 24', alignItems: 'center' },
  metricValue: { fontSize: 22, fontWeight: 800, lineHeight: 1, marginBottom: 4 },
  metricLabel: { fontSize: 8, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#94a3b8' },

  // ── Text ──
  textBlock: { padding: '28 48', fontSize: 12, color: '#334155', lineHeight: 1.8 },
});

// ─────────────────────────────────────────────────────────────
// Renderizadores por tipo de bloco
// ─────────────────────────────────────────────────────────────

// URL de imagem estável para PDF (suporta CORS, sem rate-limit)
const SOLAR_BG_URL = 'https://images.unsplash.com/photo-1509391366360-1e97b524c5bb?w=1600&q=80&fm=jpg&crop=entropy&cs=tinysrgb';

function PDFCover({ content, theme }: { content: CoverContent; theme: ProposalTheme }) {
  const c = content;
  const primary = theme.primaryColor;
  return (
    <View style={{ position: 'relative', minHeight: 600 }}>
      {/* Foto de fundo — usamos URL com parâmetros CORS-safe */}
      <Image
        style={styles.coverBg}
        src={SOLAR_BG_URL}
        cache={false}
      />
      {/* Overlay escuro */}
      <View style={[styles.coverOverlay, { backgroundColor: theme.secondaryColor, opacity: 0.9 }]} />
      {/* Conteúdo */}
      <View style={styles.coverContent}>
        {/* Logo / Nome */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          {theme.logoUrl ? (
            <Image src={theme.logoUrl} style={{ height: 36, maxWidth: 140 }} />
          ) : (
            <Text style={{ fontSize: 12, fontWeight: 700, color: '#ffffff' }}>Quark Tecnologia em Energia</Text>
          )}
          <Text style={[styles.coverBadge, { color: primary, borderColor: primary }]}>Exclusivo</Text>
        </View>

        {/* Headline */}
        <Text style={[styles.coverH1, { marginTop: 28 }]}>
          Projeto{'\n'}<Text style={{ color: primary }}>Solar.</Text>
        </Text>
        <Text style={styles.coverTagline}>{c.tagline}</Text>

        {/* Barra esquerda + dados cliente */}
        <View style={{ borderLeftColor: primary, borderLeftWidth: 3, paddingLeft: 20, marginTop: 28 }}>
          <Text style={[styles.coverClientLabel, { color: primary }]}>Preparado Exclusivamente Para</Text>
          <Text style={styles.coverClientName}>{c.clientName}</Text>
          <Text style={styles.coverMeta}>{c.city}  ·  {c.date}</Text>
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Potência do Sistema</Text>
            <Text style={[styles.kpiValue, { color: primary }]}>{c.systemSizeKw?.toFixed(2) ?? '0'} kWp</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Investimento Total</Text>
            <Text style={[styles.kpiValue, { color: primary }]}>{fmtCurrency(c.finalPrice ?? 0)}</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.coverFooter}>
        <Text style={styles.coverFooterText}>Quark Energia · quarkenergia.com.br</Text>
        <Text style={styles.coverFooterText}>Válido por 30 dias · {c.date}</Text>
      </View>
    </View>
  );
}

function PDFSocialProof({ content, theme }: { content: SocialProofContent; theme: ProposalTheme }) {
  const c = content;
  const primary = theme.primaryColor;
  const [featured, ...rest] = c.images.filter((i) => i.url);
  return (
    <View>
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: primary }]}>Prova Social</Text>
        <Text style={styles.sectionH2}>{c.headline}</Text>
        <Text style={styles.sectionSubtitle}>{c.subheadline}</Text>
      </View>
      {featured && <Image src={featured.url} style={styles.heroImage} />}
      {rest.length > 0 && (
        <View style={{ flexDirection: 'row', marginTop: 4 }}>
          {rest.map((img) => (
            <Image key={img.id} src={img.url} style={{ flex: 1, height: 140 }} />
          ))}
        </View>
      )}
      {/* Métricas */}
      <View style={[styles.metricsRow, { borderTopColor: '#f1f5f9', borderTopWidth: 1, marginTop: 4 }]}>
        {[
          { value: '+500', label: 'Projetos Entregues' },
          { value: '100%', label: 'Dentro do Prazo' },
          { value: '25 anos', label: 'Garantia Inclusa' },
        ].map(({ value, label }, i) => (
          <View key={label} style={[styles.metricCell, i < 2 ? { borderRightColor: '#f1f5f9', borderRightWidth: 1 } : {}]}>
            <Text style={[styles.metricValue, { color: primary }]}>{value}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PDFTechSpecs({ content, theme }: { content: TechSpecsContent; theme: ProposalTheme }) {
  const c = content;
  const primary = theme.primaryColor;
  const totalPower = (c.modulesCount * c.modulePower) / 1000;
  const rows = [
    { label: `Módulos — ${c.moduleBrand}`, value: `${c.modulesCount} × ${c.modulePower}W`, accent: primary },
    { label: `Inversores — ${c.inverterBrand}`, value: `${c.inverterCount} × ${c.inverterPower} kW`, accent: undefined },
    { label: 'Potência Total Instalada', value: `${totalPower.toFixed(2)} kWp`, accent: '#3b82f6' },
    { label: 'Produção Estimada Mensal', value: `${Math.round(c.consumption * 1.05)} kWh`, accent: undefined },
    { label: 'Área de Telhado Necessária', value: `${c.roofArea} m²`, accent: undefined },
    { label: 'Garantia de Performance', value: '25 anos', accent: '#10b981' },
  ];
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: primary }]}>Engenharia do Sistema</Text>
      <Text style={styles.sectionH2}>Ficha Técnica</Text>
      <Text style={styles.sectionSubtitle}>Sistema dimensionado para o perfil de consumo. Equipamentos Tier 1 com garantia de fábrica.</Text>

      {/* 3 KPIs */}
      <View style={styles.kpiGrid3}>
        {[
          { label: 'Potência Total', value: `${totalPower.toFixed(2)} kWp`, color: primary },
          { label: 'Consumo de Referência', value: `${c.consumption} kWh/mês`, color: '#3b82f6' },
          { label: 'Área Necessária', value: `${c.roofArea} m²`, color: '#10b981' },
        ].map(({ label, value, color }) => (
          <View key={label} style={[styles.kpiBox, { backgroundColor: `${color}0d`, borderColor: `${color}25`, borderWidth: 1 }]}>
            <Text style={[styles.kpiBoxValue, { color }]}>{value}</Text>
            <Text style={styles.kpiBoxLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Tabela */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderText}>Componente</Text>
          <Text style={styles.tableHeaderText}>Especificação</Text>
        </View>
        {rows.map(({ label, value, accent }, i) => (
          <View key={label} style={[styles.tableRow, i === rows.length - 1 ? { borderBottomWidth: 0 } : {}]}>
            <Text style={styles.tableRowLabel}>{label}</Text>
            <Text style={[styles.tableRowValue, accent ? { color: accent } : {}]}>{value}</Text>
          </View>
        ))}
      </View>

      {/* Banner dark */}
      <View style={styles.darkBanner}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.darkBannerLabel, { color: primary }]}>Escopo Turn-Key Completo</Text>
          <Text style={styles.darkBannerSub}>Projeto executivo · Homologação ANEEL · Instalação · Comissionamento · Suporte 24/7</Text>
        </View>
        <View style={[styles.darkBannerBadge, { backgroundColor: `${primary}20`, borderColor: `${primary}35`, borderWidth: 1 }]}>
          <Text style={{ fontSize: 8, color: primary, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Tudo</Text>
          <Text style={{ fontSize: 18, fontWeight: 800, color: primary }}>Incluso</Text>
        </View>
      </View>
    </View>
  );
}

function PDFFinancial({ content, theme }: { content: FinancialContent; theme: ProposalTheme }) {
  const c = content;
  const primary = theme.primaryColor;

  // Calcular payback e economia
  let cumulativeSavings = 0;
  let paybackYear = c.systemLifeYears;
  let cumulativeCost = -c.finalPrice;
  for (let year = 1; year <= c.systemLifeYears; year++) {
    const annualSavings = c.monthlyBill * Math.pow(1 + c.tariffAdjustmentRate / 100, year - 1) * 12;
    cumulativeSavings += annualSavings;
    cumulativeCost += annualSavings;
    if (cumulativeCost >= 0 && paybackYear === c.systemLifeYears) paybackYear = year;
  }
  const roi = c.finalPrice > 0 ? ((cumulativeSavings / c.finalPrice - 1) * 100) : 0;

  return (
    <View>
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: primary }]}>Análise de Investimento</Text>
        <Text style={styles.sectionH2}>Retorno sobre o Investimento</Text>
        <Text style={styles.sectionSubtitle}>Projeção baseada no consumo histórico e reajuste tarifário ANEEL.</Text>

        {/* KPIs gigantes */}
        <View style={styles.kpiFinancialGrid}>
          <View style={[styles.kpiFinancialCell, { backgroundColor: `${primary}06` }]}>
            <Text style={styles.kpiFinancialLabel}>Payback</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
              <Text style={[styles.kpiFinancialValue, { color: primary }]}>{paybackYear}</Text>
              <Text style={[styles.kpiFinancialUnit, { color: primary }]}>anos</Text>
            </View>
            <Text style={styles.kpiFinancialSub}>Retorno do capital</Text>
          </View>
          <View style={styles.kpiFinancialCell}>
            <Text style={styles.kpiFinancialLabel}>Economia em {c.systemLifeYears} Anos</Text>
            <Text style={[styles.kpiFinancialValue, { color: '#10b981', fontSize: 20 }]}>{fmtCurrency(cumulativeSavings)}</Text>
            <Text style={styles.kpiFinancialSub}>Economia acumulada projetada</Text>
          </View>
          <View style={[styles.kpiFinancialCell, { borderRightWidth: 0 }]}>
            <Text style={styles.kpiFinancialLabel}>ROI Total</Text>
            <Text style={[styles.kpiFinancialValue, { color: '#6366f1' }]}>{roi.toFixed(0)}%</Text>
            <Text style={styles.kpiFinancialSub}>Sobre o investimento</Text>
          </View>
        </View>

        {/* Painel de reajuste iOS-style */}
        <View style={styles.iOSPanel}>
          <View style={{ flex: 1 }}>
            <Text style={styles.iOSPanelTitle}>Taxa de Reajuste Tarifário</Text>
            <Text style={styles.iOSPanelSub}>Média histórica ANEEL: 7% a.a.</Text>
          </View>
          <Text style={styles.iOSPanelValue}>{c.tariffAdjustmentRate}%</Text>
        </View>

        {/* Painel de investimento final */}
        <View style={styles.investmentPanel}>
          <Text style={[styles.investmentLabel, { color: primary }]}>Aporte Financeiro Total (Turn-Key)</Text>
          <Text style={styles.investmentValue}>{fmtCurrency(c.finalPrice)}</Text>
          <View style={styles.investmentOptions}>
            {[
              { label: 'À Vista (−5%)', value: fmtCurrency(c.finalPrice * 0.95) },
              { label: `${c.installmentCount}× de`, value: fmtCurrency(c.finalPrice / c.installmentCount) },
            ].map(({ label, value }) => (
              <View key={label} style={styles.investmentOption}>
                <Text style={styles.investmentOptionLabel}>{label}</Text>
                <Text style={[styles.investmentOptionValue, { color: primary }]}>{value}</Text>
              </View>
            ))}
          </View>
          <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 14 }}>
            Sistema entregue completamente funcional. Zero surpresas.
          </Text>
        </View>
      </View>
    </View>
  );
}

function PDFText({ content }: { content: TextContent }) {
  // Strip basic HTML tags for PDF
  const plain = content.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return (
    <View style={{ paddingHorizontal: 48, paddingVertical: 24, borderTopColor: '#f1f5f9', borderTopWidth: 1 }}>
      <Text style={styles.textBlock}>{plain}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Documento completo
// ─────────────────────────────────────────────────────────────
interface ProposalPDFProps {
  blocks: ProposalBlock[];
  theme: ProposalTheme;
  clientName: string;
}

export function ProposalPDF({ blocks, theme, clientName }: ProposalPDFProps) {
  return (
    <Document
      title={`Proposta Solar — ${clientName}`}
      author="Quark Tecnologia em Energia"
      subject="Proposta de Engenharia Solar"
      creator="Quark Proposal Engine v2.0"
    >
      <Page size="A4" style={styles.page}>
        {blocks.map((block) => {
          switch (block.type) {
            case 'cover':
              return <PDFCover key={block.id} content={block.content as CoverContent} theme={theme} />;
            case 'social_proof':
              return <PDFSocialProof key={block.id} content={block.content as SocialProofContent} theme={theme} />;
            case 'tech_specs':
              return <PDFTechSpecs key={block.id} content={block.content as TechSpecsContent} theme={theme} />;
            case 'financial':
              return <PDFFinancial key={block.id} content={block.content as FinancialContent} theme={theme} />;
            case 'text':
              return <PDFText key={block.id} content={block.content as TextContent} />;
            default:
              return null;
          }
        })}
      </Page>
    </Document>
  );
}
