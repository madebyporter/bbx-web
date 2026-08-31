<template>
  <button
    type="button"
    :aria-label="ariaLabel"
    :class="[
      'rounded-full px-4 py-2 w-fit flex items-center justify-center whitespace-nowrap cursor-pointer transition-colors text-xs text-neutral-400 select-none border border-neutral-800',
      active ? 'bg-neutral-800 !text-neutral-200' : 'bg-transparent hover:bg-neutral-800',
    ]"
    @click="emit('click')"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    active?: boolean
    ariaLabel?: string
  }>(),
  {
    active: false,
    ariaLabel: undefined,
  },
)

const emit = defineEmits<{
  click: []
}>()
</script>
