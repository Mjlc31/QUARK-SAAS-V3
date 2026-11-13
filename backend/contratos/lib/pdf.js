// DOCX → PDF. Ordem: Gotenberg (GOTENBERG_URL, serviço do docker-compose) → LibreOffice local (soffice).
// Sem nenhum dos dois devolve null: o contrato sai só em .docx e a rota avisa.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

async function viaGotenberg(buffer, url) {
  const form = new FormData();
  form.append('files', new Blob([buffer]), 'contrato.docx');
  const res = await fetch(`${url.replace(/\/$/, '')}/forms/libreoffice/convert`, { method: 'POST', body: form, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`Gotenberg respondeu ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function viaSoffice(buffer) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'contrato-'));
  const docx = path.join(dir, 'contrato.docx');
  fs.writeFileSync(docx, buffer);
  return new Promise((resolve, reject) => {
    execFile('soffice', ['--headless', '--convert-to', 'pdf', '--outdir', dir, docx], { timeout: 90_000 }, (err) => {
      try {
        if (err) return reject(err);
        resolve(fs.readFileSync(path.join(dir, 'contrato.pdf')));
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  });
}

/** Retorna { pdf: Buffer|null, aviso?: string }. Nunca lança: PDF é opcional, o .docx é o documento-base. */
async function converterParaPdf(buffer, env = process.env) {
  const erros = [];
  if (env.GOTENBERG_URL) {
    try { return { pdf: await viaGotenberg(buffer, env.GOTENBERG_URL) }; } catch (e) { erros.push(`Gotenberg: ${e.message}`); }
  }
  try { return { pdf: await viaSoffice(buffer) }; } catch (e) { erros.push(`LibreOffice: ${e.code === 'ENOENT' ? 'não instalado' : e.message}`); }
  return { pdf: null, aviso: `PDF não gerado (${erros.join('; ')}). Contrato salvo apenas em .docx.` };
}

module.exports = { converterParaPdf };
