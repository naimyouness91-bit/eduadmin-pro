import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI, setAuthHeader } from '../services/api';
import {
  AUTH_STORAGE_KEY,
  authPersistStorage,
  clearAuthState,
  isRememberMeEnabled,
  resolveLoginRedirect,
  setRememberMe,
  writeAuthState,
  getStoredToken,
} from '../utils/authSession';
import { readStoredColorTheme } from '../config/colorThemes';
import { persistColorTheme } from '../utils/applyColorTheme';
import { readStoredThemeMode, persistThemeMode } from '../utils/applyThemeMode';
import { withTimeout, AUTH_BOOTSTRAP_TIMEOUT_MS } from '../utils/withTimeout';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      authBootstrapped: false,

      login: async (credentials) => {
        set({ isLoading: true });
        try {
          const { data } = await withTimeout(
            authAPI.login(credentials),
            AUTH_BOOTSTRAP_TIMEOUT_MS,
            'Login timed out — check that the API server is running.'
          );

          if (data.requires_2fa) {
            return { requires_2fa: true, message: data.message };
          }

          const rememberMe = Boolean(credentials.remember_me);
          setRememberMe(rememberMe);

          const session = {
            user: data.user,
            token: data.token,
            isAuthenticated: true,
          };

          set({ ...session, isLoading: false, authBootstrapped: true });
          writeAuthState({ ...session, rememberMe });
          setAuthHeader(data.token);

          return {
            user: data.user,
            redirect: resolveLoginRedirect(data.redirect_url, data.user?.role),
          };
        } catch (error) {
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          await authAPI.logout();
        } catch {
          /* ignore — clear local session anyway */
        } finally {
          clearAuthState();
          setAuthHeader(null);
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            authBootstrapped: true,
          });
        }
      },

      clearSession: () => {
        clearAuthState();
        setAuthHeader(null);
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          authBootstrapped: true,
        });
      },

      fetchMe: async () => {
        const existingToken = get().token ?? getStoredToken();
        if (!existingToken) {
          set({ authBootstrapped: true, isLoading: false });
          return null;
        }

        set({ isLoading: true });
        try {
          const { data } = await withTimeout(
            authAPI.me(),
            AUTH_BOOTSTRAP_TIMEOUT_MS,
            'Session validation timed out.'
          );
          const session = {
            user: data.user,
            token: existingToken,
            isAuthenticated: true,
          };
          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
            authBootstrapped: true,
          });
          writeAuthState({ ...session, rememberMe: isRememberMeEnabled() });
          return data.user;
        } catch (error) {
          throw error;
        } finally {
          set({ isLoading: false, authBootstrapped: true });
        }
      },

      markAuthBootstrapped: () => set({ authBootstrapped: true }),

      updateUser: (userData) => {
        const current = get().user;
        if (!current) return;
        set({ user: { ...current, ...userData } });
      },

      hasRole: (...roles) => {
        const role = (get().user?.role ?? '').toString().toLowerCase();
        if (!role) return false;
        const allowed = roles.flat().map((r) => String(r).toLowerCase());
        return allowed.some((r) => r === role);
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: authPersistStorage,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          setAuthHeader(state.token);
        }
        useAuthStore.getState().markAuthBootstrapped();
      },
    }
  )
);

export const useUIStore = create((set, get) => ({
  sidebarExpanded: (() => {
    try {
      const stored = localStorage.getItem('sidebar-expanded');
      return stored !== 'false';
    } catch {
      return true;
    }
  })(),
  mobileSidebarOpen: false,
  theme: readStoredThemeMode(),
  colorTheme: readStoredColorTheme(),
  notifications: [],

  /** @deprecated use toggleSidebarExpand / toggleMobileSidebar */
  sidebarOpen: true,

  toggleSidebar: () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen }));
    } else {
      get().toggleSidebarExpand();
    }
  },

  toggleSidebarExpand: () => {
    set((state) => {
      const next = !state.sidebarExpanded;
      try {
        localStorage.setItem('sidebar-expanded', String(next));
      } catch {
        /* ignore */
      }
      return { sidebarExpanded: next, sidebarOpen: next };
    });
  },

  setSidebarOpen: (open) => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      set({ mobileSidebarOpen: open });
    } else {
      try {
        localStorage.setItem('sidebar-expanded', String(open));
      } catch {
        /* ignore */
      }
      set({ sidebarExpanded: open, sidebarOpen: open });
    }
  },

  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

  closeMobileSidebar: () => set({ mobileSidebarOpen: false }),

  setTheme: (theme) => {
    const mode = persistThemeMode(theme);
    set({ theme: mode });
  },

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  setColorTheme: (colorTheme) => {
    const id = persistColorTheme(colorTheme);
    set({ colorTheme: id });
  },

  addNotification: (notif) => {
    const id =
      notif.id ??
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `notif-${Date.now()}`);
    const entry = {
      id,
      read: false,
      createdAt: new Date().toISOString(),
      ...notif,
    };
    set((state) => ({
      notifications: [entry, ...state.notifications],
    }));
    return id;
  },

  markNotificationRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },
}));

