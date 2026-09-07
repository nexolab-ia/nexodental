import { sql } from "drizzle-orm";
import { check, date, foreignKey, index, pgTable, text, time, uuid, varchar } from "drizzle-orm/pg-core";
import { createdAt, id, organizationId, updatedAt } from "./core";
import { memberships, organizations } from "./tenant";

export const absenceTypes = ["vacation", "medical_leave", "personal", "holiday", "other"] as const;
export const absenceDurations = ["full_day", "specific_hours"] as const;
export const absences = pgTable("absences", {
  id: id(), organizationId: organizationId().references(() => organizations.id, { onDelete: "cascade" }),
  membershipId: uuid("membership_id").notNull().references(() => memberships.id, { onDelete: "cascade" }),
  absenceType: varchar("absence_type", { length: 40 }).notNull(), startsOn: date("starts_on").notNull(), endsOn: date("ends_on").notNull(),
  duration: varchar("duration", { length: 16 }).notNull(), startsAt: time("starts_at"), endsAt: time("ends_at"), description: text("description"),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (table) => [
  check("absences_type_valid", sql`${table.absenceType} IN ('vacation','medical_leave','personal','holiday','other')`),
  check("absences_duration_valid", sql`${table.duration} IN ('full_day','specific_hours')`),
  check("absences_interval_valid", sql`${table.startsOn} <= ${table.endsOn} AND ((${table.duration} = 'full_day' AND ${table.startsAt} IS NULL AND ${table.endsAt} IS NULL) OR (${table.duration} = 'specific_hours' AND ${table.startsOn} = ${table.endsOn} AND ${table.startsAt} IS NOT NULL AND ${table.endsAt} IS NOT NULL AND ${table.startsAt} < ${table.endsAt}))`),
  foreignKey({ columns: [table.membershipId, table.organizationId], foreignColumns: [memberships.id, memberships.organizationId], name: "absences_membership_tenant_fk" }),
  index("absences_scope_idx").on(table.organizationId, table.membershipId),
]);
