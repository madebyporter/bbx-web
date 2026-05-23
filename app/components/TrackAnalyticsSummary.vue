<template>
  <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 px-4 py-4 border-b border-neutral-800 bg-neutral-900/30">
    <div
      v-for="card in cards"
      :key="card.label"
      class="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3"
    >
      <p class="text-2xl font-bold text-neutral-100">{{ card.value }}</p>
      <p class="text-xs uppercase tracking-wide text-neutral-500 mt-1">{{ card.label }}</p>
      <p v-if="card.subtitle" class="text-xs text-neutral-600 mt-1 truncate">{{ card.subtitle }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TrackAnalyticsSummary } from '~/composables/useTrackAnalyticsData'

const props = defineProps<{
  summary: TrackAnalyticsSummary
  topTrackTitle?: string | null
  loading?: boolean
}>()

const cards = computed(() => [
  {
    label: 'Total Plays',
    value: props.loading ? '—' : props.summary.totalPlays.toLocaleString(),
    subtitle: null,
  },
  {
    label: 'Unique Listeners',
    value: props.loading ? '—' : props.summary.totalListeners.toLocaleString(),
    subtitle: null,
  },
  {
    label: 'Avg Listen Rate',
    value: props.loading ? '—' : `${props.summary.avgListenPercent}%`,
    subtitle: null,
  },
  {
    label: 'Page Views',
    value: props.loading ? '—' : props.summary.pageViews.toLocaleString(),
    subtitle: null,
  },
  {
    label: 'Top Track',
    value: props.loading ? '—' : (props.topTrackTitle ?? '—'),
    subtitle: props.loading
      ? null
      : props.summary.topTrackPlays > 0
        ? `${props.summary.topTrackPlays.toLocaleString()} plays`
        : 'No plays yet',
  },
])
</script>
