// ============================================================
// PROPOSAL ENGINE — DOCUMENTO PDF v3.0 (Dark Luxury UI Matching)
// Usa fontes Helvetica nativas e SVGs para replicar perfeitamente
// a pré-visualização web (Grid, Cores, Turn-Key banner, etc)
// ============================================================
import React from 'react';
import {
  Document, Page, View, Text, Image, StyleSheet, Font, Svg, Path, Polygon, Circle, Line, Polyline, Rect
} from '@react-pdf/renderer';
import {
  ProposalBlock, ProposalTheme,
  CoverContent, SocialProofContent, TechSpecsContent, FinancialContent, FinancingContent, TextContent,
} from './types';

// Usa Helvetica built-in — sem dependência de rede, sempre funciona
Font.registerHyphenationCallback((word) => [word]);

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
function fmtNum(v: number, dec = 2) {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);
}

// ── CORES POR MODO (dark/light) ───────────────────────────────
function getColors(mode: string = 'dark') {
  if (mode === 'light') return {
    PAGE_BG: '#ffffff',
    SURFACE: '#f4f4f6',
    BORDER: '#00000015',
    MUTED: '#00000066',
    TEXT_H: '#111111',
  };
  return {
    PAGE_BG: '#0A0A0A',
    SURFACE: '#111318',
    BORDER: '#ffffff1A',
    MUTED: '#ffffff66',
    TEXT_H: '#ffffff',
  };
}
// defaults dark para os estilos estáticos
const DARK = '#0A0A0A';
const SURFACE = '#111318';
const BORDER = '#ffffff1A';
const MUTED = '#ffffff66';
const TEXT_H = '#ffffff';

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: DARK,
    color: TEXT_H,
    paddingTop: 0,
    paddingBottom: 0,
  },
  // ── Cover ──────────────────────────────────────────────────
  coverBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  coverOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#0A0A0A', opacity: 0.85,
  },
  coverBody: { padding: 52, flex: 1, justifyContent: 'space-between' },
  headerBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  badge: {
    fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 2,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  h1: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 54, color: '#ffffff', lineHeight: 1,
    letterSpacing: -1.5, marginTop: 40,
  },
  tagline: {
    fontSize: 10, color: MUTED, letterSpacing: 2, marginTop: 12, textTransform: 'uppercase',
  },
  clientBoxCard: {
    marginTop: 40, 
    backgroundColor: SURFACE,
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 16,
    padding: 22,
  },
  clientLabel: {
    fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#ffffff',
    letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase'
  },
  clientName: {
    fontFamily: 'Helvetica-Bold', fontSize: 22, color: '#ffffff', letterSpacing: -0.5, marginBottom: 6
  },
  clientMeta: { fontSize: 10, color: MUTED },
  kpiRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  kpiCard: {
    flex: 1, backgroundColor: SURFACE,
    borderRadius: 12, padding: 18,
    borderColor: BORDER, borderWidth: 1,
  },
  kpiLabel: {
    fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED,
    letterSpacing: 1.5, marginBottom: 6, textTransform: 'uppercase'
  },
  kpiValue: { fontFamily: 'Helvetica-Bold', fontSize: 18 },
  coverFooter: {
    paddingHorizontal: 52, paddingVertical: 16,
    borderTopColor: BORDER, borderTopWidth: 1,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#00000040',
  },
  footerText: { fontSize: 9, color: MUTED },

  // ── Seção comum ─────────────────────────────────────────────
  section: { padding: '52 48' },
  sectionTag: {
    fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 2,
    marginBottom: 10, textTransform: 'uppercase'
  },
  sectionH2: {
    fontFamily: 'Helvetica-Bold', fontSize: 28, color: '#ffffff',
    letterSpacing: -0.5, marginBottom: 10, lineHeight: 1.1,
  },
  sectionSub: { fontSize: 11, color: MUTED, lineHeight: 1.6, marginBottom: 30, maxWidth: 450 },

  // ── TechSpecs ─────────────────────────────────────────────
  kpiGrid: { flexDirection: 'row', gap: 12, marginBottom: 30 },
  kpiBox: { flex: 1, borderRadius: 14, padding: 20, borderWidth: 1 },
  kpiBoxVal: { fontFamily: 'Helvetica-Bold', fontSize: 20, marginBottom: 6 },
  kpiBoxLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5, color: MUTED, textTransform: 'uppercase' },
  
  table: {
    borderRadius: 14, borderColor: BORDER, borderWidth: 1, overflow: 'hidden',
  },
  tableHead: {
    flexDirection: 'row', justifyContent: 'space-between',
    padding: '12 20', backgroundColor: '#ffffff05',
    borderBottomColor: BORDER, borderBottomWidth: 1,
  },
  tableHeadText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED, letterSpacing: 1.5, textTransform: 'uppercase' },
  tableRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: '14 20', borderBottomColor: BORDER, borderBottomWidth: 1,
  },
  tableRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1
  },
  tableRowLabel: { fontSize: 11, color: '#ffffffb3' },
  tableRowValue: { fontFamily: 'Helvetica-Bold', fontSize: 13, color: '#ffffff' },

  darkBanner: {
    backgroundColor: SURFACE, borderRadius: 14, padding: '22 28',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 20, borderColor: BORDER, borderWidth: 1,
  },

  // ── Financial ─────────────────────────────────────────────
  kpiFinGrid: {
    flexDirection: 'row', borderColor: BORDER, borderWidth: 1,
    borderRadius: 14, overflow: 'hidden', marginBottom: 24,
  },
  kpiFinCell: { flex: 1, padding: '20 22', borderRightColor: BORDER, borderRightWidth: 1 },
  kpiFinLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5, color: MUTED, marginBottom: 10, textTransform: 'uppercase' },
  kpiFinValue: { fontFamily: 'Helvetica-Bold', fontSize: 32, lineHeight: 1 },
  kpiFinSub: { fontSize: 9, color: MUTED, marginTop: 6 },
  investPanel: {
    backgroundColor: SURFACE, borderRadius: 16, padding: '36 40',
    alignItems: 'center', marginTop: 10,
    borderColor: BORDER, borderWidth: 1,
  },
  investLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', letterSpacing: 2, marginBottom: 12, textTransform: 'uppercase' },
  investValue: { fontFamily: 'Helvetica-Bold', fontSize: 44, color: '#ffffff', letterSpacing: -1, lineHeight: 1, marginBottom: 24 },
  investOptions: { flexDirection: 'row', gap: 14 },
  investOption: {
    borderRadius: 12, padding: '14 22',
    borderColor: BORDER, borderWidth: 1,
    backgroundColor: '#ffffff0A',
    alignItems: 'center'
  },
  investOptionLabel: { fontSize: 8, color: MUTED, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5, marginBottom: 6, textTransform: 'uppercase' },
  investOptionValue: { fontFamily: 'Helvetica-Bold', fontSize: 18 },

  // ── Text ─────────────────────────────────────────────────
  textBlock: {
    paddingHorizontal: 52, paddingVertical: 40,
    fontSize: 11, color: '#ffffffb3', lineHeight: 1.8,
  },
});


