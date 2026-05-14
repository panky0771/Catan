import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { socketClient } from '../socket/socketClient';

interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  isGuest?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  loginAsGuest: (username?: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  initFromStorage: () => Promise<void>;
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${SERVER_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Login failed');

          localStorage.setItem('auth_token', data.token);
          set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });

          // Connect and authenticate socket
          socketClient.connect();
          await socketClient.authenticate(data.token);
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
          throw err;
        }
      },

      register: async (username, email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${SERVER_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Registration failed');

          localStorage.setItem('auth_token', data.token);
          set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });

          socketClient.connect();
          await socketClient.authenticate(data.token);
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
          throw err;
        }
      },

      loginAsGuest: async (username) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${SERVER_URL}/api/auth/guest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Guest login failed');

          localStorage.setItem('auth_token', data.token);
          set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });

          socketClient.connect();
          await socketClient.authenticate(data.token);
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
          throw err;
        }
      },

      logout: () => {
        localStorage.removeItem('auth_token');
        socketClient.disconnect();
        set({ user: null, token: null, isAuthenticated: false });
      },

      clearError: () => set({ error: null }),

      initFromStorage: async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        try {
          const res = await fetch(`${SERVER_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            localStorage.removeItem('auth_token');
            return;
          }
          const user = await res.json();
          set({ user, token, isAuthenticated: true });

          socketClient.connect();
          await socketClient.authenticate(token);
        } catch {
          localStorage.removeItem('auth_token');
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
