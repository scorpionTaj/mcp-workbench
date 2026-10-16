"use client";

import { useEffect, useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
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
  Palette,
  CalendarClock,
  Plug,
  Settings,
  TextSearch,
  History,
  type LucideIcon,
} from "lucide-react";
import { useUIStore } from "@/store/ui-store";

const PAGES: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/agents", label: "Agents", icon: Lightbulb },
  { href: "/compare", label: "Compare models", icon: Columns3 },
  { href: "/studio", label: "Studio: images and audio", icon: Palette },
  { href: "/schedules", label: "Scheduled agent runs", icon: CalendarClock },
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

  // Message text is searched on the server after a short pause; recent searches show while empty.
  const [query, setQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const { data: messageHits } = useSWR<{ message: { id: string; chatId: string; content: string }; chat: { title?: string } }[]>(
    open && query.length >= 2 ? `/api/search?q=${encodeURIComponent(query)}` : null,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true },
  );
  const { data: recentSearches } = useSWR<string[]>(
    open && !search ? "/api/search?action=recent&limit=5" : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const openSearchResult = (chatId: string) => {
    // Only searches that led somewhere are kept in the history.
    fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: search.trim(), record: true, selectedResult: chatId }),
    }).catch(() => {});
    router.push(`/chat?id=${chatId}`);
  };

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

        {!search && recentSearches && recentSearches.length > 0 && (
          <>
            <CommandGroup heading="Recent searches">
              {recentSearches.map((q) => (
                <CommandItem key={q} value={`recent ${q}`} onSelect={() => setSearch(q)}>
                  <History className="mr-2 h-4 w-4" />
                  <span>{q}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

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

        {search.trim().length >= 2 && messageHits && messageHits.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Messages">
              {messageHits.slice(0, 5).map((hit) => (
                <CommandItem
                  key={hit.message.id}
                  // Server matches may not contain the typed text verbatim, so keep them past cmdk's filter.
                  value={`${search} message ${hit.message.id}`}
                  onSelect={() => handleSelect(() => openSearchResult(hit.message.chatId))}
                >
                  <TextSearch className="mr-2 h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{hit.message.content.slice(0, 120)}</span>
                  <span className="ml-2 max-w-32 shrink-0 truncate text-xs text-muted-foreground">
                    {hit.chat.title || "Untitled Chat"}
                  </span>
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
