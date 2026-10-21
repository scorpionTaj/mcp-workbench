import { emailTransport, escapeHtml } from "@/lib/email";

type Env = Partial<Record<string, string>>;

/**
 * Whether email/password sign-in needs a verified address. REQUIRE_EMAIL_VERIFICATION=true|false
 * decides when set; otherwise it's on only when an email transport exists, so an instance
 * without email never locks its users out.
 */
export function emailVerificationRequired(env: Env = process.env): boolean {
  const flag = env.REQUIRE_EMAIL_VERIFICATION?.trim().toLowerCase();
  if (flag === "true") return true;
  if (flag === "false") return false;
  return emailTransport(env) !== null;
}

function authEmail(subject: string, greeting: string, body: string, action: string, url: string, footer: string) {
  const text = [greeting, body, `${action}: ${url}`, footer].join("\n\n");
  const html = [
    `<p>${escapeHtml(greeting)}</p>`,
    `<p>${escapeHtml(body)}</p>`,
    `<p><a href="${escapeHtml(url)}">${escapeHtml(action)}</a></p>`,
    `<p style="color:#888;font-size:12px">${escapeHtml(footer)}</p>`,
  ].join("\n");
  return { subject, text, html };
}

/** Subject and body of the "confirm your email" message sent on sign-up. */
export function verificationEmail({ name, url }: { name: string; url: string }) {
  return authEmail(
    "Verify your email for MCP Workbench",
    `Hi ${name || "there"},`,
    "Confirm this address to finish setting up your MCP Workbench account. The link expires in 1 hour.",
    "Verify email",
    url,
    "If you didn't create an account, you can ignore this email.",
  );
}

/** Subject and body of the password reset message. */
export function resetPasswordEmail({ name, url }: { name: string; url: string }) {
  return authEmail(
    "Reset your MCP Workbench password",
    `Hi ${name || "there"},`,
    "Someone asked to reset the password for your MCP Workbench account. The link expires in 1 hour, and resetting signs you out everywhere else.",
    "Choose a new password",
    url,
    "If you didn't ask for this, you can ignore this email; your password stays the same.",
  );
}
