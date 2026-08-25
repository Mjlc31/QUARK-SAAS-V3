// ============================================================
// PROPOSAL ENGINE — DOCUMENTO PDF v4.0 (Luxury Editorial UI)
// ============================================================
import React from 'react';
import {
  Document, Page, View, Text, Image, StyleSheet, Font, Svg, Path, Polygon, Circle, Line, Polyline, Rect
} from '@react-pdf/renderer';
import {
  ProposalBlock, ProposalTheme,
  CoverContent, SocialProofContent, TechSpecsContent, FinancialContent, FinancingContent, TextContent,
} from './types';

Font.registerHyphenationCallback((word) => [word]);

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
function fmtNum(v: number, dec = 2) {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);
}

// ── FONTES PDF ──────────────────────────────────────────────
function getPdfFont(fontFamily: string, isBold: boolean = false) {
  // Sempre usa fonte serifada luxuosa para os títulos principais se for playfair
  if (fontFamily === 'playfair' || true) return isBold ? 'Times-Bold' : 'Times-Roman';
  return isBold ? 'Helvetica-Bold' : 'Helvetica';
}

function getSansFont(isBold: boolean = false) {
  return isBold ? 'Helvetica-Bold' : 'Helvetica';
}

// ── CORES LUXURY ───────────────────────────────
const DARK = TEXT_H; // Preto mais profundo
const SURFACE = '#f8fafc';
const BORDER = '#e2e8f0';
const MUTED = '#64748b';
const TEXT_H = '#0f172a';

