import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Logo, tagline and a centered card: the frame shared by the sign-in, sign-up and recovery pages. */
export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <Image src="/logo.svg" alt="" width={56} height={56} priority />
        <div>
          <p className="text-xl font-semibold tracking-tight">
            MCP <span className="text-gradient">Workbench</span>
          </p>
          <p className="text-sm text-muted-foreground">Models, tools, skills and your knowledge in one place</p>
        </div>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>
    </div>
  );
}

export const authLinkClass = "text-primary underline-offset-4 hover:underline";

/** Same-site relative paths only, so ?next= can't become an open redirect. */
export const safeNext = (next: string | null | undefined) =>
  next?.startsWith("/") && !next.startsWith("//") ? next : "/";
