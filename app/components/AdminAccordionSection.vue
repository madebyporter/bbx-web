<template>
  <div>
    <button
      type="button"
      class="w-full flex items-center justify-between gap-3 text-left cursor-pointer"
      :aria-expanded="modelValue"
      @click="toggle"
    >
      <h2 class="text-xl font-semibold">{{ title }}</h2>
      <div class="flex items-center gap-2 shrink-0">
        <span
          v-if="showNew"
          class="text-xs px-2 py-0.5 rounded-sm bg-amber-500/20 text-amber-400"
        >
          New
        </span>
        <NavArrowDown
          class="size-5 text-neutral-400 transition-transform"
          :class="modelValue ? '' : '-rotate-90'"
          stroke-width="1.5"
        />
      </div>
    </button>
    <div v-show="modelValue" class="mt-6">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { NavArrowDown } from '@iconoir/vue'

const props = defineProps<{
  title: string
  showNew?: boolean
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function toggle() {
  emit('update:modelValue', !props.modelValue)
}
</script>
