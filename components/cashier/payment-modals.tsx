"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { peso } from "@/lib/mock-data";
import { startWalletPayment } from "@/lib/paymongo";
import { isDemoModeClient } from "@/lib/demo/client-store";
import { cn } from "@/lib/utils";

export type PayMethod = "Cash" | "GCash" | "Maya" | "QR Ph";

function ModalShell({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-olive-950/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-3xl bg-cream-50 p-5 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close payment"
          autoFocus
          className="absolute top-4 right-4 grid size-9 cursor-pointer place-items-center rounded-full bg-white text-xl leading-none text-stone-500 shadow transition-colors hover:text-olive-900 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

function Summary({ total, method }: { total: number; method: PayMethod }) {
  return (
    <dl className="mt-4 rounded-2xl border border-olive-900/15 bg-cream-100 px-5 py-4 text-[15px]">
      <div className="flex justify-between py-1">
        <dt className="text-stone-500">Subtotal</dt>
        <dd className="font-bold text-olive-950 tabular-nums">{peso(total)}</dd>
      </div>
      <div className="flex justify-between py-1">
        <dt className="text-stone-500">Payment Method</dt>
        <dd className="font-bold text-olive-950">{method}</dd>
      </div>
      <div className="mt-1 flex justify-between border-t border-olive-900/20 pt-2 text-lg">
        <dt className="font-semibold">Total</dt>
        <dd className="font-bold text-olive-950 tabular-nums">{peso(total)}</dd>
      </div>
    </dl>
  );
}

function Actions({ onClose, onConfirm, confirmLabel = "Confirm Payment", disabled = false }: {
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div className="mt-6 flex justify-center gap-8">
      <button
        type="button"
        onClick={onClose}
        className="h-11 min-w-36 cursor-pointer rounded-xl border border-olive-800 px-6 font-bold text-olive-900 transition-colors hover:bg-olive-100 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled}
        className="h-11 min-w-36 cursor-pointer rounded-xl bg-olive-800 px-6 font-bold text-cream-50 transition-colors hover:bg-olive-900 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
      >
        {confirmLabel}
      </button>
    </div>
  );
}

export function CashModal({ total, onClose, onConfirm }: {
  total: number;
  onClose: () => void;
  onConfirm: (tendered: number) => void;
}) {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tendered = parseFloat(raw) || 0;
  const change = tendered - total;

  function confirm() {
    if (!raw || tendered < total) {
      setError(`Amount must be at least ${peso(total)}.`);
      inputRef.current?.focus();
      return;
    }
    onConfirm(tendered);
  }

  return (
    <ModalShell label="Cash payment" onClose={onClose}>
      <h2 className="text-3xl font-bold text-olive-950">Cash payment</h2>
      <p className="mt-1 text-stone-600">Please enter the amount received from the customer.</p>
      <Summary total={total} method="Cash" />
      <label htmlFor="cash-received" className="mt-5 block text-lg font-semibold text-olive-950">
        Amount Received
      </label>
      <div className="relative mt-1">
        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-xl font-bold text-olive-900" aria-hidden="true">₱</span>
        <input
          ref={inputRef}
          id="cash-received"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={raw}
          onChange={(e) => { setRaw(e.target.value); setError(null); }}
          placeholder="Enter amount…"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "cash-error" : "cash-change"}
          className="h-14 w-full rounded-2xl border border-olive-900/25 bg-white pr-4 pl-11 text-lg tabular-nums focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none"
        />
      </div>
      {error ? (
        <p id="cash-error" role="alert" className="mt-2 text-sm font-semibold text-red-700">{error}</p>
      ) : (
        <p id="cash-change" role="status" className="mt-2 text-sm font-semibold text-olive-800">
          Change due: {tendered > 0 ? peso(Math.max(change, 0)) : peso(0)}
        </p>
      )}
      <Actions onClose={onClose} onConfirm={confirm} />
    </ModalShell>
  );
}

function WalletBrand({ method }: { method: Exclude<PayMethod, "Cash"> }) {
  if (method === "GCash") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/gcash-logo.svg" alt="GCash" className="h-12 w-auto" />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/maya-logo.svg" alt="Maya" className="h-12 w-auto" />
  );
}

