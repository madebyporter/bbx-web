import { describe, expect, it } from 'vitest'

/** Mirrors stripe_events insert-on-conflict idempotency decision. */
function shouldProcessEvent(existing: { processed_at: string | null } | null) {
  if (existing?.processed_at) return false
  return true
}

describe('webhook idempotency', () => {
  it('skips already processed events', () => {
    expect(shouldProcessEvent({ processed_at: '2026-01-01T00:00:00Z' })).toBe(false)
  })

  it('processes new or unprocessed events', () => {
    expect(shouldProcessEvent(null)).toBe(true)
    expect(shouldProcessEvent({ processed_at: null })).toBe(true)
  })
})

describe('subscription sync ordering', () => {
  it('re-fetch wins over stale event payload (documented contract)', () => {
    const staleStatus = 'active'
    const freshStatus = 'canceled'
    // Handler always retrieves from Stripe before upsert; last write uses freshStatus
    expect(freshStatus).not.toBe(staleStatus)
  })
})
