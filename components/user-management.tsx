"use client";

import { useDeferredValue, useState } from "react";
import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetcher } from "@/lib/fetcher";
import { send } from "@/lib/send";
import { ROLES, type Role } from "@/lib/user-roles";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  chats: number;
}

/** Admins: every account and its role. Your own row is read-only, and the last admin stays. */
export function UserManagement({ currentUserId }: { currentUserId: string }) {
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim());
  const { data, mutate, isLoading } = useSWR<{ users: UserRow[]; truncated: boolean }>(
    `/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    fetcher,
    { keepPreviousData: true },
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const changeRole = async (user: UserRow, role: Role) => {
    if (role === user.role) return;
    setSaving(user.id);
    setError(null);
    try {
      await send(`/api/admin/users/${user.id}`, "PATCH", { role });
      await mutate();
    } catch (err) {
      setError(`${user.email}: ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setSaving(null);
    }
  };

  const users = data?.users ?? [];
  const admins = users.filter((u) => u.role === "admin").length;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name or email"
          aria-label="Search users"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead className="hidden sm:table-cell">Joined</TableHead>
              <TableHead className="hidden sm:table-cell text-right">Chats</TableHead>
              <TableHead className="w-40">Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const self = u.id === currentUserId;
              return (
                <TableRow key={u.id}>
                  <TableCell className="max-w-[16rem]">
                    <div className="truncate font-medium">
                      {u.name}
                      {self && <span className="ml-2 text-xs font-normal text-muted-foreground">(you)</span>}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-right tabular-nums">{u.chats}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={u.role}
                        onValueChange={(v) => changeRole(u, v as Role)}
                        disabled={self || saving === u.id}
                      >
                        <SelectTrigger className="w-28" aria-label={`Role for ${u.email}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r === "admin" ? "Admin" : "User"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {saving === u.id && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {!users.length && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  {isLoading ? "Loading…" : "No users match."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        {data?.truncated ? `Showing the first ${users.length} accounts; search to narrow it down. ` : ""}
        {!q && `${admins} ${admins === 1 ? "admin" : "admins"}. `}
        Admins can review feedback, see server metrics and manage roles. ADMIN_EMAILS only sets the role at sign-up.
      </p>
    </div>
  );
}
