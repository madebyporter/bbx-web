<template>
  <div class="flex flex-col gap-3 border border-neutral-700 rounded-sm bg-neutral-900/50 p-3">
    <!-- Current artwork -->
    <div
      v-if="showCurrent"
      class="flex items-center justify-between gap-3 pb-3 border-b border-neutral-800"
    >
      <div class="flex items-center gap-3 min-w-0">
        <a
          v-if="fullSizeHref"
          :href="fullSizeHref"
          target="_blank"
          rel="noopener noreferrer"
          class="size-16 rounded-sm overflow-hidden bg-neutral-800 shrink-0 block cursor-zoom-in hover:ring-2 hover:ring-amber-400/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          title="Open full size"
        >
          <video
            v-if="currentIsVideo && currentPreviewUrl"
            :src="currentPreviewUrl"
            autoplay
            muted
            loop
            playsinline
            class="size-full object-cover pointer-events-none"
          />
          <img
            v-else-if="currentPreviewUrl"
            :src="currentPreviewUrl"
            alt="Current artwork"
            class="size-full object-cover"
          />
          <ArtworkMedia
            v-else-if="resolvedCurrentPath"
            :path="resolvedCurrentPath"
            :provider="resolvedCurrentProvider"
            :entity-id="resolvedEntityId"
            :kind="resolvedKind"
            size-class="size-16"
            alt="Current artwork"
          />
        </a>
        <div
          v-else
          class="size-16 rounded-sm overflow-hidden bg-neutral-800 shrink-0"
        >
          <ArtworkMedia
            v-if="resolvedCurrentPath"
            :path="resolvedCurrentPath"
            :provider="resolvedCurrentProvider"
            :entity-id="resolvedEntityId"
            :kind="resolvedKind"
            size-class="size-16"
            alt="Current artwork"
          />
        </div>
        <div class="flex flex-col gap-0.5 min-w-0">
          <span class="text-sm text-neutral-300">{{ currentLabel }}</span>
          <span v-if="fileNameHint" class="text-xs text-amber-400 truncate">{{ fileNameHint }}</span>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          class="border border-neutral-700 hover:border-neutral-600 bg-neutral-900 text-neutral-200"
          :disabled="disabled || busy"
          @click="focusReplace"
        >
          Replace
        </Button>
        <Button
          type="button"
          variant="link"
          class="text-sm text-red-400 hover:text-red-300 no-underline"
          :disabled="disabled || busy"
          @click="clearArtwork"
        >
          Remove
        </Button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex flex-wrap gap-1">
      <Button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        variant="ghost"
        size="sm"
        class="border"
        :class="
          activeTab === tab.id
            ? 'border-amber-400/60 bg-amber-400/10 text-amber-300'
            : 'border-neutral-700 text-neutral-400 hover:text-neutral-200'
        "
        :disabled="disabled || busy"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </Button>
    </div>

    <!-- Browse -->
    <div v-if="activeTab === 'browse'" class="flex flex-col gap-2">
      <p v-if="libraryLoading" class="text-xs text-neutral-500">Loading artwork…</p>
      <p v-else-if="libraryItems.length === 0" class="text-xs text-neutral-500 py-4 text-center">
        No existing artwork yet. Upload or generate a cover.
      </p>
      <div
        v-else
        class="flex flex-row gap-2 overflow-x-auto no-scrollbar pb-1"
      >
        <button
          v-for="item in libraryItems"
          :key="item.path"
          type="button"
          class="relative size-16 shrink-0 rounded-sm overflow-hidden border bg-neutral-800 cursor-pointer disabled:opacity-50"
          :class="
            isReuseSelected(item.path)
              ? 'border-amber-400 ring-1 ring-amber-400/50'
              : 'border-neutral-700 hover:border-neutral-500'
          "
          :disabled="disabled || busy"
          :title="item.label"
          @click="selectReuse(item)"
        >
          <ArtworkMedia
            :path="item.path"
            :provider="item.provider"
            :entity-id="item.entityId"
            :kind="item.sourceKind"
            size-class="size-16"
            :alt="item.label"
          />
        </button>
      </div>
    </div>

    <!-- Generate -->
    <div v-else-if="activeTab === 'generate'" class="flex flex-col gap-2">
      <div
        class="flex flex-col gap-2 p-2.5 border border-neutral-700 hover:border-neutral-600 rounded-sm bg-neutral-900 focus-within:border-amber-400"
      >
        <textarea
          v-model="coverDirection"
          rows="4"
          :maxlength="COVER_DIRECTION_MAX"
          placeholder="Optional cover direction…"
          class="w-full bg-transparent text-neutral-200 placeholder-neutral-500 outline-none resize-y min-h-[96px]"
          :disabled="disabled || busy"
        />
        <div class="flex flex-wrap gap-1.5 pt-1 border-t border-neutral-800">
          <Button
            v-for="chip in COVER_DIRECTION_CHIPS"
            :key="chip"
            type="button"
            variant="ghost"
            size="sm"
            class="!h-7 !px-2 !text-xs border"
            :class="
              isCoverDirectionChipActive(coverDirection, chip)
                ? 'border-amber-400/60 bg-amber-400/10 text-amber-300'
                : 'border-neutral-700 text-neutral-400 hover:text-neutral-200'
            "
            :disabled="disabled || busy"
            @click="onToggleChip(chip)"
          >
            {{ chip }}
          </Button>
        </div>
      </div>
      <div v-if="generating" class="flex flex-col gap-1.5">
        <div class="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
          <div
            class="bg-amber-500 h-1.5 rounded-full transition-all duration-300 animate-pulse"
            :style="{ width: `${Math.max(generateProgress, 8)}%` }"
          />
        </div>
        <p class="text-xs text-amber-400">{{ generateProgressLabel }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          :disabled="disabled || busy || !canGenerate"
          @click="handleGenerate"
        >
          {{ generating ? 'Generating…' : 'Generate cover' }}
        </Button>
        <select
          v-if="coverModels.length"
          v-model="selectedCoverModel"
          class="select-field p-2 border border-neutral-700 hover:border-neutral-600 rounded-sm bg-neutral-900 text-neutral-200 text-sm outline-none focus:border-amber-400 cursor-pointer min-w-[11rem]"
          :disabled="disabled || busy || loadingCoverModels"
        >
          <option v-for="model in coverModels" :key="model.id" :value="model.id">
            {{ model.label }}
          </option>
        </select>
      </div>
      <p class="text-xs text-neutral-500">
        Uses title and artist{{ generateContext.genre || generateContext.mood ? ', plus genre/mood' : '' }}.
      </p>
    </div>

    <!-- Upload -->
    <div v-else class="flex flex-col gap-2">
      <input
        ref="fileInputRef"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov"
        class="hidden"
        :disabled="disabled || busy"
        @change="handleFileSelect"
      />
      <div class="flex items-center justify-between gap-2">
        <p class="text-xs text-neutral-500">
          JPG, PNG, WebP, GIF, MP4, MOV. Max 10MB, 1600x1600.
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          :disabled="disabled || busy"
          @click="fileInputRef?.click()"
        >
          Choose File
        </Button>
      </div>
    </div>

    <p v-if="errorMessage" class="text-xs text-red-500">{{ errorMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ArtworkMedia from '~/components/ArtworkMedia.vue'
import Button from '~/components/Button.vue'
import { useArtwork, isVideoArtwork, validateAndProcessArtwork } from '~/composables/useArtwork'
import { useArtworkLibrary } from '~/composables/useArtworkLibrary'
import { useAuthHeaders } from '~/composables/useAuthHeaders'
import {
  COVER_DIRECTION_CHIPS,
  COVER_DIRECTION_MAX,
  isCoverDirectionChipActive,
  toggleCoverDirectionChip,
} from '~/utils/coverDirection'
import type { ArtworkGenerateContext, ArtworkSelection } from '~/types/artworkSelection'
import type { StorageProvider } from '~/types/track'
import type { ArtworkKind } from '~/utils/artworkStorage'
import type { ArtworkLibraryItem } from '~/composables/useArtworkLibrary'

type TabId = 'browse' | 'generate' | 'upload'

const props = withDefaults(
  defineProps<{
    modelValue: ArtworkSelection
    kind: ArtworkKind
    currentPath?: string | null
    currentProvider?: StorageProvider | null
    currentEntityId?: number | null
    generateContext: ArtworkGenerateContext
    disabled?: boolean
  }>(),
  {
    currentPath: null,
    currentProvider: null,
    currentEntityId: null,
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: ArtworkSelection]
}>()

const coverDirection = defineModel<string>('coverDirection', { default: '' })

const { resolveArtworkUrlForEntity } = useArtwork()
const { items: libraryItems, loading: libraryLoading, loadArtworkLibrary } = useArtworkLibrary()

const tabs = [
  { id: 'browse' as const, label: 'Browse' },
  { id: 'generate' as const, label: 'Generate' },
  { id: 'upload' as const, label: 'Upload' },
]

const activeTab = ref<TabId>('upload')
const fileInputRef = ref<HTMLInputElement | null>(null)
const errorMessage = ref('')
const generating = ref(false)
const generateProgress = ref(0)
const generateProgressLabel = ref('Generating…')
const coverModels = ref<Array<{ id: string; label: string; hint?: string }>>([])
const selectedCoverModel = ref<string>('')
const loadingCoverModels = ref(false)
const resolvedStoredUrl = ref<string | null>(null)
const resolvedReuseUrl = ref<string | null>(null)

const busy = computed(() => generating.value)

const canGenerate = computed(() => {
  return Boolean(props.generateContext.title?.trim() && props.generateContext.artist?.trim())
})

const showCurrent = computed(() => {
  if (props.modelValue.kind === 'remove') return false
  if (props.modelValue.kind === 'file') return true
  if (props.modelValue.kind === 'reuse') return true
  return Boolean(props.currentPath)
})

const currentLabel = computed(() => {
  if (props.modelValue.kind === 'file') return 'New artwork'
  if (props.modelValue.kind === 'reuse') return 'Selected artwork'
  return 'Current artwork'
})

const fileNameHint = computed(() => {
  if (props.modelValue.kind === 'file') return props.modelValue.file.name
  return ''
})

const currentPreviewUrl = computed(() => {
  if (props.modelValue.kind === 'file') return props.modelValue.previewUrl
  if (props.modelValue.kind === 'reuse') return resolvedReuseUrl.value
  if (props.modelValue.kind === 'unchanged') return resolvedStoredUrl.value
  return null
})

const fullSizeHref = computed(() => currentPreviewUrl.value || null)

const currentIsVideo = computed(() => {
  if (props.modelValue.kind === 'file') return props.modelValue.isVideo
  if (props.modelValue.kind === 'reuse') return isVideoArtwork(props.modelValue.path)
  if (props.modelValue.kind === 'unchanged') return isVideoArtwork(props.currentPath)
  return false
})

const resolvedCurrentPath = computed(() => {
  if (props.modelValue.kind === 'reuse') return props.modelValue.path
  if (props.modelValue.kind === 'unchanged') return props.currentPath
  return null
})

const resolvedCurrentProvider = computed(() => {
  if (props.modelValue.kind === 'reuse') return props.modelValue.provider
  if (props.modelValue.kind === 'unchanged') return props.currentProvider
  return null
})

const reuseSelection = computed(() =>
  props.modelValue.kind === 'reuse' ? props.modelValue : null,
)

const resolvedEntityId = computed(() => {
  if (reuseSelection.value) {
    const match = libraryItems.value.find((i) => i.path === reuseSelection.value!.path)
    return match?.entityId ?? props.currentEntityId
  }
  return props.currentEntityId
})

const resolvedKind = computed<ArtworkKind>(() => {
  if (reuseSelection.value) {
    const match = libraryItems.value.find((i) => i.path === reuseSelection.value!.path)
    return match?.sourceKind ?? props.kind
  }
  return props.kind
})

const loadStoredPreview = async () => {
  if (!props.currentPath || props.modelValue.kind !== 'unchanged') {
    resolvedStoredUrl.value = null
    return
  }
  resolvedStoredUrl.value = await resolveArtworkUrlForEntity(
    {
      id: props.currentEntityId ?? undefined,
      artwork_path: props.currentPath,
      artwork_provider: props.currentProvider,
    },
    props.kind,
  )
}

const loadReusePreview = async () => {
  if (props.modelValue.kind !== 'reuse') {
    resolvedReuseUrl.value = null
    return
  }
  resolvedReuseUrl.value = await resolveArtworkUrlForEntity(
    {
      id: resolvedEntityId.value ?? undefined,
      artwork_path: props.modelValue.path,
      artwork_provider: props.modelValue.provider,
    },
    resolvedKind.value,
  )
}

const isReuseSelected = (path: string) => {
  return props.modelValue.kind === 'reuse' && props.modelValue.path === path
}

const selectReuse = (item: ArtworkLibraryItem) => {
  errorMessage.value = ''
  emit('update:modelValue', {
    kind: 'reuse',
    path: item.path,
    provider: item.provider,
  })
}

const clearArtwork = () => {
  errorMessage.value = ''
  emit('update:modelValue', { kind: 'remove' })
}

const focusReplace = () => {
  activeTab.value = libraryItems.value.length > 0 ? 'browse' : 'upload'
}

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const { file: processedFile, preview } = await validateAndProcessArtwork(file)
    errorMessage.value = ''
    emit('update:modelValue', {
      kind: 'file',
      file: processedFile,
      previewUrl: preview,
      isVideo: isVideoArtwork(processedFile.name),
    })
  } catch (err: any) {
    errorMessage.value = err.message || 'Invalid artwork file'
  }

  if (target) target.value = ''
}

const onToggleChip = (chip: string) => {
  coverDirection.value = toggleCoverDirectionChip(coverDirection.value || '', chip).slice(
    0,
    COVER_DIRECTION_MAX,
  )
}

const loadCoverModels = async () => {
  loadingCoverModels.value = true
  try {
    const headers = await useAuthHeaders()
    const data = await $fetch<{
      models: Array<{ id: string; label: string; hint?: string }>
      defaultModelId: string | null
    }>('/api/integrations/cover/models', { headers })
    coverModels.value = data.models || []
    selectedCoverModel.value = data.defaultModelId || data.models?.[0]?.id || ''
  } catch (err) {
    console.warn('Failed to load cover models:', err)
    coverModels.value = []
  } finally {
    loadingCoverModels.value = false
  }
}

const handleGenerate = async () => {
  if (!canGenerate.value || generating.value) return

  generating.value = true
  generateProgress.value = 12
  generateProgressLabel.value = 'Starting cover job…'
  errorMessage.value = ''

  const progressTimer = window.setInterval(() => {
    if (generateProgress.value < 88) {
      generateProgress.value += 4
    }
  }, 2000)

  try {
    const { generateCoverViaJob } = await import('~/utils/coverGenerateClient')
    generateProgressLabel.value = 'Generating cover…'
    const result = await generateCoverViaJob({
      title: props.generateContext.title.trim(),
      artist: props.generateContext.artist.trim(),
      genre: props.generateContext.genre?.trim() || undefined,
      mood: props.generateContext.mood?.trim() || undefined,
      direction: coverDirection.value.trim().slice(0, COVER_DIRECTION_MAX) || undefined,
      model: selectedCoverModel.value || undefined,
    })

    generateProgress.value = 92
    generateProgressLabel.value = 'Processing…'

    const binary = atob(result.base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const blob = new Blob([bytes], { type: result.mimeType || 'image/png' })
    const file = new File([blob], result.filename || 'cover-ai.png', {
      type: result.mimeType || 'image/png',
    })
    const { file: processedFile, preview } = await validateAndProcessArtwork(file)

    generateProgress.value = 100
    emit('update:modelValue', {
      kind: 'file',
      file: processedFile,
      previewUrl: preview,
      isVideo: false,
    })
  } catch (err: any) {
    errorMessage.value =
      err?.data?.statusMessage || err?.message || 'Failed to generate cover'
  } finally {
    window.clearInterval(progressTimer)
    generating.value = false
    generateProgress.value = 0
    generateProgressLabel.value = 'Generating…'
  }
}

watch(
  () => [props.currentPath, props.currentProvider, props.currentEntityId, props.modelValue.kind] as const,
  () => {
    void loadStoredPreview()
  },
  { immediate: true },
)

watch(
  () =>
    [
      props.modelValue.kind,
      props.modelValue.kind === 'reuse' ? props.modelValue.path : null,
      props.modelValue.kind === 'reuse' ? props.modelValue.provider : null,
      resolvedEntityId.value,
      resolvedKind.value,
    ] as const,
  () => {
    void loadReusePreview()
  },
  { immediate: true },
)

watch(
  () => libraryItems.value.length,
  (len) => {
    if (props.modelValue.kind === 'unchanged' && !props.currentPath && len > 0 && activeTab.value === 'upload') {
      activeTab.value = 'browse'
    }
  },
)

onMounted(async () => {
  await Promise.all([loadArtworkLibrary(), loadCoverModels()])
  if (!props.currentPath && libraryItems.value.length > 0) {
    activeTab.value = 'browse'
  }
})
</script>
