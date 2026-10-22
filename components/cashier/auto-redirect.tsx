'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Auto-returns the browser after a PayMongo checkout:
 * - If this tab was opened by another window (popup/new tab), try to close it.
 * - Otherwise (same tab), navigate back to the POS so the user isn't stuck.
 */
export function AutoRedirect({ to, delay = 3000 }: { to: string; delay?: number }) {
  const router = useRouter()
  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.opener) {
        try {
          window.close()
        } catch {
          // ignore — fall through to navigation below
        }
      }
      router.push(to)
    }, delay)
    return () => clearTimeout(timer)
  }, [router, to, delay])
  return null
}