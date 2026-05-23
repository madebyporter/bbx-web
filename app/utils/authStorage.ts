export const PENDING_SIGNUP_EMAIL_KEY = 'pending_signup_email'
export const PENDING_USER_TYPE_KEY = 'pending_user_type'

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
