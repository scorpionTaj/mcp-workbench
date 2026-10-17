import { NextResponse } from "next/server";
import { z } from "zod";
import { withUser, parseBody } from "@/lib/api";
import { sendUsageReport } from "@/lib/usage-reports";
import logger from "@/lib/logger";

const bodySchema = z.object({ frequency: z.enum(["weekly", "monthly"]) });

/** Emails the latest completed week's or month's report now, e.g. to check it arrives. */
export const POST = withUser(
  async (req, user) => {
    const { data, error } = await parseBody(req, bodySchema);
    if (error) return error;
    try {
      const sent = await sendUsageReport(user.id, data.frequency);
      if (!sent) {
        return NextResponse.json(
          { error: "Email isn't configured on the server (set RESEND_API_KEY or SMTP_URL)" },
          { status: 503 },
        );
      }
      return NextResponse.json({ success: true });
    } catch (err) {
      logger.warn({ err, userId: user.id }, "Usage report send failed");
      return NextResponse.json({ error: "Sending the report failed" }, { status: 502 });
    }
  },
  { rateLimit: "usageReportSend" },
);
