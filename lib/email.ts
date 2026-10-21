import logger from "@/lib/logger";

/**
 * Outgoing email. The transport is chosen from the environment:
 * RESEND_API_KEY sends through Resend's HTTP API, SMTP_URL (smtp[s]://user:pass@host:port)
 * through any SMTP server. With neither set, sending is a no-op that logs one line.
 * EMAIL_FROM is the sender address ("MCP Workbench Cloud <bot@example.com>").
 */
export interface Email {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Resend deduplicates retries with the same key for 24 hours. */
  idempotencyKey?: string;
  /** Small text attachments (e.g. a CSV), sent inline with the message. */
  attachments?: { filename: string; content: string; contentType: string }[];
}

export type EmailTransport = "resend" | "smtp" | null;

export function emailTransport(env: Partial<Record<string, string>> = process.env): EmailTransport {
  if (env.RESEND_API_KEY) return "resend";
  if (env.SMTP_URL) return "smtp";
  return null;
}

const fromAddress = () => process.env.EMAIL_FROM || "MCP Workbench Cloud <onboarding@resend.dev>";

async function sendWithResend(email: Email) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      ...(email.idempotencyKey && { "Idempotency-Key": email.idempotencyKey }),
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [email.to],
      subject: email.subject,
      text: email.text,
      html: email.html,
      // Resend takes attachment content as base64.
      attachments: email.attachments?.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content).toString("base64"),
        content_type: a.contentType,
      })),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Resend responded ${res.status}${body.message ? `: ${body.message}` : ""}`);
  }
}

let smtp: import("nodemailer").Transporter | undefined;

async function sendWithSmtp(email: Email) {
  if (!smtp) {
    const nodemailer = await import("nodemailer");
    smtp = nodemailer.createTransport(process.env.SMTP_URL);
  }
  await smtp.sendMail({
    from: fromAddress(),
    to: email.to,
    subject: email.subject,
    text: email.text,
    html: email.html,
    attachments: email.attachments,
  });
}

/** Sends one email; returns false when no transport is configured. Throws if the transport fails. */
export async function sendEmail(email: Email): Promise<boolean> {
  const transport = emailTransport();
  if (!transport) {
    logger.info({ subject: email.subject }, "Email not sent: set RESEND_API_KEY or SMTP_URL to enable email");
    return false;
  }
  if (transport === "resend") await sendWithResend(email);
  else await sendWithSmtp(email);
  return true;
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