const s = StyleSheet.create({
  page: {
    backgroundColor: DARK,
    color: TEXT_H,
    paddingTop: 0,
    paddingBottom: 0,
  },
  // ── Cover ──────────────────────────────────────────────────
  coverBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  coverOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: DARK, opacity: 0.75,
  },
  coverBody: { padding: '60 50', flex: 1, justifyContent: 'space-between' },
  headerBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  badge: {
    fontSize: 7, fontFamily: getSansFont(true), letterSpacing: 3,
    borderWidth: 1, borderRadius: 2, paddingHorizontal: 12, paddingVertical: 5,
  },
  h1: {
    fontSize: 64, color: TEXT_H, lineHeight: 1.05,
    letterSpacing: -1, marginTop: 60,
  },
  tagline: {
    fontSize: 9, color: MUTED, letterSpacing: 4, marginTop: 24, textTransform: 'uppercase', fontFamily: getSansFont(true),
  },
  clientBoxCard: {
    marginTop: 40, 
    backgroundColor: SURFACE,
    borderLeftWidth: 2,
    padding: '24 30',
  },
  clientLabel: {
    fontSize: 7, fontFamily: getSansFont(true), color: MUTED,
    letterSpacing: 3, marginBottom: 12, textTransform: 'uppercase'
  },
  clientName: {
    fontSize: 26, color: TEXT_H, letterSpacing: -0.5, marginBottom: 6
  },
  clientMeta: { fontSize: 10, color: MUTED, fontFamily: getSansFont(false), letterSpacing: 1 },
  kpiRow: { flexDirection: 'row', gap: 16, marginTop: 16 },
  kpiCard: {
    flex: 1, backgroundColor: SURFACE,
    padding: '20 24',
    borderTopWidth: 1,
  },
  kpiLabel: {
    fontSize: 7, fontFamily: getSansFont(true), color: MUTED,
    letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase'
  },
  kpiValue: { fontSize: 22 },
  coverFooter: {
    paddingHorizontal: 50, paddingVertical: 24,
    borderTopColor: BORDER, borderTopWidth: 1,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: SURFACE,
  },
  footerText: { fontSize: 8, color: MUTED, fontFamily: getSansFont(false), letterSpacing: 1.5 },

  // ── Seção comum ─────────────────────────────────────────────
  section: { padding: '60 50' },
  sectionTag: {
    fontSize: 7, fontFamily: getSansFont(true), letterSpacing: 3,
    marginBottom: 16, textTransform: 'uppercase'
  },
  sectionH2: {
    fontSize: 36, color: TEXT_H,
    letterSpacing: -0.5, marginBottom: 16, lineHeight: 1.1,
  },
  sectionSub: { fontSize: 11, color: MUTED, lineHeight: 1.8, marginBottom: 40, maxWidth: 450, fontFamily: getSansFont(false) },

  // ── TechSpecs ─────────────────────────────────────────────
  kpiGrid: { flexDirection: 'row', gap: 16, marginBottom: 40 },
  kpiBox: { flex: 1, padding: '24 0', borderBottomWidth: 1 },
  kpiBoxVal: { fontSize: 24, marginBottom: 8 },
  kpiBoxLabel: { fontSize: 7, fontFamily: getSansFont(true), letterSpacing: 2, color: MUTED, textTransform: 'uppercase' },
  
  table: {
    borderTopColor: BORDER, borderTopWidth: 1,
  },
  tableRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: '20 0', borderBottomColor: BORDER, borderBottomWidth: 1,
  },
  tableRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBox: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: SURFACE
  },
  tableRowLabel: { fontSize: 10, color: MUTED, fontFamily: getSansFont(false), letterSpacing: 0.5 },
  tableRowValue: { fontSize: 14, color: TEXT_H },

  darkBanner: {
    backgroundColor: SURFACE, padding: '30 40',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 40, borderLeftWidth: 2,
  },

  // ── Financial ─────────────────────────────────────────────
  kpiFinGrid: {
    flexDirection: 'row', marginBottom: 40,
    borderTopColor: BORDER, borderTopWidth: 1,
    borderBottomColor: BORDER, borderBottomWidth: 1,
  },
  kpiFinCell: { flex: 1, padding: '30 0', borderRightColor: BORDER, borderRightWidth: 1 },
  kpiFinLabel: { fontSize: 7, fontFamily: getSansFont(true), letterSpacing: 2, color: MUTED, marginBottom: 12, textTransform: 'uppercase', paddingLeft: 20 },
  kpiFinValue: { fontSize: 36, lineHeight: 1, paddingLeft: 20 },
  kpiFinSub: { fontSize: 9, color: MUTED, marginTop: 10, fontFamily: getSansFont(false), paddingLeft: 20 },
  investPanel: {
    backgroundColor: SURFACE, padding: '40 50',
    alignItems: 'center', marginTop: 20,
    borderWidth: 1, borderColor: BORDER
  },
  investLabel: { fontSize: 8, fontFamily: getSansFont(true), letterSpacing: 3, marginBottom: 16, textTransform: 'uppercase', color: MUTED },
  investValue: { fontSize: 52, color: TEXT_H, letterSpacing: -1, lineHeight: 1, marginBottom: 30 },
  investOptions: { flexDirection: 'row', gap: 20, width: '100%' },
  investOption: {
    flex: 1, padding: '20 24',
    borderTopWidth: 1, backgroundColor: SURFACE,
  },
  investOptionLabel: { fontSize: 7, color: MUTED, fontFamily: getSansFont(true), letterSpacing: 2, marginBottom: 10, textTransform: 'uppercase' },
  investOptionValue: { fontSize: 20 },

  // ── Text ─────────────────────────────────────────────────
  textBlock: {
    paddingHorizontal: 50, paddingVertical: 60,
    fontSize: 12, color: MUTED, lineHeight: 2, fontFamily: getSansFont(false)
  },
});

// Textura luxury dark abstrata
const BG_URL = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop';

