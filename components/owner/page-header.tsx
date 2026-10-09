import type { ReactNode } from "react";
import { HeaderMenus, type Notice } from "@/components/owner/header-menus";
import { getSessionRole } from "@/lib/auth/role";
import { getIngredients, getRecentOrders } from "@/lib/supabase/queries";
import { stockStatus } from "@/lib/supabase/stock";

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}

/**
 * Server-only page header: live session identity + live notifications.
 * Kept out of widgets.tsx so client components can keep importing
 * Panel/TableShell/StockBadge from there without crossing the server boundary.
 */
export async function PageHeader({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  children?: ReactNode;
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
        detail: `${i.stock_quantity} ${i.unit} left · reorder at ${i.reorder_level}`,
        time: "now",
        href: "/low-stock-alerts",
      })),
    ...(orders.data ?? []).slice(0, 3).map((o) => ({
      id: `sale-${o.id}`,
      kind: "sale" as const,
      title: `New sale · Order #${o.id}`,
      detail: `${o.items} items · Cashier ${o.cashier}`,
      time: fmtTime(o.created_at),
      href: "/sales-expenses",
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
        {children}
        {session ? (
          <HeaderMenus
            user={{ fullName: session.fullName, email: session.email ?? "", role: session.role }}
            notices={notices}
          />
        ) : null}
      </div>
    </div>
  );
}
