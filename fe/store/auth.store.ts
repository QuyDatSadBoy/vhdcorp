import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { AuthUser } from "@/types/auth";

/**
 * Auth store — chỉ lưu thông tin user (KHÔNG lưu token).
 * Token sống trong HttpOnly cookie do BE set.
 */
interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
}

interface AuthActions {
  setUser: (user: AuthUser | null) => void;
  clearAuth: () => void;
  setHydrated: (v: boolean) => void;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isHydrated: false,
};

export const useAuthStore = create<AuthState & AuthActions>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,
        setUser: (user) => set({ user, isAuthenticated: !!user }, false, "auth/setUser"),
        clearAuth: () => set({ user: null, isAuthenticated: false }, false, "auth/clearAuth"),
        setHydrated: (v) => set({ isHydrated: v }, false, "auth/setHydrated"),
      }),
      {
        // Tab admin và tab khách cache user riêng — không ghi đè lẫn nhau
        name:
          typeof window !== "undefined" && window.location.pathname.startsWith("/admin")
            ? "vhd-auth-admin"
            : "vhd-auth",
        partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
        onRehydrateStorage: () => (state) => {
          state?.setHydrated(true);
        },
      }
    ),
    { name: "AuthStore" }
  )
);
