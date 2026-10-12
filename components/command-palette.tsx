"use client";

import { useEffect, useState, useMemo } from "react";
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
  Lightbulb,
  Sparkles,
  Puzzle,
  Library,
  Columns3,
  BarChart3,
  Plug,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { useUIStore } from "@/store/ui-store";

const PAGES: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/agents", label: "Agents", icon: Lightbulb },
  { href: "/compare", label: "Compare models", icon: Columns3 },
  { href: "/skills", label: "Skills & commands", icon: Sparkles },
  { href: "/plugins", label: "Plugins", icon: Puzzle },
  { href: "/knowledge", label: "Knowledge", icon: Library },
  { href: "/models", label: "Models", icon: Cpu },
  { href: "/providers", label: "Providers", icon: Plug },
  { href: "/tools", label: "MCP Inspector", icon: Wrench },
  { href: "/registry", label: "MCP Registry", icon: Package },
  { href: "/datasets", label: "Datasets", icon: Database },
  { href: "/notebook", label: "Notebook", icon: BookOpen },
  { href: "/analytics", label: "Usage analytics", icon: BarChart3 },
  { href: "/config", label: "Settings", icon: Settings },
];
import { useChats } from "@/hooks/use-chats";
import { useProviders } from "@/hooks/use-providers";
import { useMcpServers } from "@/hooks/use-mcp-servers";

export function CommandPalette() {
  // Open state lives in the UI store so the header's search button can open the palette too.
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { chats, createChat } = useChats();
  const { providers } = useProviders();
  const { servers } = useMcpServers();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        useUIStore.getState().toggleCommandPalette();
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (callback: () => void) => {
    setOpen(false);
    callback();
  };

  // Memoize filtered results to prevent unnecessary re-computations
  const filteredChats = useMemo(() => {
    return Array.isArray(chats)
      ? chats.filter((chat) =>
          chat.title?.toLowerCase().includes(search.toLowerCase())
        )
      : [];
  }, [chats, search]);

  const allModels = useMemo(() => {
    return (providers || []).flatMap((p) => p.models || []);
  }, [providers]);

  const filteredModels = useMemo(() => {
    return allModels.filter((model) =>
      model.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [allModels, search]);

  const filteredServers = useMemo(() => {
    return (servers || []).filter((server) =>
      server.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [servers, search]);

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
          {PAGES.map(({ href, label, icon: Icon }) => (
            <CommandItem key={href} onSelect={() => handleSelect(() => router.push(href))}>
              <Icon className="mr-2 h-4 w-4" />
              <span>{label}</span>
            </CommandItem>
          ))}
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
