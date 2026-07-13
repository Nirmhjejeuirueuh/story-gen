/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Frontend Firebase initialization (client SDK).
 *
 * Used by the browser for real-time Firestore reads (e.g. live illustration render progress).
 * The values below are a PUBLIC client configuration — the apiKey here is an app identifier,
 * NOT a secret (it is safe to ship in the bundle). Access is governed by Firestore security
 * rules, not by hiding this key. Writes and AI generation go through the Express backend
 * (which uses the Admin SDK), never directly from the client.
 */

import { initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyAEvipNUkRMiXaCZAFLTVc8Jgy8XTaJWGA",
  authDomain: "storygen-6e3af.firebaseapp.com",
  projectId: "storygen-6e3af",
  storageBucket: "storygen-6e3af.firebasestorage.app",
  messagingSenderId: "951468330992",
  appId: "1:951468330992:web:43f286c2a4d44dd2721735",
};

export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);
export const firestore: Firestore = getFirestore(firebaseApp);
