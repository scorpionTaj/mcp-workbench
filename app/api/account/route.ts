import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { withUser } from "@/lib/api";
import { deleteUserFiles } from "@/lib/account-data";
import { stripeClient } from "@/lib/billing";
import { db, schema } from "@/lib/db";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

function isMissingStripeResource(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === "resource_missing",
  );
}

export const DELETE = withUser(async (request, user) => {
  const body = await request.json().catch(() => null) as { confirmation?: unknown } | null;
  if (body?.confirmation !== "DELETE") {
    return NextResponse.json({ error: "Type DELETE to confirm account removal" }, { status: 400 });
  }

  const billing = await db.query.billingAccounts.findFirst({ where: eq(schema.billingAccounts.userId, user.id) });
  if (billing) {
    const stripe = stripeClient();
    if (!stripe) {
      return NextResponse.json({ error: "Billing could not be cancelled. Contact support before deleting your account." }, { status: 503 });
    }
    try {
      const customer = await stripe.customers.retrieve(billing.stripeCustomerId).catch((err) => {
        if (isMissingStripeResource(err)) return null;
        throw err;
      });
      if (customer && !("deleted" in customer && customer.deleted)) {
        for await (const subscription of stripe.subscriptions.list({ customer: billing.stripeCustomerId, status: "all", limit: 100 })) {
          if (!["canceled", "incomplete_expired"].includes(subscription.status)) {
            await stripe.subscriptions.cancel(subscription.id).catch((err) => {
              if (!isMissingStripeResource(err)) throw err;
            });
          }
        }
        await stripe.customers.del(billing.stripeCustomerId).catch((err) => {
          if (!isMissingStripeResource(err)) throw err;
        });
      }
    } catch (err) {
      logger.error({ err, userId: user.id }, "Could not cancel Stripe billing before account deletion");
      return NextResponse.json({ error: "Could not cancel billing. Contact support before deleting your account." }, { status: 502 });
    }
  }

  try {
    await deleteUserFiles(user.id);
    await db.delete(schema.feedbacks).where(eq(schema.feedbacks.userId, user.id));
    const [deleted] = await db.delete(schema.user).where(eq(schema.user.id, user.id)).returning({ id: schema.user.id });
    if (!deleted) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    logger.error({ err, userId: user.id }, "Account deletion failed");
    return NextResponse.json({ error: "Account data could not be fully removed. Your account is still available; try again or contact support." }, { status: 503 });
  }
}, { sessionOnly: true, rateLimit: "accountDelete" });
