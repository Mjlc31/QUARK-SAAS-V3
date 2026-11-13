import express from 'express';
import { createRequire } from 'module';
import { supabaseAs } from '../services/supabase.js';

const require = createRequire(import.meta.url);
const { gerarContrato, montarCampos, ErroValidacao } = require('../contratos/lib/contrato.js');
const { mapearPropostaParaContrato, paraDocumentoAssinatura } = require('../contratos/lib/adapter.js');
const { converterParaPdf: converterPadrao } = require('../contratos/lib/pdf.js');
const { paragrafos } = require('../contratos/lib/texto.js');

const BUCKET = 'contratos';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VERSAO_COLS = 'id, proposal_id, version, status, warnings, docx_path, pdf_path, document_id, created_by, created_at';

class HttpError extends Error {
  constructor(status, msg) { super(msg); this.status = status; }
}

const tokenOf = (req) => String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');

/**
 * db(req) devolve o cliente Supabase da requisição (padrão: JWT do usuário, RLS ativa).
 * converterParaPdf é injetável para os testes.
 */
export function createContratosRouter({ db = (req) => supabaseAs(tokenOf(req)), converterParaPdf = converterPadrao } = {}) {
  const router = express.Router();

  const handle = (fn) => async (req, res) => {
    try {
      await fn(req, res);
    } catch (e) {
      if (e instanceof ErroValidacao) return res.status(422).json({ success: false, error: e.message });
      if (e instanceof HttpError) return res.status(e.status).json({ success: false, error: e.message });
      console.error('[Contratos]', e);
      res.status(500).json({ success: false, error: 'Erro interno ao processar o contrato' });
    }
  };

  async function carregarProposta(sb, propostaId) {
    const { data: proposta, error } = await sb.from('proposals').select('*').eq('id', propostaId).is('deleted_at', null).maybeSingle();
    if (error) throw error;
    if (!proposta) throw new HttpError(404, 'Proposta não encontrada');
    if (proposta.status !== 'aceita') throw new HttpError(409, 'Só é possível gerar contrato de proposta aprovada (aceita)');
    return proposta;
  }

  async function carregarOportunidade(sb, proposta) {
    const id = [proposta.opportunity_id, proposta.lead_id].find((v) => UUID.test(v || ''));
    if (!id) return null;
    const { data } = await sb.from('opportunities').select('client_name, title, cpf_cnpj, address, city, phone, email').eq('id', id).maybeSingle();
    return data;
  }

  async function listarVersoes(sb, propostaId) {
    const { data, error } = await sb.from('generated_contracts').select(VERSAO_COLS).eq('proposal_id', propostaId).order('version', { ascending: false });
    if (error) throw error;
    return data;
  }

  // Dados pré-preenchidos para o modal + avisos/pendências do gerador.
  router.get('/:propostaId/preview-dados', handle(async (req, res) => {
    const sb = db(req);
    const proposta = await carregarProposta(sb, req.params.propostaId);
    const [oportunidade, versoes] = await Promise.all([carregarOportunidade(sb, proposta), listarVersoes(sb, proposta.id)]);
    let anterior = null;
    if (versoes[0]) {
      const { data } = await sb.from('generated_contracts').select('input_snapshot').eq('id', versoes[0].id).single();
      anterior = data?.input_snapshot ?? null;
    }
    const dados = mapearPropostaParaContrato(proposta, { oportunidade, anterior });
    let campos = null, avisos = [], pendencias = [];
    try {
      ({ campos, avisos } = montarCampos(dados));
    } catch (e) {
      if (!(e instanceof ErroValidacao)) throw e;
      pendencias = e.message.replace(/^Dados incompletos:\n- /, '').split('\n- ');
    }
    res.json({ success: true, dados, campos, avisos, pendencias, versoes, proposta: { id: proposta.id, number: proposta.number, final_price: proposta.final_price } });
  }));

  // Prévia dos campos (cláusula 3.1, kWp, extenso) para os dados que estão no modal. 422 se inválidos.
  router.post('/:propostaId/previa', handle(async (req, res) => {
    const { campos, avisos } = montarCampos(req.body?.dados || {});
    res.json({ success: true, campos, avisos });
  }));

  // Gera DOCX (+PDF), salva no Storage e registra nova versão. Nunca sobrescreve uma versão anterior.
  router.post('/:propostaId/gerar', handle(async (req, res) => {
    const sb = db(req);
    const proposta = await carregarProposta(sb, req.params.propostaId);
    const dados = req.body?.dados;
    if (!dados || typeof dados !== 'object') throw new ErroValidacao('Envie os dados do contrato em { dados }');

    const { buffer, nomeArquivo, avisos, campos } = gerarContrato(dados); // ErroValidacao → 422 antes de gravar qualquer coisa
    if (Math.abs(Number(dados.valor_total) - Number(proposta.final_price)) > 0.009) {
      avisos.push(`valor do contrato difere do valor aprovado na proposta (R$ ${Number(proposta.final_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`);
    }

    // 1) registra como rascunho: o banco atribui a versão (trigger) e o snapshot fica imutável
    const { data: row, error: insErr } = await sb.from('generated_contracts')
      .insert({ proposal_id: proposta.id, opportunity_id: UUID.test(proposta.opportunity_id || '') ? proposta.opportunity_id : null, input_snapshot: dados, fields: campos, warnings: avisos, file_name: nomeArquivo, status: 'rascunho' })
      .select(VERSAO_COLS).single();
    if (insErr) throw insErr;

    // 2) arquivos no bucket privado; se falhar, a versão fica como rascunho (rastro do que houve)
    const base = `${proposta.id}/v${row.version}`;
    const up = await sb.storage.from(BUCKET).upload(`${base}/contrato.docx`, buffer, { contentType: DOCX_MIME, upsert: false });
    if (up.error) throw up.error;
    const { pdf, aviso } = await converterParaPdf(buffer);
    if (aviso) avisos.push(aviso);
    let pdfPath = null;
    if (pdf) {
      const upPdf = await sb.storage.from(BUCKET).upload(`${base}/contrato.pdf`, pdf, { contentType: 'application/pdf', upsert: false });
      if (upPdf.error) avisos.push(`PDF não salvo: ${upPdf.error.message}`);
      else pdfPath = `${base}/contrato.pdf`;
    }

    const { data: final, error: updErr } = await sb.from('generated_contracts')
      .update({ docx_path: `${base}/contrato.docx`, pdf_path: pdfPath, warnings: avisos, status: 'gerado' })
      .eq('id', row.id).select(VERSAO_COLS).single();
    if (updErr) throw updErr;
    res.status(201).json({ success: true, contrato: final, avisos, campos });
  }));

  // URL assinada (2 min) para baixar a versão em docx ou pdf.
  router.get('/:id/download', handle(async (req, res) => {
    const formato = req.query.formato === 'pdf' ? 'pdf' : 'docx';
    const sb = db(req);
    const { data: row, error } = await sb.from('generated_contracts').select('docx_path, pdf_path, file_name, version').eq('id', req.params.id).maybeSingle();
    if (error) throw error;
    if (!row) throw new HttpError(404, 'Contrato não encontrado');
    const caminho = formato === 'pdf' ? row.pdf_path : row.docx_path;
    if (!caminho) throw new HttpError(404, formato === 'pdf' ? 'Esta versão não tem PDF' : 'Arquivo ainda não foi gerado');
    const nome = row.file_name.replace(/\.docx$/, `${row.version > 1 ? ` (v${row.version})` : ''}.${formato}`);
    const { data, error: urlErr } = await sb.storage.from(BUCKET).createSignedUrl(caminho, 120, { download: nome });
    if (urlErr) throw urlErr;
    res.json({ success: true, url: data.signedUrl, nome });
  }));

  // Liga a versão ao módulo de assinatura existente (documents + document_signers).
  router.post('/:id/enviar-assinatura', handle(async (req, res) => {
    const sb = db(req);
    const { data: row, error } = await sb.from('generated_contracts').select('id, proposal_id, opportunity_id, version, status, input_snapshot, fields, docx_path').eq('id', req.params.id).maybeSingle();
    if (error) throw error;
    if (!row) throw new HttpError(404, 'Contrato não encontrado');
    if (row.status !== 'gerado') throw new HttpError(409, row.status === 'rascunho' ? 'Esta versão não terminou de ser gerada' : 'Esta versão já foi enviada para assinatura');

    const { data: proposta } = await sb.from('proposals').select('id, lead_id, phone, email').eq('id', row.proposal_id).maybeSingle();
    const file = await sb.storage.from(BUCKET).download(row.docx_path);
    if (file.error) throw file.error;
    const texto = paragrafos(Buffer.from(await file.data.arrayBuffer()));
    const data = paraDocumentoAssinatura({
      dados: row.input_snapshot, campos: row.fields, paragrafos: texto,
      telefone: proposta?.phone || '', email: proposta?.email || '', contratoId: row.id, versao: row.version,
    });
    const kwp = row.fields.potencia_kwp;
    const userId = req.auth?.user?.id;

    const { data: doc, error: docErr } = await sb.from('documents').insert({
      kind: 'contrato', title: `Contrato — ${row.fields.cliente_nome} · ${kwp} kWp (v${row.version})`,
      lead_id: proposta?.lead_id || null, opportunity_id: row.opportunity_id, data, status: 'enviado', user_id: userId, created_by: userId,
    }).select('id').single();
    if (docErr) throw docErr;

    const { data: signers, error: sgErr } = await sb.from('document_signers').insert([
      { document_id: doc.id, role: 'contratada', name: `${data.contractor.repName} (${data.contractor.name})`, cpf: data.contractor.repDoc, position: 0,
        signed_at: new Date().toISOString(), signature: data.contractorSignature, signed_name: data.contractor.repName },
      { document_id: doc.id, role: 'contratante', name: data.client.name, cpf: data.client.doc, phone: data.client.phone || null, email: data.client.email || null, position: 1 },
    ]).select('role, token');
    if (sgErr) throw sgErr;

    const { error: updErr } = await sb.from('generated_contracts').update({ status: 'enviado_assinatura', document_id: doc.id }).eq('id', row.id);
    if (updErr) throw updErr;
    const token = signers.find((s) => s.role === 'contratante')?.token;
    res.json({ success: true, document_id: doc.id, sign_token: token });
  }));

  return router;
}

export default createContratosRouter();
