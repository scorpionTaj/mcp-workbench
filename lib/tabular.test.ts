import { describe, expect, it } from "vitest";
import { csvToRows, detectDelimiter, parseCsv, profileColumns, rowsToText, toCell } from "./tabular";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, embedded newlines and CRLF", () => {
    const text = '﻿name,quote\r\n"Smith, J","He said ""hi""\nand left"\r\nAda,\r\n';
    expect(parseCsv(text)).toEqual([
      ["name", "quote"],
      ["Smith, J", 'He said "hi"\nand left'],
      ["Ada", ""],
    ]);
  });

  it("detects tab, semicolon and pipe delimiters", () => {
    expect(detectDelimiter("a\tb\tc\n1\t2\t3")).toBe("\t");
    expect(detectDelimiter("a;b\n1;2")).toBe(";");
    expect(parseCsv("a|b\n1|2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("csvToRows", () => {
  it("types cells and dedupes/blank-fills headers", () => {
    const { columns, rows } = csvToRows([
      ["id", "id", "", "ok", "zip"],
      ["1", "2.5", "x", "TRUE", "01234"],
      ["", "NA", "y", "false", "98765"],
    ]);
    expect(columns).toEqual(["id", "id_2", "column_3", "ok", "zip"]);
    expect(rows[0]).toEqual({ id: 1, id_2: 2.5, column_3: "x", ok: true, zip: "01234" });
    expect(rows[1]).toEqual({ id: null, id_2: null, column_3: "y", ok: false, zip: 98765 });
  });
});

describe("profileColumns", () => {
  it("reports types, nulls, numeric stats and top values", () => {
    const rows = [
      { n: 1, city: "Paris", d: "2024-01-01", e: null },
      { n: 3, city: "Paris", d: "2024-02-01", e: null },
      { n: null, city: "Rome", d: "2024-03-01T10:00:00Z", e: null },
    ];
    const [n, city, d, e] = profileColumns(["n", "city", "d", "e"], rows);
    expect(n).toMatchObject({ type: "number", nulls: 1, min: 1, max: 3, mean: 2 });
    expect(city).toMatchObject({ type: "text", distinct: 2, top: [{ value: "Paris", count: 2 }, { value: "Rome", count: 1 }] });
    expect(d.type).toBe("date");
    expect(e).toMatchObject({ type: "empty", nulls: 3 });
  });
});

describe("toCell", () => {
  it("normalizes parquet values", () => {
    expect(toCell(5n)).toBe(5);
    expect(toCell(2n ** 70n)).toBe("1180591620717411303424");
    expect(toCell(new Date("2024-01-02T00:00:00Z"))).toBe("2024-01-02T00:00:00.000Z");
    expect(toCell({ a: 1n })).toBe('{"a":"1"}');
    expect(toCell(undefined)).toBeNull();
  });
});

describe("rowsToText", () => {
  it("writes one record per row, skipping empty fields", () => {
    expect(rowsToText("people.csv", ["name", "age", "note"], [{ name: "Ada", age: 36, note: null }], 1)).toBe(
      "people.csv, row 1. name: Ada; age: 36",
    );
  });
});
