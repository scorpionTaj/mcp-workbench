type Env = Record<string, string | undefined>;

export function proDailyLimitUsd(env: Env = process.env): number | null {
  const raw = env.STRIPE_PRO_DAILY_LIMIT_USD?.trim();
  if (!raw) return null;
  const limit = Number(raw);
  return Number.isFinite(limit) && limit > 0 ? limit : null;
}

export function billingConfig(env: Env = process.env) {
  const secretKey = env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim();
  const priceId = env.STRIPE_PRICE_PRO?.trim();
  const appUrl = env.BETTER_AUTH_URL?.trim();
  let appOrigin: string | null = null;
  try {
    const parsed = new URL(appUrl || "");
    if (parsed.protocol === "https:" || env.NODE_ENV !== "production") appOrigin = parsed.origin;
  } catch {}
  return {
    enabled: Boolean(
      secretKey && webhookSecret && priceId && proDailyLimitUsd(env) !== null && appOrigin,
    ),
    priceId: priceId || null,
    dailyLimitUsd: proDailyLimitUsd(env),
    appOrigin,
  };
}

export function hasPaidAccess(
  status: string | null | undefined,
  priceId: string | null | undefined,
  configuredPriceId: string | null | undefined,
): boolean {
  return (status === "active" || status === "trialing") && Boolean(configuredPriceId && priceId === configuredPriceId);
}

export function effectiveDailyLimitUsd(freeLimit: number | null, proLimit: number | null, isPro: boolean) {
  return isPro ? proLimit : freeLimit;
}
