"use client"

import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export interface ChatListItem {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
  lastMessage: {
    content: string
    createdAt: string
  } | null
}

export function useChats() {
  const { data, error, isLoading, mutate } = useSWR<ChatListItem[]>("/api/chats", fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false,
  })

  const createChat = async (data?: {
    title?: string
    systemPrompt?: string
    defaultProvider?: "ollama" | "lmstudio"
    defaultModelId?: string
  }) => {
    const response = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data || {}),
    })

    if (!response.ok) {
      throw new Error("Failed to create chat")
    }

    const chat = await response.json()
    mutate()
    return chat
  }

  const deleteChat = async (id: string) => {
    const response = await fetch(`/api/chats/${id}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error("Failed to delete chat")
    }

    mutate()
  }

  return {
    chats: data || [],
    isLoading,
    error,
    createChat,
    deleteChat,
    refresh: mutate,
  }
}
