<template>
  <div
    role="button"
    tabindex="0"
    class="w-full text-left border border-neutral-800 hover:border-neutral-600 rounded-lg p-2 bg-neutral-900/80 hover:bg-neutral-800/80 transition-colors cursor-pointer"
    @click="onPrimaryClick"
    @keydown.enter.prevent="onPrimaryKey"
    @keydown.space.prevent="onPrimaryKey"
  >
    <div class="text-sm font-medium text-white tabular-nums">
      {{ primaryDisplay }}
    </div>
    <span
      v-if="secondaryDisplay && secondaryValue != null"
      role="button"
      tabindex="0"
      class="mt-0.5 inline-block text-xs text-neutral-400 hover:text-amber-400 tabular-nums transition-colors cursor-pointer"
      @click.stop="onSecondaryClick"
      @keydown.enter.prevent.stop="onSecondaryKey"
      @keydown.space.prevent.stop="onSecondaryKey"
    >
      {{ secondaryDisplay }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { useCopyCursorToast } from '~/composables/useCopyCursorToast'

const props = defineProps<{
  /** Bare number string for clipboard (e.g. "62.5") */
  primaryValue: string
  /** Display with unit (e.g. "62.5 ms") */
  primaryDisplay: string
  primaryUnit: 'ms' | 'hz'
  /** Bare number for secondary clipboard */
  secondaryValue?: string
  /** Display with unit (e.g. "0.67 Hz") */
  secondaryDisplay?: string
  secondaryUnit?: 'ms' | 'hz'
}>()

const { copyValue } = useCopyCursorToast()

const onPrimaryClick = (event: MouseEvent) => {
  copyValue(props.primaryValue, props.primaryUnit, event)
}

const onPrimaryKey = (event: KeyboardEvent) => {
  // Approximate center of focused element for keyboard copy feedback
  const el = event.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const fakeEvent = {
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
  } as MouseEvent
  copyValue(props.primaryValue, props.primaryUnit, fakeEvent)
}

const onSecondaryClick = (event: MouseEvent) => {
  if (props.secondaryValue == null || !props.secondaryUnit) return
  copyValue(props.secondaryValue, props.secondaryUnit, event)
}

const onSecondaryKey = (event: KeyboardEvent) => {
  if (props.secondaryValue == null || !props.secondaryUnit) return
  const el = event.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const fakeEvent = {
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
  } as MouseEvent
  copyValue(props.secondaryValue, props.secondaryUnit, fakeEvent)
}
</script>
