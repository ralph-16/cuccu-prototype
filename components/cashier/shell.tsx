"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CupSoda, History, LogOut, Package } from "lucide-react";
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

export function CashierShell({ children, user }: { children: React.ReactNode; user: ShellUser }) {
  const pathname = usePathname();
  const roleLabel = user.role === "owner" ? "Owner" : "Cashier";

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
          <div className="flex items-center gap-2 rounded-2xl bg-olive-950/40 px-3 py-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-cream-50 text-xs font-bold text-olive-800" aria-hidden="true">
              {shellInitials(user.fullName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-cream-50">{user.fullName}</p>
              <RoleBadge role={roleLabel} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl text-[15px] font-bold text-cream-50 transition-colors hover:bg-olive-950/30 focus-visible:ring-2 focus-visible:ring-cream-50 focus-visible:outline-none"
          >
            <LogOut className="size-5" aria-hidden="true" /> Sign out
          </button>
          <p className="flex items-center gap-1.5 text-sm font-medium text-cream-50/90">
            <span className="size-1.5 rounded-full bg-green-300" aria-hidden="true" />
            CucuPos v1.0
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-3 px-3 pt-3 pb-3 lg:px-0 lg:pt-5 lg:pr-5 lg:pb-5">
        <div className="rounded-2xl bg-olive-500 px-4 pt-4 lg:hidden">
          <nav aria-label="Cashier navigation">
            <ul className="flex flex-row gap-1 overflow-x-auto pb-3">{links}</ul>
          </nav>
        </div>
        <main className="min-w-0 flex-1 rounded-[26px] bg-cream-100 p-4 sm:p-7">{children}</main>
      </div>
    </div>
  );
}
