<template>
  <MasterDrawer ref="drawerRef" :show="props.show" @update:show="handleDrawerUpdate">
    <template #header>
      <div class="flex flex-col gap-0.5 min-w-0">
        <h2 class="text-xl truncate">Generate video</h2>
        <p v-if="props.track?.title" class="text-sm text-neutral-500 font-normal truncate">
          {{ props.track.title }}
        </p>
      </div>
    </template>

    <div class="flex flex-col gap-6 h-full">
      <!-- Cover art -->
      <section class="flex flex-col gap-3 shrink-0">
        <h3 class="text-sm font-medium text-neutral-200">Cover art</h3>
        <div class="flex flex-col gap-3">
          <div
            v-if="coverPreview"
            class="w-full max-w-[240px] aspect-square rounded-md overflow-hidden border border-neutral-800 bg-neutral-950"
          >
            <img :src="coverPreview" alt="Cover preview" class="w-full h-full object-cover" />
          </div>
          <div
            v-else
            class="w-full max-w-[240px] aspect-square rounded-md border border-dashed border-neutral-700 bg-neutral-950 flex items-center justify-center text-sm text-neutral-500 text-center p-4"
          >
            {{ coverPlaceholderText }}
          </div>

          <input
            ref="coverInputRef"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            class="hidden"
            @change="handleCoverUpload"
          />
          <Button variant="secondary" size="sm" class="self-start" @click="coverInputRef?.click()">
            {{ coverPreview ? 'Replace image' : 'Upload custom image' }}
          </Button>
          <p v-if="coverError" class="text-xs text-red-500">{{ coverError }}</p>
          <p class="text-xs text-neutral-500">
            PNG, JPG, WebP, or GIF up to 1600×1600. Uses track artwork when available.
          </p>
        </div>
      </section>

      <!-- Audio -->
      <section class="flex flex-col gap-2 shrink-0 border-t border-neutral-800 pt-4">
        <h3 class="text-sm font-medium text-neutral-200">Audio</h3>
        <p class="text-sm text-neutral-300">{{ props.track?.title || 'Track' }}</p>
        <p class="text-xs text-neutral-500">
          Duration: {{ formatDuration(props.track?.duration || 0) }} · Uses the track audio file
        </p>
      </section>

      <!-- Generate -->
      <section class="flex flex-col gap-3 shrink-0 border-t border-neutral-800 pt-4">
        <Button :disabled="!canGenerate || isGenerating" @click="handleGenerate">
          {{ isGenerating ? 'Generating...' : 'Generate video' }}
        </Button>

        <p v-if="encoderLoading && !isGenerating" class="text-xs text-neutral-500">
          Preparing encoder in the background (one-time download, ~31MB)...
        </p>
        <p v-else-if="encoderReady && !isGenerating && !generationMessage" class="text-xs text-neutral-500">
          Encoder ready. Browser encoding is slower than desktop apps — a 2–3 min track usually takes 1–3 min.
        </p>

        <div v-if="isGenerating && generationMessage" class="flex flex-col gap-2">
          <p class="text-sm text-neutral-400">{{ generationMessage }}</p>
          <div class="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div
              class="h-full bg-amber-500 transition-all duration-300"
              :class="generationProgress > 0 ? '' : 'w-[8%] animate-pulse'"
              :style="generationProgress > 0 ? { width: `${generationProgress}%` } : undefined"
            />
          </div>
        </div>

        <p v-if="generationError" class="text-sm text-red-500">{{ generationError }}</p>
      </section>

      <!-- Preview + export -->
      <section
        v-if="latestResult"
        class="flex flex-col gap-3 shrink-0 border-t border-neutral-800 pt-4"
      >
        <h3 class="text-sm font-medium text-neutral-200">Preview</h3>
        <video
          ref="previewVideoRef"
          :src="latestPreviewUrl || undefined"
          controls
          class="w-full max-w-full rounded-md border border-neutral-800 bg-black"
        />
        <Button variant="secondary" size="sm" class="self-start" @click="downloadBlob(latestResult.blob, latestResult.filename)">
          Download MP4
        </Button>
      </section>

      <!-- History -->
      <section class="flex flex-col gap-3 grow min-h-0 border-t border-neutral-800 pt-4">
        <h3 class="text-sm font-medium text-neutral-200">History</h3>
        <p class="text-xs text-neutral-500">Stored on this device until you clear site data.</p>

        <div v-if="historyLoading" class="text-sm text-neutral-400">Loading history...</div>
        <div v-else-if="history.length === 0" class="text-sm text-neutral-500">
          No videos generated for this track yet.
        </div>
        <div v-else class="flex flex-col gap-2 overflow-y-auto no-scrollbar">
          <div
            v-for="item in history"
            :key="item.id"
            class="flex flex-row items-center justify-between gap-3 p-3 border border-neutral-800 rounded-md"
          >
            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="text-sm text-neutral-200 truncate">{{ item.filename }}</span>
              <span class="text-xs text-neutral-500">
                {{ formatHistoryDate(item.createdAt) }} · {{ formatFileSize(item.sizeBytes) }}
              </span>
            </div>
            <div class="flex flex-row gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                class="!p-1.5 text-neutral-500 hover:text-amber-300"
                title="Download"
                @click="downloadBlob(item.blob, item.filename)"
              >
                Download
              </Button>
              <Button
                variant="ghost"
                size="sm"
                class="!p-1.5 text-neutral-500 hover:text-red-300"
                title="Delete"
                :disabled="deletingId === item.id"
                @click="handleDeleteHistory(item.id)"
              >
                {{ deletingId === item.id ? '...' : 'Delete' }}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </MasterDrawer>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import MasterDrawer from '~/components/MasterDrawer.vue'
