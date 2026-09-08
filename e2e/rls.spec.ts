import { expect, test } from "@playwright/test";
const otraOrganizacionId = "10000000-0000-4000-8000-000000000004";

test("mantiene al usuario demo acotado a su organización", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.locator(".tenant-identity")).toHaveText("Clínica Sonrisa Andes");

  // Un identificador externo controlado por el cliente no debe cambiar el tenant de la sesión.
  await page.goto(`/settings/organizacion?organizationId=${otraOrganizacionId}`);
  await expect(page.getByLabel("Nombre de la clínica")).toHaveValue("Clínica Sonrisa Andes");
  await expect(page.getByText("Dra. Valentina Rojas", { exact: true })).toHaveCount(0);
  await expect(page.locator(".tenant-identity")).toHaveText("Clínica Sonrisa Andes");
});
