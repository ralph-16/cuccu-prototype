/**
 * Maps PostgREST / Postgres errors to user-safe messages.
 * Mirrors cuccu-pos-api/src/middleware/errorHandler.js so the prototype
 * never leaks raw DB internals to the UI. RLS stays the real boundary.
 */
export function toUserError(err: unknown): string {
  const code = (err as { code?: string })?.code
  const message = err instanceof Error ? err.message : String(err ?? '')

  if (code === '23505') return 'A record with this value already exists.'
  if (code === '23503') return 'This action violates a related record.'
  if (code === 'PGRST116') return 'Resource not found.'
  if (
    code === '42501' ||
    message.toLowerCase().includes('row-level security') ||
    message.toLowerCase().includes('permission denied')
  ) {
    return 'You do not have permission to perform this action.'
  }
  if (message.toLowerCase().includes('insufficient stock')) {
    return message
  }
  return 'Something went wrong. Please try again.'
}
