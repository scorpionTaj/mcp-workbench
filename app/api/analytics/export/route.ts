import { NextResponse } from "next/server";
import { withUser } from "@/lib/api";
import { usageByDay, usageByModel, usageScope } from "@/lib/analytics";
import { buildAnalyticsCsv, parseExportRange } from "@/lib/analytics-csv";

export const dynamic = "force-dynamic";

/** Usage as CSV for ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive, UTC): per-day, per-model and total rows. */
export const GET = withUser(async (req, user) => {
  const params = new URL(req.url).searchParams;
  const range = parseExportRange(params.get("from"), params.get("to"));
  if ("error" in range) return NextResponse.json({ error: range.error }, { status: 400 });

  const scope = usageScope(user.id, range.since, range.until);
  const [daily, models] = await Promise.all([usageByDay(scope), usageByModel(scope)]);
  const csv = buildAnalyticsCsv({ from: range.from, to: range.to, daily, models });
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="usage-${range.from}-to-${range.to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
