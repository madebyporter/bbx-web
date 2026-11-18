import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { useAuthHeaders } from '~/composables/useAuthHeaders'

export type SyncAggregate = 'none' | 'all' | 'some' | 'error'

/**
 * Batch-load per-track sync aggregates for own-library row icons.
 */
export function useTrackSyncAggregates(
  trackIds: Ref<number[]>,
  enabled: Ref<boolean>,
) {
  const aggregates = ref<Record<number, SyncAggregate>>({})
  const loading = ref(false)

  async function refresh() {
    if (!enabled.value || !import.meta.client) {
      aggregates.value = {}
      return
    }

    const ids = [...new Set(trackIds.value.filter((id) => Number.isFinite(id) && id > 0))]
    if (!ids.length) {
      aggregates.value = {}
      return
    }

    loading.value = true
    try {
      const headers = await useAuthHeaders()
      if (!headers.Authorization) {
        aggregates.value = {}
        return
      }

      const data = await $fetch<{ aggregates: Record<string, SyncAggregate> }>(
        '/api/integrations/sync-status-batch',
        {
          headers,
          query: { sound_ids: ids.join(',') },
        },
      )

      const next: Record<number, SyncAggregate> = {}
      for (const id of ids) {
        next[id] = data.aggregates[String(id)] || 'none'
      }
      aggregates.value = next
    } catch (err) {
      console.warn('Failed to load track sync aggregates:', err)
    } finally {
      loading.value = false
    }
  }

  watch(
    [trackIds, enabled],
    () => {
      void refresh()
    },
    { immediate: true, deep: true },
  )

  const onUpdated = () => {
    void refresh()
  }

  onMounted(() => {
    if (!import.meta.client) return
    window.addEventListener('track-sync-updated', onUpdated)
  })

  onUnmounted(() => {
    if (!import.meta.client) return
    window.removeEventListener('track-sync-updated', onUpdated)
  })

  return {
    aggregates,
    loading,
    refresh,
  }
}
