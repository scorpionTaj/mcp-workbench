/**
 * Zustand Store for Chat State Management
 *
 * Manages chat-related state with optimized re-renders
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface ChatState {
  // Current active chat
  activeChatId: string | null;

  // Selected model and provider
  selectedProvider: string | null;
  selectedModel: string | null;

  // Chat input state
  inputValue: string;

  // Streaming state
  isStreaming: boolean;
  streamingMessageId: string | null;

  // Attachments
  attachments: File[];

  // UI state
  showInspector: boolean;
  showHistory: boolean;

  // Actions
  setActiveChatId: (chatId: string | null) => void;

  setSelectedProvider: (provider: string) => void;
  setSelectedModel: (model: string) => void;
  selectProviderAndModel: (provider: string, model: string) => void;

  setInputValue: (value: string) => void;
  clearInput: () => void;

  setStreaming: (streaming: boolean, messageId?: string) => void;

  addAttachment: (file: File) => void;
  removeAttachment: (index: number) => void;
  clearAttachments: () => void;

  toggleInspector: () => void;
  setShowInspector: (show: boolean) => void;

  toggleHistory: () => void;
  setShowHistory: (show: boolean) => void;

  // Reset all chat state
  resetChatState: () => void;
}

export const useChatStore = create<ChatState>()(
  devtools(
    (set) => ({
      // Initial state
      activeChatId: null,
      selectedProvider: null,
      selectedModel: null,
      inputValue: "",
      isStreaming: false,
      streamingMessageId: null,
      attachments: [],
      showInspector: false,
      showHistory: true,

      // Actions
      setActiveChatId: (chatId) => set({ activeChatId: chatId }),

      setSelectedProvider: (provider) => set({ selectedProvider: provider }),

      setSelectedModel: (model) => set({ selectedModel: model }),

      selectProviderAndModel: (provider, model) =>
        set({ selectedProvider: provider, selectedModel: model }),

      setInputValue: (value) => set({ inputValue: value }),

      clearInput: () => set({ inputValue: "", attachments: [] }),

      setStreaming: (streaming, messageId) =>
        set({ isStreaming: streaming, streamingMessageId: messageId ?? null }),

      addAttachment: (file) =>
        set((state) => ({ attachments: [...state.attachments, file] })),

      removeAttachment: (index) =>
        set((state) => ({
          attachments: state.attachments.filter((_, i) => i !== index),
        })),

      clearAttachments: () => set({ attachments: [] }),

      toggleInspector: () =>
        set((state) => ({ showInspector: !state.showInspector })),

      setShowInspector: (show) => set({ showInspector: show }),

      toggleHistory: () =>
        set((state) => ({ showHistory: !state.showHistory })),

      setShowHistory: (show) => set({ showHistory: show }),

      resetChatState: () =>
        set({
          activeChatId: null,
          inputValue: "",
          isStreaming: false,
          streamingMessageId: null,
          attachments: [],
        }),
    }),
    {
      name: "Chat Store",
    }
  )
);

// Optimized selectors
export const useActiveChatId = () =>
  useChatStore((state) => state.activeChatId);
export const useSelectedProvider = () =>
  useChatStore((state) => state.selectedProvider);
export const useSelectedModel = () =>
  useChatStore((state) => state.selectedModel);
export const useInputValue = () => useChatStore((state) => state.inputValue);
export const useIsStreaming = () => useChatStore((state) => state.isStreaming);
export const useStreamingMessageId = () =>
  useChatStore((state) => state.streamingMessageId);
export const useAttachments = () => useChatStore((state) => state.attachments);
export const useShowInspector = () =>
  useChatStore((state) => state.showInspector);
export const useShowHistory = () => useChatStore((state) => state.showHistory);

// Action selectors
export const useChatActions = () =>
  useChatStore((state) => ({
    setActiveChatId: state.setActiveChatId,
    setSelectedProvider: state.setSelectedProvider,
    setSelectedModel: state.setSelectedModel,
    selectProviderAndModel: state.selectProviderAndModel,
    setInputValue: state.setInputValue,
    clearInput: state.clearInput,
    setStreaming: state.setStreaming,
    addAttachment: state.addAttachment,
    removeAttachment: state.removeAttachment,
    clearAttachments: state.clearAttachments,
    toggleInspector: state.toggleInspector,
    setShowInspector: state.setShowInspector,
    toggleHistory: state.toggleHistory,
    setShowHistory: state.setShowHistory,
    resetChatState: state.resetChatState,
  }));
