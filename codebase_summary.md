# codebase_summary.md — AI Reference for CuccuPOS

> **Audience:** AI coding agents working in this repo. This is the authoritative, detailed map of every module, contract, database object, and invariant.
> **Companion doc:** `system_summary.md` (human-readable overview). Read this file instead when editing code.

---

## 1. Project Identity

- **What:** CuccuPOS — a web POS + shop-management system for a Philippine beverage café ("Cuccu"). Cashier takes cash orders; Owner manages menu/recipes, inventory, expenses, reports, staff.
- **Course context:** Software Architecture & Design prototype. Ships with a full sample-data **demo mode** so it demo-runs with no backend, while preserving a complete, reversible **live Supabase backend**.
- **Payments:** Cash is the default; GCash/Maya/QR are supported via PayMongo Checkout Sessions (live mode). DB still allows `cash|gcash|maya`; cash orders never create a `payments` row. Demo mode completes wallet orders locally without a real charge.
- **Locale:** pesos via `peso()` (`lib/mock-data.ts`), all day boundaries approximated on **Asia/Manila (UTC+8)**.

## 2. Critical Invariants & Gotchas (read before editing)

1. **Two operating modes, one flag.** `NEXT_PUBLIC_DEMO_MODE` — demo mode is ON unless explicitly `"false"` (`isDemoMode()` / `isDemoModeClient()`). Every server query starts with `if (isDemoMode()) …`. When touching `lib/supabase/queries.ts`, ALWAYS keep the demo branch and the live branch in sync behaviorally.
2. **Never trust the client for authorization or pricing.** Role comes only from `getSessionRole()` (server; JWT-verified `auth.getUser()` + `profiles.role`). Order totals are recomputed server-side from DB prices. `profile_id` is server-set from the session. RLS + DB policies are the real boundary; layout/middleware gates are UX fast-fails only.
3. **Never use `getSession()` for auth decisions** — use `auth.getUser()` / `auth.getClaims()` (JWT verified server-side).
4. **Auth must be caught around `redirect()`.** `next/navigation`'s `redirect()` throws; a `try/catch` around a call that redirects will surface `NEXT_REDIRECT` as an error. Pattern in `app/login/form.tsx`: re-throw / return when `/NEXT_REDIRECT/i.test(e.message)`.
5. **No static prerendering of authed pages.** `next.config.ts` intentionally keeps classic dynamic rendering (comment explains: every route needs auth + live data per request). `/login` uses a `<Suspense>` wrapper because `LoginForm` calls `useSearchParams()` (Next 16 requirement).
6. **The two-step order insert is load-bearing.** The inventory-deduction DB trigger fires on transition `pending → completed` and requires `order_items` to already exist. `createCashOrder()` must: insert order as `pending` → insert items → update to `completed`. Never "optimize" this into one call.
7. **Cookie-based Supabase server client is per-request.** `createClient()` (`lib/supabase/server.ts`) is an async factory using `next/headers` cookies — do NOT memoize it globally (Fluid compute note in source).
8. **Deprecated shims exist on purpose.** `lib/role.ts` (localStorage roles) and newer pieces of `lib/mock-data.ts` are legacy/compat: `lib/role.ts` keeps old client shells compiling; `lib/mock-data.ts` survives for `peso()`, types, and UI sample fixtures. Source of truth = `lib/auth/role.ts` + `lib/supabase/*`.
9. **`lib/validations` mirrors DB CHECKs** (`supabase/migrations` tables) so failures happen fast with 400-style messages instead of raw Postgres errors.
10. **Middleware double behavior.** `middleware.ts` returns `NextResponse.next()` immediately in demo mode (no Supabase at all → app boots without backend). In live mode it delegates to `updateSession()` which also redirects unauthenticated visitors to `/login` (except `/login`, `/auth`, `/oauth/consent`).
11. **Stock status has one rule:** `lib/supabase/stock.ts stockStatus()` — `<=0` Out of Stock, `<= reorder_level` Low Stock, else In Stock. Never derive status inline elsewhere.
12. **Supabase ties are swallow-not-crash:** `createClient()` and queries in `queries.ts` are wrapped so an unreachable backend degrades to `{error}`/signed-out, never an unhandled exception.
13. This is **Next 16** (unexpected APIs/conventions vs older training data; `node_modules/next/dist/docs/` is the reference, per `AGENTS.md`).

## 3. Tech Stack & Config

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Components default, Turbopack CSS loader) |
| UI | React 19, Tailwind CSS 4, shadcn CLI scaffold, `@base-ui/react`, lucide-react icons, `tw-animate-css` |
| Validation | Zod (`lib/validations/order.ts`) |
| Backend | Supabase (`@supabase/ssr`, `@supabase/supabase-js@2`) — Postgres+RLS, Auth, RPC, triggers, manual SQL migrations |
| Demo state | `localStorage` (`lib/demo/client-store.ts`) |
| Fonts | Quicksand (`--font-sans`), Geist / Geist Mono (`app/layout.tsx`) |
| Scripts | `npm run dev` / `build` / `start` / `lint` |

**Environment variables** (untyped, via `process.env`):
- `NEXT_PUBLIC_DEMO_MODE` — anything except `"false"` ⇒ demo mode.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — required only in live mode (branched code paths avoid them in demo).

## 4. Repository Map (every file)

