import { NextResponse } from "next/server";
import { withUser } from "@/lib/api";
import { AccountExportError, buildAccountExport } from "@/lib/account-data";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

export const GET = withUser(async (_req, user) => {
  try {
    const data = await buildAccountExport(user.id);
    if (!data) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    return new NextResponse(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="mcp-workbench-cloud-data-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    if (err instanceof AccountExportError) {
      return NextResponse.json({ error: err.message }, { status: err.status, headers: { "Cache-Control": "no-store" } });
    }
    logger.error({ err, userId: user.id }, "Account data export failed");
    return NextResponse.json({ error: "Could not export account data. Try again or contact support." }, { status: 500 });
  }
}, { rateLimit: "accountExport" });
