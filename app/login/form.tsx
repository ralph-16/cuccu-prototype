'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { LogoImage } from '@/components/brand/logo'
import { signIn } from './actions'

/** Client form: reads ?error= via useSearchParams so the page shell can prerender. */
export function LoginForm() {
  const searchParams = useSearchParams()
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

  // Clear any stale demo display session on landing so switching modes never
  // leaks the previous user's name.
  useEffect(() => {
    try {
      window.localStorage.removeItem('cuccu-demo-session')
    } catch {
      // ignore
    }
  }, [])

  return (
    <div className="grid min-h-dvh place-items-center bg-cream-100 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-[0_4px_24px_rgba(46,51,29,0.12)]">
        <div className="flex flex-col items-center text-center">
          <LogoImage className="size-16" priority />
          <h1 className="mt-3 text-xl font-bold text-olive-950">Sign in to your CuccuPOS account</h1>
        </div>

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
      </div>
    </div>
  )
}
