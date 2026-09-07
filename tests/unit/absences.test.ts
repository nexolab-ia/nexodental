import { describe, expect, it } from "vitest";
import { AbsenceValidationError, validateAbsenceInput } from "@/features/members/absence-actions";

describe("member absence rules", () => {
  it("accepts a full-day range and clears hours", () => {
    expect(validateAbsenceInput({ absenceType: "vacation", startsOn: "2026-09-07", endsOn: "2026-09-10", duration: "full_day", startsAt: "09:00", endsAt: "18:00" })).toMatchObject({ startsAt: null, endsAt: null });
  });
  it("requires specific hours to stay in one day", () => {
    expect(() => validateAbsenceInput({ absenceType: "personal", startsOn: "2026-09-07", endsOn: "2026-09-08", duration: "specific_hours", startsAt: "09:00", endsAt: "12:00" })).toThrow(AbsenceValidationError);
  });
  it("rejects reversed hours and invalid date ranges", () => {
    expect(() => validateAbsenceInput({ absenceType: "medical_leave", startsOn: "2026-09-07", endsOn: "2026-09-07", duration: "specific_hours", startsAt: "14:00", endsAt: "10:00" })).toThrow("La hora de fin");
    expect(() => validateAbsenceInput({ absenceType: "other", startsOn: "2026-09-10", endsOn: "2026-09-07", duration: "full_day" })).toThrow("rango de fechas válido");
    expect(() => validateAbsenceInput({ absenceType: "other", startsOn: "2026-02-30", endsOn: "2026-03-01", duration: "full_day" })).toThrow("rango de fechas válido");
  });
});
