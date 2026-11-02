import { describe, expect, it } from 'vitest'

function shouldCreateNewPrice(existing: {
  unit_amount: number
  interval: string
  active: boolean
} | null, next: { amountCents: number; interval: string }) {
  if (!existing) return true
  if (!existing.active) return true
  if (existing.unit_amount !== next.amountCents) return true
  if (existing.interval !== next.interval) return true
  return false
}

describe('admin stripe price sync', () => {
  it('reuses matching active price', () => {
    expect(
      shouldCreateNewPrice(
        { unit_amount: 900, interval: 'month', active: true },
        { amountCents: 900, interval: 'month' },
      ),
    ).toBe(false)
  })

  it('creates a new price when amount changes (old price should be archived)', () => {
    expect(
      shouldCreateNewPrice(
        { unit_amount: 900, interval: 'month', active: true },
        { amountCents: 1200, interval: 'month' },
      ),
    ).toBe(true)
  })
})
