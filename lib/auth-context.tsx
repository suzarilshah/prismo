"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  name: string | null;
  currency?: string | null;
  occupation?: string | null;
  salary?: string | null;
  twoFactorEnabled?: boolean;
  createdAt?: Date | null;
  profileImageUrl?: string | null;
  needsOnboarding?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  syncUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Sync Stack Auth user with our database
  const syncUser = useCallback(async (): Promise<User | null> => {
    try {
      // Call sync endpoint to create/update user in our DB
      const syncResponse = await fetch("/api/auth/sync", {
        method: "POST",
        credentials: "include",
      });
      
      if (syncResponse.ok) {
        const syncData = await syncResponse.json();
        if (syncData.success) {
          setUser(syncData.data);
          return syncData.data;
        }
      }
      return null;
    } catch (error) {
      console.error("Failed to sync user:", error);
      return null;
    }
  }, []);

  // Refresh user data from our database
  const refreshUser = useCallback(async () => {
    try {
      // First try Stack Auth sync endpoint
      const syncResponse = await fetch("/api/auth/sync", {
        method: "GET",
        credentials: "include",
      });
      
      if (syncResponse.ok) {
        const data = await syncResponse.json();
        if (data.success && !data.data.needsSync) {
          setUser(data.data);
          
          // Redirect to onboarding if needed
          if (data.data.needsOnboarding && window.location.pathname !== "/onboarding") {
            router.push("/onboarding");
          }
          return;
        } else if (data.success && data.data.needsSync) {
          // User exists in Stack Auth but not in our DB - sync them
          const syncedUser = await syncUser();
          if (syncedUser) {
            setUser(syncedUser);
            if (syncedUser.needsOnboarding && window.location.pathname !== "/onboarding") {
              router.push("/onboarding");
            }
          }
          return;
        }
      }
      
      // Fall back to legacy auth check
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser(data.data);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [syncUser, router]);

  // Initial auth check
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const signIn = async (email: string, password: string) => {
    const response = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to sign in");
    }

    setUser(data.data);
    router.push("/dashboard");
  };

  const signUp = async (email: string, password: string, name: string) => {
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to sign up");
    }

    setUser(data.data);
    router.push("/onboarding");
  };

  const signOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    setUser(null);
    router.push("/");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signUp,
        signOut,
        refreshUser,
        syncUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
