# CuccuPOS — System Summary

Documentation of how the CuccuPOS system works: its purpose, architecture, data flow, modules, and the demo/live operating modes.

---

## 1. What the System Is

**CuccuPOS** is a web-based Point-of-Sale (POS) and shop-management prototype for a beverage / café business (the "Cuccu" demo stall). It was built as a Software Design prototype:

- **Cashiers** take and complete cash orders at the counter, and review order history and stock levels.
- **Owners / Managers** run the shop: monitor sales, manage menu & recipes, track inventory and low-stock alerts, record expenses, view reports, and manage staff accounts and roles.

The system runs in **two mutually exclusive modes**, controlled by the environment variable `NEXT_PUBLIC_DEMO_MODE` (see [§5](#5-operating-modes-demo-vs-live)):

| | **Demo/Prototype mode (default)** | **Live mode** (`NEXT_PUBLIC_DEMO_MODE=false`) |
|---|---|---|
| Data source | Centralized sample dataset + `localStorage` | Supabase Postgres (RLS-protected) |
| Auth | One-click pseudo-login via a role cookie | Supabase Auth (email/password + OAuth) |
| Payments | Simulated cash checkout (no real money) | Cash payments recorded in the DB; GCash/Maya/QR via **PayMongo Checkout Sessions** (test keys in `.env.local`) |
| Writes | Browser-local only (no DB writes) | Real inserts/updates through Server Actions |

Live-mode code, migrations, and RLS policies are kept intact so the switch from demo to live is reversible at any time.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 16 (App Router)** — Server Components by default |
| UI | **React 19**, **Tailwind CSS 4**, shadcn/Base UI components, lucide-react icons |
| Validation | **Zod** (client- and server-side input schemas) |
| Backend (live) | **Supabase** — Postgres with Row-Level Security, Auth, RPC functions, DB triggers |
| Sessions | `@supabase/ssr` cookie-based sessions, refreshed by Next.js middleware |
| State (demo) | Browser `localStorage` (`lib/demo/client-store.ts`) |

Formatting conventions: prices are rendered with `peso()` (₱, from `lib/mock-data.ts`), and dates are treated on an **Asia/Manila** day boundary.

---

## 3. Directory Map

```
app/
  page.tsx                  → redirects to /dashboard
  login/                    → login page (demo role buttons + email/password form)
    actions.ts              → signIn() server action (live mode)
  auth/callback/route.ts    → OAuth callback (live mode)
  privacy/                  → Data Privacy & User Consent screen (pre-login, RA 10173)
  (cashier)/                → route group guarded by the CASHIER gate
    layout.tsx              → server-side gate: any signed-in staff allowed
    pos/order/              → POS order screen (the cashier home)
      paymongo-return/      → PayMongo checkout return (completes/cancels wallet orders)
    pos/history/            → order history
    pos/inventory/          → stock-level view (read-only for cashiers)
  (owner)/                  → route group guarded by the OWNER gate
    layout.tsx              → server-side gate: owners only (others → /pos/order)
    dashboard/              → today's KPIs + recent sales
    menu-recipes/           → menu, variants & recipes
    inventory/              → ingredient inventory + restock
    sales-expenses/         → sales ledger + expense recording
    low-stock-alerts/       → quick-restock alerts
    reports/                → date-range sales reports + trend chart
    users/                  → staff & role management
components/
  brand/                    → CuccuPOS logo (badge + wordmark) for sidebar/login
  cashier/                  → cashier shell, page header, payment modals (cash + PayMongo wallets)
  owner/                    → owner shell, header menus, widgets (Panel/Table/Sparkline)
lib/
  paymongo.ts               → PayMongo Checkout Session + complete/cancel wallet orders
  supabase/                 → server/client creation, session middleware, queries, helpers
  auth/role.ts              → getSessionRole() (single server-side role lookup)
  demo/                     → demo mode: config, session, seed data, client store
  validations/order.ts      → Zod schemas (cash/wallet order, report date range)
  supabase/stock.ts         → stockStatus() — the one stock-status rule
middleware.ts              → demo-mode shortcut / Supabase session refresh (+ /privacy allowlist)
supabase/migrations/       → SQL migrations (triggers, policies, expenses, soft delete, profile email)
```

---

## 4. Navigation & Access Control

### Route gating (defense in depth)

1. **`middleware.ts`**
   - **Demo mode:** healthy exit — Supabase is skipped entirely so the prototype boots with no backend. Role gating is left to the layouts.
   - **Live mode:** calls `updateSession()` (`lib/supabase/middleware.ts`), which refreshes the Supabase JWT cookies and redirects unauthenticated visitors to `/login` (except `/login`, `/auth`).

2. **Route-group layouts (server components)**
   - `app/(cashier)/layout.tsx`: any signed-in staff may use the POS (owners may also, e.g. via "Open Cashier View").
   - `app/(owner)/layout.tsx`: **owners only** — cashiers are redirected to `/pos/order`; signed-out users to `/login`.

3. **Server-side role resolution — `getSessionRole()` (`lib/auth/role.ts`)**
   - Demo mode first: reads the `cuccu-demo-role` cookie → `DEMO_OWNER` / `DEMO_CASHIER`.
   - Live mode: calls `supabase.auth.getUser()` (**never `getSession()`** for authorization — the JWT is verified with the server) and then reads `profiles.role` and `profiles.is_active`.
   - Deactivated staff (`is_active = false`) resolve to "signed out" everywhere.

> ⚠️ `lib/role.ts` (localStorage-based) is a **deprecated** legacy shim kept only for client compatibility — it is never the source of truth.

### Navigation structure

- **Cashier shell tabs:** Order (`/pos/order`), History (`/pos/history`), Inventory (`/pos/inventory`).
- **Owner shell sections:** Dashboard, Menu & Recipe, Inventory, Sales & Expenses, Low-Stock Alerts, Reports, User/Role Management.

---

## 5. Authentication Flow

### Demo login (default)

1. `/login` renders two one-click buttons: **Login as Cashier** / **Login as Owner**.
2. Clicking sets:
   - a client "display session" in `localStorage` (`cuccu-demo-session`), and
   - the **`cuccu-demo-role` cookie** via the `demoLogin()` server action (12h expiry).
3. `revalidatePath('/', 'layout')` then redirects: cashier → `/pos/order`, owner → `/dashboard`.
4. "Reset demo data" on the login page clears all browser-local demo state (orders, expenses, stock changes, staff edits).
5. `demoLogout()` deletes the cookie; it is called alongside real `signOut` so role switching never leaks the previous user's name.

### Live login

1. `signIn()` (`app/login/actions.ts`) validates email/password presence, calls `supabase.auth.signInWithPassword()`, then resolves `getSessionRole()`.
2. If the role lookup fails (no profile or deactivated account), the session is **immediately signed out** (`/login?error=disabled`) — no useless session is left behind.
3. Successful login lands on the role home: cashier → `/pos/order`, owner → `/dashboard`.
4. Errors are passed back as `/login?error=missing|invalid|oauth|disabled`.
5. OAuth: `/auth/callback` exchanges the code for a session and redirects to the `next` parameter.

---

## 6. The Data Layer

### Single query module: `lib/supabase/queries.ts` (`'use server'`)

Every read/write goes through Server Actions in this file. Each function follows the same pattern:

```
1. if (isDemoMode()) → return centralized sample data (or validate-and-return-OK)
2. resolve session (getSessionRole) → owner-only checks for mutations
3. query Supabase (RLS enforces the real authorization boundary)
4. return { data, error } — errors mapped to user-friendly strings (toUserError)
```

| Function | Access | Purpose |
|---|---|---|
| `getMenu()` | any signed-in staff | Cashier/owner menu — one join over `product_variants → products → categories` (≤500, available-only) |
| `createCashOrder(input)` | any signed-in staff | Cash checkout (see [§8](#8-checkout-flow)) |
| `getSalesSummary(from, to)` | owner | Owner-only aggregate via the **SECURITY DEFINER** RPC `get_sales_summary()`; the in-function `role='owner'` check is the real guard |
| `getIngredients()` | any signed-in staff | Ingredient stock ledger |
| `recordStockIn(...)` | owner | Appends a `stock_in` row to `inventory_transactions`; a trigger updates `ingredients` |
| `getRecentOrders(limit)` | any signed-in staff | Recent orders with line-cashier-name (RLS scopes rows per role) |
| `getSalesTrend()` | any authenticated | Monthly completed-sales totals for the current year (≤2000 rows) |
| `getProfiles()` / `addStaff()` / `updateStaffProfile()` / `updateProfileRole()` / `deactivateStaffProfile()` | owner | Staff & role management (see [§9.7](#97-usersuserrole-management)) |
| `getExpenses()` / `addExpense()` | owner read / owner write | Expense ledger |
| `getMenuWithRecipes()` | owner | Full menu with variants + `recipes → ingredients` for the Menu & Recipes page |

### Demo data: `lib/demo/data.ts`

- Deterministic **PRNG (mulberry32)** generates ~10 months of backfilled orders so charts, dashboard metrics, and reports are always derived from **one shared order ledger** (`getDemoOrders()`) — numbers reconcile across pages.
- Dates are generated relative to "now" on Asia/Manila day boundaries (detailed recent fortnight + busy "today").
- Seeds: 16 ingredients (with deliberately low/zero stock to showcase alerts), 14 products in categories (Coffee, Milk Tea, Frappe, Others) with 26 variants, 16 expenses, 6 staff profiles (2 owners, 4 cashiers).

### Demo write-through: `lib/demo/client-store.ts`

Interactive demo writes never hit the server cache; they persist to `localStorage` and are **merged on top of the seed** after navigation:

| Key | Content | Produced by |
|---|---|---|
| `cuccu-demo-orders` | locally completed receipts (max 200) | cashier checkout |
| `cuccu-demo-expenses` | new expense rows | Sales & Expenses |
| `cuccu-demo-stock` | `{ingredientId: qtyAdded}` restock deltas | inventory / alerts |
| `cuccu-demo-users` | edited staff roster | Users page |
| `cuccu-demo-session` | display name for the current demo role | login |

`resetDemoData()` (login page) removes all of the above; `clearDemoSessionClient()` runs on the login page so stale display names never appear after switching roles.

---

## 7. Database (Live Mode)

Tables referenced by (and shown in the schema `CUCCU_POS_Master_Organized.sql`, migrations in `supabase/migrations/`):

| Table | Notes |
|---|---|
| `profiles` | One per Auth user (`handle_new_user` trigger). Columns: `full_name`, `role` (`owner`\|`cashier`), `is_active`, `email` (added by `004_profile_email.sql`, backfilled from `auth.users`). `get_user_role()` helper feeds RLS. |
| `categories` → `products` → `product_variants` | Menu hierarchy with `is_available` flags and prices per variant. |
| `recipes` | Maps each `product_variant` to `ingredients` with consumption `quantity` + unit. |
| `ingredients` | Stock ledger (`stock_quantity`, `reorder_level`, `is_available`, `unit_cost`). |
| `inventory_transactions` | Append-only stock ledger (`stock_in` etc.). |
| `orders` / `order_items` | `orders` carry `profile_id` (cashier), `order_status` (`pending`/`preparing`/`completed`/`cancelled`, default `completed`), `payment_method` (`cash`/`gcash`/`maya`), subtotal/discount/total, timestamps. Note: `refunded` exists only in demo seed data, not in the DB CHECK. |
| `expenses` | Owner-only ledger (description, category, amount, type, frequency, source, date). `002_expenses.sql` + RLS "Owners can manage expenses". |
| `payments` | PayMongo wallet ledger (`payment_method` ∈ {gcash, maya}; status `pending`/`chargeable`/`paid`/`failed`). Cash orders never create a row; wallet orders are created as `pending` orders and completed via the PayMongo return route. |
| `addons` / `order_item_addons` | Reserved addon support (prices, availability, per-order addon lines). |

Database behaviors (migrations):

- **`deduct_inventory_for_completed_order()`** (`001`): a trigger on transition of `orders.order_status` to `completed` `INSERT`s negative `stock_out` transactions; **`update_ingredient_stock`** keeps `ingredients.stock_quantity` in sync with the ledger. This is why `createCashOrder()` must insert the order as `pending`, then complete it *after* the order items exist.
- **Staff soft delete** (`003`): `is_active = false` keeps order history (name) intact while `get_user_role()` returns `NULL`, which means RLS denies all rows and the app bounces every route to `/login`. Reversible with a single `UPDATE profiles SET is_active = true`.

**Security model:** every request runs with the caller's JWT — RLS policies (e.g. `authenticated USING(true)` for reads, owner-only writes) are the real authorization boundary. The middleware/layout gates are fast-fail UX only. `profile_id` on orders/expenses is always taken from the server-side session, never from client input.

---

## 8. Checkout Flow (Cashier POS)

**Screen:** `app/(cashier)/pos/order/order-client.tsx` (menu is fetched server-side and passed in as props).

1. **Menu browsing** — search box + category filter chips; unavailable items show "Out of stock" and cannot be added.
2. **Cart** — quantity held as `{[variantId]: qty}`; +/-/trash controls; live subtotal & total.
3. **Confirm & Send to Kitchen** → **Cash modal** (`components/cashier/payment-modals.tsx`): cash tendered with change calculation; **GCash/Maya** open a wallet modal that, in live mode, creates a PayMongo Checkout Session and redirects to PayMongo's hosted checkout (`/pos/order/paymongo-return` completes or cancels the pending order). In demo mode the wallet path completes locally with no real charge.
4. **Order completion:**
   - **Demo:** `addDemoOrder()` persists the receipt to `localStorage` (order no ≥ 5000). No payment occurs; the success modal says so explicitly.
   - **Live:** calls the `createCashOrder()` server action:
     1. **Zod validation** (`createCashOrderSchema`: cash-only, qty 1–99, ≤50 lines, discount ≥ 0) — mirrors DB CHECKs so bad input fails fast.
     2. **Server-side price lookup** — client totals are never trusted; missing variants abort the order.
     3. `INSERT orders (profile_id = session.userId, status 'pending')` → `INSERT order_items` → `UPDATE status 'completed'` → **inventory deduction trigger fires**.
5. **Success modal** — order number, total, cash received/change → "New order" or back to History.

**History** (`/pos/history`): recent orders, merged with locally-placed demo orders (`mergeDemoOrders`). **Cashier inventory** (`/pos/inventory`): read-only stock view using the shared `stockStatus()` rule (Out of Stock ≤ 0 / Low ≤ reorder level / otherwise In Stock).

---

## 9. Owner Modules

### 9.1 Dashboard (`/dashboard`)
Today's KPIs (Today's Sale, Orders Today, Low-Stock Alerts, Cash Revenue) with sparklines, a Recent Sales table (`getRecentOrders(6)`), and summary footers — all from `getSalesSummary()` for **today** on the Asia/Manila boundary. KPI cards link to their detail pages.

### 9.2 Menu & Recipes (`/menu-recipes`)
`getMenuWithRecipes()` renders products → variants (price/availability) → ingredient recipes (quantity + unit). The page now includes an item-detail modal (image, category/price/availability strip, edit/close), an inline recipe panel with Recipe/Ingredients tabs, a preparation-method column, and an **Add Menu Item** modal (name, description, category, price, image, recipe rows, preparation steps) that persists locally in demo mode.

### 9.3 Inventory (`/inventory`)
Ingredient ledger with status badges (`stockStatus()`), plus **restock**: demo → `addDemoStockAdjustment()`; live → `recordStockIn()` (owner-only, appends `stock_in` ledger rows; trigger updates stock).

### 9.4 Sales & Expenses (`/sales-expenses`)
Recent order sales table + expense recording (description, category, amount, one-time/recurring, frequency, source of funds, date). Demo writes go to `localStorage` via `addDemoExpense()`; live writes to the `expenses` table with `profile_id` from the session.

### 9.5 Low-Stock Alerts (`/low-stock-alerts`)
Ingredients not `In Stock`, with one-click **quick restock (+1 per click)** through the same `recordStockIn()` path.

### 9.6 Reports (`/reports`)
- Date-range form (`from`/`to`, validated as `YYYY-MM-DD` via Zod; defaults to today).
- KPI cards: Total Revenue, Orders, Avg. Order Value, Cash Revenue (+ `gcash`/`maya` breakdown available).
- Monthly trend chart (dependency-free SVG area/line chart).
- Recent Orders table.

### 9.7 User/Role Management (`/users`)
Owner-only roster (active staff only) supporting: **add staff** (signs up an Auth user — `handle_new_user` creates the profile — then promotes the role), **edit name/role**, **deactivate (soft delete)**, with guards: cannot remove yourself, and cannot remove the **last active owner**. The roster now shows an **Email** column (migration `004_profile_email.sql` backfills `profiles.email`). The **Add User** modal captures full name, email, create/confirm password, and role. Demo edits persist to `localStorage` (`saveDemoUsers`).

---

## 10. Error Handling Conventions

- Every query/action returns `{ data, error }` / `{ ..., error: string | null }`; raw Postgres errors are converted to user-friendly strings by `toUserError()` (`lib/supabase/errors.ts`).
- Page-level failures render an accessible `role="alert"` banner instead of crashing.
- Supabase is treated as **unreachable-safe**: `createClient()` and every query are wrapped so a dead backend degrades to "signed out / error banner", never a runtime exception.
- Forms surface client-side validation errors inline; login errors arrive via the `?error=` search param so the server shell can prerender.

---

## 11. Environment / Running

```bash
npm run dev    # http://localhost:3000  (demo mode by default)

# Live mode:
NEXT_PUBLIC_DEMO_MODE=false   +  NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY envs

# PayMongo (live wallet payments) — test keys in .env.local:
PAYMONGO_SECRET_KEY, PAYMONGO_PUBLIC_KEY
```

Flow at a glance:

```
Visitor → / (redirect) → /login (or /privacy consent) → choose role (demo) or sign in (live)
  ├─ Cashier → /pos/order → Order ▸ Cash modal / PayMongo wallet ▸ Success → History
  └─ Owner   → /dashboard → Inventory · Menu & Recipes · Sales & Expenses
                            Low-Stock Alerts · Reports · Users
```
