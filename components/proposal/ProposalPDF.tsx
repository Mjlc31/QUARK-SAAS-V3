// ============================================================
// PROPOSAL ENGINE — DOCUMENTO PDF v3.0
// Usa fontes Helvetica nativas (sem requisições de rede)
// Múltiplas páginas A4 com fundo dark luxury
// ============================================================
import React from 'react';
import {
  Document, Page, View, Text, Image, StyleSheet, Font,
} from '@react-pdf/renderer';
import {
  ProposalBlock, ProposalTheme,
  CoverContent, SocialProofContent, TechSpecsContent, FinancialContent, TextContent,
} from './types';

// Usa Helvetica built-in — sem dependência de rede, sempre funciona
Font.registerHyphenationCallback((word) => [word]);

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
function fmtNum(v: number, dec = 2) {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);
}

const DARK = '#0A0A0A';
const SURFACE = '#111318';
const BORDER = 'rgba(255,255,255,0.08)';

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: DARK,
    color: '#ffffff',
    paddingTop: 0,
    paddingBottom: 0,
  },
  // ── Cover ──────────────────────────────────────────────────
  coverBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  coverOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#08090f', opacity: 0.88,
  },
  coverBody: { padding: 52, flex: 1 },
  badge: {
    fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 2,
    color: '#c4a050', borderColor: '#c4a050', borderWidth: 1,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  h1: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 58, color: '#ffffff', lineHeight: 1,
    letterSpacing: -1, marginTop: 40,
  },
  accent: { color: '#c4a050' },
  tagline: {
    fontSize: 9, color: 'rgba(255,255,255,0.35)',
    letterSpacing: 2, marginTop: 10,
  },
  clientBox: {
    marginTop: 40, borderLeftColor: '#c4a050', borderLeftWidth: 3, paddingLeft: 20,
  },
  clientLabel: {
    fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#c4a050',
    letterSpacing: 2, marginBottom: 6,
  },
  clientName: {
    fontFamily: 'Helvetica-Bold', fontSize: 30, color: '#ffffff', letterSpacing: -0.5,
  },
  clientMeta: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
  kpiRow: { flexDirection: 'row', gap: 12, marginTop: 32 },
  kpiCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 16,
    borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1,
  },
  kpiLabel: {
    fontSize: 7, fontFamily: 'Helvetica-Bold', color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.5, marginBottom: 8,
  },
  kpiValue: { fontFamily: 'Helvetica-Bold', fontSize: 18, color: '#c4a050' },
  coverFooter: {
    paddingHorizontal: 52, paddingVertical: 14,
    borderTopColor: 'rgba(255,255,255,0.06)', borderTopWidth: 1,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  footerText: { fontSize: 9, color: 'rgba(255,255,255,0.25)' },

  // ── Seção comum ─────────────────────────────────────────────
  section: { padding: '48 52' },
  sectionTag: {
    fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 2,
    color: '#c4a050', marginBottom: 10,
  },
  sectionH2: {
    fontFamily: 'Helvetica-Bold', fontSize: 28, color: '#ffffff',
    letterSpacing: -0.5, marginBottom: 10,
  },
  sectionSub: { fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: 28 },

  // ── TechSpecs ─────────────────────────────────────────────
  kpiGrid: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  kpiBox: { flex: 1, borderRadius: 12, padding: 18, borderWidth: 1 },
  kpiBoxVal: { fontFamily: 'Helvetica-Bold', fontSize: 20, marginBottom: 5 },
  kpiBoxLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5, color: 'rgba(255,255,255,0.35)' },
  table: {
    borderRadius: 12, borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, overflow: 'hidden',
  },
  tableHead: {
    flexDirection: 'row', justifyContent: 'space-between',
    padding: '10 18', backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomColor: 'rgba(255,255,255,0.06)', borderBottomWidth: 1,
  },
  tableHeadText: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5 },
  tableRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: '13 18', borderBottomColor: 'rgba(255,255,255,0.04)', borderBottomWidth: 1,
  },
  tableRowLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)' },
  tableRowValue: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: '#ffffff' },
  darkBanner: {
    backgroundColor: SURFACE, borderRadius: 12, padding: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 20, borderColor: 'rgba(255,255,255,0.06)', borderWidth: 1,
  },

  // ── Financial ─────────────────────────────────────────────
  kpiFinGrid: {
    flexDirection: 'row', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1,
    borderRadius: 14, overflow: 'hidden', marginBottom: 24,
  },
  kpiFinCell: { flex: 1, padding: 22, borderRightColor: 'rgba(255,255,255,0.06)', borderRightWidth: 1 },
  kpiFinLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5, color: 'rgba(255,255,255,0.35)', marginBottom: 10 },
  kpiFinValue: { fontFamily: 'Helvetica-Bold', fontSize: 36, lineHeight: 1 },
  kpiFinUnit: { fontFamily: 'Helvetica-Bold', fontSize: 14, opacity: 0.7 },
  kpiFinSub: { fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 5 },
  investPanel: {
    backgroundColor: SURFACE, borderRadius: 16, padding: '36 40',
    alignItems: 'center', marginTop: 8,
    borderColor: 'rgba(255,255,255,0.06)', borderWidth: 1,
  },
  investLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 2, color: '#c4a050', marginBottom: 12 },
  investValue: { fontFamily: 'Helvetica-Bold', fontSize: 48, color: '#ffffff', letterSpacing: -1, lineHeight: 1, marginBottom: 20 },
  investOptions: { flexDirection: 'row', gap: 12 },
  investOption: {
    borderRadius: 10, padding: '12 20',
    borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  investOptionLabel: { fontSize: 7, color: 'rgba(255,255,255,0.3)', fontFamily: 'Helvetica-Bold', letterSpacing: 1, marginBottom: 4 },
  investOptionValue: { fontFamily: 'Helvetica-Bold', fontSize: 16 },

  // ── Text ─────────────────────────────────────────────────
  textBlock: {
    paddingHorizontal: 52, paddingVertical: 32,
    fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.8,
    borderTopColor: 'rgba(255,255,255,0.06)', borderTopWidth: 1,
  },
});

