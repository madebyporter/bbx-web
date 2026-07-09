<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="classes"
    v-bind="buttonAttrs"
  >
    <template v-if="variant === 'art' && artworkUrl">
      <video
        v-if="artworkIsVideo"
        :src="artworkUrl"
        autoplay
        muted
        loop
        playsinline
        class="absolute inset-0 size-full object-cover pointer-events-none"
      />
      <img
        v-else
        :src="artworkUrl"
        alt=""
        class="absolute inset-0 size-full object-cover pointer-events-none"
      />
      <span
        class="absolute inset-0 bg-black/30 transition-colors group-hover:bg-black/40 pointer-events-none"
      />
    </template>
    <span class="relative z-10 inline-flex items-center justify-center">
      <slot />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

type Variant = 'filled' | 'ghost' | 'art'
type ButtonType = 'button' | 'submit' | 'reset'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    type?: ButtonType
    disabled?: boolean
    artworkUrl?: string | null
    artworkIsVideo?: boolean
  }>(),
  {
    variant: 'ghost',
    type: 'button',
    disabled: false,
    artworkUrl: null,
    artworkIsVideo: false,
  }
)

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const variantClasses: Record<Exclude<Variant, 'art'>, string> = {
  filled:
    'bg-white text-black hover:bg-neutral-100 disabled:opacity-30',
  ghost:
    'bg-transparent text-neutral-400 hover:bg-white/5 hover:text-white disabled:opacity-30',
}

const baseClasses =
  'inline-flex items-center justify-center shrink-0 size-10 rounded-sm transition-colors cursor-pointer disabled:cursor-not-allowed'

const classes = computed(() => {
  const hasArtwork = props.variant === 'art' && props.artworkUrl

  return [
    baseClasses,
    hasArtwork
      ? 'relative overflow-hidden group text-white'
      : variantClasses[props.variant === 'art' ? 'ghost' : props.variant],
    attrs.class,
  ]
})

const buttonAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})
</script>
