"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/db/client";
import { authorize } from "@/features/tenant-identity/authorize";
import { requestTenantContext } from "@/lib/request-context";
import { runAsTenant } from "@/lib/tenancy";

function field(formData: FormData, name: string): string { return String(formData.get(name) ?? "").trim(); }
function duration(formData: FormData): number {
  const value = Number(field(formData, "durationMinutes"));
  if (!Number.isInteger(value) || value < 10 || value > 240) throw new Error("La duración debe estar entre 10 y 240 minutos.");
  return value;
}
function name(formData: FormData): string {
  const value = field(formData, "name");
  if (value.length < 2 || value.length > 120) throw new Error("El nombre debe tener entre 2 y 120 caracteres.");
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
    const typeName = name(formData); const durationMinutes = duration(formData);
    const makeDefault = field(formData, "isDefault") === "on";
    if (makeDefault) await tx`UPDATE session_types SET is_default = false, updated_at = now() WHERE organization_id = ${actor.organizationId} AND is_default`;
    await tx`INSERT INTO session_types (organization_id, name, duration_minutes, is_default) VALUES (${actor.organizationId}, ${typeName}, ${durationMinutes}, ${makeDefault})`;
  }));
}

export async function updateSessionType(formData: FormData): Promise<void> {
  await manage(async (actor) => runAsTenant(sql, actor, async (tx) => {
    const id = field(formData, "id");
    const updated = await tx`UPDATE session_types SET name = ${name(formData)}, duration_minutes = ${duration(formData)}, updated_at = now() WHERE id = ${id} AND organization_id = ${actor.organizationId} RETURNING id`;
    if (!updated.length) throw new Error("El tipo de sesión ya no está disponible.");
  }));
}

export async function toggleSessionType(formData: FormData): Promise<void> {
  await manage(async (actor) => runAsTenant(sql, actor, async (tx) => {
    const id = field(formData, "id"); const active = field(formData, "active") === "true";
    const updated = await tx`UPDATE session_types SET active = ${active}, is_default = CASE WHEN ${active} THEN is_default ELSE false END, updated_at = now() WHERE id = ${id} AND organization_id = ${actor.organizationId} RETURNING id`;
    if (!updated.length) throw new Error("El tipo de sesión ya no está disponible.");
  }));
}

export async function setDefaultSessionType(formData: FormData): Promise<void> {
  await manage(async (actor) => runAsTenant(sql, actor, async (tx) => {
    const id = field(formData, "id");
    const target = (await tx<{ id: string }[]>`SELECT id FROM session_types WHERE id = ${id} AND organization_id = ${actor.organizationId} AND active FOR UPDATE`)[0];
    if (!target) throw new Error("Solo puedes marcar como predeterminado un tipo activo.");
    await tx`UPDATE session_types SET is_default = (id = ${id}), updated_at = CASE WHEN is_default <> (id = ${id}) THEN now() ELSE updated_at END WHERE organization_id = ${actor.organizationId}`;
  }));
}
