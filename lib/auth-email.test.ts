import { describe, expect, it } from "vitest";
import { emailVerificationRequired, resetPasswordEmail, verificationEmail } from "@/lib/auth-email";

describe("auth email", () => {
  it("requires verification only when email can be sent, unless overridden", () => {
    expect(emailVerificationRequired({})).toBe(false);
    expect(emailVerificationRequired({ RESEND_API_KEY: "re_x" })).toBe(true);
    expect(emailVerificationRequired({ SMTP_URL: "smtp://h" })).toBe(true);
    expect(emailVerificationRequired({ SMTP_URL: "smtp://h", REQUIRE_EMAIL_VERIFICATION: "false" })).toBe(false);
    expect(emailVerificationRequired({ REQUIRE_EMAIL_VERIFICATION: "TRUE" })).toBe(true);
    expect(emailVerificationRequired({ RESEND_API_KEY: "re_x", REQUIRE_EMAIL_VERIFICATION: "" })).toBe(true);
    expect(emailVerificationRequired({ REQUIRE_EMAIL_VERIFICATION: "maybe" })).toBe(false);
  });

  it("formats the verification email and escapes HTML", () => {
    const mail = verificationEmail({ name: "<b>Ann</b>", url: "https://app/api/auth/verify-email?token=t&callbackURL=%2F" });
    expect(mail.subject).toBe("Verify your email for MCP Workbench");
    expect(mail.text).toContain("Hi <b>Ann</b>,");
    expect(mail.text).toContain("Verify email: https://app/api/auth/verify-email?token=t&callbackURL=%2F");
    expect(mail.html).toContain("&lt;b&gt;Ann&lt;/b&gt;");
    expect(mail.html).not.toContain("<b>Ann</b>");
    expect(mail.html).toContain('href="https://app/api/auth/verify-email?token=t&amp;callbackURL=%2F"');
  });

  it("formats the reset email", () => {
    const mail = resetPasswordEmail({ name: "", url: "https://app/api/auth/reset-password/abc?callbackURL=%2Freset-password" });
    expect(mail.subject).toBe("Reset your MCP Workbench password");
    expect(mail.text).toContain("Hi there,");
    expect(mail.text).toContain("Choose a new password: https://app/api/auth/reset-password/abc?callbackURL=%2Freset-password");
    expect(mail.html).toContain('<a href="https://app/api/auth/reset-password/abc?callbackURL=%2Freset-password">');
  });
});
