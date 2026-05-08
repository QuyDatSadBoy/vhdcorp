import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

/**
 * UI store — local UI state (sidebar collapsed, ...). Theme do next-themes quản.
 */
interface UiState {
  adminSidebarCollapsed: boolean;
}

interface UiActions {
  toggleAdminSidebar: () => void;
  setAdminSidebarCollapsed: (v: boolean) => void;
}

export const useUiStore = create<UiState & UiActions>()(
  devtools(
    persist(
      (set) => ({
        adminSidebarCollapsed: false,
        toggleAdminSidebar: () =>
          set((s) => ({ adminSidebarCollapsed: !s.adminSidebarCollapsed }), false, "ui/toggleAdminSidebar"),
        setAdminSidebarCollapsed: (v) =>
          set({ adminSidebarCollapsed: v }, false, "ui/setAdminSidebarCollapsed"),
      }),
      { name: "vhd-ui" },
    ),
    { name: "UiStore" },
  ),
);
