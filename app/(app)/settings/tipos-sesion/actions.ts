"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/db/client";
import { authorize } from "@/features/tenant-identity/authorize";
import { requestTenantContext } from "@/lib/request-context";
import { runAsTenant } from "@/lib/tenancy";

function field(formData: FormData, name: string): string { return String(formData.get(name) ?? "").trim(); }
function duration(formData: FormData): number {
  const value = Number(field(formData, "durationMinutes"));
  if (![15, 30, 45, 60].includes(value)) throw new Error("Selecciona una duración de 15, 30, 45 o 60 minutos.");
  return value;
}
function name(formData: FormData): string {
  const value = field(formData, "name");
  if (value.length < 2 || value.length > 120) throw new Error("El nombre debe tener entre 2 y 120 caracteres.");
  return value;
}
function description(formData: FormData): string {
  const value = field(formData, "description");
  if (value.length > 150) throw new Error("La descripción no puede superar los 150 caracteres.");
  return value;
}

async function manage(work: (actor: Awaited<ReturnType<typeof requestTenantContext>>) => Promise<void>) {
  const actor = await requestTenantContext();
  authorize(actor, "organization:manage");
  await work(actor);
  revalidatePath("/settings/tipos-sesion");
  revalidatePath("/agenda");
}

export async function createSessionType(formData: FormData): Promise<void> {
  await manage(async (actor) => runAsTenant(sql, actor, async (tx) => {
    await tx`INSERT INTO session_types (organization_id, name, duration_minutes, description) VALUES (${actor.organizationId}, ${name(formData)}, ${duration(formData)}, ${description(formData)})`;
  }));
}

export async function updateSessionType(formData: FormData): Promise<void> {
  await manage(async (actor) => runAsTenant(sql, actor, async (tx) => {
    const id = field(formData, "id");
    const updated = await tx`UPDATE session_types SET name = ${name(formData)}, duration_minutes = ${duration(formData)}, description = ${description(formData)}, updated_at = now() WHERE id = ${id} AND organization_id = ${actor.organizationId} RETURNING id`;
    if (!updated.length) throw new Error("El tipo de sesión ya no está disponible.");
  }));
}

export async function toggleSessionType(formData: FormData): Promise<void> {
  await manage(async (actor) => runAsTenant(sql, actor, async (tx) => {
    const id = field(formData, "id"); const active = field(formData, "active") === "true";
    const updated = await tx`UPDATE session_types SET active = ${active}, updated_at = now() WHERE id = ${id} AND organization_id = ${actor.organizationId} RETURNING id`;
    if (!updated.length) throw new Error("El tipo de sesión ya no está disponible.");
  }));
}
