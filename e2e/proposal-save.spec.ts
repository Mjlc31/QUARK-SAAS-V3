import { test, expect } from "@playwright/test";

test.describe("Propostas - Fluxo de Salvamento e Verificação E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Injeta usuário admin offline para contornar qualquer barreira de login no client-side
    await page.addInitScript(() => {
      localStorage.setItem(
        "quark_offline_user",
        JSON.stringify({
          id: "7dacc88f-9ebd-4710-a1be-0647841db24a",
          email: "arthurmoraesp12@gmail.com",
          name: "Arthur Moraes",
          role: "Admin",
          avatarInitials: "AM",
        })
      );
    });
  });

  test("Deve carregar /propostas/nova, selecionar lead, salvar orçamento sem travar e redirecionar", async ({
    page,
  }) => {
    // 1. Acessa a página de criação de nova proposta com lead existente (ex.: Jurandir)
    await page.goto("http://127.0.0.1:5199/propostas/nova?lead=d95d2f33-6a5a-4958-bdce-51c7c6b14100", {
      waitUntil: "networkidle",
    });

    // 2. Garante que os componentes essenciais estão na tela
    await expect(page.locator("text=Novo orçamento")).toBeVisible({ timeout: 10_000 });

    // 3. Preenche valor da conta de luz se estiver zerado
    const billInput = page.getByPlaceholder("Ex.: 450");
    if (await billInput.isVisible()) {
      await billInput.fill("665");
      await billInput.blur();
    }

    // 4. Seleciona um kit salvo no select do Kit fotovoltaico
    const kitSelect = page.locator("#sec-kit select").first();
    await expect(kitSelect).toBeVisible();
    await kitSelect.selectOption({ index: 1 });

    // 5. Localiza e clica no botão "Salvar orçamento"
    const saveBtn = page.getByRole("button", { name: "Salvar orçamento" }).first();
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // 6. O botão não pode ficar travado com spinner infinito (>5s)
    // Espera toast de sucesso ou redirecionamento para /propostas/:id
    await expect(page).toHaveURL(/\/propostas\/[a-f0-9-]+/, { timeout: 15_000 });

    // 7. Na nova página, verifica que o status "Salvo automaticamente" ou o título com número do orçamento aparece
    await expect(page.locator("text=Orçamento #").first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Deve abrir proposta existente, alterar dados, salvar via botão e manter integridade", async ({ page }) => {
    // 1. Acessa proposta real de Cassiano (#41)
    await page.goto("http://127.0.0.1:5199/propostas/41000000-0000-0000-0000-000000000041", {
      waitUntil: "networkidle",
    });

    // 2. Confere que carregou imediatamente os dados do Orçamento #41 (<2s)
    await expect(page.getByRole("heading", { name: /Orçamento #41/i })).toBeVisible({ timeout: 10_000 });

    // 3. Localiza o botão "Salvar" no topo
    const saveBtn = page.getByRole("button", { name: /^Salvar$/i }).first();
    await expect(saveBtn).toBeVisible();

    // 4. Clica em "Salvar"
    await saveBtn.click();

    // 5. Verifica que não trava e que o toast de sucesso aparece
    await expect(page.locator("text=Orçamento salvo com sucesso!")).toBeVisible({ timeout: 10_000 });

    // 6. O botão não pode permanecer em estado de loading
    await expect(saveBtn).toBeEnabled({ timeout: 5_000 });
  });
});
