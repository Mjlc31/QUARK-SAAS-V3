#!/usr/bin/env node
// Uso: node gerar-contrato.js exemplos/yulia.json [--pdf]
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { gerarContrato } = require('./lib/contrato');

const args = process.argv.slice(2);
const arquivos = args.filter((a) => !a.startsWith('--'));
if (!arquivos.length) {
  console.error('Uso: node gerar-contrato.js <dados.json> [mais.json ...] [--pdf]');
  process.exit(1);
}
fs.mkdirSync('saida', { recursive: true });
for (const arq of arquivos) {
  try {
    const dados = JSON.parse(fs.readFileSync(arq, 'utf8'));
    const { buffer, nomeArquivo, avisos } = gerarContrato(dados);
    const destino = path.join('saida', nomeArquivo);
    fs.writeFileSync(destino, buffer);
    console.log(`✔ ${destino}`);
    avisos.forEach((a) => console.log(`  ⚠ ${a}`));
    if (args.includes('--pdf')) {
      execFileSync('soffice', ['--headless', '--convert-to', 'pdf', '--outdir', 'saida', destino], { stdio: 'ignore' });
      console.log(`✔ ${destino.replace(/\.docx$/, '.pdf')}`);
    }
  } catch (e) {
    console.error(`✖ ${arq}: ${e.message}`);
    process.exitCode = 1;
  }
}
