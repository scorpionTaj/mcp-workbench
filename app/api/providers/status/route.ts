import { NextResponse } from "next/server";
import { getAllProvidersStatus } from "@/lib/llm-providers";
import { withUser } from "@/lib/api";
import logger from "@/lib/logger";

export const GET = withUser(async (_req, user) => {
  try {
    return NextResponse.json(await getAllProvidersStatus(user));
  } catch (error) {
    logger.error({ err: error }, "Error fetching provider statuses");
    return NextResponse.json({ error: "Failed to fetch provider statuses" }, { status: 500 });
  }
});
