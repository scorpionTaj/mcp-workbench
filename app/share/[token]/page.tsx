import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadChatMessages } from "@/lib/chat-store";
import { publicMessages, sharedChat } from "@/lib/chat-share";
import { SharedChatView } from "@/components/chat/shared-chat-view";

type Props = { params: Promise<{ token: string }> };

// Always read the current state: revoking a link must take effect immediately.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const chat = await sharedChat((await params).token);
  return {
    title: chat ? `${chat.title ?? "Shared chat"} · MCP Workbench` : "Chat not found · MCP Workbench",
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function SharedChatPage({ params }: Props) {
  const { token } = await params;
  const chat = await sharedChat(token);
  if (!chat) notFound();
  const messages = publicMessages(await loadChatMessages(chat.id));
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
        <div className="mb-4">
          <h1 className="text-2xl font-bold">{chat.title || "Untitled chat"}</h1>
          <p className="text-sm text-muted-foreground">
            {messages.length} messages
            {models.length > 0 && ` · ${models.join(", ")}`}
            {chat.sharedAt && ` · shared ${chat.sharedAt.toLocaleDateString("en", { dateStyle: "medium" })}`}
          </p>
        </div>
        <SharedChatView token={token} chatId={chat.id} messages={messages} />
      </main>
    </div>
  );
}
