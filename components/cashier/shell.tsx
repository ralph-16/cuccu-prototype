"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, CupSoda, History, LogOut, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth/actions";
import { RoleBadge } from "@/components/owner/widgets";

const NAV = [
  { href: "/pos/order", label: "Order", icon: CupSoda },
  { href: "/pos/history", label: "History", icon: History },
  { href: "/pos/inventory", label: "Inventory", icon: Package },
];

export interface ShellUser {
  fullName: string;
  role: "owner" | "cashier";
}

function shellInitials(name: string) {
  const parts = name.trim().split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2);
  return (parts.join("") || "•").toUpperCase();
}

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

/** Owner-style account dropdown: identity + sign out. Exported for page headers. */
export function CashierAccount({ user, dark = false, drop = 'down' }: { user: ShellUser; dark?: boolean; drop?: 'up' | 'down' }) {
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
        className={cn(
          "flex cursor-pointer items-center gap-2 rounded-full px-2 py-1.5 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:outline-none",
          dark
            ? "text-cream-50 hover:bg-olive-950/30 focus-visible:ring-cream-50"
            : "text-olive-950 hover:bg-olive-100 focus-visible:ring-olive-600"
        )}
      >
        <span
          className="grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold"
          style={{ backgroundColor: dark ? "#f7f3e3" : "#556030", color: dark ? "#3f4a1f" : "#f7f3e3" }}
          aria-hidden="true"
        >
          {shellInitials(user.fullName)}
        </span>
        <span className="max-w-28 truncate">{user.fullName}</span>
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Account"
          className={cn(
            "absolute z-50 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-olive-900/15 bg-cream-50 shadow-[0_8px_30px_rgba(46,51,29,0.25)]",
            drop === 'up' ? "bottom-full left-0 mb-2" : "top-full right-0 mt-2"
          )}
        >
          <div className="flex items-center gap-3 border-b border-olive-900/10 bg-white px-4 py-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-olive-600 text-sm font-bold text-cream-50" aria-hidden="true">
              {shellInitials(user.fullName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-olive-950">{user.fullName}</p>
              <div className="mt-1">
                <RoleBadge role={roleLabel} />
              </div>
            </div>
          </div>
          <div className="p-1.5">
            <form action={signOut} className="px-1.5 pb-1.5">
              {/* No onClick close: unmounting on submit would cancel the action. */}
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
            CucuPos v1.0
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function CashierShell({ children, user }: { children: React.ReactNode; user: ShellUser }) {
  const pathname = usePathname();

  const links = NAV.map(({ href, label, icon: Icon }) => {
    const active = pathname === href;
    return (
      <li key={href}>
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-2xl px-4 py-2.5 text-[17px] font-semibold whitespace-nowrap transition-colors",
            "focus-visible:ring-2 focus-visible:ring-cream-50 focus-visible:ring-offset-2 focus-visible:ring-offset-olive-500 focus-visible:outline-none",
            active
              ? "bg-olive-950/85 text-cream-50 shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
              : "text-cream-50/95 hover:bg-olive-950/30 hover:text-cream-50"
          )}
        >
          <Icon className="size-6 shrink-0" aria-hidden="true" />
          {label}
        </Link>
      </li>
    );
  });

  return (
    <div className="flex min-h-dvh flex-col bg-olive-500 lg:flex-row">
      <aside className="hidden w-[260px] shrink-0 flex-col px-6 pt-8 pb-5 lg:flex">
        <Link href="/pos/order" className="flex items-center gap-2.5" aria-label="CuccuPOS cashier home">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-cream-50 font-bold text-olive-800">
            <CupSoda className="size-6" aria-hidden="true" />
          </span>
          <span className="text-[26px] font-bold tracking-tight text-cream-50">
            Cuccu<span className="text-olive-950">POS</span>
          </span>
        </Link>
        <nav aria-label="Cashier navigation" className="mt-9 flex-1">
          <ul className="flex flex-col gap-1.5">{links}</ul>
        </nav>
        <div className="flex flex-col gap-2">
          <CashierAccount user={user} dark drop="up" />
          <p className="flex items-center gap-1.5 text-sm font-medium text-cream-50/90">
            <span className="size-1.5 rounded-full bg-green-300" aria-hidden="true" />
            CucuPos v1.0
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-3 px-3 pt-3 pb-3 lg:px-0 lg:pt-5 lg:pr-5 lg:pb-5">
        <div className="rounded-2xl bg-olive-500 px-4 pt-4 lg:hidden">
          <div className="flex items-center justify-between gap-2 pb-1">
            <span className="text-lg font-bold tracking-tight text-cream-50">
              Cuccu<span className="text-olive-950">POS</span>
            </span>
            <CashierAccount user={user} dark />
          </div>
          <nav aria-label="Cashier navigation">
            <ul className="flex flex-row gap-1 overflow-x-auto pb-3">{links}</ul>
          </nav>
        </div>
        <main className="min-w-0 flex-1 rounded-[26px] bg-cream-100 p-4 sm:p-7">{children}</main>
      </div>
    </div>
  );
}
