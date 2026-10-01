const fs = require('fs');
let content = fs.readFileSync('src/components/proposal/ProposalPDF.tsx', 'utf8');

const replacementStr = `const PDFSocialProof = ({ content, styles }: { content: SocialProofContent, styles: any }) => {
  const metrics = content.metrics || [
    { label: '+500', sub: 'Projetos Entregues' },
    { label: '100%', sub: 'Satisfação' },
    { label: '25 Anos', sub: 'Garantia de Geração' },
  ];

  return (
  <Page size="A4" style={styles.page}>
    <View style={styles.section}>
      <Text style={styles.sectionTag}>Nossa Qualidade</Text>
      <Text style={styles.sectionH2}>{content.headline}</Text>
      <Text style={styles.sectionSub}>{content.subheadline}</Text>

      <View style={[styles.kpiGrid, { marginBottom: 30 }]}>
        {metrics.map((m, i) => (
          <View key={i} style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{m.label}</Text>
            <Text style={styles.kpiLabel}>{m.sub}</Text>
          </View>
        ))}
      </View>

      {content.images && content.images.length > 0 && (
        <View style={styles.imageGrid}>
          {content.images.slice(0, 4).map((img, i) => (
            <View key={i} style={styles.imageCard}>
              <Image src={img.url} style={styles.imageStyle} />
              <Text style={styles.imageCaption}>{img.caption}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  </Page>
)};`;

content = content.replace(/const PDFSocialProof \= \(\{ content, styles \}\: \{ content\: SocialProofContent, styles\: any \}\) \=\> \(\n  <Page size\="A4" style=\{styles\.page\}>\n    <View style=\{styles\.section\}>\n      <Text style=\{styles\.sectionTag\}>Nossa Qualidade<\/Text>\n      <Text style=\{styles\.sectionH2\}>\{content\.headline\}<\/Text>\n      <Text style=\{styles\.sectionSub\}>\{content\.subheadline\}<\/Text>\n\n      \{content\.images && content\.images\.length > 0 && \(\n        <View style=\{styles\.imageGrid\}>\n          \{content\.images\.slice\(0, 4\)\.map\(\(img, i\) \=\> \(\n            <View key=\{i\} style=\{styles\.imageCard\}>\n              <Image src=\{img\.url\} style=\{styles\.imageStyle\} \/>\n              <Text style=\{styles\.imageCaption\}>\{img\.caption\}<\/Text>\n            <\/View>\n          \)\)\}\n        <\/View>\n      \)\}\n    <\/View>\n  <\/Page>\n\);/, replacementStr);

fs.writeFileSync('src/components/proposal/ProposalPDF.tsx', content);
