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

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link'
type Size = 'md' | 'sm'
type ButtonType = 'button' | 'submit' | 'reset'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    type?: ButtonType
    disabled?: boolean
    fullWidth?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button',
    disabled: false,
    fullWidth: false,
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
  danger:
    'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600',
  link:
    'bg-transparent text-neutral-400 hover:text-neutral-300 underline p-0 disabled:opacity-50',
}

const sizeClasses: Record<Size, string> = {
  md: 'px-4 py-2 text-base rounded',
  sm: 'px-3 py-1.5 text-sm rounded',
}

const baseClasses =
  'inline-flex items-center justify-center font-medium transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap min-h-8 min-w-8'

const linkBaseClasses =
  'inline h-fit w-fit font-medium transition-colors cursor-pointer disabled:cursor-not-allowed'

const classes = computed(() => {
  const isLinkVariant = props.variant === 'link'
  return [
    isLinkVariant ? linkBaseClasses : baseClasses,
    isLinkVariant ? '' : sizeClasses[props.size],
    variantClasses[props.variant],
    props.fullWidth ? 'w-full' : '',
    attrs.class,
  ]
})

const buttonAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})
</script>
