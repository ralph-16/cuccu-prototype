import type { ReactNode } from "react";
import { CashierAccount } from "@/components/cashier/shell";
import { Notifications, type Notice } from "@/components/owner/header-menus";
import { getSessionRole } from "@/lib/auth/role";
import { getIngredients, getRecentOrders } from "@/lib/supabase/queries";
import { stockStatus } from "@/lib/supabase/stock";
import { peso } from "@/lib/mock-data";

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}

/**
 * Server-only cashier page header: title + live notifications + account
 * dropdown at top right, mirroring the owner PageHeader. Notice links point
 * at cashier routes (never owner-only pages).
 */
export async function CashierPageHeader({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  const [session, ingredients, orders] = await Promise.all([
    getSessionRole(),
    getIngredients(),
    getRecentOrders(3),
  ]);

  const notices: Notice[] = [
    ...(ingredients.data ?? [])
      .filter((i) => stockStatus(i) !== "In Stock")
      .slice(0, 5)
      .map((i) => ({
        id: `stock-${i.id}`,
        kind: "stock" as const,
        title: `${stockStatus(i)}: ${i.name}`,
        detail: `${i.stock_quantity} ${i.unit} left · tell the manager`,
        time: "now",
        href: "/pos/inventory",
      })),
    ...(orders.data ?? []).slice(0, 3).map((o) => ({
      id: `sale-${o.id}`,
      kind: "sale" as const,
      title: `Sale · Order #${o.id}`,
      detail: `${o.items} items · ${peso(o.total)}`,
      time: fmtTime(o.created_at),
      href: "/pos/history",
    })),
  ];

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid size-9 place-items-center rounded-lg bg-olive-900 text-cream-50">
          {icon}
        </span>
        <div>
          <h1 className="text-[26px] leading-8 font-bold text-olive-950">{title}</h1>
          <p className="text-sm text-stone-500">{subtitle}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {session ? (
          <>
            <Notifications initial={notices} />
            <span className="hidden h-7 w-px bg-olive-900/25 sm:block" aria-hidden="true" />
            <CashierAccount user={{ fullName: session.fullName, role: session.role }} />
          </>
        ) : null}
      </div>
    </div>
  );
}
