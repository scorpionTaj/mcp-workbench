import { NextResponse } from "next/server";
import { getSecurityInfo } from "@/lib/security";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const securityInfo = getSecurityInfo();

    return NextResponse.json(securityInfo);
  } catch (error) {
    logger.error({ err: error }, "[Security] Error fetching security info");
    return NextResponse.json(
      { error: "Failed to fetch security information" },
      { status: 500 }
    );
  }
}
