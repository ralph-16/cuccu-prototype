"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartColumn,
  CupSoda,
  FileText,
  LayoutDashboard,
  Package,
  TriangleAlert,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/menu-recipes", label: "Menu & Recipe", icon: CupSoda },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/sales-expenses", label: "Sales & Expenses", icon: ChartColumn },
  { href: "/low-stock-alerts", label: "Low-Stock Alerts", icon: TriangleAlert },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/users", label: "User/Role Management", icon: Users },
];

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5" aria-label="CuccuPOS home">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-cream-50 font-bold text-olive-800">
        <CupSoda className="size-6" aria-hidden="true" />
      </span>
      {!compact && (
        <span className="text-[26px] font-bold tracking-tight text-cream-50">
          Cuccu<span className="text-olive-950">POS</span>
        </span>
      )}
    </Link>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Owner navigation">
      <ul className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:gap-1.5 lg:overflow-visible">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                onClick={onNavigate}
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
        })}
      </ul>
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-olive-500 lg:flex-row">
      <aside className="hidden w-[300px] shrink-0 flex-col px-6 pt-8 pb-5 lg:flex">
        <Logo />
        <div className="mt-9 flex-1">
          <NavList />
        </div>
        <p className="flex items-center gap-1.5 text-sm font-medium text-cream-50/90">
          <span className="size-1.5 rounded-full bg-green-300" aria-hidden="true" />
          CucuPos v1.0
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-3 px-3 pt-3 pb-3 lg:px-0 lg:pt-5 lg:pr-5 lg:pb-5">
        <div className="rounded-2xl bg-olive-500 px-4 pt-4 lg:hidden">
          <Logo />
          <div className="mt-3 pb-3">
            <NavList />
          </div>
        </div>
        <main className="min-w-0 flex-1 rounded-[26px] bg-cream-100 p-4 sm:p-7">{children}</main>
      </div>
    </div>
  );
}
