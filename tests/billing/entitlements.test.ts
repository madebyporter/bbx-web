import { describe, expect, it } from 'vitest'
import {
  applyAdminUnlimitedPlan,
  evaluateUploadAgainstEntitlements,
  hasEntitlementFlag,
  isUnlimited,
  resolveEffectivePlanSource,
  type PlanEntitlementState,
} from '../../server/utils/billingLimits'

const base = {
  enforcement_enabled: true,
  tracks_unlimited: false,
  track_limit: 5,
  track_count: 4,
  storage_unlimited: false,
  storage_limit_bytes: 1000,
  storage_bytes: 100,
  max_file_size_bytes: 500,
}

describe('resolveEffectivePlanSource', () => {
  const now = new Date('2026-06-01T12:00:00Z')

  it('prefers active comp over paid', () => {
    expect(
      resolveEffectivePlanSource({
        now,
        pastDueGraceDays: 7,
        compPlanId: 'pro',
        compUntil: '2026-07-01T00:00:00Z',
        status: 'active',
        planId: 'free-paid',
        pastDueSince: null,
      }),
    ).toBe('comp')
  })

  it('uses paid when active', () => {
    expect(
      resolveEffectivePlanSource({
        now,
        pastDueGraceDays: 7,
        compPlanId: null,
        compUntil: null,
        status: 'active',
        planId: 'pro',
        pastDueSince: null,
      }),
    ).toBe('paid')
  })

  it('keeps paid during past_due grace window', () => {
    expect(
      resolveEffectivePlanSource({
        now,
        pastDueGraceDays: 7,
        compPlanId: null,
        compUntil: null,
        status: 'past_due',
        planId: 'pro',
        pastDueSince: '2026-05-28T12:00:00Z',
      }),
    ).toBe('paid')
  })

  it('falls back to default after past_due grace', () => {
    expect(
      resolveEffectivePlanSource({
        now,
        pastDueGraceDays: 7,
        compPlanId: null,
        compUntil: null,
        status: 'past_due',
        planId: 'pro',
        pastDueSince: '2026-05-01T12:00:00Z',
      }),
    ).toBe('default')
  })

  it('falls back to default when comp expired', () => {
    expect(
      resolveEffectivePlanSource({
        now,
        pastDueGraceDays: 7,
        compPlanId: 'pro',
        compUntil: '2026-05-01T00:00:00Z',
        status: 'canceled',
        planId: 'pro',
        pastDueSince: null,
      }),
    ).toBe('default')
  })

  it('gives admins the unlimited plan when they are not paying', () => {
    expect(
      resolveEffectivePlanSource({
        now,
        pastDueGraceDays: 7,
        compPlanId: null,
        compUntil: null,
        status: null,
        planId: null,
        pastDueSince: null,
        isAdmin: true,
      }),
    ).toBe('admin')
  })

  it('keeps an active paid plan ahead of the admin grant', () => {
    expect(
      resolveEffectivePlanSource({
        now,
        pastDueGraceDays: 7,
        compPlanId: null,
        compUntil: null,
        status: 'active',
        planId: 'pro',
        pastDueSince: null,
        isAdmin: true,
      }),
    ).toBe('paid')
  })
})

const freeEntitlements: PlanEntitlementState = {
  plan_id: 'free-id',
  plan_slug: 'free',
  plan_name: 'Free',
  track_limit: 5,
  storage_limit_bytes: 500,
  max_file_size_bytes: 50,
  track_count: 157,
  storage_bytes: 1010,
  tracks_unlimited: false,
  storage_unlimited: false,
  over_track_limit: true,
  over_storage_limit: true,
  storage_percent: 202,
  entitlements: { track_sync: false },
  can_upload: false,
  enforcement_enabled: true,
  features: ['5 tracks'],
  badge: null,
}

describe('applyAdminUnlimitedPlan', () => {
  const pro = {
    id: 'pro-id',
    slug: 'pro',
    name: 'Pro',
    track_limit: null,
    storage_limit_bytes: 100_000,
    max_file_size_bytes: 50,
    entitlements: { track_sync: false },
    features: ['Unlimited tracks'],
    badge: 'Most popular',
  }

  it('moves an admin off Free onto the unlimited-tracks plan', () => {
    const next = applyAdminUnlimitedPlan(freeEntitlements, pro, true)
    expect(next.plan_slug).toBe('pro')
    expect(next.tracks_unlimited).toBe(true)
    expect(next.over_track_limit).toBe(false)
    expect(next.over_storage_limit).toBe(false)
    expect(next.can_upload).toBe(true)
    expect(next.track_count).toBe(157)
  })

  it('leaves non-admins on their current plan', () => {
    expect(applyAdminUnlimitedPlan(freeEntitlements, pro, false)).toEqual(freeEntitlements)
  })

  it('does not replace a plan that is already unlimited', () => {
    const studio = {
      ...freeEntitlements,
      plan_slug: 'studio',
      plan_name: 'Studio',
      tracks_unlimited: true,
      track_limit: null,
    }
    expect(applyAdminUnlimitedPlan(studio, pro, true).plan_slug).toBe('studio')
  })
})

describe('null limits mean unlimited', () => {
  it('isUnlimited', () => {
    expect(isUnlimited(null)).toBe(true)
    expect(isUnlimited(undefined)).toBe(true)
    expect(isUnlimited(5)).toBe(false)
  })

  it('skips track check when unlimited', () => {
    expect(
      evaluateUploadAgainstEntitlements(
        { ...base, tracks_unlimited: true, track_limit: null, track_count: 9000 },
        100,
      ),
    ).toBeNull()
  })

  it('skips storage check when unlimited', () => {
    expect(
      evaluateUploadAgainstEntitlements(
        {
          ...base,
          storage_unlimited: true,
          storage_limit_bytes: null,
          storage_bytes: 9e15,
        },
        100,
      ),
    ).toBeNull()
  })
})

describe('hasEntitlementFlag', () => {
  it('defaults missing keys to false', () => {
    expect(hasEntitlementFlag({}, 'track_sync')).toBe(false)
    expect(hasEntitlementFlag({ track_sync: true }, 'track_sync')).toBe(true)
    expect(hasEntitlementFlag(null, 'track_sync')).toBe(false)
  })
})

describe('evaluateUploadAgainstEntitlements', () => {
  it('blocks tracks when over limit', () => {
    expect(
      evaluateUploadAgainstEntitlements({ ...base, track_count: 5 }, 100),
    ).toBe('tracks')
  })

  it('blocks storage when over limit', () => {
    expect(
      evaluateUploadAgainstEntitlements({ ...base, storage_bytes: 950 }, 100),
    ).toBe('storage')
  })

  it('blocks file size', () => {
    expect(evaluateUploadAgainstEntitlements(base, 600)).toBe('file_size')
  })

  it('does not count a new track on replacement', () => {
    expect(
      evaluateUploadAgainstEntitlements(
        { ...base, track_count: 5 },
        100,
        { replacingSize: 50, countingNewTrack: false },
      ),
    ).toBeNull()
  })

  it('does not enforce when kill switch is off (except file size still checked)', () => {
    expect(
      evaluateUploadAgainstEntitlements(
        { ...base, enforcement_enabled: false, track_count: 99 },
        100,
      ),
    ).toBeNull()
    expect(
      evaluateUploadAgainstEntitlements(
        { ...base, enforcement_enabled: false },
        600,
      ),
    ).toBe('file_size')
  })
})
