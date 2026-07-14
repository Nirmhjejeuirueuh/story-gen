/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Backend Firebase Admin SDK initialization.
 *
 * The server is a trusted environment, so it uses the Admin SDK (full access, bypasses
 * security rules) rather than the client SDK. Credentials are loaded from, in priority order:
 *   1. FIREBASE_SERVICE_ACCOUNT — the service-account JSON as a single-line env var (used in
 *      production / Render, where committing a key file is not an option).
 *   2. server/serviceAccountKey.json — a local, git-ignored file (used in development).
 *
 * getFirestore() lazily initializes the app once and returns the shared Firestore handle.
 * Uses firebase-admin's modular subpath imports, which interop cleanly with ESM/tsx.
 */

import { initializeApp, cert, getApps, type ServiceAccount } from "firebase-admin/app";
import { getFirestore as getAdminFirestore, type Firestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

/**
 * Loads explicit service-account credentials from, in priority order:
 *   1. FIREBASE_SERVICE_ACCOUNT env var (JSON) — for hosts where a key is provided that way.
 *   2. server/serviceAccountKey.json — local development.
 * Returns null when neither is present, so the caller falls back to Application Default
 * Credentials (ADC) — which is how Cloud Run authenticates via its own service account.
 */
function tryLoadServiceAccount(): ServiceAccount | null {
  const envJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (envJson) return JSON.parse(envJson) as ServiceAccount;
  const keyPath = path.join(process.cwd(), "server", "serviceAccountKey.json");
  if (fs.existsSync(keyPath)) return JSON.parse(fs.readFileSync(keyPath, "utf-8")) as ServiceAccount;
  return null;
}

let firestoreInstance: Firestore | null = null;

export function getFirestore(): Firestore {
  if (!firestoreInstance) {
    if (getApps().length === 0) {
      const creds = tryLoadServiceAccount();
      initializeApp(creds ? { credential: cert(creds) } : {}); // {} → Application Default Credentials
    }
    firestoreInstance = getAdminFirestore();
  }
  return firestoreInstance;
}
