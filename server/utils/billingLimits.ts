export type PlanLimitReason = 'tracks' | 'storage' | 'file_size'

export function evaluateUploadAgainstEntitlements(
  entitlements: {
    enforcement_enabled: boolean
    tracks_unlimited: boolean
    track_limit: number | null
    track_count: number
    storage_unlimited: boolean
    storage_limit_bytes: number | null
    storage_bytes: number
    max_file_size_bytes: number
  },
  fileSizeBytes: number,
  options: { replacingSize?: number; countingNewTrack?: boolean } = {},
): PlanLimitReason | null {
  const replacingSize = options.replacingSize ?? 0
  const countingNewTrack = options.countingNewTrack ?? true
  const maxFile = entitlements.max_file_size_bytes

  if (fileSizeBytes > maxFile) return 'file_size'

  if (!entitlements.enforcement_enabled) return null

  if (
    countingNewTrack &&
    !entitlements.tracks_unlimited &&
    entitlements.track_limit != null &&
    entitlements.track_count + 1 > entitlements.track_limit
  ) {
    return 'tracks'
  }

  if (!entitlements.storage_unlimited && entitlements.storage_limit_bytes != null) {
    const next = entitlements.storage_bytes - replacingSize + fileSizeBytes
    if (next > entitlements.storage_limit_bytes) return 'storage'
  }

  return null
}

export function resolveEffectivePlanSource(input: {
  now: Date
  pastDueGraceDays: number
  compPlanId: string | null
  compUntil: string | null
  status: string | null
  planId: string | null
  pastDueSince: string | null
  isAdmin?: boolean
}): 'comp' | 'paid' | 'admin' | 'default' {
  if (input.compPlanId && input.compUntil && new Date(input.compUntil) > input.now) {
    return 'comp'
  }

  if (input.planId && input.status) {
    if (input.status === 'active' || input.status === 'trialing') return 'paid'
    if (
      input.status === 'past_due' &&
      input.pastDueSince &&
      new Date(input.pastDueSince).getTime() >
        input.now.getTime() - input.pastDueGraceDays * 24 * 60 * 60 * 1000
    ) {
      return 'paid'
    }
  }

  if (input.isAdmin) return 'admin'

  return 'default'
}

export interface UnlimitedPlanSnapshot {
  id: string
  slug: string
  name: string
  track_limit: number | null
  storage_limit_bytes: number | null
  max_file_size_bytes: number | null
  entitlements?: unknown
  features?: unknown
  badge?: string | null
}

export interface PlanEntitlementState {
  plan_id: string
  plan_slug: string
  plan_name: string
  track_limit: number | null
  storage_limit_bytes: number | null
  max_file_size_bytes: number
  track_count: number
  storage_bytes: number
  tracks_unlimited: boolean
  storage_unlimited: boolean
  over_track_limit: boolean
  over_storage_limit: boolean
  storage_percent: number | null
  entitlements: Record<string, unknown>
  can_upload: boolean
  enforcement_enabled: boolean
  features: unknown[]
  badge: string | null
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

/**
 * Admins without a paid or comped plan get the public unlimited-tracks plan.
 * Already-unlimited entitlements are left as-is so a comp or paid plan wins.
 */
export function applyAdminUnlimitedPlan<T extends PlanEntitlementState>(
  current: T,
  plan: UnlimitedPlanSnapshot | null,
  isAdmin: boolean,
): T {
  if (!isAdmin || current.tracks_unlimited || !plan) return current

  const tracksUnlimited = plan.track_limit == null
  const storageUnlimited = plan.storage_limit_bytes == null
  const overTrack =
    !tracksUnlimited && plan.track_limit != null && current.track_count >= plan.track_limit
  const overStorage =
    !storageUnlimited &&
    plan.storage_limit_bytes != null &&
    current.storage_bytes >= plan.storage_limit_bytes
  const storagePercent =
    storageUnlimited || plan.storage_limit_bytes == null || plan.storage_limit_bytes === 0
      ? null
      : Math.round((current.storage_bytes / plan.storage_limit_bytes) * 10000) / 100

  return {
    ...current,
    plan_id: plan.id,
    plan_slug: plan.slug,
    plan_name: plan.name,
    track_limit: plan.track_limit,
    storage_limit_bytes: plan.storage_limit_bytes,
    max_file_size_bytes: plan.max_file_size_bytes ?? current.max_file_size_bytes,
    tracks_unlimited: tracksUnlimited,
    storage_unlimited: storageUnlimited,
    over_track_limit: overTrack,
    over_storage_limit: overStorage,
    storage_percent: storagePercent,
    entitlements: asRecord(plan.entitlements),
    can_upload: !current.enforcement_enabled || !(overTrack || overStorage),
    features: Array.isArray(plan.features) ? plan.features : [],
    badge: plan.badge ?? null,
  }
}

export function isUnlimited(limit: number | null | undefined): boolean {
  return limit == null
}

export function hasEntitlementFlag(
  entitlements: Record<string, unknown> | null | undefined,
  key: string,
): boolean {
  if (!entitlements) return false
  return entitlements[key] === true
}