const BG_URL = 'https://images.unsplash.com/photo-1509391366360-1e97b524c5bb?w=1200&q=75&fm=jpg';

// ─────────────────────────────────────────────────────────────
// Blocos PDF individuais
// ─────────────────────────────────────────────────────────────
function PDFCover({ content: c, theme }: { content: CoverContent; theme: ProposalTheme }) {
  const pri = theme.primaryColor || '#c4a050';
  return (
    <Page size="A4" style={s.page}>
      <View style={{ flex: 1 }}>
        <Image style={s.coverBg} src={BG_URL} cache />
        <View style={[s.coverOverlay, { backgroundColor: theme.secondaryColor || '#08090f' }]} />
        <View style={[s.coverBody, { flex: 1 }]}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            {theme.logoUrl
              ? <Image src={theme.logoUrl} style={{ height: 34, maxWidth: 130 }} />
              : <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 12, color: '#fff' }}>Quark Tecnologia em Energia</Text>
            }
            <Text style={[s.badge, { color: pri, borderColor: pri }]}>EXCLUSIVO</Text>
          </View>

          {/* Headline */}
          <Text style={s.h1}>Projeto{'\n'}<Text style={{ color: pri }}>Solar.</Text></Text>
          <Text style={s.tagline}>{(c.tagline || 'SEU PASSAPORTE PARA A INDEPENDÊNCIA ENERGÉTICA').toUpperCase()}</Text>

          {/* Cliente */}
          <View style={s.clientBox}>
            <Text style={[s.clientLabel, { color: pri }]}>PREPARADO EXCLUSIVAMENTE PARA</Text>
            <Text style={s.clientName}>{c.clientName}</Text>
            <Text style={s.clientMeta}>{c.city}  ·  {c.date}</Text>
          </View>

          {/* KPIs */}
          <View style={s.kpiRow}>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>POTÊNCIA DO SISTEMA</Text>
              <Text style={[s.kpiValue, { color: pri }]}>{fmtNum(c.systemSizeKw ?? 0, 2)} kWp</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>INVESTIMENTO TOTAL</Text>
              <Text style={[s.kpiValue, { color: pri }]}>{fmtCurrency(c.finalPrice ?? 0)}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={s.coverFooter}>
          <Text style={s.footerText}>Quark Energia · quarkenergia.com.br</Text>
          <Text style={s.footerText}>Válido por 30 dias · {c.date}</Text>
        </View>
      </View>
    </Page>
  );
}

