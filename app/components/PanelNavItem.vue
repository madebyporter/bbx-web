<template>
  <button
    type="button"
    :aria-label="label"
    :class="[
      'rounded-full px-2.5 md:px-4 py-2 w-fit flex items-center justify-center whitespace-nowrap cursor-pointer transition-colors text-xs text-neutral-400 select-none border border-neutral-800',
      active ? 'bg-neutral-800 !text-neutral-200' : 'bg-transparent hover:bg-neutral-800',
    ]"
    @click="emit('click')"
  >
    <span class="inline-flex items-center gap-1.5">
      <slot />
      <span class="hidden md:inline">{{ label }}</span>
    </span>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    active?: boolean
  }>(),
  {
    active: false,
  },
)

const emit = defineEmits<{
  click: []
}>()
</script>
