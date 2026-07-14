/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Authentication middleware (Firebase Admin).
 *
 * `authProtect` verifies the `Authorization: Bearer <idToken>` header on every protected API
 * request using the Firebase Admin SDK, and attaches the caller's uid/email/isAdmin to the
 * request. `adminOnly` gates admin-only routes (e.g. the System Settings that hold API keys).
 *
 * Admins are identified by an email allowlist from the ADMIN_EMAILS env var (comma-separated).
 * A default is provided so local development has an admin out of the box.
 */

import { Request, Response, NextFunction } from "express";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "../database/firestore.js";

// Force the Firebase Admin app to initialize (idempotent) so getAuth() has an app to use.
getFirestore();

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "savindueshan2004@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** Express request augmented by authProtect with the verified caller identity. */
export interface AuthedRequest extends Request {
  uid?: string;
  email?: string;
  isAdmin?: boolean;
}

/**
 * Rejects any request without a valid Firebase ID token. On success, populates
 * req.uid / req.email / req.isAdmin for downstream handlers.
 */
export async function authProtect(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  try {
    const decoded = await getAuth().verifyIdToken(token);
    req.uid = decoded.uid;
    req.email = (decoded.email || "").toLowerCase();
    req.isAdmin = !!req.email && ADMIN_EMAILS.includes(req.email);
    next();
  } catch (err) {
    console.warn("[auth] Token verification failed:", (err as any)?.message || err);
    res.status(401).json({ error: "Invalid or expired session. Please sign in again." });
  }
}

/** Requires the caller to be an admin (per ADMIN_EMAILS). Must run after authProtect. */
export function adminOnly(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.isAdmin) {
    res.status(403).json({ error: "Admin access required." });
    return;
  }
  next();
}
