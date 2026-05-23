import { ref, watch, type Ref } from 'vue'
import { useSupabase } from '~/utils/supabase'
import { useAuth } from '~/composables/useAuth'

export interface TrackAnalyticsRow {
  plays: number
  listeners: number
  avgDuration: number
  avgPercent: number
  completionRate: number
}

export interface TrackAnalyticsSummary {
  totalPlays: number
  totalListeners: number
  avgListenPercent: number
  pageViews: number
  topTrackId: number | null
  topTrackPlays: number
}

export interface TrackAnalyticsDateRange {
  label: string
  from: Date
  to: Date
}

export const ANALYTICS_RANGE_OPTIONS = [
  { label: 'Past Day', days: 1 },
  { label: 'Past 7 Days', days: 7 },
  { label: 'Past 14 Days', days: 14 },
  { label: 'Past 30 Days', days: 30 },
  { label: 'Past 90 Days', days: 90 },
  { label: 'Past 6 Months', months: 6 },
  { label: 'Past 12 Months', months: 12 },
  { label: 'Past 24 Months', months: 24 },
] as const

const STORAGE_KEY = 'track_analytics_range'

export function getAnalyticsDateRange(optionLabel: string): TrackAnalyticsDateRange {
  const option = ANALYTICS_RANGE_OPTIONS.find(o => o.label === optionLabel) ?? ANALYTICS_RANGE_OPTIONS[1]
  const to = new Date()
  const from = new Date()

  if ('days' in option) {
    from.setDate(from.getDate() - option.days)
  } else {
    from.setMonth(from.getMonth() - option.months)
  }

  return { label: option.label, from, to }
}

export function loadStoredAnalyticsRangeLabel(): string {
  if (!import.meta.client) return ANALYTICS_RANGE_OPTIONS[1].label
  return localStorage.getItem(STORAGE_KEY) ?? ANALYTICS_RANGE_OPTIONS[1].label
}

export function storeAnalyticsRangeLabel(label: string) {
  if (!import.meta.client) return
  localStorage.setItem(STORAGE_KEY, label)
}

export function useTrackAnalyticsData(options: {
  trackIds: Ref<number[]>
  enabled: Ref<boolean>
  rangeLabel: Ref<string>
  collectionId?: Ref<number | null>
}) {
  const { supabase } = useSupabase()
  const { user } = useAuth()

  const loading = ref(false)
  const trackStats = ref<Map<number, TrackAnalyticsRow>>(new Map())
  const summary = ref<TrackAnalyticsSummary>({
    totalPlays: 0,
    totalListeners: 0,
    avgListenPercent: 0,
    pageViews: 0,
    topTrackId: null,
    topTrackPlays: 0,
  })

  async function fetchAnalytics() {
    if (!supabase || !user.value || !options.enabled.value) return

    const ids = options.trackIds.value
    if (ids.length === 0) {
      trackStats.value = new Map()
      summary.value = {
        totalPlays: 0,
        totalListeners: 0,
        avgListenPercent: 0,
        pageViews: 0,
        topTrackId: null,
        topTrackPlays: 0,
      }
      return
    }

    loading.value = true

    try {
      const range = getAnalyticsDateRange(options.rangeLabel.value)
      const collectionId = options.collectionId?.value ?? null

      const { data, error } = await supabase.rpc('get_track_analytics', {
        p_owner_id: user.value.id,
        p_track_ids: ids,
        p_from: range.from.toISOString(),
        p_to: range.to.toISOString(),
        p_collection_id: collectionId,
      })

      if (error) throw error

      const payload = data as {
        summary?: {
          total_plays?: number
          total_listeners?: number
          avg_listen_percent?: number
          page_views?: number
          top_track_id?: number | null
          top_track_plays?: number
        }
        tracks?: Array<{
          track_id: number
          play_count?: number
          listener_count?: number
          avg_duration_seconds?: number
          avg_listen_percent?: number
          completion_rate?: number
        }>
      }

      const nextMap = new Map<number, TrackAnalyticsRow>()
      for (const row of payload.tracks ?? []) {
        nextMap.set(row.track_id, {
          plays: row.play_count ?? 0,
          listeners: row.listener_count ?? 0,
          avgDuration: Number(row.avg_duration_seconds ?? 0),
          avgPercent: Number(row.avg_listen_percent ?? 0),
          completionRate: Number(row.completion_rate ?? 0),
        })
      }
      trackStats.value = nextMap

      summary.value = {
        totalPlays: payload.summary?.total_plays ?? 0,
        totalListeners: payload.summary?.total_listeners ?? 0,
        avgListenPercent: Number(payload.summary?.avg_listen_percent ?? 0),
        pageViews: payload.summary?.page_views ?? 0,
        topTrackId: payload.summary?.top_track_id ?? null,
        topTrackPlays: payload.summary?.top_track_plays ?? 0,
      }
    } catch (error) {
      console.error('Failed to fetch track analytics:', error)
    } finally {
      loading.value = false
    }
  }

  watch(
    [options.trackIds, options.enabled, options.rangeLabel, () => options.collectionId?.value],
    () => {
      if (options.enabled.value) {
        void fetchAnalytics()
      }
    },
    { immediate: true, deep: true }
  )

  return {
    loading,
    trackStats,
    summary,
    refresh: fetchAnalytics,
  }
}

export function formatAnalyticsDuration(seconds: number): string {
  if (!seconds || Number.isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