function PDFTechSpecs({ content: c, theme }: { content: TechSpecsContent; theme: ProposalTheme }) {
  const pri = theme.primaryColor || '#c4a050';
  const totalPower = (c.modulesCount * c.modulePower) / 1000;
  const monthlyGen = Math.round(totalPower * 120); // 120 kWh/kWp/mês (HSP médio BR)
  const rows = [
    { label: `Módulos Fotovoltaicos — ${c.moduleBrand}`, value: `${c.modulesCount} × ${c.modulePower}W`, accent: pri },
    { label: `Inversores — ${c.inverterBrand}`, value: `${c.inverterCount} × ${c.inverterPower} kW`, accent: undefined },
    { label: 'Potência Total Instalada', value: `${totalPower.toFixed(2)} kWp`, accent: '#3b82f6' },
    { label: 'Produção Estimada Mensal', value: `${monthlyGen} kWh`, accent: undefined },
    { label: 'Área de Telhado Necessária', value: `${c.roofArea} m²`, accent: undefined },
    { label: 'Garantia de Performance', value: '25 anos', accent: '#10b981' },
  ];
  return (
    <Page size="A4" style={s.page}>
      <View style={s.section}>
        <Text style={[s.sectionTag, { color: pri }]}>ENGENHARIA DO SISTEMA</Text>
        <Text style={s.sectionH2}>Ficha Técnica</Text>
        <Text style={s.sectionSub}>Sistema dimensionado para o perfil de consumo. Equipamentos Tier 1 com garantia de fábrica.</Text>

        <View style={s.kpiGrid}>
          {[
            { label: 'POTÊNCIA TOTAL', value: `${totalPower.toFixed(2)} kWp`, color: pri },
            { label: 'CONSUMO REFERÊNCIA', value: `${c.consumption} kWh/mês`, color: '#3b82f6' },
            { label: 'ÁREA NECESSÁRIA', value: `${c.roofArea} m²`, color: '#10b981' },
          ].map(({ label, value, color }) => (
            <View key={label} style={[s.kpiBox, { backgroundColor: `${color}10`, borderColor: `${color}20` }]}>
              <Text style={[s.kpiBoxVal, { color }]}>{value}</Text>
              <Text style={s.kpiBoxLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={s.table}>
          <View style={s.tableHead}>
            <Text style={s.tableHeadText}>COMPONENTE</Text>
            <Text style={s.tableHeadText}>ESPECIFICAÇÃO</Text>
          </View>
          {rows.map(({ label, value, accent }, i) => (
            <View key={label} style={[s.tableRow, i === rows.length - 1 ? { borderBottomWidth: 0 } : {}]}>
              <Text style={s.tableRowLabel}>{label}</Text>
              <Text style={[s.tableRowValue, accent ? { color: accent } : {}]}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={s.darkBanner}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: pri, letterSpacing: 1.5, marginBottom: 5 }}>ESCOPO TURN-KEY COMPLETO</Text>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>Projeto executivo · Homologação ANEEL · Instalação · Comissionamento · Suporte 24/7</Text>
          </View>
          <View style={{ borderRadius: 10, padding: '10 18', backgroundColor: `${pri}18`, borderColor: `${pri}30`, borderWidth: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 7, color: pri, fontFamily: 'Helvetica-Bold', letterSpacing: 1 }}>TUDO</Text>
            <Text style={{ fontSize: 20, fontFamily: 'Helvetica-Bold', color: pri }}>INCLUSO</Text>
          </View>
        </View>
      </View>
    </Page>
  );
}

function PDFFinancial({ content: c, theme }: { content: FinancialContent; theme: ProposalTheme }) {
  const pri = theme.primaryColor || '#c4a050';
  const annualAdjust = (c.tariffAdjustmentRate || 7) / 100;
  let cumSavings = 0, cumCost = -(c.finalPrice || 0), payback = c.systemLifeYears || 25;
  for (let y = 1; y <= (c.systemLifeYears || 25); y++) {
    const annualSavings = (c.monthlyBill || 0) * Math.pow(1 + annualAdjust, y - 1) * 12;
    cumSavings += annualSavings;
    cumCost += annualSavings;
    if (cumCost >= 0 && payback === (c.systemLifeYears || 25)) payback = y;
  }
  const roi = c.finalPrice > 0 ? ((cumSavings / c.finalPrice - 1) * 100) : 0;

  return (
    <Page size="A4" style={s.page}>
      <View style={s.section}>
        <Text style={[s.sectionTag, { color: pri }]}>ANÁLISE DE INVESTIMENTO</Text>
        <Text style={s.sectionH2}>Retorno sobre o Investimento</Text>
        <Text style={s.sectionSub}>Projeção baseada no consumo histórico e reajuste tarifário ANEEL de {c.tariffAdjustmentRate || 7}% a.a.</Text>

        {/* KPIs */}
        <View style={s.kpiFinGrid}>
          <View style={[s.kpiFinCell, { backgroundColor: `${pri}08` }]}>
            <Text style={s.kpiFinLabel}>PAYBACK</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={[s.kpiFinValue, { color: pri }]}>{payback}</Text>
              <Text style={[s.kpiFinUnit, { color: pri }]}>anos</Text>
            </View>
            <Text style={s.kpiFinSub}>Retorno do capital</Text>
          </View>
          <View style={s.kpiFinCell}>
            <Text style={s.kpiFinLabel}>ECONOMIA EM {c.systemLifeYears || 25} ANOS</Text>
            <Text style={[s.kpiFinValue, { color: '#10b981', fontSize: 22 }]}>{fmtCurrency(cumSavings)}</Text>
            <Text style={s.kpiFinSub}>Economia acumulada projetada</Text>
          </View>
          <View style={[s.kpiFinCell, { borderRightWidth: 0 }]}>
            <Text style={s.kpiFinLabel}>ROI TOTAL</Text>
            <Text style={[s.kpiFinValue, { color: '#6366f1' }]}>{roi.toFixed(0)}%</Text>
            <Text style={s.kpiFinSub}>Sobre o investimento</Text>
          </View>
        </View>

        {/* Painel investimento */}
        <View style={s.investPanel}>
          <Text style={s.investLabel}>APORTE FINANCEIRO TOTAL (TURN-KEY)</Text>
          <Text style={s.investValue}>{fmtCurrency(c.finalPrice || 0)}</Text>
          <View style={s.investOptions}>
            {[
              { label: 'À VISTA (−5%)', value: fmtCurrency((c.finalPrice || 0) * 0.95) },
              { label: `${c.installmentCount || 60}× DE`, value: fmtCurrency((c.finalPrice || 0) / (c.installmentCount || 60)) },
            ].map(({ label, value }) => (
              <View key={label} style={s.investOption}>
                <Text style={s.investOptionLabel}>{label}</Text>
                <Text style={[s.investOptionValue, { color: pri }]}>{value}</Text>
              </View>
            ))}
          </View>
          <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 16 }}>Sistema entregue completamente funcional. Zero surpresas.</Text>
        </View>
      </View>
    </Page>
  );
}

function PDFSocialProof({ content: c, theme }: { content: SocialProofContent; theme: ProposalTheme }) {
  const pri = theme.primaryColor || '#c4a050';
  const [featured, ...rest] = (c.images || []).filter((i) => i.url);
  return (
    <Page size="A4" style={s.page}>
      <View style={s.section}>
        <Text style={[s.sectionTag, { color: pri }]}>PROVA SOCIAL</Text>
        <Text style={s.sectionH2}>{c.headline || 'Projetos Realizados'}</Text>
        <Text style={s.sectionSub}>{c.subheadline || 'Obras entregues com excelência em todo o Brasil.'}</Text>
      </View>
      {featured && <Image src={featured.url} style={{ width: '100%', height: 220 }} />}
      {rest.length > 0 && (
        <View style={{ flexDirection: 'row', marginTop: 4 }}>
          {rest.map((img) => <Image key={img.id} src={img.url} style={{ flex: 1, height: 150 }} />)}
        </View>
      )}
      <View style={{ flexDirection: 'row', borderTopColor: 'rgba(255,255,255,0.06)', borderTopWidth: 1, marginTop: 8 }}>
        {[
          { value: '+500', label: 'PROJETOS ENTREGUES' },
          { value: '100%', label: 'DENTRO DO PRAZO' },
          { value: '25 ANOS', label: 'GARANTIA INCLUSA' },
        ].map(({ value, label }, i) => (
          <View key={label} style={{ flex: 1, padding: '20 24', alignItems: 'center', borderRightColor: 'rgba(255,255,255,0.06)', borderRightWidth: i < 2 ? 1 : 0 }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 24, color: pri, lineHeight: 1, marginBottom: 6 }}>{value}</Text>
            <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5, color: 'rgba(255,255,255,0.35)' }}>{label}</Text>
          </View>
        ))}
      </View>
    </Page>
  );
}

function PDFText({ content: c }: { content: TextContent }) {
  const plain = (c.html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!plain) return null;
  return (
    <Page size="A4" style={s.page}>
      <Text style={s.textBlock}>{plain}</Text>
    </Page>
  );
}

// ─────────────────────────────────────────────────────────────
// Documento principal
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
      creator="Quark Proposal Engine v3.0"
    >
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
    </Document>
  );
}
