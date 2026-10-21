import { afterEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/sentry-config/route";

const originalDsn = process.env.SENTRY_DSN;

afterEach(() => {
  if (originalDsn === undefined) delete process.env.SENTRY_DSN;
  else process.env.SENTRY_DSN = originalDsn;
});

describe("GET /api/sentry-config", () => {
  it("returns no configuration when Sentry is disabled", async () => {
    delete process.env.SENTRY_DSN;

    const response = GET();

    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("reads the DSN at runtime without caching it", async () => {
    process.env.SENTRY_DSN = "https://public@example.ingest.sentry.io/1";

    const response = GET();

    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      dsn: "https://public@example.ingest.sentry.io/1",
    });
  });
});