const BG_URL = 'https://images.unsplash.com/photo-1509391366360-1e97b524c5bb?w=1200&q=75&fm=jpg';

// ============================================================
// SVG ICONS PARA O PDF
// ============================================================
const ZapIcon = ({ color }: { color: string }) => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </Svg>
);
const SunIcon = ({ color }: { color: string }) => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="5" /><Line x1="12" y1="1" x2="12" y2="3" />
    <Line x1="12" y1="21" x2="12" y2="23" /><Line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <Line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><Line x1="1" y1="12" x2="3" y2="12" />
    <Line x1="21" y1="12" x2="23" y2="12" />
  </Svg>
);
const BatteryIcon = ({ color }: { color: string }) => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Rect x="1" y="6" width="18" height="12" rx="2" /><Line x1="23" y1="13" x2="23" y2="11" />
    <Line x1="5" y1="12" x2="9" y2="12" /><Line x1="7" y1="10" x2="7" y2="14" />
    <Line x1="13" y1="12" x2="17" y2="12" />
  </Svg>
);
const HomeIcon = ({ color }: { color: string }) => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <Polyline points="9 22 9 12 15 12 15 22" />
  </Svg>
);
const ShieldIcon = ({ color }: { color: string }) => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <Polyline points="9 12 11 14 15 10" />
  </Svg>
);
const GaugeIcon = ({ color }: { color: string }) => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 2a10 10 0 0 1 10 10" /><Path d="M12 2a10 10 0 0 0-10 10" />
    <Path d="M12 12 8 8" /><Circle cx="12" cy="12" r="1.5" />
  </Svg>
);