import Button from '~/components/Button.vue'
import { isVideoArtwork, useArtwork } from '~/composables/useArtwork'
import {
  isTrackVideoEncoderLoaded,
  preloadTrackVideoEncoder,
  terminateTrackVideoGenerator,
  useTrackVideoGenerator,
  type TrackVideoGenerationProgress,
} from '~/composables/useTrackVideoGenerator.client'
import {
  deleteExport,
  getExportsForTrack,
  saveExport,
  type TrackVideoExport,
} from '~/composables/useTrackVideoHistory'
import { useSupabase } from '~/utils/supabase'
import { useToast } from '~/composables/useToast'
import type { Track } from '~/types/track'

const props = defineProps<{
  show: boolean
  track: Track | null
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const { getArtworkUrl, validateAndProcessArtwork } = useArtwork()
const { generateTrackVideo, isGenerating } = useTrackVideoGenerator()
const { supabase } = useSupabase()
const { showError, showSuccess } = useToast()

const drawerRef = ref<InstanceType<typeof MasterDrawer> | null>(null)
const coverInputRef = ref<HTMLInputElement | null>(null)
const previewVideoRef = ref<HTMLVideoElement | null>(null)

const coverPreview = ref<string | null>(null)
const coverFile = ref<File | null>(null)
const coverError = ref<string | null>(null)
const usingTrackArtwork = ref(false)

const generationMessage = ref('')
const generationProgress = ref(0)
const generationError = ref<string | null>(null)
const latestResult = ref<{ blob: Blob; filename: string } | null>(null)
const latestPreviewUrl = ref<string | null>(null)

const history = ref<TrackVideoExport[]>([])
const historyLoading = ref(false)
const deletingId = ref<string | null>(null)
const encoderReady = ref(false)
const encoderLoading = ref(false)

let abortController: AbortController | null = null
let previewObjectUrl: string | null = null

const canUseTrackArtwork = computed(() => {
  if (!props.track?.artwork_path) return false
  return !isVideoArtwork(props.track.artwork_path)
})

const canGenerate = computed(() => {
  return !!(props.track?.storage_path && (coverFile.value || canUseTrackArtwork.value))
})

const coverPlaceholderText = computed(() => {
  if (props.track?.artwork_path && isVideoArtwork(props.track.artwork_path)) {
    return 'Video artwork cannot be used. Upload a still image.'
  }
  if (!props.track?.artwork_path) {
    return 'No artwork on this track. Upload an image to continue.'
  }
  return 'Loading artwork...'
})

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatHistoryDate(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function revokePreviewUrl() {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl)
    previewObjectUrl = null
  }
  latestPreviewUrl.value = null
}

function setPreviewBlob(blob: Blob) {
  revokePreviewUrl()
  previewObjectUrl = URL.createObjectURL(blob)
  latestPreviewUrl.value = previewObjectUrl
}

function resetGenerationState() {
  generationMessage.value = ''
  generationProgress.value = 0
  generationError.value = null
}

function resetDrawerState() {
  abortController?.abort()
  abortController = null

  coverPreview.value = null
  coverFile.value = null
  coverError.value = null
  usingTrackArtwork.value = false

  resetGenerationState()
  encoderLoading.value = false
  latestResult.value = null
  revokePreviewUrl()

  if (coverInputRef.value) {
    coverInputRef.value.value = ''
  }
}

