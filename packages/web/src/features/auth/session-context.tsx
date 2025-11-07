import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "cursor-orchestrator-session";

export interface Session {
  userId: string;
  displayName: string;
  email?: string | null;
}

interface SessionContextValue {
  session: Session | null;
  isAuthenticated: boolean;
  setSession: (session: Session) => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

const readStoredSession = (): Session | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const data = JSON.parse(raw) as Session;
    if (data.userId && data.displayName) {
      return data;
    }
  } catch (error) {
    console.warn("Failed to read stored session", error);
  }
  return null;
};

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSessionState] = useState<Session | null>(null);

  useEffect(() => {
    const stored = readStoredSession();
    if (stored) {
      setSessionState(stored);
    }
  }, []);

  const setSession = useCallback((value: Session) => {
    setSessionState(value);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }, []);

  const clearSession = useCallback(() => {
    setSessionState(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session),
      setSession,
      clearSession,
    }),
    [session, setSession, clearSession],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};
