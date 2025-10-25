"use client";

import type React from "react";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, MessageSquare, Trash2 } from "lucide-react";
import { useState } from "react";
import { useChats, type ChatListItem } from "@/hooks/use-chats";
import { formatDistanceToNow } from "date-fns";

interface ChatHistoryProps {
  chats: ChatListItem[];
  currentChatId: string | null;
}

export function ChatHistory({ chats, currentChatId }: ChatHistoryProps) {
  const router = useRouter();
  const { createChat, deleteChat } = useChats();
  const [search, setSearch] = useState("");

  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleNewChat = async () => {
    const chat = await createChat();
    router.push(`/chat?id=${chat.id}`);
  };

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (confirm("Delete this chat?")) {
      await deleteChat(chatId);
      if (currentChatId === chatId) {
        router.push("/chat");
      }
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-card to-card/50 backdrop-blur-sm border border-border/50 rounded-lg flex flex-col shadow-lg">
      <div className="p-4 border-b border-border/50 space-y-3">
        <Button onClick={handleNewChat} className="w-full gap-2" size="sm">
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background/50 border-border/50"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredChats.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {search ? "No chats found" : "No chats yet"}
            </div>
          ) : (
            filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => router.push(`/chat?id=${chat.id}`)}
                className={`w-full text-left p-3 rounded-lg transition-all group relative ${
                  currentChatId === chat.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-accent/50 border border-transparent"
                }`}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-3 h-3 shrink-0 text-primary mt-1" />
                  <div className="flex-1 min-w-0 pr-8">
                    <h4
                      className="font-medium text-sm truncate mb-1"
                      title={chat.title}
                    >
                      {chat.title}
                    </h4>
                    {chat.lastMessage && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                        {chat.lastMessage.content}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(chat.updatedAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all h-7 w-7 p-0 shrink-0"
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    title="Delete chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
