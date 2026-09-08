import { expect, test } from "@playwright/test";

test("carga el resumen del dashboard autenticado", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Resumen", level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "Indicadores del día" })).toBeVisible();
});
