import { betterAuth } from "better-auth";
import { APIError, getOAuthState } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import { user, session, account, verification } from "@/lib/schema";
import { emailTransport, sendEmail } from "@/lib/email";
import { emailVerificationRequired, resetPasswordEmail, verificationEmail } from "@/lib/auth-email";
import logger from "@/lib/logger";
import { authRateLimitStorage } from "@/lib/rate-limit";

const env = process.env;
const adminEmails = new Set(
  (env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean),
);
const canEmail = emailTransport() !== null;
const requireEmailVerification = emailVerificationRequired();
if (requireEmailVerification && !canEmail) {
  logger.warn("REQUIRE_EMAIL_VERIFICATION is on but no email transport is set: new users can't verify and sign in");
}

// Not awaited, so response time doesn't reveal whether the account exists; failures are logged.
const sendAuthEmail = (to: string, mail: { subject: string; text: string; html: string }) => {
  sendEmail({ to, ...mail }).catch((err) => logger.error({ err, subject: mail.subject }, "Auth email failed"));
};

export const auth = betterAuth({
  // BETTER_AUTH_SECRET and BETTER_AUTH_URL are read from the environment.
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification,
    revokeSessionsOnPasswordReset: true,
    // Without a transport the reset endpoint answers RESET_PASSWORD_DISABLED and the UI hides the link.
    ...(canEmail && {
      sendResetPassword: async ({ user, url }) => sendAuthEmail(user.email, resetPasswordEmail({ name: user.name, url })),
    }),
  },
  emailVerification: {
    sendOnSignUp: canEmail,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => sendAuthEmail(user.email, verificationEmail({ name: user.name, url })),
  },
  // Per-IP limits on the auth endpoints: in Redis when REDIS_URL is set (shared by all instances,
  // in-memory fallback during an outage), else in memory per instance. Sessions are unaffected
  // (customStorage, not secondaryStorage). The client IP comes from x-forwarded-for, so run
  // behind a proxy that sets it. RATE_LIMIT=off disables them.
  rateLimit: {
    enabled: env.RATE_LIMIT !== "off",
    customStorage: authRateLimitStorage(),
    customRules: {
      "/sign-in/*": { window: 60, max: 5 },
      "/sign-up/*": { window: 60, max: 3 },
      "/request-password-reset": { window: 60, max: 3 },
      "/send-verification-email": { window: 60, max: 3 },
    },
  },
  socialProviders: {
    ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
      ? { github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET } }
      : {}),
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
      : {}),
  },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "user", input: false },
      policyAccepted: { type: "boolean", defaultValue: false, input: true, returned: false },
      policyAcceptedAt: { type: "date", required: false, input: false, returned: false },
      policyVersion: { type: "string", required: false, input: false, returned: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Enforce policy acceptance in the server path for password and OAuth sign-ups.
        before: async (u) => {
          const oauthState = await getOAuthState<{ policyAccepted?: unknown }>();
          if (u.policyAccepted !== true && oauthState?.policyAccepted !== true) {
            throw new APIError("BAD_REQUEST", { message: "Accept the Terms and Privacy Policy to create an account" });
          }
          return {
            data: {
              ...u,
              role: adminEmails.has(u.email.toLowerCase()) ? "admin" : "user",
              policyAccepted: true,
              policyAcceptedAt: new Date(),
              policyVersion: process.env.LEGAL_TERMS_VERSION || "2026-10-21",
            },
          };
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export type SessionUser = typeof auth.$Infer.Session.user;
