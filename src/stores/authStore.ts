import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types/index.ts';
import { authApi } from '../services/api.ts';
import { clearAuth, setAccessToken } from '../utils/storage.ts';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  /** Clears tokens and auth state (used by logout and when token is missing). */
  clearSession: () => void;
  resetPassword: (email: string) => Promise<void>;
  uploadProfileImage: (file: File) => Promise<User>;
  refreshCurrentUser: () => Promise<User | null>;
  updateProfile: (payload: { name: string }) => Promise<User>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const user = await authApi.login(email, password);
          const token = `geo-${btoa(JSON.stringify({ sub: user.id, role: user.role }))}.${Date.now()}`;
          setAccessToken(token);
          set({ user, isAuthenticated: true, isLoading: false, error: null });
          return user;
        } catch (e) {
          set({ error: e instanceof Error ? e.message : 'Login failed', isLoading: false });
          throw e;
        }
      },
      logout: async () => {
        await authApi.logout();
        get().clearSession();
      },
      clearSession: () => {
        clearAuth();
        set({ user: null, isAuthenticated: false, error: null });
      },
      resetPassword: async (email) => {
        set({ isLoading: true, error: null });
        try {
          await authApi.resetPassword(email);
          set({ isLoading: false, error: null });
        } catch (e) {
          set({ error: e instanceof Error ? e.message : 'Failed', isLoading: false });
          throw e;
        }
      },
      uploadProfileImage: async (file) => {
        set({ isLoading: true, error: null });
        try {
          const updatedUser = await authApi.uploadProfileImage(file);
          set({ user: updatedUser, isAuthenticated: true, isLoading: false, error: null });
          return updatedUser;
        } catch (e) {
          set({ error: e instanceof Error ? e.message : 'Failed to upload image', isLoading: false });
          throw e;
        }
      },
      refreshCurrentUser: async () => {
        const currentUser = get().user;
        if (!currentUser) return null;
        try {
          const refreshed = await authApi.getCurrentUser();
          set({ user: refreshed, isAuthenticated: true, error: null });
          return refreshed;
        } catch {
          return currentUser;
        }
      },
      updateProfile: async (payload) => {
        set({ isLoading: true, error: null });
        try {
          const updatedUser = await authApi.updateProfile(payload);
          set({ user: updatedUser, isAuthenticated: true, isLoading: false, error: null });
          return updatedUser;
        } catch (e) {
          set({ error: e instanceof Error ? e.message : 'Failed to update profile', isLoading: false });
          throw e;
        }
      },
      clearError: () => set({ error: null }),
    }),
    { name: 'geo-attendance-auth', partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }) }
  )
);
