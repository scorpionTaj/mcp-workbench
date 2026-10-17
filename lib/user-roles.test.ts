import { describe, expect, it } from "vitest";
import { roleChangeProblem, roleChangeSchema } from "./user-roles";

const change = (over: Partial<Parameters<typeof roleChangeProblem>[0]>) =>
  roleChangeProblem({ actorId: "a", targetId: "b", currentRole: "user", newRole: "admin", adminCount: 1, ...over });

describe("user roles", () => {
  it("lets an admin promote and demote others", () => {
    expect(change({})).toBeNull();
    expect(change({ currentRole: "admin", newRole: "user", adminCount: 2 })).toBeNull();
  });

  it("refuses changing your own role", () => {
    expect(change({ targetId: "a" })).toMatch(/your own role/);
  });

  it("keeps at least one admin", () => {
    expect(change({ currentRole: "admin", newRole: "user", adminCount: 1 })).toMatch(/at least one admin/);
    // Re-saving an admin as admin is fine.
    expect(change({ currentRole: "admin", newRole: "admin", adminCount: 1 })).toBeNull();
  });

  it("only accepts known roles", () => {
    expect(roleChangeSchema.safeParse({ role: "admin" }).success).toBe(true);
    expect(roleChangeSchema.safeParse({ role: "owner" }).success).toBe(false);
  });
});