// ============================================================
// SVG ICONS PARA O PDF
// ============================================================
const ZapIcon = ({ color }: { color: string }) => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <Polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </Svg>
);
const SunIcon = ({ color }: { color: string }) => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="5" /><Line x1="12" y1="1" x2="12" y2="3" />
    <Line x1="12" y1="21" x2="12" y2="23" /><Line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <Line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><Line x1="1" y1="12" x2="3" y2="12" />
    <Line x1="21" y1="12" x2="23" y2="12" />
  </Svg>
);
const BatteryIcon = ({ color }: { color: string }) => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <Rect x="1" y="6" width="18" height="12" rx="2" /><Line x1="23" y1="13" x2="23" y2="11" />
    <Line x1="5" y1="12" x2="9" y2="12" /><Line x1="7" y1="10" x2="7" y2="14" />
    <Line x1="13" y1="12" x2="17" y2="12" />
  </Svg>
);
const HomeIcon = ({ color }: { color: string }) => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <Polyline points="9 22 9 12 15 12 15 22" />
  </Svg>
);
const ShieldIcon = ({ color }: { color: string }) => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <Polyline points="9 12 11 14 15 10" />
  </Svg>
);
const GaugeIcon = ({ color }: { color: string }) => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 2a10 10 0 0 1 10 10" /><Path d="M12 2a10 10 0 0 0-10 10" />
    <Path d="M12 12 8 8" /><Circle cx="12" cy="12" r="1.5" />
  </Svg>
);

