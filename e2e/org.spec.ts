import { expect, test } from "@playwright/test";

test("muestra la organización asignada al usuario demo", async ({ page }) => {
  // La app no ofrece un flujo para crear una segunda organización a un usuario ya incorporado.
  // Verificamos el flujo real de organización sin modificar datos productivos existentes.
  await page.goto("/settings/organizacion");

  await expect(page.getByRole("heading", { name: "Organización", level: 1 })).toBeVisible();
  await expect(page.getByLabel("Nombre de la clínica")).toHaveValue("Clínica Sonrisa Andes");
});
