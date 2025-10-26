"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  MessageSquare,
  LayoutDashboard,
  Cpu,
  Package,
  Wrench,
  Database,
  Plus,
  BookOpen,
} from "lucide-react";
import { useChats } from "@/hooks/use-chats";
import { useProviders } from "@/hooks/use-providers";
import { useInstalledServers } from "@/hooks/use-installed-servers";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { chats, createChat } = useChats();
  const { providers } = useProviders();
  const { servers } = useInstalledServers();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (callback: () => void) => {
    setOpen(false);
    callback();
  };

  const filteredChats = Array.isArray(chats)
    ? chats.filter((chat) =>
        chat.title?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const allModels = (providers || []).flatMap((p) => p.models || []);
  const filteredModels = allModels.filter((model) =>
    model.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredServers = (servers || []).filter((server) =>
    server.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      className="backdrop-blur-xl"
    >
      <CommandInput
        placeholder="Type a command or search..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() =>
              handleSelect(async () => {
                const newChat = await createChat({});
                router.push(`/chat?id=${newChat.id}`);
              })
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            <span>New Chat</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => handleSelect(() => router.push("/"))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => router.push("/chat"))}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>Chat</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => router.push("/models"))}
          >
            <Cpu className="mr-2 h-4 w-4" />
            <span>Models</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => router.push("/registry"))}
          >
            <Package className="mr-2 h-4 w-4" />
            <span>Registry</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => router.push("/tools"))}
          >
            <Wrench className="mr-2 h-4 w-4" />
            <span>Tools</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => router.push("/datasets"))}
          >
            <Database className="mr-2 h-4 w-4" />
            <span>Datasets</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => router.push("/notebook"))}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            <span>Notebook</span>
          </CommandItem>
        </CommandGroup>

        {filteredChats.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent Chats">
              {filteredChats.slice(0, 5).map((chat) => (
                <CommandItem
                  key={chat.id}
                  onSelect={() =>
                    handleSelect(() => router.push(`/chat?id=${chat.id}`))
                  }
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span>{chat.title || "Untitled Chat"}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {filteredModels.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Models">
              {filteredModels.slice(0, 5).map((model) => (
                <CommandItem
                  key={`${model.provider}-${model.id}`}
                  onSelect={() => handleSelect(() => router.push("/models"))}
                >
                  <Cpu className="mr-2 h-4 w-4" />
                  <span>{model.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {model.provider}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {filteredServers.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="MCP Servers">
              {filteredServers.slice(0, 5).map((server) => (
                <CommandItem
                  key={server.id}
                  onSelect={() => handleSelect(() => router.push("/tools"))}
                >
                  <Wrench className="mr-2 h-4 w-4" />
                  <span>{server.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