// ─────────────────────────────────────────────────────────────
// Blocos PDF individuais
// ─────────────────────────────────────────────────────────────
function PDFCover({ content: c, theme }: { content: CoverContent; theme: ProposalTheme }) {
  const pri = theme.primaryColor || '#c4a050';
  const C = getColors(theme.mode);
  const logoH = theme.logoSize === 'sm' ? 28 : theme.logoSize === 'md' ? 40 : 56;
  const logoMaxW = theme.logoSize === 'sm' ? 110 : theme.logoSize === 'md' ? 150 : 200;
  return (
    <Page size="A4" style={[s.page, { backgroundColor: C.PAGE_BG }]}>
      <View style={{ flex: 1, position: 'relative' }}>
        <Image style={s.coverBg} src={BG_URL} cache />
        <View style={[s.coverOverlay, { backgroundColor: theme.mode === 'light' ? '#ffffffCC' : '#0A0A0ACC' }]} />
        
        <View style={s.coverBody}>
          <View>
            <View style={s.headerBox}>
              {theme.logoUrl
                ? <Image src={theme.logoUrl} style={{ height: logoH, maxWidth: logoMaxW, objectFit: 'contain' }} />
                : <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 13, color: C.TEXT_H }}>Quark Tecnologia em Energia</Text>
              }
              <Text style={[s.badge, { color: pri, borderColor: pri, backgroundColor: `${pri}1A` }]}>EXCLUSIVO</Text>
            </View>

            <View style={{ marginTop: 80 }}>
              <Text style={[s.sectionTag, { color: pri, fontSize: 10 }]}>{(c as any).categoryLabel || 'Proposta de Engenharia Solar'}</Text>
              <Text style={s.h1}>{(c as any).headlineLine1 || 'Projeto'}{'\n'}<Text style={{ color: pri }}>{(c as any).headlineLine2 || 'Solar.'}</Text></Text>
              <Text style={s.tagline}>{c.tagline || 'SEU PASSAPORTE PARA A INDEPENDÊNCIA ENERGÉTICA'}</Text>
            </View>
          </View>

          <View>
            <View style={s.clientBoxCard}>
              <Text style={[s.clientLabel, { color: pri }]}>Preparado para</Text>
              <Text style={s.clientName}>{c.clientName}</Text>
              <Text style={s.clientMeta}>{c.city}   ·   {c.date}</Text>
            </View>

            <View style={s.kpiRow}>
              <View style={s.kpiCard}>
                <Text style={s.kpiLabel}>Tamanho do Sistema</Text>
                <Text style={[s.kpiValue, { color: pri }]}>{fmtNum(c.systemSizeKw ?? 0, 2)} kWp</Text>
              </View>
              <View style={s.kpiCard}>
                <Text style={s.kpiLabel}>Conta Atual vs Nova</Text>
                <Text style={[s.kpiValue, { color: pri }]}>{fmtCurrency(c.currentBill ?? 860)} <Text style={{ fontSize: 11, color: MUTED }}>para</Text> <Text style={{ color: '#fff' }}>{fmtCurrency(c.newBill ?? 207)}</Text></Text>
              </View>
            </View>
          </View>
        </View>

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
  const monthlyGen = Math.round(c.consumption * 1.05); // Margem de segurança de ~5% como no BlockTechSpecs
  
  const rows = [
    { icon: SunIcon, label: `Módulos — ${c.moduleBrand}`, value: `${c.modulesCount} × ${c.modulePower}W`, accent: pri },
    { icon: BatteryIcon, label: `Inversores — ${c.inverterBrand}`, value: `${c.inverterCount} × ${c.inverterPower} kW`, accent: undefined },
    { icon: GaugeIcon, label: 'Potência Total Instalada', value: `${totalPower.toFixed(2)} kWp`, accent: '#3b82f6' },
    { icon: ZapIcon, label: 'Produção Estimada Mensal', value: `${monthlyGen} kWh`, accent: undefined },
    { icon: HomeIcon, label: 'Área de Telhado Necessária', value: `${c.roofArea} m²`, accent: undefined },
    { icon: ShieldIcon, label: 'Garantia de Performance', value: '25 anos', accent: '#10b981' },
  ];

  return (
    <Page size="A4" style={s.page}>
      <View style={s.section}>
        <Text style={[s.sectionTag, { color: pri }]}>Engenharia do Sistema</Text>
        <Text style={s.sectionH2}>Ficha Técnica</Text>
        <Text style={s.sectionSub}>Sistema dimensionado para o perfil de consumo. Equipamentos Tier 1 com garantia de fábrica.</Text>

        <View style={s.kpiGrid}>
          {[
            { label: 'POTÊNCIA TOTAL', value: `${totalPower.toFixed(2)} kWp`, color: pri },
            { label: 'CONSUMO REF.', value: `${c.consumption} kWh/mês`, color: '#3b82f6' },
            { label: 'ÁREA NECESSÁRIA', value: `${c.roofArea} m²`, color: '#10b981' },
          ].map(({ label, value, color }) => (
            <View key={label} style={[s.kpiBox, { backgroundColor: `${color}0A`, borderColor: `${color}1A` }]}>
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
          {rows.map((row, i) => {
            const Icon = row.icon;
            const accentBg = row.accent ? `${row.accent}15` : '#ffffff08';
            const accentBorder = row.accent ? `${row.accent}25` : BORDER;
            const accentColor = row.accent ? row.accent : '#ffffff66';
            
            return (
              <View key={row.label} style={[s.tableRow, i === rows.length - 1 ? { borderBottomWidth: 0 } : {}]}>
                <View style={s.tableRowLeft}>
                  <View style={[s.iconBox, { backgroundColor: accentBg, borderColor: accentBorder }]}>
                    <Icon color={accentColor} />
                  </View>
                  <Text style={s.tableRowLabel}>{row.label}</Text>
                </View>
                <Text style={[s.tableRowValue, row.accent ? { color: row.accent } : {}]}>{row.value}</Text>
              </View>
            )
          })}
        </View>

        <View style={s.darkBanner}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: pri, letterSpacing: 1.5, marginBottom: 5, textTransform: 'uppercase' }}>Escopo Turn-Key Completo</Text>
            <Text style={{ fontSize: 10, color: MUTED, lineHeight: 1.5 }}>Projeto executivo · Homologação ANEEL · Instalação · Comissionamento · Suporte 24/7</Text>
          </View>
          <View style={{ borderRadius: 10, padding: '12 20', backgroundColor: `${pri}1A`, borderColor: `${pri}30`, borderWidth: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 7, color: pri, fontFamily: 'Helvetica-Bold', letterSpacing: 1, textTransform: 'uppercase' }}>TUDO</Text>
            <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: pri }}>INCLUSO</Text>
          </View>
        </View>
      </View>
    </Page>
  );
}