```
app/
  layout.tsx                  Root layout: fonts, metadata, suppressHydrationWarning
  page.tsx                    redirect("/dashboard")
  globals.css                 Tailwind 4 + custom olive/cream palette tokens
  login/
    page.tsx                  Static shell + <Suspense> around LoginForm
    form.tsx                  LoginForm: demo role buttons + email form; reads ?error=;
                              useEffect clearDemoSessionClient() on mount; "Reset demo data" button;
                              link to /privacy
    actions.ts                signIn() server action (live login) — see §7.3
  privacy/
    page.tsx                  Data Privacy & User Consent screen (pre-login, RA 10173)
  auth/callback/route.ts      OAuth code-for-session exchange; redirect `${origin}${next}`; ?error=oauth
  (cashier)/
    layout.tsx                Gate: getSessionRole() || redirect /login. Renders <CashierShell>
                              with {fullName, role} (owners allowed — "Open Cashier View")
    pos/order/page.tsx        Server page: getMenu(); error-banner on failure; maps MenuVariant→
                              PosMenuItem ("Product · Variant"); renders <OrderClient>
    pos/order/order-client.tsx  POS screen (client): search/category/cart/checkout; payment method
                              select (Cash/GCash/Maya); PayMongo wallet redirect (live) / demo complete
    pos/order/paymongo-return/page.tsx  PayMongo checkout return — completes/cancels pending wallet order
    pos/history/page.tsx      Server page: getRecentOrders(100)
    pos/history/history-table.tsx Client table: search by order no., method filter; demo merge
    pos/inventory/page.tsx    Server page: getIngredients() + stockStatus() → read-only table
    pos/inventory/inventory-table.tsx  Read-only stock table (StockBadge)
  (owner)/
    layout.tsx                Gate: !session → /login; role!=='owner' → /pos/order; <AppShell>
    dashboard/page.tsx        Today KPI cards (Sparkline), Recent Sales (6), low-stock count
    menu-recipes/page.tsx     Server: getMenuWithRecipes() + getIngredients() → <MenuClient>
    menu-recipes/menu-client.tsx   Menu grid + ItemDetailModal + inline recipe panel + AddMenuModal
    inventory/page.tsx        Server: getIngredients() → <InventoryClient>
    inventory/inventory-client.tsx Stock table + Restock modal → recordStockIn() / demo
    sales-expenses/page.tsx   Server: getSalesSummary(30) + getRecentOrders(30) + getExpenses(50)
    sales-expenses/sales-client.tsx Sales table (+ Pay/Cashier filters) + Expenses table + form
    low-stock-alerts/page.tsx Server: getIngredients() → <AlertsClient> (client filters to non-In-Stock)
    low-stock-alerts/alerts-client.tsx  Alert cards + quick "+1 restock" buttons → recordStockIn()
    reports/page.tsx          Server: getSalesSummary(from,to) + getRecentOrders(20) + getSalesTrend();
                              date-range GET form (searchParams Promise + Zod); TrendChart = inline SVG
    users/page.tsx            Server: getProfiles() + getSessionRole() (selfId) → <UsersClient>
    users/users-client.tsx    Roster table (User Name/Email/Role/Action); Add (confirm-pw)/Edit/Remove;
                              demo: loadDemoUsers/saveDemoUsers (now incl. email)
components/
  brand/logo.tsx          CuccuPOS logo (badge + wordmark) — sidebar & login
  cashier/shell.tsx       CashierShell (dark olive sidebar; tabs Order/History/Inventory),
                          CashierAccount dropdown (styled <form action={signOut}>)
  cashier/page-header.tsx Icon + title + subtitle header, account dropdown drop="down"
  cashier/payment-modals.tsx  CashModal (tender input & change), WalletModal (PayMongo GCash/Maya),
                          SuccessModal (receipt); exports PayMethod type
  owner/shell.tsx         AppShell + Logo + NAV (7 owner pages); mobile top-nav variant
  owner/header-menus.tsx  Owner topbar menus: low-stock badge link, account (sign out),
                          "Open Cashier View" link to /pos/order
  owner/page-header.tsx   Owner page header
  owner/widgets.tsx       Panel, TableShell, Sparkline, StatusBadge, StockBadge, RoleBadge
components/ui/button.tsx  shadcn Button primitive
lib/
  paymongo.ts             ⭐ PayMongo: startWalletPayment (checkout session), complete/cancel wallet orders
  supabase/
    server.ts       createClient() — cookie-bound server client (per-request)
    client.ts       createBrowserClient() — browser client (rarely imported)
    middleware.ts   updateSession() — JWT refresh via getClaims() + /login redirect (live mode; + /privacy allowlist)
    queries.ts      ⭐ ALL server queries/mutations (demo branch + live branch) — see §7.2
    errors.ts       toUserError(): Postgres code → friendly strings
    stock.ts        stockStatus() — the single stock-status rule
  auth/
    role.ts         getSessionRole() — demo cookie first, else getUser()+profiles; see §7.1
    actions.ts      signOut() — auth.signOut() + delete demo cookie + redirect /login
  demo/
    config.ts       isDemoMode(), DEMO_COOKIE = 'cuccu-demo-role'
    session.ts      getDemoSession(), demoLogin(role), demoLogout() ('use server'; revalidatePath)
    data.ts         ⭐ Entire sample dataset (deterministic PRNG) — see §7.4 (incl. preparation steps)
    client-store.ts localStorage demo store + resetDemoData() — see §7.5 (now incl. menu extras)
  validations/order.ts        createCashOrderSchema (cash/gcash/maya), salesSummaryQuerySchema
  order-store.ts              DEPRECATED localStorage order history (POS v1; keys 'cuccu-orders')
  role.ts                     DEPRECATED localStorage DemoRole (key 'cuccu-demo-role')
  mock-data.ts                peso() ⭐ used everywhere, UI types/fixtures (Sale, MenuItem, …)
  utils.ts                    cn() (clsx + tailwind-merge)
middleware.ts                 demo-mode short-circuit / updateSession delegation; broad matcher
next.config.ts                Turbopack CSS rule; NO static prerender (see invariant #5)
supabase/migrations/          001/002/003/004 SQL — 004 adds profiles.email
skills-lock.json/.agents/…    Installed agent skills (supabase, postgres practices, shadcn)
```

