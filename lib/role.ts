"use client";

// DEPRECATED prototype-grade role handling (localStorage, user-editable).
// Source of truth is now Supabase Auth + profiles.role via
// lib/auth/role.ts:getSessionRole() (server, getUser-verified).
// Kept only so existing client shells keep compiling during migration.

export type DemoRole = "owner" | "cashier";

const KEY = "cuccu-demo-role";

export function getRole(): DemoRole | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(KEY);
  return v === "owner" || v === "cashier" ? v : null;
}

export function setRole(role: DemoRole) {
  window.localStorage.setItem(KEY, role);
}

export function clearRole() {
  window.localStorage.removeItem(KEY);
}
