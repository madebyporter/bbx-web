<template>
  <button
    :type="type"
    :disabled="disabled"
    :aria-label="responsiveLabel ? label : undefined"
    :class="classes"
    v-bind="buttonAttrs"
  >
    <span v-if="responsiveLabel" class="inline-flex items-center gap-1.5">
      <slot />
      <span class="hidden md:inline">{{ label }}</span>
    </span>
    <slot v-else />
  </button>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outlined' | 'danger' | 'link'
type Size = 'md' | 'sm'
type ButtonType = 'button' | 'submit' | 'reset'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    type?: ButtonType
    disabled?: boolean
    fullWidth?: boolean
    /** Icon-only hit target matching adjacent input height (aspect-square + stretch). */
    square?: boolean
    responsiveLabel?: boolean
    label?: string
  }>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button',
    disabled: false,
    fullWidth: false,
    square: false,
    responsiveLabel: false,
    label: undefined,
  }
)

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-amber-500 text-black hover:bg-amber-600 disabled:opacity-50 disabled:hover:bg-amber-500',
  secondary:
    'bg-neutral-700 text-neutral-200 hover:bg-neutral-600 disabled:opacity-50 disabled:hover:bg-neutral-700',
  ghost:
    'bg-transparent text-neutral-400 hover:text-neutral-300 disabled:opacity-50',
  outlined:
    'bg-transparent border border-neutral-700 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-400 disabled:opacity-50',
  danger:
    'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600',
  link:
    'bg-transparent text-amber-400 hover:text-amber-300 underline p-0 disabled:opacity-50',
}

const sizeClasses: Record<Size, string> = {
  md: 'px-4 py-2 text-base',
  sm: 'px-3 py-1.5 text-sm',
}

const responsiveSizeClasses: Record<Size, string> = {
  md: 'px-2.5 md:px-4 py-2 text-base min-w-12',
  sm: 'px-2.5 md:px-3 py-1.5 text-sm min-w-8',
}

const baseClasses =
  'rounded-sm inline-flex items-center justify-center font-medium transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap min-h-8 min-w-8'

const linkBaseClasses =
  'inline h-fit w-fit font-medium transition-colors cursor-pointer disabled:cursor-not-allowed'

// Fixed box — flex stretch + aspect-ratio is unreliable (w-auto ignores ratio; w-0 collapses).
// size-12 matches p-3 inputs; size-10 matches denser p-2.5 rows when size="sm".
const squareSizeClasses: Record<Size, string> = {
  md: 'aspect-square !p-0 size-12 min-w-12',
  sm: 'aspect-square !p-0 size-8 min-w-8',
}

const classes = computed(() => {
  const isLinkVariant = props.variant === 'link'
  const sizeClass = isLinkVariant
    ? ''
    : props.square
      ? squareSizeClasses[props.size]
      : props.responsiveLabel
        ? responsiveSizeClasses[props.size]
        : sizeClasses[props.size]

  return [
    isLinkVariant ? linkBaseClasses : baseClasses,
    sizeClass,
    variantClasses[props.variant],
    props.fullWidth && !props.square ? 'w-full' : '',
    attrs.class,
  ]
})

const buttonAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})
</script>
