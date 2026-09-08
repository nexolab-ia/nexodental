import type { Page } from "@playwright/test";

export async function esperarFormularioInteractivo(page: Page) {
  // Evita que un clic demasiado temprano ejecute el submit nativo antes de la hidratación de React.
  await page.waitForFunction(() => {
    const form = document.querySelector("form");
    return form && Object.keys(form).some((key) => key.startsWith("__reactProps$"));
  });
}
