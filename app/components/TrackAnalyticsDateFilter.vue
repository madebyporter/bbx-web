<template>
  <div class="flex flex-wrap gap-2 px-4 py-3 border-b border-neutral-800 bg-neutral-900/50">
    <select
      :value="modelValue"
      class="px-3 py-1.5 bg-neutral-800 border border-neutral-700 hover:border-neutral-600 rounded text-sm text-neutral-200 cursor-pointer outline-none"
      @change="handleChange"
    >
      <option v-for="option in ANALYTICS_RANGE_OPTIONS" :key="option.label" :value="option.label">
        {{ option.label }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import {
  ANALYTICS_RANGE_OPTIONS,
  storeAnalyticsRangeLabel,
} from '~/composables/useTrackAnalyticsData'

defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function handleChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  storeAnalyticsRangeLabel(value)
  emit('update:modelValue', value)
}
</script>
