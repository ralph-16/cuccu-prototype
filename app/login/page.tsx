import { Suspense } from 'react'
import { LoginForm } from './form'

/**
 * Static shell + Suspense boundary so useSearchParams() inside LoginForm
 * never blocks prerendering (Next 16 cacheComponents requirement).
 */
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
