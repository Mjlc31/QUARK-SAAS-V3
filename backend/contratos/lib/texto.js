// Extrai o texto de um .docx, um parágrafo por item (usado na regressão e na tela de assinatura).
const PizZip = require('pizzip');

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decode = (s) => s.replace(/&(amp|lt|gt|quot|apos);/g, (_, e) => ENT[e]);

function paragrafos(buffer) {
  const xml = new PizZip(buffer).file('word/document.xml').asText();
  return xml
    .split(/<\/w:p>/)
    .map((p) => decode([...p.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>/g)].map((m) => m[1] ?? '\t').join('')).trim())
    .filter(Boolean);
}

module.exports = { paragrafos };
