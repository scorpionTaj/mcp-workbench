/**
 * Zustand Stores - Centralized State Management
 *
 * Exports all Zustand stores for optimized global state management.
 *
 * Benefits:
 * - Reduced re-renders (only components using specific state slices update)
 * - Better performance than React Context
 * - DevTools integration for debugging
 * - Persistent state for better UX
 * - TypeScript support with full type safety
 *
 * Usage:
 * ```tsx
 * import { useUIStore, useSidebarOpen } from '@/store'
 *
 * // Use selector for specific state (optimized - only re-renders when this changes)
 * const sidebarOpen = useSidebarOpen()
 *
 * // Or use action selector
 * const { toggle } = useSidebarActions()
 * ```
 */

// UI Store
export {
  useUIStore,
  useSidebarOpen,
  useSidebarCollapsed,
  useTheme,
  useCommandPaletteOpen,
  useMobileMenuOpen,
  useGlobalLoading,
  useNotificationCount,
  useChatSidebarOpen,
  useChatInspectorOpen,
  useSidebarActions,
  useThemeActions,
  useCommandPaletteActions,
  useMobileMenuActions,
  useGlobalLoadingActions,
  useNotificationActions,
  useChatSidebarActions,
  useChatInspectorActions,
} from "./ui-store";

// Chat Store
export {
  useChatStore,
  useActiveChatId,
  useSelectedProvider,
  useSelectedModel,
  useInputValue,
  useIsStreaming,
  useStreamingMessageId,
  useAttachments,
  useShowInspector,
  useShowHistory,
  useChatActions,
} from "./chat-store";
