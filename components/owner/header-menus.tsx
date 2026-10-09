"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CheckCheck,
  ChevronDown,
  CircleUserRound,
  LogOut,
  Settings,
  ShoppingCart,
  Store,
  TriangleAlert,
  X,
} from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { RoleBadge } from "@/components/owner/widgets";
import { cn } from "@/lib/utils";

export interface Notice {
  id: string;
  kind: "stock" | "sale";
  title: string;
  detail: string;
  time: string;
  href: string;
}

export interface HeaderUser {
  fullName: string;
  email: string;
  role: "owner" | "cashier";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2);
  return (parts.join("") || "•").toUpperCase();
}

const KIND_ICON = {
  stock: TriangleAlert,
  sale: ShoppingCart,
} as const;

const KIND_TONE = {
  stock: "bg-red-100 text-red-700",
  sale: "bg-olive-100 text-olive-700",
} as const;

function useDismiss(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onPointer(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return ref;
}

export function Notifications({ initial }: { initial: Notice[] }) {
  const [open, setOpen] = useState(false);
  const [notices, setNotices] = useState<Notice[]>(initial);
  const [read, setRead] = useState<string[]>([]);
  const ref = useDismiss(() => setOpen(false));
  const unread = notices.filter((n) => !read.includes(n.id)).length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications, all read"}
        className="relative grid size-9 cursor-pointer place-items-center rounded-full text-olive-900 transition-colors hover:bg-olive-100 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none"
      >
        <Bell className="size-5" aria-hidden="true" />
        {unread > 0 ? (
          <span className="absolute top-1.5 right-2 size-1.5 rounded-full bg-red-600" aria-hidden="true" />
        ) : null}
      </button>

      {open ? (
        <div className="absolute top-full right-0 z-50 mt-2 w-[min(22rem,80vw)] overflow-hidden rounded-2xl border border-olive-900/15 bg-cream-50 shadow-[0_8px_30px_rgba(46,51,29,0.25)]">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="font-bold text-olive-950">
              Notifications{" "}
              {unread > 0 ? (
                <span className="ml-1 rounded-full bg-olive-800 px-2 py-0.5 text-xs font-bold text-cream-50">
                  {unread}
                </span>
              ) : null}
            </p>
            <button
              type="button"
              onClick={() => setRead(notices.map((n) => n.id))}
              disabled={unread === 0}
              className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-olive-700 transition-colors hover:text-olive-900 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CheckCheck className="size-3.5" aria-hidden="true" /> Mark all read
            </button>
          </div>
          <ul className="max-h-80 divide-y divide-olive-900/10 overflow-y-auto bg-white" role="list" aria-label="Notifications">
            {notices.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-stone-500">No notifications.</li>
            ) : (
              notices.map((n) => {
                const Icon = KIND_ICON[n.kind];
                const isRead = read.includes(n.id);
                return (
                  <li key={n.id} className={cn("flex gap-3 px-4 py-3", !isRead && "bg-cream-100/60")}>
                    <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", KIND_TONE[n.kind])}>
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={n.href}
                        onClick={() => setOpen(false)}
                        className="block rounded font-bold text-olive-950 hover:underline focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none"
                      >
                        {n.title}
                      </Link>
                      <p className="truncate text-[13px] text-stone-500">{n.detail}</p>
                      <p className="text-xs text-stone-400">{n.time}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotices((ns) => ns.filter((x) => x.id !== n.id))}
                      aria-label={`Dismiss: ${n.title}`}
                      className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-full text-stone-400 transition-colors hover:bg-cream-200 hover:text-olive-900 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </li>
                );
              })
            )}
          </ul>
          <Link
            href="/low-stock-alerts"
            onClick={() => setOpen(false)}
            className="block bg-cream-100 px-4 py-2.5 text-center text-sm font-bold text-olive-800 transition-colors hover:bg-olive-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-olive-600 focus-visible:outline-none"
          >
            View all alerts →
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function Account({ user }: { user: HeaderUser }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(() => setOpen(false));
  const roleLabel = user.role === "owner" ? "Owner" : "Cashier";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex cursor-pointer items-center gap-1.5 rounded-full px-1 py-1 text-sm font-semibold text-olive-950 transition-colors hover:bg-olive-100 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none"
      >
        <CircleUserRound className="size-6" aria-hidden="true" />
        {roleLabel}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Account"
          className="absolute top-full right-0 z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-olive-900/15 bg-cream-50 shadow-[0_8px_30px_rgba(46,51,29,0.25)]"
        >
          <div className="flex items-center gap-3 border-b border-olive-900/10 bg-white px-4 py-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-olive-600 text-sm font-bold text-cream-50" aria-hidden="true">
              {initials(user.fullName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-olive-950">{user.fullName}</p>
              <p className="truncate text-xs text-stone-500">{user.email}</p>
              <div className="mt-1">
                <RoleBadge role={roleLabel} />
              </div>
            </div>
          </div>
          <div className="p-1.5">
            <Link
              href="/users"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-olive-950 transition-colors hover:bg-olive-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-olive-600 focus-visible:outline-none"
            >
              <Settings className="size-4" aria-hidden="true" /> Profile Settings
            </Link>
            <Link
              href="/pos/order"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-olive-950 transition-colors hover:bg-olive-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-olive-600 focus-visible:outline-none"
            >
              <Store className="size-4" aria-hidden="true" /> Open Cashier View
            </Link>
            <form action={signOut} className="px-1.5 pb-1.5">
              {/* No onClick close here: unmounting the menu on submit would
                  detach the form before the action fires. Redirect unmounts anyway. */}
              <button
                type="submit"
                role="menuitem"
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500 focus-visible:outline-none"
              >
                <LogOut className="size-4" aria-hidden="true" /> Sign out
              </button>
            </form>
          </div>
          <p className="border-t border-olive-900/10 bg-cream-100 px-4 py-2 text-center text-[11px] text-stone-400">
            CucuPos v1.0 · Prototype
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function HeaderMenus({ user, notices }: { user: HeaderUser; notices: Notice[] }) {
  return (
    <>
      <Notifications initial={notices} />
      <span className="hidden h-7 w-px bg-olive-900/25 sm:block" aria-hidden="true" />
      <Account user={user} />
    </>
  );
}
