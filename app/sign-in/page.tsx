import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

// Rendered per request so OAuth buttons follow the runtime env, not the build env.
export const dynamic = "force-dynamic";

export default function SignInPage() {
  const socialProviders = (["github", "google"] as const).filter(
    (p) => process.env[`${p.toUpperCase()}_CLIENT_ID`],
  );
  return (
    <Suspense>
      <AuthForm mode="sign-in" socialProviders={[...socialProviders]} />
    </Suspense>
  );
}
