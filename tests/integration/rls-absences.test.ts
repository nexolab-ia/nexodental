import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import postgres, { type Sql } from "postgres";
import { createMemberAbsence, deleteMemberAbsence, getMemberAbsences } from "@/features/members/absence-actions";
import { runAsTenant, type TenantContext } from "@/lib/tenancy";

const orgA = "11111111-1111-4111-8111-111111111111"; const orgB = "22222222-2222-4222-8222-222222222222";
const userA = "33333333-3333-4333-8333-333333333333"; const userB = "44444444-4444-4444-8444-444444444444";
const memberA = "55555555-5555-4555-8555-555555555555"; const memberB = "66666666-6666-4666-8666-666666666666";
const password = "absence-test-password"; const port = 55443;
let embedded: EmbeddedPostgres; let admin: Sql; let app: Sql; let dataDir: string;
const actor: TenantContext = { membershipId: memberA, organizationId: orgA, role: "organization_admin", siteIds: [], active: true };

beforeAll(async () => {
  dataDir = await mkdtemp(join(tmpdir(), "nexodent-absences-"));
  embedded = new EmbeddedPostgres({ databaseDir: dataDir, port, user: "admin", password, persistent: false, onLog: () => undefined, onError: () => undefined });
  await embedded.initialise(); await embedded.start(); admin = postgres(`postgres://admin:${password}@localhost:${port}/postgres`);
  for (const migration of ["0000_core.sql", "0001_tenant_rls.sql", "0011_absences.sql"]) await admin.unsafe(await readFile(`db/migrations/${migration}`, "utf8"));
  await admin.unsafe(`CREATE ROLE absences_app LOGIN PASSWORD '${password}' NOSUPERUSER NOBYPASSRLS; GRANT USAGE ON SCHEMA public TO absences_app; GRANT SELECT ON memberships TO absences_app; GRANT SELECT, INSERT, UPDATE, DELETE ON absences TO absences_app;
    INSERT INTO organizations(id,type,slug,name) VALUES ('${orgA}','clinic','a','A'),('${orgB}','clinic','b','B');
    INSERT INTO users(id,name,email) VALUES ('${userA}','A','a@test'),('${userB}','B','b@test');
    INSERT INTO memberships(id,organization_id,user_id,role) VALUES ('${memberA}','${orgA}','${userA}','organization_admin'),('${memberB}','${orgB}','${userB}','organization_admin');`);
  app = postgres(`postgres://absences_app:${password}@localhost:${port}/postgres`);
}, 60_000);
afterAll(async () => { await app?.end(); await admin?.end(); await embedded?.stop(); await rm(dataDir, { recursive: true, force: true }); });

describe("absence persistence and forced RLS", () => {
  it("creates, lists, reopens and deletes inside runAsTenant as NOBYPASSRLS", async () => {
    const created = await runAsTenant(app, actor, (tx) => createMemberAbsence(tx, actor, memberA, { absenceType: "vacation", startsOn: "2026-09-07", endsOn: "2026-09-09", duration: "full_day", description: "Descanso" }));
    expect(await runAsTenant(app, actor, (tx) => getMemberAbsences(tx, actor, memberA))).toMatchObject([{ id: created.id, description: "Descanso" }]);
    await runAsTenant(app, actor, (tx) => deleteMemberAbsence(tx, actor, created.id));
    expect(await runAsTenant(app, actor, (tx) => getMemberAbsences(tx, actor, memberA))).toEqual([]);
  });
  it("hides the other tenant and rejects a cross-tenant membership", async () => {
    await admin.unsafe(`INSERT INTO absences(organization_id,membership_id,absence_type,starts_on,ends_on,duration) VALUES ('${orgB}','${memberB}','holiday','2026-09-18','2026-09-18','full_day')`);
    await expect(runAsTenant(app, actor, (tx) => createMemberAbsence(tx, actor, memberB, { absenceType: "personal", startsOn: "2026-09-08", endsOn: "2026-09-08", duration: "full_day" }))).rejects.toThrow("no está disponible");
    expect(await runAsTenant(app, actor, (tx) => tx<{ count: string }[]>`SELECT count(*)::text AS count FROM absences`)).toEqual([{ count: "0" }]);
  });
});
