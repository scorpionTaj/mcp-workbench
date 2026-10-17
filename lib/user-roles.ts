// Account roles. Shared by the admin API and the Users page; no DB imports here.
import { z } from "zod";

export const ROLES = ["user", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const roleChangeSchema = z.object({ role: z.enum(ROLES) });

/**
 * Why a role change isn't allowed, or null when it is. Admins can't change their own role
 * (no locking yourself out by accident), and the last admin can't be demoted.
 */
export function roleChangeProblem({
  actorId,
  targetId,
  currentRole,
  newRole,
  adminCount,
}: {
  actorId: string;
  targetId: string;
  currentRole: string;
  newRole: Role;
  adminCount: number;
}): string | null {
  if (actorId === targetId) return "You can't change your own role. Ask another admin.";
  if (currentRole === "admin" && newRole !== "admin" && adminCount <= 1) return "There must be at least one admin.";
  return null;
}
