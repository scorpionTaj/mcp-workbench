import { NextResponse } from "next/server";
import { getSecurityInfo } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const securityInfo = getSecurityInfo();

    return NextResponse.json(securityInfo);
  } catch (error) {
    console.error("[Security] Error fetching security info:", error);
    return NextResponse.json(
      { error: "Failed to fetch security information" },
      { status: 500 }
    );
  }
}