function PDFFinancial({ content: c, theme }: { content: FinancialContent; theme: ProposalTheme }) {
  const pri = theme.primaryColor || '#c4a050';
  const C = getColors(theme.mode);
  // Usa valores pré-calculados se disponíveis, senão calcula on-the-fly
  const annualAdjust = (c.tariffAdjustmentRate || 7) / 100;
  let cumSavings = c.totalSavings25Years || 0;
  let payback = c.paybackYears || (c.systemLifeYears || 25);
  if (!cumSavings) {
    let cumCost = -(c.finalPrice || 0);
    payback = c.systemLifeYears || 25;
    for (let y = 1; y <= (c.systemLifeYears || 25); y++) {
      const ys = (c.monthlyBill || 0) * Math.pow(1 + annualAdjust, y - 1) * 12;
      cumSavings += ys; cumCost += ys;
      if (cumCost >= 0 && payback === (c.systemLifeYears || 25)) payback = y;
    }
  }
  const tir = c.tir || 0;
  const vpl = c.vpl || 0;
  const roi = c.roi || (c.finalPrice > 0 ? ((cumSavings / c.finalPrice - 1) * 100) : 0);
  const co2Ton = c.co2EvitedTon25Years || 0;
  const trees = c.treesEquivalent || 0;

  return (
    <Page size="A4" style={[s.page, { backgroundColor: C.PAGE_BG }]}>
      <View style={s.section}>
        <Text style={[s.sectionTag, { color: pri }]}>Análise de Investimento</Text>
        <Text style={[s.sectionH2, { color: C.TEXT_H }]}>Retorno Financeiro</Text>
        <Text style={[s.sectionSub, { color: C.MUTED }]}>Projeção com reajuste tarifário ANEEL de {c.tariffAdjustmentRate || 7}% a.a. · TMA de 12% a.a.</Text>

        {/* KPIs principais */}
        <View style={[s.kpiFinGrid, { borderColor: C.BORDER }]}>
          <View style={[s.kpiFinCell, { backgroundColor: `${pri}0A`, borderRightColor: C.BORDER }]}>
            <Text style={[s.kpiFinLabel, { color: C.MUTED }]}>PAYBACK SIMPLES</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={[s.kpiFinValue, { color: pri }]}>{fmtNum(payback, 1)}</Text>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 14, color: pri, opacity: 0.7 }}>anos</Text>
            </View>
            <Text style={[s.kpiFinSub, { color: C.MUTED }]}>Retorno do capital investido</Text>
          </View>
          <View style={[s.kpiFinCell, { borderRightColor: C.BORDER }]}>
            <Text style={[s.kpiFinLabel, { color: C.MUTED }]}>ECONOMIA EM {c.systemLifeYears || 25} ANOS</Text>
            <Text style={[s.kpiFinValue, { color: '#10b981', fontSize: 22 }]}>{fmtCurrency(cumSavings)}</Text>
            <Text style={[s.kpiFinSub, { color: C.MUTED }]}>Economia acumulada projetada</Text>
          </View>
          <View style={[s.kpiFinCell, { borderRightWidth: 0 }]}>
            <Text style={[s.kpiFinLabel, { color: C.MUTED }]}>ROI TOTAL</Text>
            <Text style={[s.kpiFinValue, { color: '#3b82f6' }]}>{roi.toFixed(0)}%</Text>
            <Text style={[s.kpiFinSub, { color: C.MUTED }]}>Sobre o investimento</Text>
          </View>
        </View>

        {/* TIR e VPL */}
        {(tir > 0 || vpl !== 0) && (
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <View style={[s.kpiBox, { flex: 1, backgroundColor: `${pri}08`, borderColor: `${pri}20` }]}>
              <Text style={[s.kpiBoxVal, { color: pri, fontSize: 24 }]}>{fmtNum(tir, 1)}% a.a.</Text>
              <Text style={[s.kpiBoxLabel, { color: C.MUTED }]}>TIR — TAXA INTERNA DE RETORNO</Text>
            </View>
            <View style={[s.kpiBox, { flex: 1, backgroundColor: vpl >= 0 ? '#10b98108' : '#ef444408', borderColor: vpl >= 0 ? '#10b98120' : '#ef444420' }]}>
              <Text style={[s.kpiBoxVal, { color: vpl >= 0 ? '#10b981' : '#ef4444', fontSize: 20 }]}>{fmtCurrency(vpl)}</Text>
              <Text style={[s.kpiBoxLabel, { color: C.MUTED }]}>VPL (TMA 12% A.A.)</Text>
            </View>
          </View>
        )}

        {/* CO2 */}
        {co2Ton > 0 && (
          <View style={[s.darkBanner, { backgroundColor: '#10b98108', borderColor: '#10b98120', marginBottom: 16 }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#10b981', letterSpacing: 1.5, marginBottom: 5, textTransform: 'uppercase' }}>Impacto Ambiental em 25 Anos</Text>
              <Text style={{ fontSize: 10, color: C.MUTED, lineHeight: 1.5 }}>{fmtNum(co2Ton, 1)} toneladas de CO₂ evitadas · equivalente a {trees} árvores plantadas</Text>
            </View>
            <View style={{ borderRadius: 10, padding: '10 16', backgroundColor: '#10b98115', alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#10b981' }}>🌱</Text>
            </View>
          </View>
        )}

        {/* Painel investimento */}
        <View style={[s.investPanel, { backgroundColor: C.SURFACE, borderColor: C.BORDER }]}>
          <Text style={[s.investLabel, { color: pri }]}>Aporte Financeiro Total (Turn-Key)</Text>
          <Text style={[s.investValue, { color: C.TEXT_H }]}>{fmtCurrency(c.finalPrice || 0)}</Text>
          <View style={s.investOptions}>
            {[
              { label: 'OPÇÃO À VISTA (−5%)', value: fmtCurrency((c.finalPrice || 0) * 0.95) },
              { label: `FINANCIADO ${c.installmentCount || 60}× DE`, value: fmtCurrency((c.finalPrice || 0) / (c.installmentCount || 60)) },
            ].map(({ label, value }) => (
              <View key={label} style={[s.investOption, { borderColor: C.BORDER }]}>
                <Text style={[s.investOptionLabel, { color: C.MUTED }]}>{label}</Text>
                <Text style={[s.investOptionValue, { color: pri }]}>{value}</Text>
              </View>
            ))}
          </View>
          <Text style={{ fontSize: 9, color: C.MUTED, marginTop: 18 }}>Sistema entregue completamente funcional. Zero surpresas.</Text>
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
        <Text style={[s.sectionTag, { color: pri }]}>Prova Social</Text>
        <Text style={s.sectionH2}>{c.headline || 'Projetos Realizados'}</Text>
        <Text style={s.sectionSub}>{c.subheadline || 'Obras entregues com excelência técnica e foco em resultados operacionais.'}</Text>
      </View>
      {featured && <Image src={featured.url} style={{ width: '100%', height: 260 }} />}
      {rest.length > 0 && (
        <View style={{ flexDirection: 'row', marginTop: 4 }}>
          {rest.map((img) => <Image key={img.id} src={img.url} style={{ flex: 1, height: 160 }} />)}
        </View>
      )}
      <View style={{ flexDirection: 'row', borderTopColor: BORDER, borderTopWidth: 1, marginTop: 8 }}>
        {[
          { value: '+500', label: 'PROJETOS ENTREGUES' },
          { value: '100%', label: 'DENTRO DO PRAZO' },
          { value: '25 ANOS', label: 'GARANTIA INCLUSA' },
        ].map(({ value, label }, i) => (
          <View key={label} style={{ flex: 1, padding: '24 24', alignItems: 'center', borderRightColor: BORDER, borderRightWidth: i < 2 ? 1 : 0, backgroundColor: SURFACE }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 28, color: pri, lineHeight: 1, marginBottom: 8 }}>{value}</Text>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5, color: MUTED }}>{label}</Text>
          </View>
        ))}
      </View>
    </Page>
  );
}

