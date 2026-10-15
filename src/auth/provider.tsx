import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./client";
type AuthState = {
  session: Session | null;
  ready: boolean;
  pendingInvite: string | null;
  setPendingInvite: (value: string | null) => void;
};
const Context = createContext<AuthState>({
  session: null,
  ready: false,
  pendingInvite: null,
  setPendingInvite: () => {},
});
export const useAuth = () => useContext(Context);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null),
    [ready, setReady] = useState(false),
    [pendingInvite, setPendingInvite] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    let revision = 0;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!live) return;
      revision++;
      setSession(next);
      setReady(true);
    });
    const initialRevision = revision;
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (live && revision === initialRevision) {
          setSession(data.session);
          setReady(true);
        }
      })
      .catch(() => {
        if (live) setReady(true);
      });
    const sync = () => {
      if (Platform.OS !== "web") {
        if (AppState.currentState === "active")
          supabase.auth.startAutoRefresh();
        else supabase.auth.stopAutoRefresh();
      }
    };
    sync();
    const foreground = AppState.addEventListener("change", sync);
    return () => {
      live = false;
      subscription.unsubscribe();
      foreground.remove();
      if (Platform.OS !== "web") supabase.auth.stopAutoRefresh();
    };
  }, []);
  return (
    <Context.Provider
      value={{ session, ready, pendingInvite, setPendingInvite }}
    >
      {children}
    </Context.Provider>
  );
}
