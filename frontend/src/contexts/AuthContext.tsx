"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  fetchCurrentUser,
  getAuthToken,
  loginWithPassword,
  logoutClient,
  registerWithPassword,
  type AuthUser,
} from "@/lib/auth";
import { fetchMyProfile, type UserProfile } from "@/lib/userProfile";

type AuthContextValue = {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (input: { username: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  setProfile: (profile: UserProfile | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setProfile(null);
      return;
    }
    const me = await fetchCurrentUser();
    setUser(me);
    const p = await fetchMyProfile();
    setProfile(p);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const finish = () => {
      if (!cancelled) setLoading(false);
    };
    if (!getAuthToken()) {
      finish();
      return;
    }
    const run = async () => {
      try {
        await refreshProfile();
      } catch {
        logoutClient();
        if (!cancelled) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        finish();
      }
    };
    if (typeof requestIdleCallback !== "undefined") {
      const idleId = requestIdleCallback(() => void run(), { timeout: 2500 });
      return () => {
        cancelled = true;
        cancelIdleCallback(idleId);
      };
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [refreshProfile]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const data = await loginWithPassword(identifier, password);
      setUser(data.user);
      const p = await fetchMyProfile();
      setProfile(p);
      await queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      await queryClient.invalidateQueries({ queryKey: ["myReviews"] });
    },
    [queryClient],
  );

  const register = useCallback(
    async (input: { username: string; email: string; password: string }) => {
      const data = await registerWithPassword(input);
      setUser(data.user);
      const p = await fetchMyProfile();
      setProfile(p);
      await queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    logoutClient();
    setUser(null);
    setProfile(null);
    queryClient.removeQueries({ queryKey: ["userProfile"] });
    queryClient.removeQueries({ queryKey: ["myReviews"] });
  }, [queryClient]);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refreshProfile,
      setProfile,
    }),
    [user, profile, loading, login, register, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
