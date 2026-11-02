export type PlanLimitReason = 'tracks' | 'storage' | 'file_size'

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

export interface PublicPlan {
  id: string
  slug: string
  name: string
  description: string | null
  price_monthly_cents: number
  price_annual_cents: number | null
  currency: string
  track_limit: number | null
  storage_limit_bytes: number | null
  max_file_size_bytes: number | null
  features: string[]
  entitlements: Record<string, unknown>
  is_default: boolean
  badge: string | null
  sort_order: number
}
