import { expect, test } from "@playwright/test";
import { demoCredentials } from "./fixtures/env";
import { esperarFormularioInteractivo } from "./fixtures/auth";

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

test("inicia sesión con las credenciales demo", async ({ page }) => {
  await page.goto("/login");
  await esperarFormularioInteractivo(page);
  await page.getByRole("textbox", { name: "Email" }).fill(demoCredentials.email);
  await page.getByLabel("Contraseña").fill(demoCredentials.password);
  const [respuesta] = await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/auth/sign-in/email")),
    page.getByRole("button", { name: "Entrar" }).click(),
  ]);
  expect(respuesta.ok()).toBe(true);
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/dashboard(?:[/?#]|$)/);
});

test("muestra un error y permanece en login con una credencial inválida", async ({ page }) => {
  await page.goto("/login");
  await esperarFormularioInteractivo(page);
  await page.getByRole("textbox", { name: "Email" }).fill(demoCredentials.email);
  await page.getByLabel("Contraseña").fill("credencial-e2e-invalida");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);
});
