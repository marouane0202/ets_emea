"use client";

import { useSyncExternalStore } from "react";
import { isAdminUser, isAuthenticatedUser } from "./AuthService";

const authChangedEvent = "reservation-auth-changed";

function subscribe(callback: () => void) {
  // Listen to browser storage changes and local logout/login events so auth-aware UI updates immediately.
  window.addEventListener("storage", callback);
  window.addEventListener(authChangedEvent, callback);

  return () => {
    // useSyncExternalStore expects cleanup to avoid duplicate listeners after rerenders.
    window.removeEventListener("storage", callback);
    window.removeEventListener(authChangedEvent, callback);
  };
}

function getAuthSnapshot() {
  // Collapse token and role state into one stable value so components only rerender on meaningful changes.
  if (!isAuthenticatedUser()) return "guest";
  return isAdminUser() ? "admin" : "user";
}

function getServerSnapshot() {
  // Server rendering cannot inspect localStorage, so render as guest until the client hydrates.
  return "guest";
}

export function useIsAdminUser() {
  // Components only need the admin boolean; the hook hides the subscription details.
  return useSyncExternalStore(subscribe, getAuthSnapshot, getServerSnapshot) === "admin";
}

export function notifyAuthChanged() {
  // Dispatch a same-tab event because the native storage event only fires in other tabs.
  window.dispatchEvent(new Event(authChangedEvent));
}