-existing-tables-noted-below§9- Master schema (see §9.1) is NOT in the repo — it lives in `CUCCU_POS_Master_Organized.sql` (referenced by comments in `lib/mock-data.ts` and `lib/validations/order.ts`). Migrations here are delta scripts (001–003). If your changes depend on un-migrated tables, check with the user or the master SQL file.

## 5. Runtime Flow

```
Request → middleware.ts
   demo:  NextResponse.next()  (no Supabase, no redirect)
   live:  updateSession(): createServerClient(cookie-bound) → auth.getClaims()
          ├─ claims OK       → refresh auth cookies on the response; continue
          └─ no claims AND
             path ∉ /login,/auth,/oauth/consent → redirect /login

RSC layout (cashier or owner) → getSessionRole()   ⋯ may add its own redirect
Server page awaits lib/supabase/queries.ts action   (demo: sample data; live: Supabase)
Interactive parts are thin 'use client' leaves that call 'use server' actions back.
```

Login A-list of tokens/cookies:
| Token | Where | Purpose |
|---|---|---|
| `cuccu-demo-role` cookie | server | THE demo session (owner/cashier), 12h, sameSite=lax |
| `cuccu-demo-session` LS | client | display name so nav shows the chosen demo identity |
| `cuccu-demo-orders` / `cuccu-demo-expenses` / `cuccu-demo-stock` / `cuccu-demo-users` LS | client | demo write-through store |
| `cuccu-orders`, `cuccu-demo-role`(LS) | client | legacy v1 shims (still referenced by deprecated modules) |
| Supabase auth cookies | server/live | `@supabase/ssr` session cookies (refreshed by middleware) |

## 6. Execution Model

- Server Components own data fetching; they pass serialized props into client islands.
- Server Actions (`'use server'`) live in `lib/supabase/queries.ts`, `lib/auth/actions.ts`, `lib/demo/session.ts`, `app/login/actions.ts`. Actions may be invoked from client JS or `<form action={...}>` (the shell sign-out button uses a plain form).
- Mutations always `revalidatePath('/', 'layout')` when they must invalidate routes (demo login/logout do; query results rely on default revalidation because cacheComponents/static prerender is off).
- Charts are dependency-free inline SVG (`TrendChart` in reports, `Sparkline` in widgets).

## 7. Data Layer — Full Contracts

### 7.1 `getSessionRole()` (`lib/auth/role.ts`) — the only role resolver

```ts
getSessionRole(): Promise<{ userId, email?, role: 'owner'|'cashier', fullName } | null>
```
- Demo mode: cookie `cuccu-demo-role` → `DEMO_OWNER` (`demo-owner-1`, `owner@cuccu.demo`, "Gian Baldovino") or `DEMO_CASHIER` (`demo-cashier-1`, `cashier@cuccu.demo`, "Sean Villangca").
- Live: `auth.getUser()` → `profiles` row (`role, full_name, is_active`) by `id = user.id`.
  - `null` on: no user / no client / no profile / **`is_active === false`** / unexpected role.
  - Deactivated = signed out at every layer (RLS returns NULL role ⇒ no policy passes; layouts bounce to `/login`).

### 7.2 `lib/supabase/queries.ts` — every action, signature + behavior

All are `async`, all return `{ data, error }` or `{ ..., error: string | null }` (never throw to callers).

Getter/	boolean-exact source of truth below:

