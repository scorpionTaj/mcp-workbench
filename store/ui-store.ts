/**
 * Zustand Store for UI State Management
 *
 * Optimized global state management to reduce re-renders
 * and improve performance across the application.
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface UIState {
  // Sidebar state
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;

  // Theme state
  theme: "light" | "dark" | "system";

  // Command palette state
  commandPaletteOpen: boolean;

  // Mobile menu state
  mobileMenuOpen: boolean;

  // Loading states
  isGlobalLoading: boolean;
  loadingMessage: string | null;

  // Notification state
  notificationCount: number;

  // Chat UI state
  chatSidebarOpen: boolean;
  chatInspectorOpen: boolean;

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;

  setTheme: (theme: "light" | "dark" | "system") => void;

  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;

  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;

  setGlobalLoading: (loading: boolean, message?: string) => void;

  setNotificationCount: (count: number) => void;
  incrementNotificationCount: () => void;
  resetNotificationCount: () => void;

  toggleChatSidebar: () => void;
  setChatSidebarOpen: (open: boolean) => void;

  toggleChatInspector: () => void;
  setChatInspectorOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        sidebarOpen: true,
        sidebarCollapsed: false,
        theme: "system",
        commandPaletteOpen: false,
        mobileMenuOpen: false,
        isGlobalLoading: false,
        loadingMessage: null,
        notificationCount: 0,
        chatSidebarOpen: true,
        chatInspectorOpen: false,

        // Actions
        toggleSidebar: () =>
          set((state) => ({ sidebarOpen: !state.sidebarOpen })),

        setSidebarOpen: (open) => set({ sidebarOpen: open }),

        toggleSidebarCollapsed: () =>
          set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

        setTheme: (theme) => set({ theme }),

        toggleCommandPalette: () =>
          set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),

        setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

        toggleMobileMenu: () =>
          set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),

        setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

        setGlobalLoading: (loading, message) =>
          set({ isGlobalLoading: loading, loadingMessage: message ?? null }),

        setNotificationCount: (count) => set({ notificationCount: count }),

        incrementNotificationCount: () =>
          set((state) => ({ notificationCount: state.notificationCount + 1 })),

        resetNotificationCount: () => set({ notificationCount: 0 }),

        toggleChatSidebar: () =>
          set((state) => ({ chatSidebarOpen: !state.chatSidebarOpen })),

        setChatSidebarOpen: (open) => set({ chatSidebarOpen: open }),

        toggleChatInspector: () =>
          set((state) => ({ chatInspectorOpen: !state.chatInspectorOpen })),

        setChatInspectorOpen: (open) => set({ chatInspectorOpen: open }),
      }),
      {
        name: "ui-store",
        partialize: (state) => ({
          sidebarOpen: state.sidebarOpen,
          sidebarCollapsed: state.sidebarCollapsed,
          theme: state.theme,
          chatSidebarOpen: state.chatSidebarOpen,
        }),
      }
    ),
    {
      name: "UI Store",
    }
  )
);

// Selectors for optimized component re-renders
export const useSidebarOpen = () => useUIStore((state) => state.sidebarOpen);
export const useSidebarCollapsed = () =>
  useUIStore((state) => state.sidebarCollapsed);
export const useTheme = () => useUIStore((state) => state.theme);
export const useCommandPaletteOpen = () =>
  useUIStore((state) => state.commandPaletteOpen);
export const useMobileMenuOpen = () =>
  useUIStore((state) => state.mobileMenuOpen);
export const useGlobalLoading = () =>
  useUIStore((state) => ({
    isLoading: state.isGlobalLoading,
    message: state.loadingMessage,
  }));
export const useNotificationCount = () =>
  useUIStore((state) => state.notificationCount);
export const useChatSidebarOpen = () =>
  useUIStore((state) => state.chatSidebarOpen);
export const useChatInspectorOpen = () =>
  useUIStore((state) => state.chatInspectorOpen);

// Action selectors
export const useSidebarActions = () =>
  useUIStore((state) => ({
    toggle: state.toggleSidebar,
    setOpen: state.setSidebarOpen,
    toggleCollapsed: state.toggleSidebarCollapsed,
  }));

export const useThemeActions = () =>
  useUIStore((state) => ({
    setTheme: state.setTheme,
  }));

export const useCommandPaletteActions = () =>
  useUIStore((state) => ({
    toggle: state.toggleCommandPalette,
    setOpen: state.setCommandPaletteOpen,
  }));

export const useMobileMenuActions = () =>
  useUIStore((state) => ({
    toggle: state.toggleMobileMenu,
    setOpen: state.setMobileMenuOpen,
  }));

export const useGlobalLoadingActions = () =>
  useUIStore((state) => ({
    setLoading: state.setGlobalLoading,
  }));

export const useNotificationActions = () =>
  useUIStore((state) => ({
    setCount: state.setNotificationCount,
    increment: state.incrementNotificationCount,
    reset: state.resetNotificationCount,
  }));

export const useChatSidebarActions = () =>
  useUIStore((state) => ({
    toggle: state.toggleChatSidebar,
    setOpen: state.setChatSidebarOpen,
  }));

export const useChatInspectorActions = () =>
  useUIStore((state) => ({
    toggle: state.toggleChatInspector,
    setOpen: state.setChatInspectorOpen,
  }));
