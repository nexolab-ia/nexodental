"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/db/client";
import {
  getProfessionalAvailability as readProfessionalAvailability,
  saveProfessionalAvailability as replaceProfessionalAvailability,
  type AvailabilityDayInput,
} from "@/features/scheduling/availability-actions";
import { requestTenantContext } from "@/lib/request-context";
import { runAsTenant } from "@/lib/tenancy";

export async function getProfessionalAvailability(membershipId: string) {
  const actor = await requestTenantContext();
  return runAsTenant(sql, actor, (tx) => readProfessionalAvailability(tx, actor, membershipId));
}

export async function saveProfessionalAvailability(membershipId: string, days: AvailabilityDayInput[]) {
  const actor = await requestTenantContext();
  const result = await runAsTenant(sql, actor, (tx) => replaceProfessionalAvailability(tx, actor, membershipId, days));
  revalidatePath("/settings/members");
  return result;
}
