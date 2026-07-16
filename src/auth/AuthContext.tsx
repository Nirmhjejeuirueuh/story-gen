/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Authentication context (Firebase Auth).
 *
 * Provides the current user, an `isAdmin` flag (resolved from the backend), and sign-in /
 * sign-out actions to the whole app. Also installs a one-time global `fetch` interceptor that
 * attaches the user's Firebase ID token as `Authorization: Bearer <token>` to every same-origin
 * `/api/` request — so individual call sites don't each have to thread the token through.
 * Image requests (`/api/images/*`, loaded via <img src>) can't carry headers and stay public.
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase.js";

// --- Global fetch interceptor (installed once, at module load) ---
// Wraps window.fetch so any request to a relative "/api/..." URL automatically carries the
// signed-in user's ID token. Non-API and cross-origin requests pass through untouched.
if (typeof window !== "undefined" && !(window as any).__authFetchInstalled) {
  (window as any).__authFetchInstalled = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const isApi = url.startsWith("/api/") || url.startsWith(`${window.location.origin}/api/`);
      const current = auth.currentUser;
      if (isApi && current) {
        const token = await current.getIdToken();
        const headers = new Headers(init?.headers || (typeof input !== "string" && !(input instanceof URL) ? input.headers : undefined));
        headers.set("Authorization", `Bearer ${token}`);
        return originalFetch(input, { ...init, headers });
      }
    } catch (err) {
      console.warn("[auth] Failed to attach ID token to request:", err);
    }
    return originalFetch(input, init);
  };
}

interface AuthContextValue {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Complete any pending redirect sign-in (used as a popup fallback). Errors here surface
    // via the normal sign-in error path; a null result just means no redirect was in flight.
    getRedirectResult(auth).catch((err) => {
      console.warn("[auth] Redirect sign-in did not complete:", err?.code || err);
    });

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Ask the backend whether this account is an admin (drives the Settings tab). The
        // fetch interceptor above attaches the token automatically.
        try {
          const res = await fetch("/api/auth/me");
          const data = res.ok ? await res.json() : null;
          setIsAdmin(!!data?.isAdmin);
        } catch {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const value: AuthContextValue = {
    user,
    isAdmin,
    loading,
    loginWithGoogle: async () => {
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (err: any) {
        // Strict popup settings (or automated browsers) block the popup window. Fall back to
        // a full-page redirect, which needs no popup. Real config errors are re-thrown so the
        // login screen can show them.
        const code = err?.code || "";
        if (
          code === "auth/popup-blocked" ||
          code === "auth/cancelled-popup-request" ||
          code === "auth/popup-closed-by-user"
        ) {
          await signInWithRedirect(auth, googleProvider);
          return;
        }
        throw err;
      }
    },
    loginWithEmail: async (email, password) => {
      await signInWithEmailAndPassword(auth, email, password);
    },
    signUpWithEmail: async (email, password) => {
      await createUserWithEmailAndPassword(auth, email, password);
    },
    logout: async () => {
      await signOut(auth);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