| Function | Demo branch | Live branch (`Supabase`) | Auth |
|---|---|---|---|
| `getMenu()` → `{ data: MenuVariant[], error }` | `getDemoMenu()` (14 products, 26 variants) | `product_variants.select(id, product_id, variant_name, price, is_available, products!inner(name, is_available, categories!inner(name)))` with `.eq('products.is_available', true)`, ordered by id, ≤500; numeric-coerce `price` | any signed-in (RLS SELECT `authenticated USING (true)`) |
| `createCashOrder(unknown)` → `{ orderId, total, error }` | Zod-validated; sum via `getDemoVariantPrice()`; unknown/absent variant ⇒ error "One or more items are unavailable."; `total = max(0, subtotal − discount)`; id: `5000 + (Date.now() % 100000)`; NO DB write | Zod first; session required → server-side `product_variants.select(id, price) .in(variantIds)` (fails if any missing) → insert `orders(profile_id=session.userId, pending, cash, subtotal, discount, total)` `.select('id').single()` → insert `order_items` lines `{order_id, product_variant_id, quantity, unit_price, subtotal}` → update `order_status='completed'` (fires trigger, see §9.4) | any signed-in; cashier-owned `profile_id` |
| `getSalesSummary(from?, to?)` → `{ data: SalesSummary, error }` | `getDemoSalesSummary(from,to)` (min date today by default; strips time, compares `slice(0,10)`) | owner check (`'Owners only.'`); `rpc('get_sales_summary', {p_from_date, p_to_date})`; normalizes `Number()` and `{cash,gcash,maya}` defaults `0`; missing row ⇒ `"Report returned no rows."` | owner (RPC re-checks SECURITY DEFINER internally) |
| `getIngredients()` → `{ data: Ingredient[], error }` | `getDemoIngredients()` (deep-copy of SEED_INGREDIENTS) | `ingredients.select(...).order('name')`; coerces numerics/booleans | any signed-in |
| `recordStockIn({ingredient_id, quantity, notes?})` → `{ error }` | validate `quantity > 0` only ⇒ OK (client applies the delta) | owner; owner of `quantity>0`; insert `inventory_transactions{ingredient_id, transaction_type:'stock_in', quantity, reference_type:'RESTOCK', notes: notes ?? 'Manual restock'}` (trigger updates `ingredients`; `insufficient stock` cannot happen on stock_in) | owner |
| `getRecentOrders(limit=50)` → `{ data: OrderRow[], error }` | `getDemoRecentOrders(limit)` | `orders.select(id, payment_method, total_amount, order_status, created_at, order_items(quantity), profiles(full_name)).order('id',{ascending:false}).limit`; folds duplicate order-item rows into `items = Σ quantity`; `cashier = profiles.full_name ?? '—'` | any signed-in; RLS scopes rows per role (§9.2) |
| `getSalesTrend()` → `{ data: [{month, total}], error }` | `getDemoSalesTrend()` (year-filtered 12 buckets) | current-year `orders(total_amount, created_at)` where `order_status='completed'` since Jan-1, ≤2000; buckets `[12]`; buckets default `0` and skip out-of-range months | any authenticated |
| `getProfiles()` → `{ data: StaffProfile[], error }` | `getDemoProfiles()` (6 rows, incl. email) | `profiles.select(id, full_name, role, is_active, email).eq('is_active', true).order('full_name')` | owner (`getProfiles` relies on RLS "Owners can manage all profiles") |
| `updateProfileRole(id, role)` → `{ error }` | delegates to `updateStaffProfile(id, {role})` | same | owner |
| `updateStaffProfile(id, {full_name?, role?})` → `{ error }` | validate types/empty/`Nothing to update.`; OK ⇒ client persists roster | owner; validates name (trimmed non-empty), role ∈ {owner,cashier}; `profiles.update(patch).eq('id', id)` — note per-doc: email is Auth-managed | owner |
| `deactivateStaffProfile(id)` → `{ error }` | OK immediately (client enforces guards) | owner; **self-delete blocked** (`You cannot remove your own account.`); target fetch; if target is owner, count active owners (`count<=1` ⇒ `"Cannot remove the last active owner."`); `update {is_active:false}` | owner |
| `addStaff({email, password, full_name, role})` → `{ error }` | validate (`@`, `password.length>=6`, name non-empty) | owner; `auth.signUp({email, password, options:{data:{full_name, role}}})` — `handle_new_user` trigger creates a default profile; then `profiles.update({role, full_name}).eq('id', user.id)`; email-confirmation requirement noted in docblock | owner |
| `getExpenses(limit=100)` → `{ data: Expense[], error }` | `getDemoExpenses(limit)` | `expenses.select(...).order('date_incurred',{ascending:false}).order('id',{ascending:false}).limit` | any (RLS owner-only, §9.5) |
| `addExpense({...})` → `{ error }` | validate description + amount>0 | owner; validation; insert `{profile_id: session.userId, ..., notes: input.notes?.trim() || null}` | owner |
| `getMenuWithRecipes()` → `{ data: MenuProduct[], error }` | `getDemoMenuWithRecipes()` | `products.select(id, name, description, is_available, categories!inner(name), product_variants(id, variant_name, price, is_available, recipes(quantity, ingredients!inner(name, unit)))).order('name').limit(200)`; flattens recipes per variant into `recipe: [{ingredient, quantity, unit}]` | owner |

Type shapes (all in `queries.ts`):
```ts
MenuVariant { id, product_id, product_name, category_name, variant_name, price, is_available }
SalesSummary { from_date, to_date, total_revenue, order_count, revenue_by_payment_method:{cash,gcash,maya}, average_order_value }
Ingredient { id, name, unit, stock_quantity, reorder_level, is_available }
OrderRow { id, items, cashier, created_at, payment_method, total, status }
StaffProfile { id, full_name, email: string | null, role:'owner'|'cashier', is_active }
Expense { id, description, category, amount, expense_type, frequency, source, date_incurred }
MenuProduct { id, name, description|null, category_name, is_available,
              variants:[{id, variant_name, price, is_available}],
              recipe:[{ingredient, quantity, unit}] }
```

### 7.2.1 `lib/paymongo.ts` — PayMongo wallet payments

- `startWalletPayment({ payment_method: 'gcash'|'maya', items })` → `{ orderId, checkoutUrl, error }`: validates, computes the total server-side, creates the order as `pending` (with order_items), creates a PayMongo Checkout Session (amount in centavos, success/cancel URLs derived from the request host), returns the hosted `checkout_url`.
- `completeWalletOrder(orderId)` → marks a pending order `completed` (fires the inventory-deduction trigger). No-op in demo mode.
- `cancelWalletOrder(orderId)` → marks a pending order `cancelled`. No-op in demo mode.

### 7.3 Auth actions

- `signIn(formData)` (`app/login/actions.ts`): reads `email`/`password`; missing → `/login?error=missing`; `signInWithPassword` error → `/login?error=invalid`; success → `revalidatePath('/', 'layout')` → `getSessionRole()` ⇒ no-role → sign out + `/login?error=disabled`; role-based landing (`/pos/order` cashier, `/dashboard` owner).
- `signOut()` (`lib/auth/actions.ts`): `auth.signOut()`, deletes the demo cookie (dynamic import — must work in both modes), `revalidatePath`, `redirect('/login')`. Used by the shells via `<form action={signOut}>` (no onClick — unmounting would cancel).

### 7.4 `lib/demo/data.ts` — the sample dataset (single source of truth)

