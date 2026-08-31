<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="classes"
    v-bind="buttonAttrs"
  >
    <template v-if="variant === 'art'">
      <ArtworkMedia
        v-if="useEntityArtwork"
        :path="artworkPath"
        :provider="artworkProvider"
        :entity-id="artworkEntityId"
        :kind="artworkKind!"
        size-class="absolute inset-0 size-full"
        wrapper-class="absolute inset-0"
        class="absolute inset-0"
        :alt="''"
      />
      <template v-else>
        <video
          v-if="artworkUrl && artworkIsVideo"
          :src="artworkUrl"
          autoplay
          muted
          loop
          playsinline
          :class="mediaClasses"
          @loadeddata="handleArtworkLoaded"
          @error="handleArtworkError"
        />
        <img
          v-else-if="artworkUrl"
          :src="artworkUrl"
          alt=""
          :class="mediaClasses"
          @load="handleArtworkLoaded"
          @error="handleArtworkError"
        />
      </template>
      <span
        v-if="showArtOverlay"
        class="absolute inset-0 bg-black/30 transition-colors group-hover:bg-black/40 pointer-events-none"
      />
    </template>
    <span class="relative z-10 inline-flex items-center justify-center">
      <slot />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed, ref, useAttrs, watch } from 'vue'
import ArtworkMedia from '~/components/ArtworkMedia.vue'
import { useResolvedArtworkUrl } from '~/composables/useArtworkUrlCache'
import { normalizeArtworkProvider, type ArtworkKind } from '~/utils/artworkStorage'

type Variant = 'filled' | 'ghost' | 'art'
type ButtonType = 'button' | 'submit' | 'reset'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    type?: ButtonType
    disabled?: boolean
    artworkUrl?: string | null
    artworkIsVideo?: boolean
    artworkPath?: string | null
    artworkProvider?: string | null
    artworkEntityId?: number | null
    artworkKind?: ArtworkKind | null
  }>(),
  {
    variant: 'ghost',
    type: 'button',
    disabled: false,
    artworkUrl: null,
    artworkIsVideo: false,
    artworkPath: null,
    artworkProvider: null,
    artworkEntityId: null,
    artworkKind: null,
  }
)

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const artworkLoaded = ref(false)

const useEntityArtwork = computed(
  () =>
    props.variant === 'art' &&
    !props.artworkUrl &&
    !!props.artworkPath &&
    !!props.artworkEntityId &&
    !!props.artworkKind,
)

const entity = computed(() => ({
  id: props.artworkEntityId ?? undefined,
  artwork_path: props.artworkPath,
  artwork_provider: normalizeArtworkProvider(props.artworkProvider),
}))

const { url: entityArtworkUrl } = useResolvedArtworkUrl(
  entity,
  props.artworkKind || 'track',
)

watch(
  () => props.artworkUrl,
  () => {
    artworkLoaded.value = false
  }
)

watch(entityArtworkUrl, (value) => {
  artworkLoaded.value = !!value
})

const handleArtworkLoaded = () => {
  artworkLoaded.value = true
}

const handleArtworkError = () => {
  artworkLoaded.value = false
}

const variantClasses: Record<Exclude<Variant, 'art'>, string> = {
  filled:
    'bg-white text-black hover:bg-neutral-100 disabled:opacity-30',
  ghost:
    'bg-transparent text-neutral-400 hover:bg-white/5 hover:text-white disabled:opacity-30',
}

const baseClasses =
  'inline-flex items-center justify-center shrink-0 size-10 rounded-sm transition-colors cursor-pointer disabled:cursor-not-allowed'

const hasArtwork = computed(() => {
  if (props.variant !== 'art') return false
  if (props.artworkUrl) return true
  if (useEntityArtwork.value) return !!entityArtworkUrl.value || !!props.artworkPath
  return false
})

const showArtOverlay = computed(() => {
  if (useEntityArtwork.value) {
    return !!entityArtworkUrl.value
  }
  return !!props.artworkUrl && artworkLoaded.value
})

const mediaClasses = computed(() => [
  'absolute inset-0 size-full object-cover pointer-events-none transition-opacity duration-200',
  artworkLoaded.value ? 'opacity-100' : 'opacity-0',
])

const classes = computed(() => {
  if (props.variant === 'art') {
    const artClasses = hasArtwork.value && !artworkLoaded.value && !useEntityArtwork.value
      ? 'relative overflow-hidden group text-white bg-neutral-700'
      : hasArtwork.value
        ? 'relative overflow-hidden group text-white'
        : 'relative overflow-hidden group text-white bg-transparent'

    return [baseClasses, artClasses, attrs.class]
  }

  return [
    baseClasses,
    variantClasses[props.variant],
    attrs.class,
  ]
})

const buttonAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})
</script>
