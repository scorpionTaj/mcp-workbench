import { NextResponse } from "next/server";
import { count, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withUser, parseBody, notFound } from "@/lib/api";
import { roleChangeProblem, roleChangeSchema } from "@/lib/user-roles";
import logger from "@/lib/logger";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Admins: change another account's role. Takes effect on that user's next request, since the
 * session is read from the database every time.
 */
export const PATCH = withUser<Ctx>(
  async (req, admin, { params }) => {
    const { id } = await params;
    const { data, error } = await parseBody(req, roleChangeSchema);
    if (error) return error;

    const result = await db.transaction(async (tx) => {
      // Serialize role changes so two admins demoting each other can't leave none.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('user-role-change'))`);
      const target = await tx.query.user.findFirst({ where: eq(schema.user.id, id) });
      if (!target) return null;
      const [{ admins }] = await tx.select({ admins: count() }).from(schema.user).where(eq(schema.user.role, "admin"));
      const problem = roleChangeProblem({
        actorId: admin.id,
        targetId: id,
        currentRole: target.role,
        newRole: data.role,
        adminCount: admins,
      });
      if (problem) return { problem };
      await tx.update(schema.user).set({ role: data.role, updatedAt: new Date() }).where(eq(schema.user.id, id));
      return { from: target.role };
    });

    if (!result) return notFound();
    if ("problem" in result) return NextResponse.json({ error: result.problem }, { status: 409 });
    logger.info({ adminId: admin.id, userId: id, from: result.from, to: data.role }, "User role changed");
    return NextResponse.json({ id, role: data.role });
  },
  { admin: true },
);
