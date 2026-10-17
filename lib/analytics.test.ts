import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { usageScope } from "./analytics";

describe("usageScope", () => {
  const dialect = new PgDialect();

  // postgres.js can't serialize a Date bound into raw SQL (the CSV export used to 500).
  it("binds date bounds as ISO strings, not Date objects", () => {
    const since = new Date("2026-09-18T00:00:00Z");
    const until = new Date("2026-10-18T00:00:00Z");
    const { sql: text, params } = dialect.sqlToQuery(usageScope("u1", since, until));
    expect(params).toEqual(["u1", since.toISOString(), until.toISOString()]);
    expect(params.some((p) => p instanceof Date)).toBe(false);
    expect(text).toContain("::timestamp");
  });

  it("accepts a SQL expression as the lower bound", () => {
    const { params } = dialect.sqlToQuery(usageScope("u1", sql`now() - interval '30 days'`));
    expect(params).toEqual(["u1"]);
  });
});
