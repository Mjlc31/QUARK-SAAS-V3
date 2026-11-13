// Fluxo do vendedor no modal real: abrir → editar pagamento → gerar → baixar → enviar para assinatura.
// Backend: rotas Express reais (createContratosRouter) + Supabase falso em memória. Não toca o banco.
import { test, expect } from "@playwright/test";
import express from "express";
import cors from "cors";
import type { AddressInfo } from "net";
import { createRequire } from "module";
import { createContratosRouter } from "../backend/routes/contratos.js";
import { fakeDb } from "../backend/contratos/test/fake-supabase.mjs";

const require = createRequire(import.meta.url);
const PizZip = require("../backend/node_modules/pizzip");

const PROPOSTA = {
  id: "p1", status: "aceita", final_price: 33867, client_name: "Yulia Amaral Almeida", cpf_cnpj: "075.716.334-35", address: "R. João Rodrigues Sampaio",
  city: "Maceió", deleted_at: null, opportunity_id: null, lead_id: "x", phone: "82999990000",
  inputs: { moduleQty: 23, modulePowerW: 710, inverterQty: 1, inverterBrand: "SolPlanet", inverterPowerKw: 15, structureType: "Telhado" },
};

let server: ReturnType<express.Express["listen"]>;
let api = "";
let fake: ReturnType<typeof fakeDb>;

test.beforeAll(async () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.get("/files/:bucket/*rest", (req, res) => {
    const key = `${req.params.bucket}/${(req.params as unknown as { rest: string[] }).rest.join("/")}`;
    res.attachment(String(req.query.dl)).send(fake.files.get(key));
  });
  app.use((req, _res, next) => { (req as unknown as { auth: unknown }).auth = { user: { id: "u-team" }, isTeam: true }; next(); });
  app.use("/api/contratos", createContratosRouter({ db: () => fake.client, converterParaPdf: async () => ({ pdf: Buffer.from("%PDF-1.4 e2e"), aviso: undefined }) }));
  server = app.listen(0);
  api = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  fake = fakeDb({ proposals: [PROPOSTA] }, { signedUrlBase: `${api}/files` });
});
test.afterAll(() => server?.close());

test("proposta aprovada → modal → editar pagamento → gerar → baixar → enviar para assinatura", async ({ page }) => {
  const t0 = Date.now();
  await page.goto(`/e2e/harness/contract-modal.html?api=${encodeURIComponent(api)}&proposta=p1`);
  const field = (label: string) => page.getByLabel(label, { exact: true });

  // Pré-preenchido da proposta, sem redigitar
  await expect(page.getByRole("heading", { name: "Gerar contrato" })).toBeVisible();
  await expect(field("Nome completo / razão social")).toHaveValue("Yulia Amaral Almeida");
  await expect(field("CPF")).toHaveValue("075.716.334-35");
  await expect(page.getByText("16,33 kWp")).toBeVisible();

  // Completa o que o banco não tem: gênero e endereço estruturado
  await page.getByRole("tab", { name: "Feminino" }).click();
  await field("Número").fill("50");
  await field("Complemento").fill("QD I");
  await field("CEP").fill("57046085");
  await field("Bairro").fill("Barro Duro");

  // Pagamento: 23.867 no cartão 18x com juros + 10.000 no PIX
  const gerar = page.getByTestId("gerar-contrato");
  const parcela = page.getByTestId("parcela");
  await parcela.first().getByLabel("Forma de pagamento").selectOption("cartao");
  await parcela.first().locator('input[inputmode="decimal"]').first().fill("23867");
  await expect(page.getByTestId("soma-pagamentos")).toHaveText(/23\.867,00 de R\$\s?33\.867,00/);
  await expect(gerar).toBeDisabled(); // soma não bate → bloqueado
  await parcela.first().locator('input[inputmode="decimal"]').nth(1).fill("18");
  await page.getByRole("button", { name: "Adicionar pagamento" }).click();
  await expect(page.getByTestId("soma-pagamentos")).toHaveText(/33\.867,00 de R\$\s?33\.867,00/);
  await expect(page.getByTestId("previa-31")).toContainText("no cartão de crédito em 18 parcelas com juros; e o valor de R$ 10.000,00 (dez mil reais) à vista, via PIX");

  // Gera
  await expect(gerar).toBeEnabled();
  await gerar.click();
  await expect(page.getByTestId("versao")).toHaveCount(1);
  await expect(page.getByTestId("versao").first()).toContainText("Gerado");
  expect(Date.now() - t0).toBeLessThan(60_000); // critério: < 1 minuto

  // Baixa o DOCX e confere o conteúdo
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("versao").first().getByRole("button", { name: "DOCX" }).click()]);
  expect(download.suggestedFilename()).toBe("CONTRATO - YULIA AMARAL ALMEIDA.docx");
  const fs = await import("fs");
  const xml = new PizZip(fs.readFileSync(await download.path())).file("word/document.xml").asText();
  expect(xml).toContain("BARRO DURO");
  expect(xml).toContain("residente e domiciliad");

  // Envia para assinatura (módulo existente)
  await page.getByRole("button", { name: "Enviar para assinatura" }).click();
  await expect(page.getByTestId("link-assinatura")).toContainText("/assinar/tok-");
  await expect(page.getByTestId("versao").first()).toContainText("Aguardando assinatura");
  expect(fake.tables.documents).toHaveLength(1);
  expect(fake.tables.generated_contracts[0].status).toBe("enviado_assinatura");
});

test("CPF inválido bloqueia a geração", async ({ page }) => {
  await page.goto(`/e2e/harness/contract-modal.html?api=${encodeURIComponent(api)}&proposta=p1`);
  await page.getByLabel("CPF", { exact: true }).fill("11111111111");
  await expect(page.getByText("Documento inválido")).toBeVisible();
  await expect(page.getByTestId("previa-erro")).toBeVisible();
  await expect(page.getByTestId("gerar-contrato")).toBeDisabled();
});
