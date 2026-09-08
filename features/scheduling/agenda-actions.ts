"use server";

import { requestTenantContext } from "@/lib/request-context";
import { loadAgendaAppointments, type AgendaAppointment } from "./agenda-queries";

export type { AgendaAppointment } from "./agenda-queries";

export async function getAgendaAppointments(from: string, to: string): Promise<AgendaAppointment[]> {
  const startsAt = new Date(from); const endsAt = new Date(to);
  const maximumRange = 8 * 24 * 60 * 60 * 1000;
  if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || startsAt >= endsAt || endsAt.getTime() - startsAt.getTime() > maximumRange) throw new Error("El rango de la agenda no es válido.");
  const actor = await requestTenantContext();
  return loadAgendaAppointments(actor, startsAt.toISOString(), endsAt.toISOString());
}
