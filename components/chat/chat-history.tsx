"use client";

import type React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MessageSquare,
  Trash2,
  MoreHorizontal,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  Folder,
  FolderPlus,
  Tag,
  ChevronDown,
  History,
  X,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import useSWR from "swr";
import {
  useChats,
  useChatFolders,
  type ChatFolder,
  type ChatListItem,
  type ChatOrganizationPatch,
} from "@/hooks/use-chats";
import { fetcher } from "@/lib/fetcher";
import { matchesFilter, parseTagInput, tagCounts, type ChatFilter } from "@/lib/chat-organization";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface ChatHistoryProps {
  chats: ChatListItem[];
  currentChatId: string | null;
}

export function ChatHistory({ chats, currentChatId }: ChatHistoryProps) {
  const router = useRouter();
  const { createChat, deleteChat, organizeChat, isLoading: loadingActive } = useChats();
  const [showArchived, setShowArchived] = useState(false);
  const { chats: archivedChats, isLoading: loadingArchived } = useChats({ archived: true });
  const { folders, createFolder, renameFolder, deleteFolder } = useChatFolders();
  const [filter, setFilter] = useState<ChatFilter>({ kind: "all" });

  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  // Titles filter instantly; message text is searched on the server after a short pause.
  const [query, setQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const { data: hits } = useSWR<{ message: { chatId: string; content: string } }[]>(
    query.length >= 2 ? `/api/search?q=${encodeURIComponent(query)}` : null,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true },
  );
  // Recent searches when the box is empty, suggestions from past searches while typing.
  const { data: recent, mutate: refreshRecent } = useSWR<string[]>(
    searchFocused ? "/api/search?action=recent&limit=5" : null,
    fetcher,
    { revalidateOnFocus: false },
  );
  const { data: suggestions } = useSWR<string[]>(
    searchFocused && search.trim() ? `/api/search?action=suggestions&q=${encodeURIComponent(search.trim())}` : null,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true },
  );
  const searchOptions = search.trim()
    ? (suggestions ?? []).filter((s) => s.toLowerCase() !== search.trim().toLowerCase())
    : (recent ?? []);

  // First matching message per chat, shown as a snippet under the title.
  const snippets = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of hits ?? []) if (!map.has(h.message.chatId)) map.set(h.message.chatId, h.message.content);
    return map;
  }, [hits]);

  const source = showArchived ? archivedChats : chats;
  const tags = useMemo(() => tagCounts(source), [source]);
  const folderName = (id: string) => folders.find((f) => f.id === id)?.name ?? "Folder";

  const filteredChats = useMemo(() => {
    const q = search.trim().toLowerCase();
    return source.filter(
      (chat) =>
        matchesFilter(chat, filter) &&
        (!q || chat.title.toLowerCase().includes(q) || snippets.has(chat.id)),
    );
  }, [source, filter, search, snippets]);
  // Pinned chats get their own section in the main list (the API already lists them first).
  const pinned = showArchived ? [] : filteredChats.filter((c) => c.pinned);
  const rest = showArchived ? filteredChats : filteredChats.filter((c) => !c.pinned);

  const run = (action: () => Promise<unknown>) => {
    action().catch((err: Error) => alert(err.message));
  };

  const openChat = (chatId: string) => {
    const q = search.trim();
    if (q) {
      // Only searches that led somewhere are kept in the history.
      fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, record: true, selectedResult: chatId }),
      }).then(() => refreshRecent(), () => {});
    }
    router.push(`/chat?id=${chatId}`);
  };

  const handleNewChat = async () => {
    const chat = await createChat();
    router.push(`/chat?id=${chat.id}`);
  };

  const handleDeleteChat = (chatId: string) => {
    if (!confirm("Delete this chat?")) return;
    run(async () => {
      await deleteChat(chatId);
      if (currentChatId === chatId) router.push("/chat");
    });
  };

  const handleNewFolder = async (): Promise<ChatFolder | null> => {
    const name = prompt("Folder name")?.trim();
    return name ? createFolder(name) : null;
  };

  const handleEditTags = (chat: ChatListItem) => {
    const input = prompt("Tags, separated by commas", chat.tags.join(", "));
    if (input === null) return;
    run(() => organizeChat(chat.id, { tags: parseTagInput(input) }));
  };

  const clearRecent = () =>
    run(async () => {
      await fetch("/api/search", { method: "DELETE" });
      await refreshRecent([], { revalidate: false });
    });

  const filterLabel =
    filter.kind === "all"
      ? showArchived
        ? "All archived"
        : "All chats"
      : filter.kind === "unfiled"
        ? "Unfiled"
        : filter.kind === "folder"
          ? folderName(filter.id)
          : `#${filter.tag}`;

  const renderChat = (chat: ChatListItem) => (
    <ChatRow
      key={chat.id}
      chat={chat}
      active={currentChatId === chat.id}
      folders={folders}
      folderName={chat.folderId ? folderName(chat.folderId) : null}
      snippet={search.trim() ? snippets.get(chat.id) : undefined}
      query={search.trim()}
      onOpen={() => openChat(chat.id)}
      onOrganize={(patch) => run(() => organizeChat(chat.id, patch))}
      onNewFolder={() =>
        run(async () => {
          const folder = await handleNewFolder();
          if (folder) await organizeChat(chat.id, { folderId: folder.id });
        })
      }
      onEditTags={() => handleEditTags(chat)}
      onTagClick={(tag) => setFilter({ kind: "tag", tag })}
      onDelete={() => handleDeleteChat(chat.id)}
    />
  );

  return (
    <div className="min-h-0 flex-1 glass border-border/50 rounded-lg flex flex-col shadow-lg">
      <div className="p-4 border-b border-border/50 space-y-3 shrink-0">
        <Button onClick={handleNewChat} className="w-full gap-2 font-medium" size="sm">
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search titles and messages…"
            aria-label="Search chats"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            onKeyDown={(e) => e.key === "Escape" && setSearch("")}
            className="pl-9 glass border-border/50 hover:border-primary/50 transition-colors"
          />
          {searchFocused && searchOptions.length > 0 && (
            <div
              role="listbox"
              aria-label={search.trim() ? "Search suggestions" : "Recent searches"}
              // Keep focus in the input so a click picks the option before blur closes the list.
              onMouseDown={(e) => e.preventDefault()}
              className="absolute inset-x-0 top-full z-20 mt-1 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
            >
              <div className="flex items-center justify-between px-2 py-1 text-xs text-muted-foreground">
                <span>{search.trim() ? "Suggestions" : "Recent searches"}</span>
                {!search.trim() && (
                  <button type="button" onClick={clearRecent} className="hover:text-foreground">
                    Clear
                  </button>
                )}
              </div>
              {searchOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => setSearch(option)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-default"
                >
                  <History className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{option}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="min-w-0 flex-1 justify-between gap-1">
                <span className="truncate">{filterLabel}</span>
                <ChevronDown className="size-3.5 shrink-0 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onSelect={() => setFilter({ kind: "all" })}>
                <MessageSquare className="size-4" /> All chats
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setFilter({ kind: "unfiled" })}>
                <Folder className="size-4 opacity-50" /> Unfiled
              </DropdownMenuItem>
              {folders.length > 0 && <DropdownMenuLabel>Folders</DropdownMenuLabel>}
              {folders.map((f) => (
                <DropdownMenuItem key={f.id} onSelect={() => setFilter({ kind: "folder", id: f.id })}>
                  <Folder className="size-4" /> <span className="truncate">{f.name}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                onSelect={() =>
                  run(async () => {
                    const folder = await handleNewFolder();
                    if (folder) setFilter({ kind: "folder", id: folder.id });
                  })
                }
              >
                <FolderPlus className="size-4" /> New folder…
              </DropdownMenuItem>
              {filter.kind === "folder" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      const name = prompt("Rename folder", folderName(filter.id))?.trim();
                      if (name) run(() => renameFolder(filter.id, name));
                    }}
                  >
                    Rename “{folderName(filter.id)}”…
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => {
                      if (!confirm(`Delete the folder “${folderName(filter.id)}”? Its chats are kept, unfiled.`)) return;
                      run(async () => {
                        await deleteFolder(filter.id);
                        setFilter({ kind: "all" });
                      });
                    }}
                  >
                    Delete folder
                  </DropdownMenuItem>
                </>
              )}
              {tags.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Tags</DropdownMenuLabel>
                  {tags.map(({ tag, count }) => (
                    <DropdownMenuItem key={tag} onSelect={() => setFilter({ kind: "tag", tag })}>
                      <Tag className="size-4" /> <span className="flex-1 truncate">{tag}</span>
                      <span className="text-xs text-muted-foreground">{count}</span>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {filter.kind !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setFilter({ kind: "all" })}
              aria-label="Clear filter"
              title="Clear filter"
            >
              <X className="size-4" />
            </Button>
          )}
          <Button
            variant={showArchived ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            aria-pressed={showArchived}
            onClick={() => setShowArchived((v) => !v)}
            aria-label={showArchived ? "Show active chats" : "Show archived chats"}
            title={showArchived ? "Show active chats" : "Show archived chats"}
          >
            <Archive className="size-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-1">
          {filteredChats.length === 0 ? (
            <div className="text-center py-8 glass rounded-lg mx-2 border-dashed border-2 border-border/50">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                {(showArchived ? loadingArchived : loadingActive)
                  ? "Loading chats…"
                  : search
                  ? "No chats found"
                  : showArchived
                    ? "No archived chats"
                    : filter.kind === "all"
                      ? "No chats yet"
                      : "No chats here"}
              </p>
            </div>
          ) : (
            <>
              {pinned.length > 0 && (
                <>
                  <SectionLabel>Pinned</SectionLabel>
                  {pinned.map(renderChat)}
                  {rest.length > 0 && <SectionLabel>Chats</SectionLabel>}
                </>
              )}
              {rest.map(renderChat)}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-3 pt-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{children}</p>;
}

function ChatRow({
  chat,
  active,
  folders,
  folderName,
  snippet,
  query,
  onOpen,
  onOrganize,
  onNewFolder,
  onEditTags,
  onTagClick,
  onDelete,
}: {
  chat: ChatListItem;
  active: boolean;
  folders: ChatFolder[];
  folderName: string | null;
  snippet?: string;
  query: string;
  onOpen: () => void;
  onOrganize: (patch: ChatOrganizationPatch) => void;
  onNewFolder: () => void;
  onEditTags: () => void;
  onTagClick: (tag: string) => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "w-full text-left p-3 rounded-lg transition-all group relative glass",
        active
          ? "border-primary/30 bg-primary/5 shadow-sm shadow-primary/10"
          : "border-transparent hover:border-primary/20 hover:bg-primary/5",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
          <div className="p-1 rounded bg-primary/10 border border-primary/20 mt-0.5 shrink-0">
            {chat.pinned ? (
              <Pin className="w-3 h-3 text-primary shrink-0" aria-label="Pinned" />
            ) : (
              <MessageSquare className="w-3 h-3 text-primary shrink-0" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate mb-1" title={chat.title}>
              {chat.title}
            </h4>
            {snippet ? (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                <Snippet text={snippet} query={query} />
              </p>
            ) : (
              chat.lastMessage && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-1">{chat.lastMessage.content}</p>
              )
            )}
            {(chat.tags.length > 0 || folderName) && (
              <div className="mb-1 flex flex-wrap gap-1">
                {folderName && (
                  <span className="inline-flex items-center gap-1 rounded bg-default px-1.5 py-0.5 text-[11px] text-muted-foreground">
                    <Folder className="size-3" /> {folderName}
                  </span>
                )}
                {chat.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTagClick(tag);
                    }}
                    className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary hover:bg-primary/20"
                    title={`Show chats tagged ${tag}`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground font-mono">
              {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true })}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 shrink-0 opacity-60 hover:opacity-100"
              aria-label={`Actions for ${chat.title}`}
              title="Chat actions"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {!chat.archived && (
              <DropdownMenuItem onSelect={() => onOrganize({ pinned: !chat.pinned })}>
                {chat.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                {chat.pinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>
            )}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Folder className="size-4" /> Move to folder
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-44">
                <DropdownMenuItem disabled={!chat.folderId} onSelect={() => onOrganize({ folderId: null })}>
                  No folder
                </DropdownMenuItem>
                {folders.map((f) => (
                  <DropdownMenuItem
                    key={f.id}
                    disabled={chat.folderId === f.id}
                    onSelect={() => onOrganize({ folderId: f.id })}
                  >
                    <span className="truncate">{f.name}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onNewFolder}>
                  <FolderPlus className="size-4" /> New folder…
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onSelect={onEditTags}>
              <Tag className="size-4" /> Edit tags…
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onOrganize({ archived: !chat.archived, pinned: false })}>
              {chat.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
              {chat.archived ? "Unarchive" : "Archive"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 className="size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/** The part of a message around the first match, with the match highlighted. */
function Snippet({ text, query }: { text: string; query: string }) {
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0) return <>{text.slice(0, 120)}</>;
  const start = Math.max(0, i - 40);
  return (
    <>
      {start > 0 && "…"}
      {text.slice(start, i)}
      <mark className="rounded bg-accent/25 px-0.5 text-foreground">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length, i + query.length + 80)}
    </>
  );
}
