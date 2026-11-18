import type { H3Event } from 'h3'
import { createError } from 'h3'
import type { User } from '@supabase/supabase-js'
import {
  applyAdminUnlimitedPlan,
  evaluateUploadAgainstEntitlements,
  hasEntitlementFlag,
  resolveEffectivePlanSource,
  type PlanLimitReason,
  type UnlimitedPlanSnapshot,
} from './billingLimits'
import { getServiceSupabase, requireAuthUser } from './supabaseAuth'

export const DEFAULT_MAX_FILE_BYTES = 50 * 1024 * 1024
/** Cloud track videos exceed audio max_file_size; hard cap for paid saves. */
export const TRACK_VIDEO_MAX_BYTES = 512 * 1024 * 1024

export interface Entitlements {
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

export function userHasAdminRole(
  user: { app_metadata?: Record<string, unknown> | null } | null | undefined,
): boolean {
  const roles = user?.app_metadata?.roles
  return Array.isArray(roles) && roles.includes('admin')
}

export async function getEntitlements(
  userId: string,
  options: { isAdmin?: boolean } = {},
): Promise<Entitlements> {
  const supabase = getServiceSupabase()
  const { data, error } = await supabase.rpc('get_entitlements', {
    p_user_id: userId,
  })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load entitlements: ${error.message}`,
    })
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row) {
    throw createError({
      statusCode: 500,
      statusMessage: 'No entitlements returned',
    })
  }

  const entitlements = normalizeEntitlements(row)
  if (!options.isAdmin || entitlements.tracks_unlimited) return entitlements

  const plan = await loadPublicUnlimitedPlan()
  return applyAdminUnlimitedPlan(entitlements, plan, true)
}

async function loadPublicUnlimitedPlan(): Promise<UnlimitedPlanSnapshot | null> {
  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('plans')
    .select(
      'id, slug, name, track_limit, storage_limit_bytes, max_file_size_bytes, entitlements, features, badge',
    )
    .eq('is_active', true)
    .eq('is_public', true)
    .is('track_limit', null)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error || !data?.id) return null
  return data as UnlimitedPlanSnapshot
}

function normalizeEntitlements(row: Record<string, unknown>): Entitlements {
  const entitlementsRaw = row.entitlements
  const entitlements =
    entitlementsRaw && typeof entitlementsRaw === 'object' && !Array.isArray(entitlementsRaw)
      ? (entitlementsRaw as Record<string, unknown>)
      : {}

  return {
    plan_id: String(row.plan_id),
    plan_slug: String(row.plan_slug),
    plan_name: String(row.plan_name),
    track_limit: row.track_limit == null ? null : Number(row.track_limit),
    storage_limit_bytes: row.storage_limit_bytes == null ? null : Number(row.storage_limit_bytes),
    max_file_size_bytes:
      row.max_file_size_bytes == null ? DEFAULT_MAX_FILE_BYTES : Number(row.max_file_size_bytes),
    track_count: Number(row.track_count ?? 0),
    storage_bytes: Number(row.storage_bytes ?? 0),
    tracks_unlimited: Boolean(row.tracks_unlimited),
    storage_unlimited: Boolean(row.storage_unlimited),
    over_track_limit: Boolean(row.over_track_limit),
    over_storage_limit: Boolean(row.over_storage_limit),
    storage_percent: row.storage_percent == null ? null : Number(row.storage_percent),
    entitlements,
    can_upload: Boolean(row.can_upload),
    enforcement_enabled: Boolean(row.enforcement_enabled),
    features: Array.isArray(row.features) ? row.features : [],
    badge: row.badge == null ? null : String(row.badge),
  }
}

export function hasEntitlement(
  entitlements: Entitlements | null | undefined,
  key: string,
): boolean {
  return hasEntitlementFlag(entitlements?.entitlements, key)
}

export async function assertCanUpload(
  userId: string,
  fileSizeBytes: number,
  options: { replacingTrackId?: number | null; isAdmin?: boolean } = {},
): Promise<Entitlements> {
  const entitlements = await getEntitlements(userId, { isAdmin: options.isAdmin })

  const supabase = getServiceSupabase()
  let replacingSize = 0
  const replacingTrackId = options.replacingTrackId
  let countingNewTrack = true

  if (replacingTrackId != null) {
    const { data: track, error } = await supabase
      .from('sounds')
      .select('id, user_id, file_size')
      .eq('id', replacingTrackId)
      .maybeSingle()

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to load track for replacement: ${error.message}`,
      })
    }
    if (!track || track.user_id !== userId) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Track not found',
      })
    }
    replacingSize = Number(track.file_size || 0)
    countingNewTrack = false
  }

  const reason = evaluateUploadAgainstEntitlements(entitlements, fileSizeBytes, {
    replacingSize,
    countingNewTrack,
  })
  if (reason) throwPlanLimit(reason, entitlements)

  return entitlements
}

function throwPlanLimit(reason: PlanLimitReason, entitlements: Entitlements): never {
  throw createError({
    statusCode: 402,
    statusMessage: 'plan_limit_reached',
    data: { reason, entitlements },
  })
}

/**
 * Cloud track video save: paid (active/trialing/past_due grace), valid comp, or admin.
 * Free/default plans get 403 paid_required.
 */
export async function assertCanSaveTrackVideo(user: User): Promise<Entitlements> {
  const isAdmin = userHasAdminRole(user)
  const supabase = getServiceSupabase()

  const [{ data: subscription }, { data: settings }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('plan_id, status, comp_plan_id, comp_until, past_due_since')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase.from('billing_settings').select('past_due_grace_days').eq('id', 1).maybeSingle(),
  ])

  const source = resolveEffectivePlanSource({
    now: new Date(),
    pastDueGraceDays: Number(settings?.past_due_grace_days ?? 7),
    compPlanId: subscription?.comp_plan_id ?? null,
    compUntil: subscription?.comp_until ?? null,
    status: subscription?.status ?? null,
    planId: subscription?.plan_id ?? null,
    pastDueSince: subscription?.past_due_since ?? null,
    isAdmin,
  })

  if (source === 'default') {
    throw createError({
      statusCode: 403,
      statusMessage: 'paid_required',
      data: { code: 'paid_required' },
    })
  }

  return getEntitlements(user.id, { isAdmin })
}

/** Storage headroom + 512MB hard cap for cloud track videos (not audio max_file_size). */
export function assertTrackVideoSizeAllowed(
  entitlements: Entitlements,
  fileSizeBytes: number,
): void {
  if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'size is required',
    })
  }

  if (fileSizeBytes > TRACK_VIDEO_MAX_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: 'Video exceeds the 512MB cloud save limit',
      data: { reason: 'file_size', maxBytes: TRACK_VIDEO_MAX_BYTES },
    })
  }

  if (
    entitlements.enforcement_enabled &&
    !entitlements.storage_unlimited &&
    entitlements.storage_limit_bytes != null
  ) {
    const next = entitlements.storage_bytes + fileSizeBytes
    if (next > entitlements.storage_limit_bytes) {
      throwPlanLimit('storage', entitlements)
    }
  }
}

export async function requireAdminUser(event: H3Event): Promise<User> {
  const user = await requireAuthUser(event)
  const roles = (user.app_metadata?.roles as string[] | undefined) || []
  if (!roles.includes('admin')) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
    })
  }
  return user
}
