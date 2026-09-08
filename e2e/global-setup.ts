import { mkdir } from "node:fs/promises";
import { request, type FullConfig } from "@playwright/test";
import { demoCredentials } from "./fixtures/env";

export default async function prepararSesionDemo(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;
  if (typeof baseURL !== "string") {
    throw new Error("Playwright necesita una baseURL válida para preparar la sesión demo.");
  }

  const contexto = await request.newContext({ baseURL });
  const respuesta = await contexto.post("/api/auth/sign-in/email", {
    data: demoCredentials,
  });
  if (!respuesta.ok()) {
    await contexto.dispose();
    throw new Error(`No se pudo preparar la sesión demo (HTTP ${respuesta.status()}).`);
  }

  await mkdir("e2e/.auth", { recursive: true });
  await contexto.storageState({ path: "e2e/.auth/demo.json" });
  await contexto.dispose();
}
