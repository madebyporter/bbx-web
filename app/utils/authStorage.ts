export const PENDING_SIGNUP_EMAIL_KEY = 'pending_signup_email'
export const PENDING_USER_TYPE_KEY = 'pending_user_type'

const SIGNUP_CONFIRMATION_SENT_PREFIX = 'signup_confirmation_sent:'
const SIGNUP_CONFIRMATION_SENT_WINDOW_MS = 60_000

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function setPendingSignupEmail(email: string) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, email)
}

export function getPendingSignupEmail(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(PENDING_SIGNUP_EMAIL_KEY)
}

export function clearPendingSignupEmail() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(PENDING_SIGNUP_EMAIL_KEY)
}

export function markSignupConfirmationSent(email: string) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(
    `${SIGNUP_CONFIRMATION_SENT_PREFIX}${normalizeEmail(email)}`,
    String(Date.now())
  )
}

export function wasSignupConfirmationSentRecently(email: string): boolean {
  if (typeof window === 'undefined') return false
  const raw = sessionStorage.getItem(
    `${SIGNUP_CONFIRMATION_SENT_PREFIX}${normalizeEmail(email)}`
  )
  if (!raw) return false
  const sentAt = Number(raw)
  if (!Number.isFinite(sentAt)) return false
  return Date.now() - sentAt < SIGNUP_CONFIRMATION_SENT_WINDOW_MS
}

/** Skip another signUp() SMTP send for the same pending / recently-confirmed email. */
export function shouldSkipDuplicateSignup(email: string): boolean {
  if (typeof window === 'undefined') return false
  const normalized = normalizeEmail(email)
  if (!normalized) return false
  const pending = getPendingSignupEmail()
  if (pending && normalizeEmail(pending) === normalized) return true
  return wasSignupConfirmationSentRecently(email)
}
