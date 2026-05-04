import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  setAuth: (user: User, accessToken: string) => void;
  clearAuth: () => void;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
};

export const useAuthStore = create<AuthState & AuthActions>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setAuth: (user, accessToken) =>
          set({ user, accessToken, isAuthenticated: true }, false, "auth/setAuth"),

        clearAuth: () =>
          set(initialState, false, "auth/clearAuth"),
      }),
      {
        name: "auth-storage",
        partialize: (state) => ({
          user: state.user,
          accessToken: state.accessToken,
          isAuthenticated: state.isAuthenticated,
        }),
      },
    ),
    { name: "AuthStore" },
  ),
);
