<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="classes"
    v-bind="buttonAttrs"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

type Variant = 'filled' | 'ghost'
type ButtonType = 'button' | 'submit' | 'reset'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    type?: ButtonType
    disabled?: boolean
  }>(),
  {
    variant: 'ghost',
    type: 'button',
    disabled: false,
  }
)

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const variantClasses: Record<Variant, string> = {
  filled:
    'bg-white text-black hover:bg-neutral-100 disabled:opacity-30',
  ghost:
    'bg-transparent text-neutral-400 hover:bg-white/5 hover:text-white disabled:opacity-30',
}

const baseClasses =
  'inline-flex items-center justify-center shrink-0 size-10 rounded-sm transition-colors cursor-pointer disabled:cursor-not-allowed'

const classes = computed(() => [
  baseClasses,
  variantClasses[props.variant],
  attrs.class,
])

const buttonAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})
</script>
