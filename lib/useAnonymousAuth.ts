"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth } from "@/lib/firebase";

let anonymousSignInPromise: Promise<void> | null = null;

function ensureAnonymousSignIn() {
  if (!anonymousSignInPromise) {
    anonymousSignInPromise = signInAnonymously(auth)
      .then(() => undefined)
      .catch((error) => {
        anonymousSignInPromise = null;
        throw error;
      });
  }

  return anonymousSignInPromise;
}

export function useAnonymousAuth() {
  const [currentUid, setCurrentUid] = useState("");
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUid(user?.uid ?? "");
      setAuthReady(true);
    });

    if (!auth.currentUser) {
      void ensureAnonymousSignIn().catch((error) => {
        console.error("Anonymous sign-in failed:", error);
      });
    }

    return () => unsubscribe();
  }, []);

  return { currentUid, authReady };
}
