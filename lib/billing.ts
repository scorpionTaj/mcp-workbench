import "server-only";
import Stripe from "stripe";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
export { billingConfig, effectiveDailyLimitUsd, hasPaidAccess, proDailyLimitUsd } from "@/lib/billing-plan";

type Env = Record<string, string | undefined>;

export function stripeClient(env: Env = process.env): Stripe | null {
  const key = env.STRIPE_SECRET_KEY?.trim();
  return key ? new Stripe(key) : null;
}

export function subscriptionFields(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const firstItem = subscription.items.data[0];
  return {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: firstItem?.price.id ?? null,
    subscriptionStatus: subscription.status,
    currentPeriodEnd: firstItem?.current_period_end ? new Date(firstItem.current_period_end * 1000) : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}

/** Store webhook snapshots monotonically so a delayed event cannot roll back a newer state. */
export async function saveSubscriptionFromEvent(
  userId: string,
  subscription: Stripe.Subscription,
  eventCreated: number,
) {
  const table = schema.billingAccounts;
  const snapshot = subscriptionFields(subscription);
  await db
    .insert(table)
    .values({ ...snapshot, userId, lastStripeEventCreated: eventCreated })
    .onConflictDoUpdate({
      target: table.userId,
      set: { ...snapshot, lastStripeEventCreated: eventCreated, updatedAt: new Date() },
      setWhere: sql`${table.lastStripeEventCreated} IS NULL OR ${table.lastStripeEventCreated} <= ${eventCreated}`,
    });
}

export async function getBillingAccount(userId: string) {
  return db.query.billingAccounts.findFirst({ where: eq(schema.billingAccounts.userId, userId) });
}
