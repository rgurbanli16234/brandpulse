/**
 * Client-side session store.
 *
 * Keeps the JWT + user/business in localStorage and mirrors the token into the
 * API client. Reads happen in an effect so server-side rendering stays safe.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api, setAuthToken, type Business, type TokenResponse, type User } from "@/lib/api";

const STORAGE_KEY = "brandpulse.session";

export interface Session {
  token: string;
  user: User;
  business: Business;
}

interface AuthContextValue {
  session: Session | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    business_name: string;
    email: string;
    password: string;
    alert_email?: string;
  }) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function persist(next: Session | null): void {
  setAuthToken(next?.token ?? null);
  if (typeof window === "undefined") return;
  if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  else window.localStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const stored = JSON.parse(raw) as Session;
        setAuthToken(stored.token);
        setSession(stored);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setReady(true);
  }, []);

  const apply = useCallback((result: TokenResponse) => {
    const next: Session = { token: result.access_token, user: result.user, business: result.business };
    persist(next);
    setSession(next);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => apply(await api.login({ email, password })),
    [apply],
  );

  const register = useCallback(
    async (input: { business_name: string; email: string; password: string; alert_email?: string }) =>
      apply(await api.register(input)),
    [apply],
  );

  const signOut = useCallback(() => {
    persist(null);
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, ready, login, register, signOut }),
    [session, ready, login, register, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
