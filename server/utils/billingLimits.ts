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
}): 'comp' | 'paid' | 'default' {
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

  return 'default'
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
