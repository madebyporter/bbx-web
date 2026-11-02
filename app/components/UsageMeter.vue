<template>
  <div v-if="entitlements" class="space-y-3">
    <div v-if="entitlements.tracks_unlimited" class="text-sm text-neutral-300">
      <p class="font-medium">Unlimited tracks</p>
      <p class="text-neutral-500">{{ entitlements.track_count }} tracks</p>
    </div>
    <div v-else class="space-y-1">
      <div class="flex justify-between text-sm">
        <span class="text-neutral-300">Tracks</span>
        <span class="text-neutral-400">
          {{ entitlements.track_count }} of {{ entitlements.track_limit }} tracks
        </span>
      </div>
      <div class="h-2 rounded bg-neutral-800 overflow-hidden">
        <div
          class="h-full bg-amber-500 transition-all"
          :style="{ width: `${trackPercent}%` }"
        />
      </div>
    </div>

    <div
      v-if="showStorageWarning"
      class="text-sm rounded border border-neutral-800 bg-neutral-900/60 p-3 text-neutral-300"
    >
      <p v-if="entitlements.tracks_unlimited">
        You're close to the fair use limit. We'll reach out before anything changes.
      </p>
      <p v-else>
        Storage is at {{ Math.round(entitlements.storage_percent || 0) }}% of your plan.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Entitlements } from '~/types/billing'

const props = defineProps<{
  entitlements: Entitlements | null
}>()

const trackPercent = computed(() => {
  const e = props.entitlements
  if (!e || e.tracks_unlimited || !e.track_limit) return 0
  return Math.min(100, Math.round((e.track_count / e.track_limit) * 100))
})

const showStorageWarning = computed(() => {
  const e = props.entitlements
  if (!e || e.storage_unlimited || e.storage_limit_bytes == null) return false
  if (e.storage_percent == null) return false
  return e.storage_percent >= 80
})
</script>
