"use client";

import useSWR, { mutate as mutateKey } from "swr";

import { fetcher } from "@/lib/fetcher";

export interface ChatListItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage: {
    content: string;
    createdAt: string;
  } | null;
  pinned: boolean;
  archived: boolean;
  folderId: string | null;
  tags: string[];
}

export interface ChatFolder {
  id: string;
  name: string;
}

export type ChatOrganizationPatch = Partial<{
  pinned: boolean;
  archived: boolean;
  folderId: string | null;
  tags: string[];
}>;

const CHATS_KEY = "/api/chats";
const ARCHIVED_KEY = "/api/chats?archived=1";
const FOLDERS_KEY = "/api/chat-folders";

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return res.json();
}

/** The active chat list (pinned first), or the archived one with `{ archived: true }`. */
export function useChats({ archived = false }: { archived?: boolean } = {}) {
  const { data, error, isLoading, mutate } = useSWR<ChatListItem[]>(
    archived ? ARCHIVED_KEY : CHATS_KEY,
    fetcher,
    {
      refreshInterval: 0,
      revalidateOnFocus: false,
    }
  );

  const createChat = async (data?: {
    title?: string;
    systemPrompt?: string;
    defaultProvider?: string;
    defaultModelId?: string;
    toolServerIds?: string[];
    knowledgeBaseIds?: string[];
  }) => {
    const response = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data || {}),
    });

    if (!response.ok) {
      throw new Error("Failed to create chat");
    }

    const chat = await response.json();
    mutate();
    return chat;
  };

  const deleteChat = async (id: string) => {
    const response = await fetch(`/api/chats/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete chat");
    }

    mutate();
  };

  /** Pin, archive, file or tag a chat; refreshes both the active and archived lists. */
  const organizeChat = async (id: string, patch: ChatOrganizationPatch) => {
    await send(`/api/chats/${id}`, "PATCH", patch);
    await Promise.all([mutateKey(CHATS_KEY), mutateKey(ARCHIVED_KEY)]);
  };

  return {
    chats: data || [],
    organizeChat,
    isLoading,
    error,
    createChat,
    deleteChat,
    refresh: mutate,
  };
}

export function useChatFolders() {
  const { data, mutate } = useSWR<ChatFolder[]>(FOLDERS_KEY, fetcher, { revalidateOnFocus: false });

  const createFolder = async (name: string): Promise<ChatFolder> => {
    const folder = await send(FOLDERS_KEY, "POST", { name });
    await mutate();
    return folder;
  };

  const renameFolder = async (id: string, name: string) => {
    await send(`${FOLDERS_KEY}/${id}`, "PATCH", { name });
    await mutate();
  };

  // Its chats become unfiled, so the chat lists are refreshed too.
  const deleteFolder = async (id: string) => {
    await send(`${FOLDERS_KEY}/${id}`, "DELETE");
    await Promise.all([mutate(), mutateKey(CHATS_KEY), mutateKey(ARCHIVED_KEY)]);
  };

  return { folders: data || [], createFolder, renameFolder, deleteFolder };
}
