"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/db/client";
import { authorize } from "@/features/tenant-identity/authorize";
import { requestTenantContext } from "@/lib/request-context";
import { runAsTenant } from "@/lib/tenancy";

function field(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function boxName(formData: FormData): string {
  const value = field(formData, "name");
  if (value.length < 2 || value.length > 120) {
    throw new Error("El nombre debe tener entre 2 y 120 caracteres.");
  }
  return value;
}

function isUniqueViolation(cause: unknown): boolean {
  return typeof cause === "object" && cause !== null && "code" in cause && cause.code === "23505";
}

async function manage(work: (actor: Awaited<ReturnType<typeof requestTenantContext>>) => Promise<void>) {
  const actor = await requestTenantContext();
  authorize(actor, "organization:manage");
  await work(actor);
  revalidatePath("/settings/box");
  revalidatePath("/agenda");
}

export async function createBox(formData: FormData): Promise<void> {
  try {
    await manage(async (actor) => runAsTenant(sql, actor, async (tx) => {
      await tx`
        INSERT INTO boxes (organization_id, site_id, name, active)
        VALUES (${actor.organizationId}, NULL, ${boxName(formData)}, true)
      `;
    }));
  } catch (cause) {
    if (isUniqueViolation(cause)) throw new Error("Ya existe un box con ese nombre.");
    throw cause;
  }
}

export async function updateBox(formData: FormData): Promise<void> {
  try {
    await manage(async (actor) => runAsTenant(sql, actor, async (tx) => {
      const updated = await tx`
        UPDATE boxes
        SET name = ${boxName(formData)}, updated_at = now()
        WHERE id = ${field(formData, "id")}
          AND organization_id = ${actor.organizationId}
        RETURNING id
      `;
      if (!updated.length) throw new Error("El box ya no está disponible.");
    }));
  } catch (cause) {
    if (isUniqueViolation(cause)) throw new Error("Ya existe un box con ese nombre.");
    throw cause;
  }
}

export async function toggleBox(formData: FormData): Promise<void> {
  await manage(async (actor) => runAsTenant(sql, actor, async (tx) => {
    const updated = await tx`
      UPDATE boxes
      SET active = ${field(formData, "active") === "true"}, updated_at = now()
      WHERE id = ${field(formData, "id")}
        AND organization_id = ${actor.organizationId}
      RETURNING id
    `;
    if (!updated.length) throw new Error("El box ya no está disponible.");
  }));
}
