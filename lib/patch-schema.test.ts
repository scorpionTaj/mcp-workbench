import { describe, expect, it } from "vitest";
import { z } from "zod";
import { patchSchema } from "./patch-schema";

describe("patchSchema", () => {
  const create = z.object({
    name: z.string().min(1),
    enabled: z.boolean().default(true),
    files: z.record(z.string(), z.string()).default({}),
  });

  it("leaves omitted fields out instead of filling defaults", () => {
    expect(patchSchema(create).parse({ enabled: false })).toEqual({ enabled: false });
    expect(patchSchema(create).parse({})).toEqual({});
  });

  it("still validates the fields that are sent", () => {
    expect(patchSchema(create).safeParse({ name: "" }).success).toBe(false);
  });
});