async function loadTrackArtwork() {
  if (!props.track?.artwork_path || isVideoArtwork(props.track.artwork_path)) {
    coverPreview.value = null
    coverFile.value = null
    usingTrackArtwork.value = false
    return
  }

  const url = getArtworkUrl(props.track.artwork_path)
  if (!url) return

  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Failed to load track artwork')
    const blob = await response.blob()
    const ext = props.track.artwork_path.split('.').pop()?.toLowerCase() || 'jpg'
    const mimeType = blob.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`
    const file = new File([blob], `cover.${ext}`, { type: mimeType })
    const { file: processedFile, preview } = await validateAndProcessArtwork(file)
    coverFile.value = processedFile
    coverPreview.value = preview
    usingTrackArtwork.value = true
    coverError.value = null
  } catch (err: any) {
    coverPreview.value = null
    coverFile.value = null
    usingTrackArtwork.value = false
    coverError.value = err.message || 'Could not load track artwork'
  }
}

async function loadHistory() {
  if (!props.track?.id) {
    history.value = []
    return
  }

  historyLoading.value = true
  try {
    history.value = await getExportsForTrack(props.track.id)
  } catch {
    showError('Failed to load video history')
  } finally {
    historyLoading.value = false
  }
}

async function preloadEncoder() {
  if (encoderReady.value || encoderLoading.value) return

  if (isTrackVideoEncoderLoaded()) {
    encoderReady.value = true
    return
  }

  encoderLoading.value = true
  generationError.value = null
  try {
    await preloadTrackVideoEncoder()
    encoderReady.value = true
  } catch (err: any) {
    generationError.value = err?.message || 'Failed to load encoder'
  } finally {
    encoderLoading.value = false
  }
}

async function initializeDrawer() {
  resetDrawerState()
  encoderReady.value = isTrackVideoEncoderLoaded()
  await Promise.all([loadTrackArtwork(), loadHistory()])
  if (!encoderReady.value) {
    void preloadEncoder()
  }
}

watch(
  () => [props.show, props.track?.id] as const,
  ([show, trackId]) => {
    if (show && trackId) {
      initializeDrawer()
    } else if (!show) {
      resetDrawerState()
      encoderReady.value = isTrackVideoEncoderLoaded()
    }
  }
)

async function handleCoverUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const { file: processedFile, preview } = await validateAndProcessArtwork(file)
    coverFile.value = processedFile
    coverPreview.value = preview
    usingTrackArtwork.value = false
    coverError.value = null
  } catch (err: any) {
    coverError.value = err.message || 'Invalid image file'
    if (!usingTrackArtwork.value) {
      coverFile.value = null
      coverPreview.value = null
    }
  } finally {
    input.value = ''
  }
}

function handleProgress(progress: TrackVideoGenerationProgress) {
  generationMessage.value = progress.message
  generationProgress.value = progress.progress
}

async function handleGenerate() {
  if (!props.track?.storage_path || !coverFile.value || isGenerating.value) return

  resetGenerationState()
  abortController = new AbortController()

  try {
    if (!supabase) throw new Error('Storage is not available')

    const { data: audioData, error: downloadError } = await supabase.storage
      .from('sounds')
      .download(props.track.storage_path)

    if (downloadError) throw downloadError
    if (!audioData) throw new Error('Failed to download audio file')

    const result = await generateTrackVideo({
      coverFile: coverFile.value,
      audioBlob: audioData,
      audioStoragePath: props.track.storage_path,
      trackTitle: props.track.title,
      audioDurationSeconds: props.track.duration || 0,
      onProgress: handleProgress,
      signal: abortController.signal,
    })

    latestResult.value = result
    setPreviewBlob(result.blob)

    const exportRecord: TrackVideoExport = {
      id: crypto.randomUUID(),
      trackId: props.track.id,
      trackTitle: props.track.title,
      createdAt: new Date().toISOString(),
      filename: result.filename,
      sizeBytes: result.blob.size,
      blob: result.blob,
    }

    await saveExport(exportRecord)
    await loadHistory()
    showSuccess('Video generated')
  } catch (err: any) {
    if (err?.name === 'AbortError') return
    const message = err.message || 'Failed to generate video'
    generationError.value = message
    showError(message)
  } finally {
    abortController = null
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

async function handleDeleteHistory(id: string) {
  deletingId.value = id
  try {
    await deleteExport(id)
    history.value = history.value.filter((item) => item.id !== id)
    showSuccess('Video removed from history')
  } catch {
    showError('Failed to delete video')
  } finally {
    deletingId.value = null
  }
}

function handleDrawerUpdate(value: boolean) {
  if (!value) {
    abortController?.abort()
    abortController = null
  }
  emit('update:show', value)
}

onUnmounted(() => {
  abortController?.abort()
  terminateTrackVideoGenerator()
  revokePreviewUrl()
})
</script>
