import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-olive-900/10 bg-cream-50 shadow-[0_2px_10px_rgba(46,51,29,0.08)]",
        className
      )}
    >
      {children}
    </section>
  );
}

export function Sparkline({
  points,
  stroke,
  className,
}: {
  points: number[];
  stroke: string;
  className?: string;
}) {
  const w = 96;
  const h = 34;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const coords = points
    .map((p, i) => `${(i / (points.length - 1)) * w},${h - 3 - ((p - min) / span) * (h - 8)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("h-9 w-24", className)} aria-hidden="true">
      <polyline points={coords} fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StatusBadge({ status }: { status: "Pending" | "Verified" | "Rejected" }) {
  const styles = {
    Pending: "bg-yellow-200/70 text-yellow-900 ring-yellow-600/30",
    Verified: "bg-green-700 text-cream-50 ring-green-900/30",
    Rejected: "bg-red-600 text-cream-50 ring-red-800/30",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        styles[status]
      )}
    >
      {status}
    </span>
  );
}

export function StockBadge({ status }: { status: "In Stock" | "Low Stock" | "Out of Stock" }) {
  const styles = {
    "In Stock": "bg-olive-100 text-olive-800 ring-olive-500/30",
    "Low Stock": "bg-yellow-200/70 text-yellow-900 ring-yellow-600/30",
    "Out of Stock": "bg-red-600/10 text-red-700 ring-red-600/30",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        styles[status]
      )}
    >
      {status}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    Owner: "bg-blue-200/70 text-blue-900",
    Manager: "bg-olive-200/70 text-olive-800",
    Cashier: "bg-cream-200 text-olive-800",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold",
        styles[role] ?? "bg-cream-200 text-olive-800"
      )}
    >
      {role}
    </span>
  );
}

export function TableShell({
  headers,
  children,
  empty,
}: {
  headers: string[];
  children: ReactNode;
  empty?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-olive-900/15">
      <table className="w-full min-w-[640px] border-collapse bg-white text-left text-sm">
        <thead>
          <tr className="bg-cream-200/70 text-olive-900">
            {headers.map((h) => (
              <th key={h} scope="col" className="px-4 py-2.5 font-semibold first:rounded-tl-xl last:rounded-tr-xl">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-olive-900/10 tabular-nums">{children}</tbody>
      </table>
      {empty ? <p className="bg-white px-4 py-6 text-center text-sm text-stone-500">{empty}</p> : null}
    </div>
  );
}
