'use client'

import { useSearchParams } from 'next/navigation'
import { CupSoda } from 'lucide-react'
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

  return (
    <div className="grid min-h-dvh place-items-center bg-cream-100 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-[0_4px_24px_rgba(46,51,29,0.12)]">
        <div className="flex flex-col items-center text-center">
          <span className="grid size-12 place-items-center rounded-full bg-olive-500 font-bold text-cream-50">
            <CupSoda className="size-7" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-olive-950">Sign in to your CuccuPOS account</h1>
        </div>

        <form
          className="mt-6 flex flex-col gap-4"
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
            <label htmlFor="password" className="mb-1 block text-sm font-semibold text-olive-950">
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
            className="h-10 cursor-pointer rounded-lg bg-olive-500 text-sm font-bold tracking-wide text-cream-50 uppercase transition-colors hover:bg-olive-600 focus-visible:ring-2 focus-visible:ring-olive-700 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Sign In
          </button>

          <p className="text-center text-xs text-stone-400">
            Cash-only build — PayMongo wallets disabled for now.
          </p>
        </form>
      </div>
    </div>
  )
}
