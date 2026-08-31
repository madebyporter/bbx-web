<template>
  <div
    :class="[
      sizeClass,
      'rounded-sm overflow-hidden bg-neutral-700 shrink-0',
      wrapperClass,
    ]"
  >
    <video
      v-if="resolvedUrl && isVideo"
      :src="resolvedUrl"
      autoplay
      muted
      loop
      playsinline
      class="size-full object-cover"
    />
    <img
      v-else-if="resolvedUrl"
      :src="resolvedUrl"
      :alt="alt"
      class="size-full object-cover"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { isVideoArtwork } from '~/composables/useArtwork'
import { useResolvedArtworkUrl } from '~/composables/useArtworkUrlCache'
import { normalizeArtworkProvider, type ArtworkEntity, type ArtworkKind } from '~/utils/artworkStorage'

const props = withDefaults(
  defineProps<{
    path?: string | null
    provider?: string | null
    entityId?: number | null
    kind: ArtworkKind
    sizeClass?: string
    alt?: string
    wrapperClass?: string
    previewUrl?: string | null
  }>(),
  {
    path: null,
    provider: null,
    entityId: null,
    sizeClass: 'size-10',
    alt: '',
    wrapperClass: '',
    previewUrl: null,
  },
)

const entity = computed<ArtworkEntity>(() => ({
  id: props.entityId ?? undefined,
  artwork_path: props.path,
  artwork_provider: normalizeArtworkProvider(props.provider),
}))

const { url: resolvedFromStorage } = useResolvedArtworkUrl(entity, props.kind)

const resolvedUrl = computed(() => {
  if (props.previewUrl) return props.previewUrl
  if (normalizeArtworkProvider(props.provider) === 'supabase' && props.path) {
    const config = useRuntimeConfig()
    return `${config.public.supabaseUrl}/storage/v1/object/public/artwork/${props.path}`
  }
  return resolvedFromStorage.value
})

const isVideo = computed(() => {
  if (props.previewUrl && props.path) {
    return isVideoArtwork(props.path)
  }
  return isVideoArtwork(props.path)
})
</script>