Design goals (stated in the header): one shared order ledger; all dashboards/summaries/alternatives derived from it; deterministic across reloads (seeded PRNG); no backend dependency; all getters return fresh copies (`map(o=>({...o}))` / spread).

- **PRNG:** `mulberry32(seed)` — deterministic; used with seed `20260214` for monthly backfill only.
- **Time helpers:** `manilaDayStart` (approx UTC+8 day boundary) → `isoAt(dayOffset, hour, minute)` and `dateOnly(dayOffset)` (noon-slice ISO date).
- `DEMO_OWNER` / `DEMO_CASHIER` — referenced by `session.ts` + `role.ts` and mirrored by seed profiles.
- **SEED_INGREDIENTS (16):** weights/units/packaging; intentional stresses: `Fresh Milk (8/10) Low`, `Wintermelon Syrup (1/3) Low`, `Tapioca Pearls (0/3) Out`, `Nata de Coco (2/4) Low`, `Caramel Syrup (2/4) Low`, `Cup Lids & Straws (0/150) Out`.
- **SEED_PRODUCTS (14, `SeedProduct[]`):** `Coffee` (Iced Americano, Spanish Latte, Kapeng Barako), `Milk Tea` (Classic, Wintermelon, Okinawa, Matcha, Taro), `Frappe` (Java Chip, Caramel, Cookies & Cream), `Others` (Cheese Pimiento Sandwich, Banana Bread Slice, Calamansi Juice). 26 variants total (ids 1–26), most with Regular/Large (or Hot/Iced), one deliberately unavailable variant (`id 20 Caramel Frappe Large`, `is_available:false`). Recipes reference ingredient names and consumption quantities in ingredient units (e.g. `0.02 kg Espresso Beans`, `1 pcs Paper Cups 12oz`).
- Getters: `getDemoIngredients`, `getDemoMenu` (flat variant list; `is_available = v.is_available && p.is_available`), `getDemoMenuWithRecipes`, `getDemoVariantPrice(id)` (linear scan).
- **Order ledger `buildOrders()`** (memoized in module-scope `cachedOrders` — a deliberate build-time cache so rerenders across pages don't re-roll the PRNG):
  - Monthly backfill Jan→current month −1: 9–15 orders/month, deterministic combos (`combos[10]`), hour 9–18, method mix 78% cash / 12% gcash / 10% maya, cashier ∈ {Sean Villangca, Alex Cruz, Reziah Calayag, Lenard Montoya}; two rows rewritten to `status:'refunded'` (rows[3], rows[17]).
  - Recent fortnight (−13…−1 days) hand-written list; today has 10 orders to make the dashboard lively (mostly cash, one gcash).
  - All totals = Σ price×qty from `getDemoVariantPrice` (so receipts reconcile with menu).
  - IDs ascending from 1001.
- Derived getters: `getDemoOrders`, `getDemoRecentOrders(limit)`, `getDemoSalesSummary(from?,to?)` (default today; completed only; by-method split), `getDemoSalesTrend()` (12 buckets of the current year, completed only).
- `SEED_EXPENSES (16)` by relative day offsets, categories `Ingredients/Packaging/Utilities/Rent/Labor/Other`; `getDemoExpenses(limit)` assigns ids 300−i.
- `getDemoProfiles()` — 6 staff: `demo-owner-1 Gian Baldovino (owner)`, `demo-owner-2 Reziah Calayag (owner)`, `demo-cashier-1..4 Sean Villangca / Alex Cruz / Lenard Montoya / Maria Santos (cashiers)`.

### 7.5 `lib/demo/client-store.ts` — write-through demo store

- Exact keys: `cuccu-demo-orders`, `cuccu-demo-expenses`, `cuccu-demo-stock`, `cuccu-demo-users`, `cuccu-demo-session`.
- Helpers: `read<T>/write<T>` (JSON in localStorage, guarded); `isDemoModeClient()`.
- Session: `setDemoSessionClient(role)` (stores role + fixed display name "Gian Baldovino"/"Sean Villangca"), `getDemoCashierName()` (fallback "Demo Cashier"), `clearDemoSessionClient()` (called on login mount).
- Orders: `loadDemoOrderExtras`, `mergeDemoOrders(seed)` (dedupes by id, newest first), `addDemoOrder({items, cashier, payment_method, total})` — id = `max(5000, …extras)+1`, `created_at = new Date().toISOString()`, status `'completed'`; caps list at 200.
- Expenses: `addDemoExpense` (id = `Date.now()`), `mergeDemoExpenses` (prepend extras), cap 200.
- Stock: `addDemoStockAdjustment(ingredientId, qty)` → additive map `{[id]: qty}` (`loadDemoStockAdjustments`).
- Users: `loadDemoUsers(seed)` / `saveDemoUsers(rows)` — the Users page persists the whole edited roster.
- `resetDemoData()` → clears the 4 data keys (NOT the session key).

## 8. Frontend Modules in Depth

### 8.1 POS Order screen (`order-client.tsx`)

State: `query` (search), `category` (chip filter; `categories` = `['All', …unique(categoryNames)]`), `cart: Record<number, number>` (variantId→qty), `modal ('pay'|'done')`, `placing`, `formError`, `lastOrder {no,total,extra}`.

- `lines` maps cart→menu items (filters missing/qty≤0); `total = Σ price×qty` (client estimate for UI only).
- `setQty` deletes ids ≤0.
- `completeOrder(cashTendered)` — demo path: `addDemoOrder(...)` → success modal with demo disclaimer text; live path: `createCashOrder({payment_method:'cash', discount_amount:0, items})`; server `total` is authoritative; change = `cashTendered − finalTotal` (may be negative text if under-tendered — UI relies on the CashModal's validation).
- Success modal → **New order** (stay) or **History** via `router.push('/pos/history')`.
- Out-of-stock cards render w/ opacity + disabled + button and cannot be added.
- Layout: 1-col mobile; `xl:grid-cols-[1fr_320px]` with sticky cart; menu column is individually scrollable at `lg`.

### 8.2 Payment modals (`components/cashier/payment-modals.tsx`)

- `ModalShell` — backdrop (click-to-close; inner stopPropagation) + close button.
- `Summary` — subtotal/method/total block.
- `CashModal` — tender input, quick-tender buttons, change preview, Confirm; validates tender ≥ total; `onConfirm(tender)`.
- `WalletModal` — GCash/Maya brand + summary; in live mode calls `startWalletPayment` (PayMongo Checkout Session) and redirects to PayMongo's hosted checkout; in demo mode completes locally with no real charge.
- `SuccessModal` — order no., total, method, `extra` line, "New order" / "Go to history".
- `PayMethod` exported for typing.

### 8.3 Cashier History / Inventory

- `HistoryTable`: client filter (order-no substring `query` + method dropdown of `['All Methods','cash','gcash','maya']`); demo merges `mergeDemoOrders(orders)` once into `useState` initializer. Status pill is stylized `completed`/`refunded` etc.
- cashier inventory: purely presentational mapping to `{id, name, stock, unit, status, reorderAt}` + `InventoryTable` (search raises no events — data is static per visit).

### 8.4 Owner Clients (pattern: `initialRows` from server → gentle local state → action → optimistic update → row feedback)

- `InventoryClient` — status filter tabs (All / In Stock / Low / Out), search, **RestockOrder modal** (qty + notes) → demo: `addDemoStockAdjustment(id, qty)` + local add; live: `recordStockIn({ingredient_id, quantity, notes})` then local `stock += qty`.
- `AlertsClient` — only non-`In Stock` ingredients; one-click "+1 quick restock" (`quantity: 1`, notes `'Quick restock from alerts'`); each click applies the same restock pipeline.
- `SalesExpensesClient` — equation cards (gross sales / operating expenses / net profit) + **Add Expense modal** (desc, category select, amount, One-Time/Recurring, frequency, source, date) → demo prepend via `addDemoExpense`, live `addExpense`, then local prepend; **Sales Transaction Log** (`getRecentOrders(30)`) and **Expense Log** tables side by side (no tabs).
- `MenuClient` — menu grid (`priceRange(p)` shows min–max variant prices) + `ItemDetailModal` (image, category/price/availability strip, edit/close) + inline recipe panel (Recipe/Ingredients tabs, recipe details, preparation method) + `AddMenuModal` (add/edit menu items, demo-persisted).
- `UsersClient` — table of active staff; **Add** (email, password, name, role) → `addStaff`; **Edit** (name/role) → `updateStaffProfile`; **Deactivate** (`ConfirmModal`, action `deactivateStaffProfile`) — explicit guards text: last owner, self; demo edits persisted via `saveDemoUsers`; `selfId` passed in to disallow removing self.
- Dashboard & Reports — pure server components; only the forms are native HTML (`GET` for reports range → `searchParams`).

### 8.5 Shared UI

`widgets.tsx`: `Panel` (rounded card), `TableShell` (bordered table wrapper; headers row + children), `Sparkline` (SVG polyline, 96×34), `StatusBadge`, `StockBadge`, `RoleBadge`.
Theme palette (used everywhere): green `olive-50…950` + neutral creams `cream-50/100/200` + accent `leaf/lake/clay/grape` tints; everything else is Tailwind utility classes. Global tokens in `app/globals.css` (Tailwind 4 `@theme` tokens; classes like `bg-cream-100`, `text-olive-950` are project-defined shades).

## 9. SQL — Complete Structure

> Master schema (001 baseline beyond this file's notes) = `CUCCU_POS_Master_Organized.sql` (not in repo; mirrors `lib/mock-data.ts` types). The three migration scripts below are idempotent (CREATE OR REPLACE / IF NOT EXISTS) and meant to be run manually **once each, in order, via Supabase SQL Editor** (not `supabase db push`).

### 9.1 Master schema (referenced by code — columns used)

```
profiles(id uuid PK ⇢ auth.users, full_name, role check(owner|cashier) default cashier,
        is_active bool default true, created_at)
categories(id PK, name unique, description nullable)
products(id PK, category_id ⇢ categories, name, description nullable, is_available, created_at)
product_variants(id PK, product_id ⇢ products, variant_name, size nullable, temperature nullable,
                 price numeric check >=0, is_available)
ingredients(id PK, name unique, unit, stock_quantity numeric check >=0, reorder_level numeric check >=0,
            is_available, unit_cost numeric check >=0, created_at)
recipes(id PK, product_variant_id ⇢ product_variants, ingredient_id ⇢ ingredients, quantity numeric check >0,
        created_at, unique(product_variant_id, ingredient_id))
inventory_transactions(id PK, ingredient_id ⇢ ingredients, transaction_type check(stock_in|stock_out|adjustment),
                       quantity numeric check >0, reference_type nullable, reference_id nullable,
                       notes nullable, created_at)
orders(id PK, profile_id uuid ⇢ profiles nullable, order_status text check(pending|preparing|completed|cancelled)
       default completed, payment_method check(cash|gcash|maya), subtotal check >=0, discount_amount check >=0,
       total_amount check >=0, created_at)
order_items(id PK, order_id ⇢ orders, product_variant_id ⇢ product_variants, quantity int check >0,
            unit_price numeric check >=0, subtotal numeric check >=0)
order_item_addons(id PK, order_item_id ⇢ order_items, addon_id ⇢ addons, quantity int check >0 default 1,
                  unit_price numeric check >=0, unique(order_item_id, addon_id))
addons(id PK, name unique, price numeric check >=0, is_available, created_at)
payments(id PK, order_id ⇢ orders, provider text default 'paymongo', payment_method check(gcash|maya),
         paymongo_source_id unique nullable, paymongo_payment_id unique nullable,
         status check(pending|chargeable|paid|failed) default pending, amount numeric check >0,
         checkout_url nullable, created_at)   -- PayMongo-only (no cash); kept for later
```

Notes vs demo: `order_status` has NO 'refunded' value in the DB (the demo seed's two "refunded" rows are demo-only). `order_items.quantity` DB check is `> 0` (Zod enforces 1..99 at the app layer). `payments` is PayMongo-only (`payment_method` ∈ {gcash,maya}; no cash).

### 9.2 `001_cash_only_backend_fixes.sql` — hardening & backend plumbing

Head comment enumerates five fixes (Data API grants, FK indexes, RLS performance, trigger hardening, cash-only note); all statements idempotent. `get_user_role()` is numbered "0." in the file and `get_sales_summary()` is *not* defined here (see note in item 6).

1. **`get_user_role()`** — `SECURITY DEFINER … STABLE SET search_path=public`:
   `SELECT role FROM profiles WHERE id = (select auth.uid())` — wrapping in `(select …)` makes the function **STABLE-per-statement**, a Supabase RLS performance rule (avoid per-row `auth.uid()`).
2. **Data API GRANTs** — framed around Supabase's 2026-04-28 breaking change (new `public` tables not exposed to the Data API by default; enforced for every project on 2026-10-30):
   ```sql
   GRANT USAGE ON SCHEMA public TO anon, authenticated;
   -- SELECT-only: categories, products, product_variants, addons, ingredients, recipes
   -- orders/order_items/order_item_addons: SELECT+INSERT+UPDATE+DELETE to authenticated;
   --   SELECT for anon (RLS filters)
   -- profiles: full CRUD to authenticated (RLS decides rows)
   -- inventory_transactions: full CRUD to authenticated (owner-only via RLS)
   -- payments: full CRUD to authenticated (future Edge Function reuses update_payment_status)
   -- sequences: USAGE, SELECT ON ALL IN SCHEMA public (identity inserts)
   ```
3. **FK indexes** — Postgres does not auto-index FK columns; 14 indexes incl. `idx_products_category_id`, `idx_variants_product_id`, `idx_recipes_variant_id`/`_ingredient_id`, `idx_inventory_ingredient_id`, `idx_orders_profile_id/_status/_created_at`, `idx_order_items_order_id/_variant_id`, `idx_item_addons_order_item_id/_addon_id`, `idx_payments_order_id/_status`, `idx_profiles_role`.
4. **Trigger functions (`SECURITY DEFINER` justification, per head comment):** triggered as the cashier completing the order, they must INSERT into owner-only `inventory_transactions` and UPDATE `ingredients`; no RLS policy could permit that without letting cashiers forge ledger rows directly. They are `RETURNS TRIGGER` ⇒ **not callable via supabase.rpc()/PostgREST**. Fixed `search_path` + quantity guards.
   - `update_ingredient_stock()` (AFTER INSERT on `inventory_transactions`): `quantity <= 0` raises; `stock_in` adds, `stock_out` subtracts (with `ingredient not found` + `insufficient stock` guard — negative stock cannot exist), `'adjustment'` rows are audit-only no-ops (all corrections must be new in/out rows ⇒ ledger stays append-only), else invalid type raises.
   - `deduct_inventory_for_completed_order()` (AFTER UPDATE OF `order_status` on `orders`): only fires when `NEW='completed' AND OLD IS DISTINCT FROM 'completed'` (idempotent across repeat updates). Bills ALL `order_items` × `recipes` quantities as one INSERT SELECT into `inventory_transactions` (`'stock_out'`, `reference_type 'ORDER'`, `reference_id = NEW.id`, notes label). `rec.quantity * oi.quantity` — recipes express ingredient-units per single serving.
   - Note: repeated `UPDATE … SET order_status='completed'` on already-complete rows can't double-bill; running out of stock mid-complete RAISES `insufficient stock`, aborting the completion update.
5. **Cash-only note:** no DB change — the CHECK already allows `cash/gcash/maya`; the Dictionary's UI pins cash.
6. **`get_sales_summary()`** owner RPC referenced by `queries.ts` (`rpc('get_sales_summary', {p_from_date, p_to_date})`) with a `get_user_role()='owner'`-style in-function guard; returns `{from_date, to_date, total_revenue, order_count, revenue_by_payment_method (jsonb), average_order_value}` in an `Asia/Manila` day range. **Not defined in this repository's migrations** — it is assumed to exist in the master schema (`CUCCU_POS_Master_Organized.sql`, not in repo); the migration only references it in self-check comments. End-of-file self-check snippets (pg_indexes review, `SELECT * FROM get_sales_summary();`, the 4-step order smoke test).

### 9.3 `002_expenses.sql`

- `expenses` table:
  - `id bigint GENERATED BY DEFAULT AS IDENTITY PK`
  - `profile_id uuid ⓘ REFERENCES profiles ON DELETE SET NULL` (nullable: ledger rows outlive staff)
  - `description text NOT NULL`
  - `category text NOT NULL DEFAULT 'Other'` — CHECK ∈ `('Ingredients','Packaging','Utilities','Rent','Labor','Other')` (`expenses_category_check`)
  - `amount numeric(10,2) NOT NULL` — CHECK `amount > 0` (`expenses_amount_check`)
  - `expense_type text NOT NULL DEFAULT 'One-Time'` — CHECK ∈ `('Recurring','One-Time')` (`expenses_type_check`)
  - `frequency text NOT NULL DEFAULT 'One-Time'` (UI keeps it free-form; module display only)
  - `source text NOT NULL DEFAULT 'Cash on Hand'` (free-form source-of-funds)
  - `date_incurred date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Manila')::date`
  - `notes text`, `created_at timestamptz NOT NULL DEFAULT now()`
- RLS ON + policy **"Owners can manage expenses"** — `FOR ALL TO authenticated USING (get_user_role() = 'owner') WITH CHECK (…same)`.
- `GRANT SELECT/INSERT/UPDATE/DELETE` + `expenses_id_seq` USAGE,SELECT.
- Indexes: `idx_expenses_date(date_incurred)`, `idx_expenses_category(category)`.

### 9.4 `003_staff_soft_delete.sql`

- `ALTER profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true`.
- Composite index `idx_profiles_active_role (is_active, role)` (used by the "last active owner" count).
- Re-creates `get_user_role()` with `AND is_active = true` — **the soft-delete mechanism**:
  - Deleting `auth.users` requires the Admin API's `service_role` key which must never live in browser code; instead, `is_active=false` means the role resolver returns `NULL` ⇒ **every RLS policy fails closed** and `getSessionRole()` ⇒ no session ⇒ app redirects to `/login` everywhere. History keeps the human name. Reactivation: `UPDATE profiles SET is_active=true WHERE id='…'`.

### 9.5 Policy inventory (as enforced by migrations + master)

- Menu/read-only tables (`categories`, `products`, `product_variants`, `addons`, `ingredients`, `recipes`): authenticated `SELECT USING(true)` + owners `ALL`.
- Transactional tables (`orders`, `order_items`, `order_item_addons`, `payments`): cashiers can `INSERT/UPDATE/SELECT` (role='cashier'); owners `ALL`.
- Owner-only tables (`expenses`, `inventory_transactions`, `profiles`): owners `ALL`; `profiles` also allows self `SELECT` (`id = auth.uid()`); `inventory_transactions` has a redundant owner `SELECT`.
- `get_user_role()` (SECURITY DEFINER, STABLE) returns `NULL` for inactive/missing profiles, so every policy fails closed for deactivated staff.

### 9.6 Data flow through SQL (cash checkout, live mode) — exact order

```
INSERT orders(profile_id, pending, cash, subtotal, discount, total)  → returns id
INSERT order_items(order_id, product_variant_id, quantity, unit_price, subtotal)
UPDATE orders SET order_status='completed' WHERE id=…
   └─ trigger_deduct_inventory_on_completed_order (AFTER UPDATE OF order_status)
        └─ deduct_inventory_for_completed_order():
             INSERT inventory_transactions × (order_items ⋈ recipes)
                 ('stock_out', reference_type 'ORDER', reference_id = order id)
             └─ per-row trigger_update_ingredient_stock (AFTER INSERT)
                  stock_in → ingredients += q  |  stock_out → ingredients -= q
                  (errors: quantity ≤ 0 / unknown ingredient / insufficient stock)
```
Restock = one insert only (`stock_in` → trigger). `recordStockIn` never touches `ingredients` directly.

## 10. Styling & Accessibility

- Two custom Tailwind scales (olive, cream) + utility tints; heavy tabular-nums for money.
- Accessibility: every interactive target has `aria-*` labels (`aria-pressed` chips, `aria-current` nav, `role="alert"` errors, `role="status"` toasts, `aria-modal` dialogs, focus-visible rings everywhere, `sr-only` labels). Keep this when editing.
- Routing animation/RSC refresh patterns: `revalidatePath('/', 'layout')` on login/logout so shells re-render with the new session.

## 11. What "different" exists in demo vs live — behavior matrix

| Surface | Demo | Live |
|---|---|---|
| Middleware | bypass | session refresh + /login redirect |
| `/login` | role buttons + "Reset demo data"; email form still rendered | email-password (+future OAuth via callback) |
| `getSessionRole()` | demo cookie → fixed identities | `getUser()` + `profiles` |
| Menu source | sample 14 products / 26 variants | Postgres RLS query |
| Checkout | local receipt (id ≥ 5000) + disclaimer | 3-step DB write; trigger bills inventory |
| Sales reports | derived from seed ledger | SECURITY DEFINER RPC `get_sales_summary` |
| Restock/expense/staff writes | validated and stored in localStorage | DB writes guarded owner-only |
| Order history | seed + localStorage merge | `orders` via RLS |

## 12. When an AI edits this repo, prefer, in order:

1. Extend `lib/supabase/queries.ts` following the `{data,error}` + demo-branch pattern (reuse `getDemo*` for demos; owner-check + `getSessionRole` for live).
2. Keep Zod schemas next to the DB CHECKs they mirror (`lib/validations`).
3. Add demo seed data to `lib/demo/data.ts` (never inline literals in pages) and leverage PRNG/time helpers for dates.
4. New pages must go into the right route group (`(cashier)` vs `(owner)`) and be server pages fetching their own data, with a thin `'use client'` leaf for interactivity.
5. SQL changes: append a new idempotent migration (00N_…) mirroring the header-comment style of 001–003.
6. Run nothing by hand that belongs to the user (no manual SQL execution, no seeding) — document instead.
7. Preserve demo/live symmetry: a feature is not done until both branches behave equivalently.
