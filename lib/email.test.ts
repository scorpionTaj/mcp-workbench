import { afterEach, describe, expect, it, vi } from "vitest";
import { emailTransport, sendEmail } from "@/lib/email";
import { runEmail } from "@/lib/notify";

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
  vi.unstubAllGlobals();
});

describe("email", () => {
  it("picks Resend, then SMTP, else nothing", () => {
    expect(emailTransport({ RESEND_API_KEY: "re_x", SMTP_URL: "smtp://h" })).toBe("resend");
    expect(emailTransport({ SMTP_URL: "smtp://h" })).toBe("smtp");
    expect(emailTransport({})).toBeNull();
  });

  it("is a no-op without a transport", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.SMTP_URL;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await sendEmail({ to: "a@b.c", subject: "s", text: "t" })).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends through Resend with the idempotency key", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "Bot <bot@example.com>";
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await sendEmail({ to: "a@b.c", subject: "Hi", text: "Body", idempotencyKey: "k1" })).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers).toMatchObject({ Authorization: "Bearer re_test", "Idempotency-Key": "k1" });
    expect(JSON.parse(init.body as string)).toMatchObject({ from: "Bot <bot@example.com>", to: ["a@b.c"], subject: "Hi" });
  });

  it("throws when Resend refuses", async () => {
    process.env.RESEND_API_KEY = "re_test";
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ message: "bad from" }), { status: 422 }));
    await expect(sendEmail({ to: "a@b.c", subject: "s", text: "t" })).rejects.toThrow(/422: bad from/);
  });

  it("formats the run email and escapes HTML", () => {
    const mail = runEmail({
      scheduleName: "Daily",
      status: "error",
      error: "<script>x</script>",
      chatUrl: "https://app/chat?id=1&a=2",
      finishedAt: "2026-01-01T00:00:00Z",
    });
    expect(mail.subject).toBe('❌ Scheduled run "Daily" failed');
    expect(mail.text).toContain("Error: <script>x</script>");
    expect(mail.text).toContain("Open the chat: https://app/chat?id=1&a=2");
    expect(mail.html).toContain("&lt;script&gt;");
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain('href="https://app/chat?id=1&amp;a=2"');
  });
});
