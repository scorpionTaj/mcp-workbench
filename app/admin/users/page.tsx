import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { UserManagement } from "@/components/user-management";

export default async function AdminUsersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user.role !== "admin") notFound();

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Users</h1>
          <p className="text-muted-foreground">Accounts on this workbench and who can administer it</p>
        </div>
        <UserManagement currentUserId={session.user.id} />
      </div>
    </div>
  );
}
