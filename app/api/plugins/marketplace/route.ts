import { NextResponse } from "next/server";
import { withUser } from "@/lib/api";
import { listMarketplace } from "@/lib/plugins";

export const maxDuration = 30;

/** GET ?url=<github marketplace repo> → its plugins and which ones can be installed here. */
export const GET = withUser(async (req) => {
  const url = new URL(req.url).searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });
  try {
    return NextResponse.json(await listMarketplace(url.slice(0, 500)));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not read marketplace" }, { status: 400 });
  }
});
