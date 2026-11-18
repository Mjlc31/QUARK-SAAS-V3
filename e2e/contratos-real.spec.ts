// E2E de ponta a ponta contra o app real (Supabase + backend com a migration 20261113 aplicada).
// Só roda com: E2E_BASE_URL (ex.: http://127.0.0.1:5173), QA_EMAIL, QA_PASSWORD (conta de equipe de teste)
// e QA_PROPOSTA_ID (proposta com status "aceita" e CPF/endereço preenchíveis). Gera uma versão nova de verdade.
import { test, expect } from "@playwright/test";

const { E2E_BASE_URL, QA_EMAIL, QA_PASSWORD, QA_PROPOSTA_ID } = process.env;
test.skip(!E2E_BASE_URL || !QA_EMAIL || !QA_PASSWORD || !QA_PROPOSTA_ID, "defina E2E_BASE_URL, QA_EMAIL, QA_PASSWORD e QA_PROPOSTA_ID");

test("vendedor gera contrato da proposta aprovada e envia para assinatura", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("nome@empresa.com").fill(QA_EMAIL!);
  await page.locator('input[type="password"]').fill(QA_PASSWORD!);
  await page.getByRole("button", { name: /Acessar Sistema/ }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));

  const t0 = Date.now();
  await page.goto(`/propostas/${QA_PROPOSTA_ID}`);
  await page.getByTestId("abrir-gerar-contrato").click();
  const field = (label: string) => page.getByLabel(label, { exact: true });
  await expect(field("Nome completo / razão social")).not.toHaveValue("");

  // Edita o pagamento: tudo no PIX → metade no cartão 10x
  const total = await field("Valor total do contrato").inputValue();
  const parcela = page.getByTestId("parcela");
  if ((await parcela.count()) > 1) for (let i = (await parcela.count()) - 1; i > 0; i--) await parcela.nth(i).getByRole("button", { name: "Remover pagamento" }).click();
  await parcela.first().getByLabel("Forma de pagamento").selectOption("pix");
  await parcela.first().locator('input[inputmode="decimal"]').first().fill(total);
  await expect(page.getByTestId("previa-31")).toContainText("via PIX");

  const gerar = page.getByTestId("gerar-contrato");
  await expect(gerar).toBeEnabled({ timeout: 10_000 });
  const antes = await page.getByTestId("versao").count();
  await gerar.click();
  await expect(page.getByTestId("versao")).toHaveCount(antes + 1, { timeout: 30_000 });
  expect(Date.now() - t0).toBeLessThan(60_000);

  const nova = page.getByTestId("versao").first();
  const [download] = await Promise.all([page.waitForEvent("download"), nova.getByRole("button", { name: "DOCX" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^CONTRATO - .+\.docx$/);

  await nova.getByRole("button", { name: "Enviar para assinatura" }).click();
  await expect(page.getByTestId("link-assinatura")).toContainText("/assinar/");
  const link = (await page.getByTestId("link-assinatura").locator("span").textContent())!;
  await page.goto(link);
  await expect(page.getByText("3.1. O CONTRATANTE pagará")).toBeVisible();
});
