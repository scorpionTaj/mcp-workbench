import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const h = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  findBillingAccount: vi.fn(),
  findUser: vi.fn(),
  saveSubscription: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("drizzle-orm", () => ({ eq: (...args: unknown[]) => args }));
vi.mock("@/lib/billing", () => ({
  billingConfig: () => ({ enabled: true }),
  saveSubscriptionFromEvent: h.saveSubscription,
  stripeClient: () => ({ webhooks: { constructEvent: h.constructEvent } }),
}));
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      billingAccounts: { findFirst: h.findBillingAccount },
      user: { findFirst: h.findUser },
    },
  },
  schema: {
    billingAccounts: { stripeCustomerId: "stripeCustomerId" },
    user: { id: "id" },
  },
}));
vi.mock("@/lib/logger", () => ({ default: { warn: h.logWarn, error: h.logError } }));

const { POST } = await import("@/app/api/billing/webhook/route");

function eventRequest(signature?: string) {
  return new Request("https://cloud.example.com/api/billing/webhook", {
    method: "POST",
    body: "raw-stripe-payload",
    headers: signature ? { "stripe-signature": signature } : {},
  });
}

function subscriptionEvent(userId = "user_1"): Stripe.Event {
  const subscription = {
    id: "sub_1",
    customer: "cus_1",
    metadata: { userId },
    items: { data: [] },
  } as unknown as Stripe.Subscription;
  return {
    id: "evt_1",
    type: "customer.subscription.created",
    created: 1_800_000_000,
    data: { object: subscription },
  } as Stripe.Event;
}

beforeEach(() => {
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
  h.constructEvent.mockReset();
  h.findBillingAccount.mockReset();
  h.findUser.mockReset();
  h.saveSubscription.mockReset();
  h.findBillingAccount.mockResolvedValue(undefined);
  h.findUser.mockResolvedValue({ id: "user_1" });
});

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/billing/webhook", () => {
  it("rejects missing and invalid signatures", async () => {
    const missing = await POST(eventRequest());
    expect(missing.status).toBe(400);

    h.constructEvent.mockImplementation(() => { throw new Error("bad signature"); });
    const invalid = await POST(eventRequest("invalid"));
    expect(invalid.status).toBe(400);
  });

  it("acknowledges unrelated signed events without writing billing state", async () => {
    h.constructEvent.mockReturnValue({ id: "evt_2", type: "invoice.paid" } as Stripe.Event);

    const response = await POST(eventRequest("valid"));

    expect(response.status).toBe(200);
    expect(h.saveSubscription).not.toHaveBeenCalled();
  });

  it("stores a subscription only for its mapped account", async () => {
    const event = subscriptionEvent();
    h.constructEvent.mockReturnValue(event);

    const response = await POST(eventRequest("valid"));

    expect(response.status).toBe(200);
    expect(h.findUser).toHaveBeenCalledWith({ where: ["id", "user_1"] });
    expect(h.saveSubscription).toHaveBeenCalledWith("user_1", event.data.object, event.created);
  });

  it("rejects subscription metadata that conflicts with the Stripe customer mapping", async () => {
    h.findBillingAccount.mockResolvedValue({ userId: "user_2" });
    h.constructEvent.mockReturnValue(subscriptionEvent("user_1"));

    const response = await POST(eventRequest("valid"));

    expect(response.status).toBe(400);
    expect(h.saveSubscription).not.toHaveBeenCalled();
    expect(h.findUser).not.toHaveBeenCalled();
  });
});
