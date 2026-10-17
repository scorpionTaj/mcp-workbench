import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { loadChatMessages } from "@/lib/chat-store";
import { publicMessages, sharedChat } from "@/lib/chat-share";
import { shareAccess, shareCookieName } from "@/lib/share-password";
import { SharedChatView } from "@/components/chat/shared-chat-view";
import { SharePasswordForm } from "@/components/chat/share-password-form";

type Props = { params: Promise<{ token: string }> };

// Always read the current state: revoking a link must take effect immediately.
export const dynamic = "force-dynamic";

/** The chat behind a link, and whether this viewer may read it (expiry, password cookie). */
async function load(token: string) {
  const chat = await sharedChat(token);
  if (!chat) return { chat: undefined, access: undefined };
  return {
    chat,
    access: shareAccess(chat, (await cookies()).get(shareCookieName(token))?.value),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { chat, access } = await load((await params).token);
  // The title is part of the conversation: only show it to viewers who can read it.
  const title = !chat ? "Chat not found" : access === "ok" ? (chat.title ?? "Shared chat") : "Shared chat";
  return {
    title: `${title} · MCP Workbench`,
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function SharedChatPage({ params }: Props) {
  const { token } = await params;
  const { chat, access } = await load(token);
  if (!chat) notFound();
  const messages = access === "ok" ? publicMessages(await loadChatMessages(chat.id)) : [];
  const models = [...new Set(messages.map((m) => m.metadata?.modelId).filter(Boolean))] as string[];

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="" width={28} height={28} className="rounded-[7px]" />
            <span className="font-semibold tracking-tight max-sm:sr-only">
              MCP <span className="text-gradient">Workbench</span>
            </span>
          </Link>
          <span className="rounded-full border border-border/60 px-2 py-0.5 text-xs text-muted-foreground">Read-only</span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        {access === "expired" ? (
          <div className="mx-auto max-w-sm space-y-2 rounded-2xl border border-border/60 bg-surface p-6 text-center">
            <h1 className="text-lg font-semibold">This link has expired</h1>
            <p className="text-sm text-muted-foreground">Ask the person who shared it for a new link.</p>
          </div>
        ) : access === "password" ? (
          <SharePasswordForm token={token} />
        ) : (
          <>
            <div className="mb-4">
              <h1 className="text-2xl font-bold">{chat.title || "Untitled chat"}</h1>
              <p className="text-sm text-muted-foreground">
                {messages.length} messages
                {models.length > 0 && ` · ${models.join(", ")}`}
                {chat.sharedAt && ` · shared ${chat.sharedAt.toLocaleDateString("en", { dateStyle: "medium" })}`}
              </p>
            </div>
            <SharedChatView token={token} chatId={chat.id} messages={messages} />
          </>
        )}
      </main>
    </div>
  );
}
