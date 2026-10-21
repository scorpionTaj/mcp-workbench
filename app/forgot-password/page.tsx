import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { emailTransport } from "@/lib/email";

// Rendered per request so the form follows the runtime email config, not the build env.
export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm canEmail={emailTransport() !== null} />;
}
