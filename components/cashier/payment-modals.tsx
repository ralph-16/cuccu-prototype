"use client";

import { useRef, useState } from "react";
import { BadgeCheck, QrCode } from "lucide-react";
import { peso } from "@/lib/mock-data";
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

export function WalletModal({ total, method, onClose, onConfirm }: {
  total: number;
  method: Exclude<PayMethod, "Cash">;
  onClose: () => void;
  onConfirm: (ref: string) => void;
}) {
  const [number, setNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const digits = number.replace(/\D/g, "");

  function confirm() {
    if (!/^09\d{9}$/.test(digits)) {
      setError(`Enter a valid 11-digit ${method} number (09XX XXX XXXX).`);
      inputRef.current?.focus();
      return;
    }
    onConfirm(digits);
  }

  return (
    <ModalShell label={`${method} payment`} onClose={onClose}>
      <h2 className="text-3xl font-bold text-olive-950">{method} payment</h2>
      <p className="mt-1 text-stone-600">Scan the QR code or enter the {method} number.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="grid place-items-center gap-2 rounded-2xl border border-olive-900/15 bg-white p-5">
          <span className="grid size-36 place-items-center rounded-xl bg-cream-100 text-olive-700" role="img" aria-label={`${method} QR code placeholder — live code appears when payments are connected`}>
            <QrCode className="size-20" aria-hidden="true" />
          </span>
          <p className="text-sm font-bold text-olive-900">{method}</p>
          <p className="text-center text-xs text-stone-400">QR connects when payments go live</p>
        </div>
        <div className="rounded-2xl border border-olive-900/15 bg-cream-100 p-4">
          <label htmlFor="wallet-number" className="text-lg font-bold text-olive-950">{method} Number</label>
          <input
            ref={inputRef}
            id="wallet-number"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={number}
            onChange={(e) => { setNumber(e.target.value); setError(null); }}
            placeholder="09XX XXX XXXX"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "wallet-error" : undefined}
            className="mt-1 h-12 w-full rounded-xl border border-olive-900/20 bg-white px-3 text-lg tracking-widest tabular-nums focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none"
          />
          {error ? (
            <p id="wallet-error" role="alert" className="mt-2 text-sm font-semibold text-red-700">{error}</p>
          ) : (
            <p className="mt-3 rounded-xl bg-white p-3 text-sm text-stone-600">
              Open your {method} app, scan the QR code or send payment to the number above.
            </p>
          )}
        </div>
      </div>
      <Summary total={total} method={method} />
      <Actions onClose={onClose} onConfirm={confirm} />
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