// ── Bloco de Financiamento (Página PDF) ──────────────────────
function PDFFinancingBlock({ content: c, theme }: { content: FinancingContent; theme: ProposalTheme }) {
  const pri = theme.primaryColor || '#c4a050';
  const C = getColors(theme.mode);
  const opts: any[] = c.options || [];
  return (
    <Page size="A4" style={[s.page, { backgroundColor: C.PAGE_BG }]}>
      <View style={s.section}>
        <Text style={[s.sectionTag, { color: pri }]}>Condições Comerciais</Text>
        <Text style={[s.sectionH2, { color: C.TEXT_H }]}>{c.title || 'Opções de Pagamento'}</Text>
        <Text style={[s.sectionSub, { color: C.MUTED }]}>Escolha a melhor forma de investir no seu sistema solar fotovoltaico.</Text>

        {opts.map((opt: any, i: number) => {
          const highlighted = opt.isHighlighted;
          const instValue = opt.installmentValue > 0
            ? opt.installmentValue
            : opt.installments > 1
              ? (c.finalPrice || 0) / opt.installments
              : (c.finalPrice || 0) * (1 - (c.cashDiscountPct || 5) / 100);
          return (
            <View key={opt.id || i} style={[
              s.investOption,
              {
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 10, padding: '16 22',
                backgroundColor: highlighted ? `${pri}0D` : C.SURFACE,
                borderColor: highlighted ? `${pri}40` : C.BORDER,
              }
            ]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: highlighted ? pri : C.TEXT_H, marginBottom: 4 }}>{opt.label}</Text>
                <Text style={{ fontSize: 9, color: C.MUTED }}>{opt.description}</Text>
                {opt.monthlyRate > 0 && (
                  <Text style={{ fontSize: 8, color: C.MUTED, marginTop: 4 }}>{opt.monthlyRate.toFixed(2)}% a.m.</Text>
                )}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 9, color: C.MUTED, fontFamily: 'Helvetica-Bold', letterSpacing: 1 }}>
                  {opt.installments <= 1 ? 'VALOR À VISTA' : `${opt.installments}× DE`}
                </Text>
                <Text style={{ fontSize: 20, fontFamily: 'Helvetica-Bold', color: highlighted ? pri : C.TEXT_H, lineHeight: 1.2 }}>
                  {fmtCurrency(instValue)}
                </Text>
              </View>
            </View>
          );
        })}
        <Text style={{ fontSize: 8, color: C.MUTED, marginTop: 16, lineHeight: 1.6 }}>
          * Valores sujeitos à aprovação de crédito. Taxas vigentes na data da proposta.
        </Text>
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
      creator="Quark Proposal Engine v4.0"
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
          case 'financing':
            return <PDFFinancingBlock key={block.id} content={block.content as FinancingContent} theme={theme} />;
          case 'text':
            return <PDFText key={block.id} content={block.content as TextContent} />;
          default:
            return null;
        }
      })}
    </Document>
  );
}
