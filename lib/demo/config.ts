/**
 * Prototype/demo mode flag.
 *
 * The requested deliverable runs as a sample-data prototype BY DEFAULT.
 * Demo mode is ON unless explicitly disabled with:
 *   NEXT_PUBLIC_DEMO_MODE=false
 *
 * When demo mode is on:
 * - middleware skips Supabase session redirects (app boots without backend),
 * - getSessionRole() resolves the demo cookie instead of Supabase Auth,
 * - every query in lib/supabase/queries.ts returns centralized sample data,
 * - mutations are simulated locally (no real DB writes, payments, or emails).
 *
 * Backend code, migrations, RLS, and API contracts are left intact so the
 * transition is reversible: set NEXT_PUBLIC_DEMO_MODE=false to use Supabase.
 */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE !== 'false'
}

export const DEMO_COOKIE = 'cuccu-demo-role'
