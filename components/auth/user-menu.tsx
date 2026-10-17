"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck, User, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, useSession } from "@/lib/auth-client";

export function UserMenu() {
  const router = useRouter();
  const { data } = useSession();
  if (!data) return <div className="w-10" />;
  const { user } = data;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary hover:bg-primary/25"
        aria-label="Account menu"
      >
        {user.name?.[0]?.toUpperCase() ?? <User className="w-4 h-4" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="text-sm font-medium truncate">{user.name}</div>
          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(user as { role?: string }).role === "admin" && (
          <DropdownMenuItem asChild>
            <Link href="/feedback/admin">
              <ShieldCheck className="w-4 h-4 mr-2" />
              Feedback admin
            </Link>
          </DropdownMenuItem>
        )}
        {(user as { role?: string }).role === "admin" && (
          <DropdownMenuItem asChild>
            <Link href="/admin/users">
              <Users className="w-4 h-4 mr-2" />
              Users
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
            router.push("/sign-in");
            router.refresh();
          }}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
