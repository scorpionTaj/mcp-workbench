import { describe, expect, it } from "vitest";
import { billingConfig, effectiveDailyLimitUsd, hasPaidAccess, proDailyLimitUsd } from "@/lib/billing-plan";

const configured = {
  NODE_ENV: "production",
  BETTER_AUTH_URL: "https://cloud.example.com",
  STRIPE_SECRET_KEY: "sk_test_example",
  STRIPE_WEBHOOK_SECRET: "whsec_example",
  STRIPE_PRICE_PRO: "price_pro",
  STRIPE_PRO_DAILY_LIMIT_USD: "12.50",
};

describe("billing configuration", () => {
  it("enables billing only when a complete production configuration is valid", () => {
    expect(billingConfig(configured)).toMatchObject({
      enabled: true,
      priceId: "price_pro",
      dailyLimitUsd: 12.5,
      appOrigin: "https://cloud.example.com",
    });
    expect(billingConfig({ ...configured, BETTER_AUTH_URL: "http://cloud.example.com" }).enabled).toBe(false);
    expect(billingConfig({ ...configured, STRIPE_PRO_DAILY_LIMIT_USD: "invalid" }).enabled).toBe(false);
    expect(billingConfig({ ...configured, STRIPE_WEBHOOK_SECRET: "" }).enabled).toBe(false);
    expect(billingConfig({ ...configured, STRIPE_SECRET_KEY: "   " }).enabled).toBe(false);
    expect(billingConfig({ ...configured, STRIPE_WEBHOOK_SECRET: "   " }).enabled).toBe(false);
  });

  it("accepts local development URLs and rejects invalid Pro allowances", () => {
    expect(billingConfig({ ...configured, NODE_ENV: "development", BETTER_AUTH_URL: "http://localhost:3000" }).enabled).toBe(true);
    expect(proDailyLimitUsd({ STRIPE_PRO_DAILY_LIMIT_USD: "0" })).toBeNull();
    expect(proDailyLimitUsd({ STRIPE_PRO_DAILY_LIMIT_USD: "NaN" })).toBeNull();
  });
});

describe("subscription plan access", () => {
  it("grants only active or trialing subscriptions on the configured price", () => {
    expect(hasPaidAccess("active", "price_pro", "price_pro")).toBe(true);
    expect(hasPaidAccess("trialing", "price_pro", "price_pro")).toBe(true);
    expect(hasPaidAccess("past_due", "price_pro", "price_pro")).toBe(false);
    expect(hasPaidAccess("active", "price_other", "price_pro")).toBe(false);
  });

  it("selects the configured allowance for each plan", () => {
    expect(effectiveDailyLimitUsd(1, 12.5, false)).toBe(1);
    expect(effectiveDailyLimitUsd(1, 12.5, true)).toBe(12.5);
    expect(effectiveDailyLimitUsd(null, null, false)).toBeNull();
  });
});
