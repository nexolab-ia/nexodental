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
import { createMemberAbsence as insertMemberAbsence, deleteMemberAbsence as removeMemberAbsence, getMemberAbsences as readMemberAbsences, type MemberAbsenceInput } from "@/features/members/absence-actions";

export async function getProfessionalAvailability(membershipId: string) {
  const actor = await requestTenantContext();
  return runAsTenant(sql, actor, (tx) => readProfessionalAvailability(tx, actor, membershipId));
}

export async function getMemberAbsences(membershipId: string) { const actor = await requestTenantContext(); return runAsTenant(sql, actor, (tx) => readMemberAbsences(tx, actor, membershipId)); }
export async function createMemberAbsence(membershipId: string, input: MemberAbsenceInput) { const actor = await requestTenantContext(); const result = await runAsTenant(sql, actor, (tx) => insertMemberAbsence(tx, actor, membershipId, input)); revalidatePath("/settings/members"); return result; }
export async function deleteMemberAbsence(absenceId: string) { const actor = await requestTenantContext(); const result = await runAsTenant(sql, actor, (tx) => removeMemberAbsence(tx, actor, absenceId)); revalidatePath("/settings/members"); return result; }

export async function saveProfessionalAvailability(membershipId: string, days: AvailabilityDayInput[]) {
  const actor = await requestTenantContext();
  const result = await runAsTenant(sql, actor, (tx) => replaceProfessionalAvailability(tx, actor, membershipId, days));
  revalidatePath("/settings/members");
  return result;
}
