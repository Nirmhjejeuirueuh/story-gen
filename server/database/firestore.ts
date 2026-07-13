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

function loadServiceAccount(): ServiceAccount {
  const envJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (envJson) {
    return JSON.parse(envJson) as ServiceAccount;
  }
  const keyPath = path.join(process.cwd(), "server", "serviceAccountKey.json");
  if (!fs.existsSync(keyPath)) {
    throw new Error(
      "Firebase credentials not found: set FIREBASE_SERVICE_ACCOUNT or add server/serviceAccountKey.json"
    );
  }
  return JSON.parse(fs.readFileSync(keyPath, "utf-8")) as ServiceAccount;
}

let firestoreInstance: Firestore | null = null;

export function getFirestore(): Firestore {
  if (!firestoreInstance) {
    if (getApps().length === 0) {
      initializeApp({ credential: cert(loadServiceAccount()) });
    }
    firestoreInstance = getAdminFirestore();
  }
  return firestoreInstance;
}
