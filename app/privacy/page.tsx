'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogoImage } from '@/components/brand/logo'

const CONSENT_KEY = 'cuccu-privacy-consent'

const SECTIONS: Array<{ n: string; title: string; points?: string[]; body?: string }> = [
  {
    n: '01',
    title: 'Data We Collect',
    points: [
      'Account name, email, role, encrypted password',
      'Daily sales logs, payment methods, order history',
      'System analytics: inventory levels, expense entries, audit logs',
    ],
  },
  {
    n: '02',
    title: 'Why We Collect It',
    points: [
      'Secure role-based access control',
      'Verify GCash / Maya payment flows',
      'Generate sales, profit and expense reports',
    ],
  },
  {
    n: '03',
    title: 'Your Privacy Rights',
    body: 'Your data is stored securely and never sold to third parties. You have the right to access, request corrections, or object to data processing, subject to applicable law.',
  },
]

/**
 * Data Privacy & User Consent screen (Philippine Data Privacy Act, RA 10173).
 * Standalone pre-login page; accepting records local consent and continues to /login.
 */
export default function PrivacyPage() {
  const router = useRouter()
  const [agreed, setAgreed] = useState(false)

  function accept() {
    try {
      window.localStorage.setItem(CONSENT_KEY, new Date().toISOString())
    } catch {
      // storage blocked — consent still proceeds for this session
    }
    router.push('/login')
  }

  return (
    <div className="min-h-dvh bg-cream-100 px-4 py-8">
      <div className="mx-auto w-full max-w-3xl">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex items-center gap-2.5">
            <LogoImage className="size-9" priority />
            <span className="text-2xl font-bold tracking-tight text-olive-950">
              Cuccu<span className="text-olive-600">POS</span>
            </span>
          </span>
          <p className="text-[11px] font-semibold tracking-wide text-olive-800/80 uppercase">
            Data Privacy &amp; User Consent • Cafe Management System • Your data, handled responsibly
          </p>
        </header>

        <section className="mt-5 rounded-2xl border border-olive-900/15 bg-cream-50 p-6 shadow-[0_4px_24px_rgba(46,51,29,0.10)]">
          <h1 className="text-2xl font-bold text-olive-950">Before you continue</h1>
          <p className="mt-1 text-sm text-stone-600">
            Please review how CuccuPOS collects and processes personal and transactional information in
            accordance with the Philippine Data Privacy Act of 2012 (RA 10173).
          </p>

          <ul className="mt-5 flex flex-col gap-3.5">
            {SECTIONS.map((s) => (
              <li key={s.n} className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-olive-950 text-xs font-bold text-cream-50">
                  {s.n}
                </span>
                <div className="min-w-0 flex-1 rounded-xl border border-olive-900/10 bg-cream-100 p-3.5">
                  <h2 className="text-sm font-bold tracking-wide text-olive-950 uppercase">{s.title}</h2>
                  {s.points ? (
                    <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-stone-700">
                      {s.points.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1.5 text-sm text-stone-700">{s.body}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5">
            <label className="flex items-start gap-2.5 text-sm font-semibold text-olive-950">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 size-4 cursor-pointer accent-olive-700"
              />
              I have read and agree to the Terms of Service and Privacy Policy
            </label>
            <p className="mt-1 pl-6 text-xs text-stone-500">You can review our privacy policy at any time.</p>
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-4 border-t border-olive-900/15 pt-5">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="h-11 min-w-36 cursor-pointer rounded-xl border border-olive-800 px-6 font-bold text-olive-900 transition-colors hover:bg-olive-100 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:outline-none"
            >
              Decline / Exit
            </button>
            <button
              type="button"
              onClick={accept}
              disabled={!agreed}
              className="h-11 min-w-40 cursor-pointer rounded-xl bg-olive-800 px-6 font-bold text-cream-50 transition-colors hover:bg-olive-900 focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
            >
              Accept &amp; Continue
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