// ─────────────────────────────────────────────────────────────
// Blocos PDF individuais
// ─────────────────────────────────────────────────────────────
function PDFCover({ content: c, theme }: { content: CoverContent; theme: ProposalTheme }) {
  const pri = theme.primaryColor || '#1e3a8a';
  const fontSerif = getPdfFont(theme.fontFamily, false);
  const fontSerifBold = getPdfFont(theme.fontFamily, true);
  const logoH = theme.logoSize === 'sm' ? 28 : theme.logoSize === 'md' ? 40 : 56;
  const logoMaxW = theme.logoSize === 'sm' ? 110 : theme.logoSize === 'md' ? 150 : 200;
  
  return (
    <Page size="A4" style={[s.page, { fontFamily: getSansFont() }]}>
      <View style={{ flex: 1, position: 'relative' }}>
        <Image style={s.coverBg} src={BG_URL} cache />
        <View style={s.coverOverlay} />
        
        <View style={s.coverBody}>
          <View>
            <View style={s.headerBox}>
              {theme.logoUrl
                ? <Image src={theme.logoUrl} style={{ height: logoH, maxWidth: logoMaxW, objectFit: 'contain' }} />
                : <Text style={{ fontFamily: fontSerifBold, fontSize: 16, color: TEXT_H, letterSpacing: 1 }}>QUARK ENERGIA</Text>
              }
              <Text style={[s.badge, { color: pri, borderColor: pri }]}>PROPOSTA EXCLUSIVA</Text>
            </View>

            <View style={{ marginTop: 100 }}>
              <Text style={[s.sectionTag, { color: pri }]}>{(c as any).categoryLabel || 'Engenharia Solar'}</Text>
              <Text style={[s.h1, { fontFamily: fontSerifBold }]}>{(c as any).headlineLine1 || 'Projeto'}{'\n'}<Text style={{ color: pri, fontFamily: fontSerif }}>{(c as any).headlineLine2 || 'Solar.'}</Text></Text>
              <Text style={s.tagline}>{c.tagline || 'SEU PASSAPORTE PARA A INDEPENDÊNCIA ENERGÉTICA'}</Text>
            </View>
          </View>

          <View>
            <View style={[s.clientBoxCard, { borderLeftColor: pri }]}>
              <Text style={s.clientLabel}>Preparado exclusivamente para</Text>
              <Text style={[s.clientName, { fontFamily: fontSerifBold }]}>{c.clientName}</Text>
              <Text style={s.clientMeta}>{c.city}   |   {c.date}</Text>
            </View>

            <View style={s.kpiRow}>
              <View style={[s.kpiCard, { borderTopColor: pri }]}>
                <Text style={s.kpiLabel}>Tamanho do Sistema</Text>
                <Text style={[s.kpiValue, { color: pri, fontFamily: fontSerifBold }]}>{fmtNum(c.systemSizeKw ?? 0, 2)} kWp</Text>
              </View>
              <View style={[s.kpiCard, { borderTopColor: pri }]}>
                <Text style={s.kpiLabel}>Nova Conta Estimada</Text>
                <Text style={[s.kpiValue, { color: TEXT_H, fontFamily: fontSerifBold }]}>{fmtCurrency(c.newBill ?? 207)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={s.coverFooter}>
          <Text style={s.footerText}>quarkenergia.com.br</Text>
          <Text style={s.footerText}>Válido por 30 dias</Text>
        </View>
      </View>
    </Page>
  );
}

function PDFTechSpecs({ content: c, theme }: { content: TechSpecsContent; theme: ProposalTheme }) {
  const pri = theme.primaryColor || '#1e3a8a';
  const fontSerifBold = getPdfFont(theme.fontFamily, true);
  const totalPower = (c.modulesCount * c.modulePower) / 1000;
  const monthlyGen = Math.round(c.consumption * 1.05);
  
  const rows = [
    { icon: SunIcon, label: `MÓDULOS FOTOVOLTAICOS`, value: `${c.modulesCount} × ${c.modulePower}W ${c.moduleBrand}`, accent: pri },
    { icon: BatteryIcon, label: `INVERSORES`, value: `${c.inverterCount} × ${c.inverterPower} kW ${c.inverterBrand}`, accent: undefined },
    { icon: GaugeIcon, label: 'POTÊNCIA INSTALADA', value: `${totalPower.toFixed(2)} kWp`, accent: TEXT_H },
    { icon: ZapIcon, label: 'PRODUÇÃO MENSAL', value: `${monthlyGen} kWh`, accent: undefined },
    { icon: HomeIcon, label: 'ÁREA DE TELHADO', value: `${c.roofArea} m²`, accent: undefined },
    { icon: ShieldIcon, label: 'GARANTIA PERFORMANCE', value: '25 anos', accent: '#10b981' },
  ];

  return (
    <Page size="A4" style={[s.page, { fontFamily: getSansFont() }]}>
      <View style={s.section}>
        <Text style={[s.sectionTag, { color: pri }]}>Engenharia do Sistema</Text>
        <Text style={[s.sectionH2, { fontFamily: fontSerifBold }]}>Ficha Técnica</Text>
        <Text style={s.sectionSub}>Sistema dimensionado rigorosamente para o seu perfil de consumo. Utilizamos exclusivamente equipamentos Tier 1 globais.</Text>

        <View style={s.kpiGrid}>
          {[
            { label: 'POTÊNCIA TOTAL', value: `${totalPower.toFixed(2)} kWp`, color: pri },
            { label: 'CONSUMO REF.', value: `${c.consumption} kWh/mês`, color: TEXT_H },
            { label: 'ÁREA ESTIMADA', value: `${c.roofArea} m²`, color: TEXT_H },
          ].map(({ label, value, color }) => (
            <View key={label} style={[s.kpiBox, { borderBottomColor: `${color}40` }]}>
              <Text style={[s.kpiBoxVal, { color, fontFamily: fontSerifBold }]}>{value}</Text>
              <Text style={[s.kpiBoxLabel]}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={s.table}>
          {rows.map((row, i) => {
            const Icon = row.icon;
            const accentColor = row.accent ? row.accent : MUTED;
            
            return (
              <View key={row.label} style={[s.tableRow, i === rows.length - 1 ? { borderBottomWidth: 0 } : {}]}>
                <View style={s.tableRowLeft}>
                  <View style={s.iconBox}>
                    <Icon color={accentColor} />
                  </View>
                  <Text style={s.tableRowLabel}>{row.label}</Text>
                </View>
                <Text style={[s.tableRowValue, { fontFamily: fontSerifBold }, row.accent ? { color: row.accent } : {}]}>{row.value}</Text>
              </View>
            )
          })}
        </View>

        <View style={[s.darkBanner, { borderLeftColor: pri }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 9, fontFamily: getSansFont(true), color: pri, letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>Escopo Turn-Key Completo</Text>
            <Text style={{ fontSize: 10, color: MUTED, lineHeight: 1.6, fontFamily: getSansFont(false) }}>Projeto executivo · Homologação ANEEL · Instalação · Comissionamento · Suporte 24/7</Text>
          </View>
          <View style={{ borderRadius: 2, padding: '12 24', backgroundColor: `${pri}15`, alignItems: 'center' }}>
            <Text style={{ fontSize: 7, color: pri, fontFamily: getSansFont(true), letterSpacing: 2, textTransform: 'uppercase' }}>TUDO</Text>
            <Text style={{ fontSize: 16, fontFamily: fontSerifBold, color: pri }}>INCLUSO</Text>
          </View>
        </View>
      </View>
    </Page>
  );
}

function PDFFinancial({ content: c, theme }: { content: FinancialContent; theme: ProposalTheme }) {
  const pri = theme.primaryColor || '#1e3a8a';
  const fontSerifBold = getPdfFont(theme.fontFamily, true);
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
    <Page size="A4" style={[s.page, { fontFamily: getSansFont() }]}>
      <View style={s.section}>
        <Text style={[s.sectionTag, { color: pri }]}>Análise de Investimento</Text>
        <Text style={[s.sectionH2, { fontFamily: fontSerifBold }]}>Retorno Financeiro</Text>
        <Text style={s.sectionSub}>Projeção baseada na inflação energética histórica e premissas conservadoras.</Text>

        <View style={s.kpiFinGrid}>
          <View style={[s.kpiFinCell, { backgroundColor: `${pri}08` }]}>
            <Text style={s.kpiFinLabel}>PAYBACK SIMPLES</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingLeft: 20 }}>
              <Text style={[s.kpiFinValue, { color: pri, fontFamily: fontSerifBold, paddingLeft: 0 }]}>{fmtNum(payback, 1)}</Text>
              <Text style={{ fontFamily: fontSerifBold, fontSize: 16, color: pri, opacity: 0.8 }}>anos</Text>
            </View>
            <Text style={s.kpiFinSub}>Retorno do capital investido</Text>
          </View>
          <View style={s.kpiFinCell}>
            <Text style={s.kpiFinLabel}>ECONOMIA EM {c.systemLifeYears || 25} ANOS</Text>
            <Text style={[s.kpiFinValue, { color: TEXT_H, fontFamily: fontSerifBold }]}>{fmtCurrency(cumSavings)}</Text>
            <Text style={s.kpiFinSub}>Economia acumulada projetada</Text>
          </View>
          <View style={[s.kpiFinCell, { borderRightWidth: 0 }]}>
            <Text style={s.kpiFinLabel}>ROI TOTAL</Text>
            <Text style={[s.kpiFinValue, { color: TEXT_H, fontFamily: fontSerifBold }]}>{roi.toFixed(0)}%</Text>
            <Text style={s.kpiFinSub}>Sobre o investimento original</Text>
          </View>
        </View>

        {(tir > 0 || vpl !== 0) && (
          <View style={{ flexDirection: 'row', gap: 20, marginBottom: 24 }}>
            <View style={[s.kpiBox, { flex: 1, borderBottomWidth: 0, padding: 0 }]}>
              <Text style={[s.kpiBoxVal, { color: pri, fontSize: 28, fontFamily: fontSerifBold }]}>{fmtNum(tir, 1)}% a.a.</Text>
              <Text style={s.kpiBoxLabel}>TIR — TAXA INTERNA DE RETORNO</Text>
            </View>
            <View style={[s.kpiBox, { flex: 1, borderBottomWidth: 0, padding: 0 }]}>
              <Text style={[s.kpiBoxVal, { color: TEXT_H, fontSize: 24, fontFamily: fontSerifBold }]}>{fmtCurrency(vpl)}</Text>
              <Text style={s.kpiBoxLabel}>VPL (TMA 12% A.A.)</Text>
            </View>
          </View>
        )}

        {co2Ton > 0 && (
          <View style={[s.darkBanner, { borderLeftColor: '#10b981', backgroundColor: '#10b98105', padding: '24 30', marginTop: 10, marginBottom: 20 }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 8, fontFamily: getSansFont(true), color: '#10b981', letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>Impacto Ambiental (25 Anos)</Text>
              <Text style={{ fontSize: 10, color: MUTED, lineHeight: 1.6, fontFamily: getSansFont(false) }}>{fmtNum(co2Ton, 1)} ton de CO₂ evitadas · {trees} árvores plantadas</Text>
            </View>
            <Text style={{ fontSize: 24 }}>🌿</Text>
          </View>
        )}

        <View style={s.investPanel}>
          <Text style={s.investLabel}>APORTE FINANCEIRO TOTAL</Text>
          <Text style={[s.investValue, { fontFamily: fontSerifBold }]}>{fmtCurrency(c.finalPrice || 0)}</Text>
          <View style={s.investOptions}>
            {[
              { label: 'À VISTA (−5%)', value: fmtCurrency((c.finalPrice || 0) * 0.95), color: pri },
              { label: `FINANCIADO ${c.installmentCount || 60}× DE`, value: fmtCurrency((c.finalPrice || 0) / (c.installmentCount || 60)), color: TEXT_H },
            ].map(({ label, value, color }) => (
              <View key={label} style={[s.investOption, { borderTopColor: color }]}>
                <Text style={s.investOptionLabel}>{label}</Text>
                <Text style={[s.investOptionValue, { color, fontFamily: fontSerifBold }]}>{value}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Page>
  );
}

function PDFSocialProof({ content: c, theme }: { content: SocialProofContent; theme: ProposalTheme }) {
  const pri = theme.primaryColor || '#1e3a8a';
  const fontSerifBold = getPdfFont(theme.fontFamily, true);
  const [featured, ...rest] = (c.images || []).filter((i) => i.url);
  return (
    <Page size="A4" style={[s.page, { fontFamily: getSansFont() }]}>
      <View style={s.section}>
        <Text style={[s.sectionTag, { color: pri }]}>Excelência Comprovada</Text>
        <Text style={[s.sectionH2, { fontFamily: fontSerifBold }]}>{c.headline || 'Projetos Realizados'}</Text>
        <Text style={s.sectionSub}>{c.subheadline || 'Obras entregues com excelência técnica e foco absoluto em resultados reais.'}</Text>
      </View>
      
      {featured && <Image src={featured.url} style={{ width: '100%', height: 320, objectFit: 'cover' }} />}
      
      {rest.length > 0 && (
        <View style={{ flexDirection: 'row', marginTop: 4 }}>
          {rest.slice(0, 3).map((img) => <Image key={img.id} src={img.url} style={{ flex: 1, height: 180, objectFit: 'cover', marginLeft: 2, marginRight: 2 }} />)}
        </View>
      )}
      
      <View style={{ flexDirection: 'row', marginTop: 30, paddingHorizontal: 50 }}>
        {[
          { value: '+500', label: 'PROJETOS ENTREGUES' },
          { value: '100%', label: 'ÍNDICE DE SATISFAÇÃO' },
          { value: '25 ANOS', label: 'GARANTIA DE PERFORMANCE' },
        ].map(({ value, label }, i) => (
          <View key={label} style={{ flex: 1, padding: '30 0', alignItems: 'center', borderTopColor: BORDER, borderTopWidth: 1 }}>
            <Text style={{ fontFamily: fontSerifBold, fontSize: 32, color: pri, lineHeight: 1, marginBottom: 12 }}>{value}</Text>
            <Text style={{ fontSize: 7, fontFamily: getSansFont(true), letterSpacing: 2, color: MUTED }}>{label}</Text>
          </View>
        ))}
      </View>
    </Page>
  );
}

function PDFFinancingBlock({ content: c, theme }: { content: FinancingContent; theme: ProposalTheme }) {
  const pri = theme.primaryColor || '#1e3a8a';
  const fontSerifBold = getPdfFont(theme.fontFamily, true);
  const opts: any[] = c.options || [];

  return (
    <Page size="A4" style={[s.page, { fontFamily: getSansFont() }]}>
      <View style={s.section}>
        <Text style={[s.sectionTag, { color: pri }]}>Condições Comerciais</Text>
        <Text style={[s.sectionH2, { fontFamily: fontSerifBold }]}>{c.title || 'Estrutura de Pagamento'}</Text>
        <Text style={s.sectionSub}>Opções formatadas para maximizar o seu fluxo de caixa desde o primeiro mês.</Text>

        <View style={{ marginTop: 20 }}>
          {opts.map((opt: any, i: number) => {
            const highlighted = opt.isHighlighted;
            const instValue = opt.installmentValue > 0
              ? opt.installmentValue
              : opt.installments > 1
                ? (c.finalPrice || 0) / opt.installments
                : (c.finalPrice || 0) * (1 - (c.cashDiscountPct || 5) / 100);
            return (
              <View key={opt.id || i} style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                padding: '24 30', marginBottom: 16,
                backgroundColor: highlighted ? `${pri}15` : SURFACE,
                borderLeftWidth: 2, borderLeftColor: highlighted ? pri : 'transparent',
                borderWidth: 1, borderColor: highlighted ? `${pri}30` : BORDER
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontFamily: getSansFont(true), color: highlighted ? pri : TEXT_H, marginBottom: 8, letterSpacing: 1 }}>{opt.label}</Text>
                  <Text style={{ fontSize: 10, color: MUTED, lineHeight: 1.5, fontFamily: getSansFont(false) }}>{opt.description}</Text>
                  {opt.monthlyRate > 0 && (
                    <Text style={{ fontSize: 9, color: MUTED, marginTop: 8, fontFamily: getSansFont(true) }}>TAXA: {opt.monthlyRate.toFixed(2)}% A.M.</Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end', marginLeft: 20 }}>
                  <Text style={{ fontSize: 8, color: MUTED, fontFamily: getSansFont(true), letterSpacing: 2, marginBottom: 6 }}>
                    {opt.installments <= 1 ? 'INVESTIMENTO' : `${opt.installments} PARCELAS DE`}
                  </Text>
                  <Text style={{ fontSize: 24, fontFamily: fontSerifBold, color: highlighted ? pri : TEXT_H }}>
                    {fmtCurrency(instValue)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
        <Text style={{ fontSize: 9, color: MUTED, marginTop: 40, lineHeight: 1.6, fontFamily: getSansFont(false), borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 20 }}>
          * Valores sujeitos à aprovação de crédito pelas instituições financeiras. Condições válidas até o término da validade desta proposta.
        </Text>
      </View>
    </Page>
  );
}

function PDFText({ content: c, theme }: { content: TextContent; theme: ProposalTheme }) {
  const plain = (c.html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!plain) return null;
  
  return (
    <Page size="A4" style={[s.page, { fontFamily: getSansFont() }]}>
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
      title={`Proposta Corporativa — ${clientName}`}
      author="Quark Energia"
      subject="Proposta de Engenharia Solar"
      creator="Quark OS"
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
            return <PDFText key={block.id} content={block.content as TextContent} theme={theme} />;
          default:
            return null;
        }
      })}
    </Document>
  );
}
