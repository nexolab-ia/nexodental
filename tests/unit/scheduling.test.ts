import { describe, expect, it } from "vitest";
import { assertSantiagoTimezone, isWithinHours, requiresCancellationReason, santiagoLocalToUtc, santiagoOffsetMs, SchedulingValidationError } from "@/features/scheduling/domain";
import { hashPublicToken, validContact } from "@/features/public-booking/service";
import { saveProfessionalAvailability } from "@/features/scheduling/availability-actions";
import { AuthorizationError } from "@/features/tenant-identity/authorize";
import type { TenantContext } from "@/lib/tenancy";

const admin: TenantContext = { membershipId: "admin", organizationId: "org", role: "organization_admin", siteIds: [], active: true };
const professional: TenantContext = { membershipId: "professional", organizationId: "org", role: "professional", siteIds: [], active: true };

describe("scheduling rules", () => {
  it("accepts a Chile-local interval within configured working hours", () => { expect(isWithinHours(new Date("2027-09-06T13:00:00.000Z"), new Date("2027-09-06T13:30:00.000Z"), [{ weekday: "mon", startsAt: "09:00", endsAt: "18:00" }])).toBe(true); });
  it("rejects outside-hours scheduling and non-Chile timezone", () => { expect(isWithinHours(new Date("2027-09-06T11:00:00.000Z"), new Date("2027-09-06T11:30:00.000Z"), [{ weekday: "mon", startsAt: "09:00", endsAt: "18:00" }])).toBe(false); expect(() => assertSantiagoTimezone("UTC")).toThrow(SchedulingValidationError); });
  it("requires a reason to cancel and hashes opaque booking tokens", () => { expect(requiresCancellationReason("cancelled", "")).toBe(false); expect(requiresCancellationReason("cancelled", "Paciente avisó")).toBe(true); expect(hashPublicToken("opaque")).toHaveLength(64); expect(validContact("+56 9 1234 5678")).toBe(true); });
});

describe("Santiago DST conversions", () => {
  it("maps 09:00 local to 13:00Z in winter (UTC-4)", () => {
    const day = new Date("2026-06-15T12:00:00.000Z"); // lunes 15 jun 2026, invierno
    expect(santiagoOffsetMs(day)).toBe(-4 * 3_600_000);
    expect(santiagoLocalToUtc(day, "09:00").toISOString()).toBe("2026-06-15T13:00:00.000Z");
  });
  it("maps 09:00 local to 12:00Z in summer (UTC-3)", () => {
    const day = new Date("2027-01-15T12:00:00.000Z"); // viernes 15 ene 2027, verano
    expect(santiagoOffsetMs(day)).toBe(-3 * 3_600_000);
    expect(santiagoLocalToUtc(day, "09:00").toISOString()).toBe("2027-01-15T12:00:00.000Z");
  });
  it("converts 18:00 local to the correct UTC instant in each season", () => {
    expect(santiagoLocalToUtc(new Date("2026-06-15T12:00:00.000Z"), "18:00").toISOString()).toBe("2026-06-15T22:00:00.000Z");
    expect(santiagoLocalToUtc(new Date("2027-01-15T12:00:00.000Z"), "18:00").toISOString()).toBe("2027-01-15T21:00:00.000Z");
  });
});

describe("professional availability rules", () => {
  const unusedSql = (() => { throw new Error("SQL must not run for rejected input"); }) as never;

  it("rejects invalid time ranges before persistence", async () => {
    await expect(saveProfessionalAvailability(unusedSql, admin, "member", [
      { weekday: "mon", periods: [{ startsAt: "18:00", endsAt: "09:00" }] },
    ])).rejects.toThrow(SchedulingValidationError);
  });

  it("allows professionals to configure only their own availability", async () => {
    await expect(saveProfessionalAvailability(unusedSql, professional, "another-member", [])).rejects.toThrow(AuthorizationError);
  });
});
