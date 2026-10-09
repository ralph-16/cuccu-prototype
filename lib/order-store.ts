"use client";

// Prototype order history. Orders placed in the cashier view persist here
// (localStorage) so History shows them. Supabase orders/order_items replace later.

import { recentSales, type Sale } from "@/lib/mock-data";

const KEY = "cuccu-orders";

export interface PlacedOrder extends Sale {
  status: "Completed";
}

function readStored(): PlacedOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as PlacedOrder[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function seedHistory(): PlacedOrder[] {
  return [...readStored(), ...recentSales.map((s) => ({ ...s, status: "Completed" as const }))];
}

export function saveOrder(order: PlacedOrder) {
  try {
    const current = readStored();
    window.localStorage.setItem(KEY, JSON.stringify([order, ...current]));
  } catch {
    // storage full/blocked — history just won't persist
  }
}

export function nextOrderNo(): string {
  const nums = [...readStored(), ...recentSales].map((o) => parseInt(o.orderNo, 10) || 0);
  return String(Math.max(...nums, 1000) + 1);
}
