import Link from "next/link";
import { CheckCircle2, CupSoda, XCircle } from "lucide-react";
import { CashierPageHeader } from "@/components/cashier/page-header";
import { Panel } from "@/components/owner/widgets";
import { completeWalletOrder, cancelWalletOrder } from "@/lib/paymongo";

/**
 * Return target for PayMongo hosted checkout. Completes (or cancels) the
 * pending wallet order based on the status query param, then offers next steps.
 */
export default async function PaymongoReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string; status?: string }>;
}) {
  const { order_id, status } = await searchParams;
  const orderId = order_id ? Number(order_id) : NaN;
  const ok = status === "success";

  if (Number.isFinite(orderId)) {
    if (ok) await completeWalletOrder(orderId);
    else await cancelWalletOrder(orderId);
  }

  return (
    <div className="flex flex-col gap-4">
      <CashierPageHeader
        icon={<CupSoda className="size-5" aria-hidden="true" />}
        title={ok ? "Payment successful" : "Payment cancelled"}
        subtitle={
          Number.isFinite(orderId)
            ? `Order #${orderId} · ${ok ? "completed" : "cancelled"}`
            : "No order reference returned."
        }
      />
      <Panel className="flex flex-col items-center gap-4 p-8 text-center">
        {ok ? (
          <CheckCircle2 className="size-16 text-olive-700" aria-hidden="true" />
        ) : (
          <XCircle className="size-16 text-red-600" aria-hidden="true" />
        )}
        <p className="text-lg font-bold text-olive-950">
          {ok
            ? "Payment confirmed. The order is complete and inventory has been updated."
            : "The payment was cancelled. The order has been marked cancelled."}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/pos/order"
            className="inline-flex h-11 min-w-36 cursor-pointer items-center justify-center rounded-xl bg-olive-800 px-6 font-bold text-cream-50 transition-colors hover:bg-olive-900 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            New Order
          </Link>
          <Link
            href="/pos/history"
            className="inline-flex h-11 min-w-36 cursor-pointer items-center justify-center rounded-xl border border-olive-800 px-6 font-bold text-olive-900 transition-colors hover:bg-olive-100 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none"
          >
            View History
          </Link>
        </div>
      </Panel>
    </div>
  );
}
