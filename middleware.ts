import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Root middleware — refreshes the Supabase session on every request so
 * server components never see a stale/expired JWT (prevents random logouts).
 * Route protection itself lives in lib/supabase/middleware.ts (updateSession).
 *
 * Prototype/demo mode (default ON; set NEXT_PUBLIC_DEMO_MODE=false to use
 * the live backend): skip Supabase entirely so the sample-data prototype
 * boots and navigates even when the backend is unreachable. Role gating
 * still happens in the (cashier)/(owner) layouts via the demo cookie.
 */
export async function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'false') {
    return NextResponse.next()
  }
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
