import Link from "next/link";
import { AuthShell, authLinkClass, safeNext } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

// Landing page for the emailed verification link: /api/auth/verify-email redirects here, adding
// ?error=… when the token is bad. On success the user is already signed in.
export default async function EmailVerifiedPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  if (error) {
    return (
      <AuthShell title="Link expired" description="This verification link is invalid or has expired. Sign in to get a new one.">
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/sign-in" className={authLinkClass}>
            Back to sign in
          </Link>
        </p>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Email verified" description="Thanks for confirming your address. You're all set.">
      <Button asChild className="w-full">
        <Link href={safeNext(next)}>Continue</Link>
      </Button>
    </AuthShell>
  );
}
