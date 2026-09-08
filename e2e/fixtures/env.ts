const email = process.env.E2E_DEMO_EMAIL ?? "emilia.demo@nexodent.invalid";
const password = process.env.E2E_DEMO_PASSWORD;

if (!password) {
  throw new Error(
    "Falta E2E_DEMO_PASSWORD. Define la credencial demo en el entorno antes de ejecutar los tests E2E.",
  );
}

export const demoCredentials = { email, password };