export function WalletModal({
  total,
  method,
  items,
  onClose,
  onConfirm,
  onCancel,
}: {
  total: number;
  method: Exclude<PayMethod, "Cash">;
  items: { product_variant_id: number; quantity: number }[];
  onClose: () => void;
  onConfirm: (orderId: number | null) => void;
  onCancel: (orderId: number | null) => void;
}) {
  const demo = isDemoModeClient();
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; orderId: number | null; checkoutUrl: string; qrDataUrl: string | null }
    | { status: "error"; message: string }
  >({ status: "loading" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await startWalletPayment({
        payment_method: method.toLowerCase(),
        items,
      });
      if (cancelled) return;
      if (res.error || !res.checkoutUrl) {
        setState({ status: "error", message: res.error ?? "Could not start payment." });
        return;
      }
      setState({
        status: "ready",
        orderId: res.orderId,
        checkoutUrl: res.checkoutUrl,
        qrDataUrl: res.qrDataUrl ?? null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [method, items]);

  async function handleConfirm() {
    const orderId = state.status === "ready" ? state.orderId : null;
    setBusy(true);
    await onConfirm(orderId);
    setBusy(false);
  }

  async function handleCancel() {
    const orderId = state.status === "ready" ? state.orderId : null;
    setBusy(true);
    await onCancel(orderId);
    setBusy(false);
  }

  return (
    <ModalShell label={`${method} payment`} onClose={onClose}>
      <div className="flex items-center gap-3">
        <WalletBrand method={method} />
        <div>
          <h2 className="text-3xl font-bold text-olive-950">{method} payment</h2>
          <p className="text-stone-600">
            {demo ? "Prototype checkout — scan to pay (no real charge)." : "Scan the QR with your " + method + " app."}
          </p>
        </div>
      </div>
      <Summary total={total} method={method} />

      {state.status === "loading" ? (
        <div className="mt-4 grid place-items-center rounded-2xl border border-olive-900/15 bg-cream-100 p-8">
          <p className="text-sm font-semibold text-olive-800">Generating payment QR…</p>
        </div>
      ) : state.status === "error" ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {state.message}
        </div>
      ) : (
        <>
          <div className="mt-4 grid place-items-center gap-2 rounded-2xl border border-olive-900/15 bg-white p-5">
            {state.qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={state.qrDataUrl}
                alt={`${method} payment QR code`}
                className="size-[220px] rounded-lg"
              />
            ) : (
              <span className="grid size-[220px] place-items-center rounded-lg bg-cream-100 text-stone-400">
                QR unavailable
              </span>
            )}
            <p className="text-sm font-bold text-olive-900">{method}</p>
            <p className="text-center text-xs text-stone-400">
              Scan with your {method} app · or{" "}
              <a
                href={state.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-olive-700 underline-offset-2 hover:underline"
              >
                open PayMongo checkout
              </a>
            </p>
          </div>
          <p className="mt-3 rounded-xl bg-cream-100 px-3 py-2 text-center text-[13px] font-semibold text-olive-900">
            {demo ? "Demo — order recorded locally after you confirm" : "Secure payment via PayMongo"}
          </p>
        </>
      )}

      <div className="mt-6 flex justify-center gap-8">
        <button
          type="button"
          onClick={handleCancel}
          disabled={busy || state.status === "loading"}
          className="h-11 min-w-36 cursor-pointer rounded-xl border border-olive-800 px-6 font-bold text-olive-900 transition-colors hover:bg-olive-100 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={busy || state.status !== "ready"}
          className="h-11 min-w-40 cursor-pointer rounded-xl bg-olive-800 px-6 font-bold text-cream-50 transition-colors hover:bg-olive-900 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Processing…" : demo ? "Payment received (demo)" : "Payment received"}
        </button>
      </div>
    </ModalShell>
  );
}


export function SuccessModal({ orderNo, total, method, extra, onClose, onNew }: {
  orderNo: string;
  total: number;
  method: PayMethod;
  extra: string;
  onClose: () => void;
  onNew: () => void;
}) {
  return (
    <ModalShell label="Payment successful" onClose={onClose}>
      <div className="flex flex-col items-center py-4 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-olive-100 text-olive-700">
          <BadgeCheck className="size-9" aria-hidden="true" />
        </span>
        <h2 className="mt-3 text-3xl font-bold text-olive-950">Payment successful</h2>
        <p role="status" className="mt-1 text-stone-600">
          Order #{orderNo} · {method} · {peso(total)}
        </p>
        <p className={cn("mt-1 text-sm font-semibold text-olive-800")}>{extra}</p>
        <div className="mt-6 flex justify-center gap-8">
          <button
            type="button"
            onClick={onClose}
            className="h-11 min-w-36 cursor-pointer rounded-xl border border-olive-800 px-6 font-bold text-olive-900 transition-colors hover:bg-olive-100 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none"
          >
            View History
          </button>
          <button
            type="button"
            onClick={onNew}
            autoFocus
            className="h-11 min-w-36 cursor-pointer rounded-xl bg-olive-800 px-6 font-bold text-cream-50 transition-colors hover:bg-olive-900 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            New Order
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
