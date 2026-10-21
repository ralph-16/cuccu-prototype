'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { RotateCcw, ShoppingCart, Store } from 'lucide-react'
import { LogoImage } from '@/components/brand/logo'
import { signIn } from './actions'
import { demoLogin } from '@/lib/demo/session'
import { clearDemoSessionClient, resetDemoData, setDemoSessionClient } from '@/lib/demo/client-store'

const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false'

/** Client form: reads ?error= via useSearchParams so the page shell can prerender. */
export function LoginForm() {
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [demoError, setDemoError] = useState<string | null>(null)
  const [resetNote, setResetNote] = useState<string | null>(null)
  const error = searchParams.get('error')
  const message =
    error === 'invalid'
      ? 'Invalid email or password.'
      : error === 'missing'
        ? 'Enter both email and password to continue.'
        : error === 'oauth'
          ? 'Sign-in failed. Please try again.'
          : error === 'disabled'
            ? 'Account disabled or missing profile. Contact an administrator.'
            : null

  // Landing on role selection means signed out: drop any stale demo display
  // session so switching roles never shows the previous user's name.
  useEffect(() => {
    clearDemoSessionClient()
  }, [])

  function loginAs(role: 'cashier' | 'owner') {
    setDemoError(null)
    setDemoSessionClient(role)
    startTransition(async () => {
      try {
        await demoLogin(role)
      } catch (e) {
        // next/navigation redirect() surfaces as an error to the caller —
        // only real failures should reach the user.
        if (e instanceof Error && /NEXT_REDIRECT/i.test(e.message)) return
        setDemoError('Could not start the demo session. Please try again.')
      }
    })
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-cream-100 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-[0_4px_24px_rgba(46,51,29,0.12)]">
        <div className="flex flex-col items-center text-center">
          <LogoImage className="size-16" priority />
          <h1 className="mt-3 text-xl font-bold text-olive-950">Sign in to your CuccuPOS account</h1>
          {demoMode ? (
            <p className="mt-2 inline-flex items-center rounded-full bg-olive-100 px-3 py-1 text-[11px] font-bold tracking-wide text-olive-800 uppercase">
              Demo / Prototype — sample data, no real transactions
            </p>
          ) : null}
        </div>

        {demoMode ? (
          <div className="mt-6 flex flex-col gap-2.5" aria-label="Demo login options">
            <button
              type="button"
              disabled={pending}
              onClick={() => loginAs('cashier')}
              className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-olive-500 text-sm font-bold tracking-wide text-cream-50 uppercase transition-colors hover:bg-olive-600 focus-visible:ring-2 focus-visible:ring-olive-700 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
            >
              <ShoppingCart className="size-4" aria-hidden="true" />
              Login as Cashier
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => loginAs('owner')}
              className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-olive-950 text-sm font-bold tracking-wide text-cream-50 uppercase transition-colors hover:bg-olive-900 focus-visible:ring-2 focus-visible:ring-olive-700 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
            >
              <Store className="size-4" aria-hidden="true" />
              Login as Owner/Manager
            </button>
            {demoError ? (
              <p role="alert" className="text-center text-sm font-medium text-red-700">
                {demoError}
              </p>
            ) : null}
            <p className="text-center text-xs text-stone-500">
              One click, no password — each role opens its own demo session with sample data.
            </p>
            <div className="my-1 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-olive-900/15" />
              <span className="text-[11px] font-semibold tracking-wide text-stone-400 uppercase">or</span>
              <span className="h-px flex-1 bg-olive-900/15" />
            </div>
          </div>
        ) : null}

        <form
          className="mt-2 flex flex-col gap-4"
          action={signIn}
          aria-describedby={message ? 'login-error' : undefined}
        >
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-semibold text-olive-950">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              spellCheck={false}
              className="h-10 w-full rounded-lg border border-olive-900/20 bg-cream-50 px-3 text-sm text-olive-950 focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-[13px] font-semibold text-olive-950">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="h-10 w-full rounded-lg border border-olive-900/20 bg-cream-50 px-3 text-sm text-olive-950 focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none"
            />
          </div>

          {message ? (
            <p id="login-error" role="alert" className="text-sm font-medium text-red-700">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            className="h-10 cursor-pointer rounded-lg border border-olive-700 text-sm font-bold tracking-wide text-olive-800 uppercase transition-colors hover:bg-olive-100 focus-visible:ring-2 focus-visible:ring-olive-700 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Sign In with Email
          </button>

          <p className="text-center text-xs text-stone-400">
            Cash-only build — PayMongo wallets disabled for now.
          </p>
          <p className="text-center text-xs text-stone-400">
            <Link href="/privacy" className="font-semibold text-olive-700 underline-offset-2 hover:underline">
              Data privacy &amp; user consent
            </Link>
          </p>
        </form>

        {demoMode ? (
          <div className="mt-4 border-t border-olive-900/10 pt-3 text-center">
            <button
              type="button"
              onClick={() => {
                resetDemoData()
                setResetNote('Demo data reset to the original sample set.')
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-olive-700 underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" /> Reset demo data
            </button>
            {resetNote ? (
              <p role="status" className="mt-1 text-xs font-medium text-olive-800">
                {resetNote}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
