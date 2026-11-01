import { describe, expect, it, vi } from 'vitest'

vi.mock('h3', () => ({
  createError: (input: { statusCode: number; statusMessage: string }) => {
    const err = new Error(input.statusMessage) as Error & { statusCode: number }
    err.statusCode = input.statusCode
    return err
  },
}))

import { validatePlanInput } from '../../server/utils/planValidation'

describe('validatePlanInput', () => {
  it('requires lowercase slug', () => {
    expect(() =>
      validatePlanInput({ slug: 'Pro Plan', name: 'Pro', price_monthly_cents: 900 }),
    ).toThrow(/slug/)
  })

  it('requires whole cents', () => {
    expect(() =>
      validatePlanInput({ slug: 'pro', name: 'Pro', price_monthly_cents: 9.5 }),
    ).toThrow(/cents/)
  })

  it('requires default plan to be free when flagged', () => {
    expect(() =>
      validatePlanInput({
        slug: 'free',
        name: 'Free',
        price_monthly_cents: 100,
        is_default: true,
      }),
    ).toThrow(/free/)
  })

  it('accepts null limits', () => {
    expect(() =>
      validatePlanInput({
        slug: 'pro',
        name: 'Pro',
        price_monthly_cents: 900,
        track_limit: null,
        storage_limit_bytes: null,
      }),
    ).not.toThrow()
  })
})
