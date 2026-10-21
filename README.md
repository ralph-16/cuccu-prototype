# CuccuPOS — Café POS & Shop Management

A web-based Point-of-Sale and shop-management prototype for a beverage café ("Cuccu"), built as a Software Design course prototype.

- **Cashiers** take and complete orders (cash + GCash/Maya via PayMongo), review history and stock.
- **Owners/Managers** run the shop: sales dashboard, menu & recipes, inventory, expenses, reports, low-stock alerts, staff & roles.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · shadcn/Base UI · Supabase (Postgres + Auth + RLS) · Zod · PayMongo Checkout Sessions.

## Getting started

```bash
npm install
npm run dev   # http://localhost:3000 (demo mode by default)
```

Other scripts: `npm run build`, `npm run lint`, `npm run start`.

## Operating modes

Controlled by `NEXT_PUBLIC_DEMO_MODE` (default ON):

| | Demo (default) | Live (`NEXT_PUBLIC_DEMO_MODE=false`) |
|---|---|---|
| Data | Centralized sample dataset + `localStorage` | Supabase Postgres (RLS-protected) |
| Auth | One-click pseudo-login via role cookie | Supabase Auth (email/password + OAuth) |
| Payments | Cash simulated; wallets complete locally (no charge) | Cash recorded in DB; GCash/Maya/QR via PayMongo |
| Writes | Browser-local only | Real inserts/updates through Server Actions |

Live code, migrations, and RLS policies stay intact so switching is reversible.

## Environment

`.env.local`:

```
NEXT_PUBLIC_DEMO_MODE=true            # set "false" for live mode
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
PAYMONGO_SECRET_KEY=sk_test_...        # PayMongo test key
PAYMONGO_PUBLIC_KEY=pk_test_...
```

## Database (live mode)

Apply the SQL in `supabase/migrations/` in order (001 → 004) to your Supabase project. Migration `004_profile_email.sql` adds an `email` column to `profiles` (backfilled from `auth.users`) used by User/Role Management.

## Payments (PayMongo)

Wallet payments (GCash/Maya) create a `pending` order, open a PayMongo Checkout Session, and redirect the browser to PayMongo's hosted page. On return, `/pos/order/paymongo-return` marks the order `completed` (firing the inventory-deduction trigger) or `cancelled`. Cash payments follow the existing two-step pending → completed flow.

## Key invariants

- Role comes only from `getSessionRole()` (server; JWT-verified `auth.getUser()` + `profiles.role`).
- Order totals are recomputed server-side from DB prices; `profile_id` is server-set.
- The two-step order insert (pending → items → completed) is load-bearing for the inventory trigger.
- `stockStatus()` in `lib/supabase/stock.ts` is the single stock-status rule.
- Demo and live branches in `lib/supabase/queries.ts` must stay behaviorally in sync.

See `system_summary.md` and `codebase_summary.md` for the full architecture reference.
