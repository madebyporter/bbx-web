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

    <div class="flex flex-col gap-4 h-full">
      <!-- Cover art -->
      <section class="flex flex-col gap-3 shrink-0">
        <h3 class="text-sm font-medium text-neutral-200">Cover art</h3>
        <div class="flex flex-col gap-3">
          <div
            v-if="coverPreview"
            class="w-full max-w-[240px] rounded-md overflow-hidden border border-neutral-800 flex items-center justify-center"
            :class="previewAspectClass"
            :style="previewBackgroundStyle"
          >
            <div class="w-full h-full flex items-center justify-center" :style="previewCoverWrapperStyle">
              <img
                :src="coverPreview"
                alt="Cover preview"
                class="w-full h-full"
                :class="selectedDimension === 'square' ? 'object-contain' : 'object-cover'"
              />
            </div>
          </div>
          <div
            v-else
            class="w-full max-w-[240px] rounded-md border border-dashed border-neutral-700 bg-neutral-950 flex items-center justify-center text-sm text-neutral-500 text-center p-4"
            :class="previewAspectClass"
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

          <div v-if="!coverFile" class="flex flex-col gap-3">
            <div class="flex flex-col gap-1.5">
              <label for="cover-direction" class="text-sm font-medium text-neutral-200">Direction</label>
              <textarea
                id="cover-direction"
                v-model="coverDirection"
                rows="8"
                :maxlength="COVER_DIRECTION_MAX"
                placeholder="e.g. neon bounce energy, city night, bold shapes…"
                class="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500 resize-y min-h-[180px]"
                :disabled="generatingCover || detectingMoods || isGenerating"
              />
              <p class="text-xs text-neutral-500">
                Optional album-art direction. Prefer scenes/mood over body or pose descriptions — OpenAI may block sexualized prompts.
              </p>
            </div>

            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-medium text-neutral-200">Moods</p>
                <Button
                  variant="ghost"
                  size="sm"
                  :disabled="detectingMoods || generatingCover || isGenerating || !props.track?.storage_path"
                  @click="handleDetectMoods"
                >
                  {{ detectingMoods ? 'Detecting…' : 'Detect moods' }}
                </Button>
              </div>
              <div class="flex flex-wrap gap-2">
                <label
                  v-for="mood in BEATBOX_MOOD_TAGS"
                  :key="mood"
                  class="cursor-pointer"
                >
                  <input v-model="selectedMoods" type="checkbox" :value="mood" class="hidden" />
                  <span :class="selectedMoods.includes(mood) ? 'tag-active' : 'tag'">
                    {{ mood }}
                  </span>
                </label>
              </div>
              <p v-if="moodDetectError" class="text-xs text-red-500">{{ moodDetectError }}</p>
              <p class="text-xs text-neutral-500">
                Toggle tags or detect from the track audio. Used for cover generation.
              </p>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" @click="coverInputRef?.click()">
              {{ coverPreview ? 'Replace image' : 'Upload custom image' }}
            </Button>
            <Button
              v-if="!coverFile"
              variant="secondary"
              size="sm"
              :disabled="generatingCover || detectingMoods || isGenerating"
              @click="handleGenerateCover"
            >
              {{ generatingCover ? 'Generating cover…' : 'Generate cover' }}
            </Button>
          </div>
          <p v-if="coverError" class="text-xs text-red-500">{{ coverError }}</p>
          <p class="text-xs text-neutral-500">
            PNG, JPG, WebP, or GIF up to 1600×1600. Uses track artwork when available, or generate one with AI.
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
        <div class="flex flex-col gap-2">
          <label for="video-dimension" class="text-sm font-medium text-neutral-200">Dimensions</label>
          <select
            id="video-dimension"
            v-model="selectedDimension"
            :disabled="isGenerating"
            class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200 outline-none focus:border-amber-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option
              v-for="option in TRACK_VIDEO_DIMENSION_OPTIONS"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <p class="text-xs text-neutral-500">{{ selectedDimensionDescription }} · {{ outputSizeLabel }}</p>
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-sm font-medium text-neutral-200">Background</span>
          <div class="flex flex-row flex-wrap items-center gap-3">
            <button
              v-for="preset in TRACK_VIDEO_BACKGROUND_PRESETS"
              :key="preset.id"
              type="button"
              :disabled="isGenerating"
              class="relative size-8 shrink-0 rounded-full border border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
              :class="preset.id === 'white' ? 'border-neutral-500' : ''"
              :style="{ backgroundColor: preset.color }"
              :title="preset.label"
              :aria-label="`${preset.label} background`"
              :aria-pressed="selectedBackgroundPreset === preset.id"
              @click="selectBackgroundPreset(preset.id)"
            >
              <span
                v-if="selectedBackgroundPreset === preset.id"
                class="absolute inset-1 flex items-center justify-center rounded-full bg-black"
              >
                <svg class="size-3 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </span>
            </button>

            <button
              type="button"
              :disabled="isGenerating"
              class="relative size-8 shrink-0 rounded-full border border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              :style="
                selectedBackgroundPreset === 'custom'
                  ? { backgroundColor: customBackgroundColor }
                  : undefined
              "
              title="Custom color"
              aria-label="Custom background color"
              :aria-pressed="selectedBackgroundPreset === 'custom'"
              @click="openCustomBackgroundPicker"
            >
              <span
                v-if="selectedBackgroundPreset !== 'custom'"
                class="absolute inset-0 rounded-full bg-[conic-gradient(#E52800,#FBBF24,#FFFFFF,#000000,#E52800)]"
                aria-hidden="true"
              />
              <span
                v-if="selectedBackgroundPreset === 'custom'"
                class="absolute inset-1 flex items-center justify-center rounded-full bg-black"
              >
                <svg class="size-3 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </span>
            </button>

            <input
              ref="customBackgroundInputRef"
              type="color"
              class="sr-only"
              :value="customBackgroundColor"
              :disabled="isGenerating"
              @input="handleCustomBackgroundInput"
            />
          </div>
          <p class="text-xs text-neutral-500">Beatbox presets or pick a custom color.</p>
        </div>

        <div class="flex flex-col gap-2">
          <label for="video-padding" class="text-sm font-medium text-neutral-200">Padding (px)</label>
          <input
            id="video-padding"
            type="text"
            inputmode="numeric"
            :value="coverPaddingPx"
            placeholder="0"
            :disabled="isGenerating"
            class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200 placeholder-neutral-500 outline-none focus:border-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
            @input="handlePaddingInput"
            @focus="handlePaddingFocus"
          />
          <p class="text-xs text-neutral-500">
            Shrinks cover art inside the frame. Video size stays the same.
          </p>
        </div>

        <div class="flex flex-col gap-2">
          <label for="video-quality" class="text-sm font-medium text-neutral-200">Quality</label>
          <select
            id="video-quality"
            v-model="selectedQuality"
            :disabled="isGenerating"
            class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200 outline-none focus:border-amber-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option
              v-for="option in TRACK_VIDEO_QUALITY_OPTIONS"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <p class="text-xs text-neutral-500">{{ selectedQualityDescription }}</p>
        </div>

        <p v-if="encoderLoading && !isGenerating && !generationMessage" class="text-xs text-neutral-500">
          Preparing encoder in the background (one-time download, ~31MB)...
        </p>
        <p v-else-if="encoderReady && !isGenerating && !generationMessage" class="text-xs text-neutral-500">
          Encoder ready. Browser encoding is slower than desktop apps — a 2–3 min track usually takes 1–3 min.
        </p>

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
        <div class="flex flex-row flex-wrap gap-2 items-center">
          <Button
            variant="secondary"
            size="sm"
            @click="downloadBlob(latestResult.blob, latestResult.filename)"
          >
            Download MP4
          </Button>
          <Button
            variant="secondary"
            size="sm"
            :disabled="savingCloudVideo"
            @click="handleSaveCloudVideo"
          >
            {{ saveCloudVideoLabel }}
          </Button>
        </div>
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

    <template #footer>
      <div class="flex flex-col gap-2">
        <Button :disabled="!canGenerate || isGenerating" @click="handleGenerate">
          {{ isGenerating ? 'Generating...' : 'Generate video' }}
        </Button>
        <div v-if="generationMessage && (encoderLoading || isGenerating)" class="flex flex-col gap-2">
          <p class="text-sm text-neutral-400">{{ generationMessage }}</p>
          <div
            v-if="isGenerating || encoderLoading"
            class="w-full h-2 bg-neutral-800 rounded-full overflow-hidden"
          >
            <div
              class="h-full bg-amber-500 transition-all duration-300"
              :class="generationProgress > 0 ? '' : 'w-[8%] animate-pulse'"
              :style="generationProgress > 0 ? { width: `${generationProgress}%` } : undefined"
            />
          </div>
        </div>
      </div>
    </template>
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
  TRACK_VIDEO_DIMENSION_OPTIONS,
  TRACK_VIDEO_QUALITY_OPTIONS,
  TRACK_VIDEO_BACKGROUND_PRESETS,
  clampPaddingPx,
  normalizeHexColor,
  resolveOutputSize,
  resolveTrackVideoBackgroundColor,
  type TrackVideoBackgroundPresetId,
  type TrackVideoGenerationProgress,
  type TrackVideoDimension,
  type TrackVideoQuality,
} from '~/composables/useTrackVideoGenerator.client'
import {
  deleteExport,
  getExportsForTrack,
  saveExport,
  type TrackVideoExport,
} from '~/composables/useTrackVideoHistory'
import { useSupabase } from '~/utils/supabase'
import { downloadAudioBlob } from '~/utils/trackAudioStorage'
import { useToast } from '~/composables/useToast'
import { useAuthHeaders } from '~/composables/useAuthHeaders'
import { useAuth } from '~/composables/useAuth'
import { useEntitlements } from '~/composables/useEntitlements'
import {
  analyzeMoodFromAudio,
  BEATBOX_MOOD_TAGS,
  type BeatboxMoodTag,
} from '~/composables/useAudioAnalyzer'
import type { Track } from '~/types/track'
import { COVER_DIRECTION_MAX } from '~/utils/coverDirection'

const props = withDefaults(
  defineProps<{
    show: boolean
    track: Track | null
    /** When true (e.g. Sync → YouTube selected), default Dimensions to landscape. */
    preferLandscape?: boolean
  }>(),
  {
    preferLandscape: false,
  },
)

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const {
  getArtworkUrl,
  validateAndProcessArtwork,
  resolveArtworkUrlForEntity,
  downloadArtwork,
  uploadArtwork,
  deleteArtwork,
} = useArtwork()
const { generateTrackVideo, isGenerating } = useTrackVideoGenerator()
const { supabase } = useSupabase()
const { showError, showSuccess } = useToast()
const { isAdmin } = useAuth()
const { subscription, refresh: refreshEntitlements } = useEntitlements()

const drawerRef = ref<InstanceType<typeof MasterDrawer> | null>(null)
const coverInputRef = ref<HTMLInputElement | null>(null)
const generatingCover = ref(false)
const customBackgroundInputRef = ref<HTMLInputElement | null>(null)
const previewVideoRef = ref<HTMLVideoElement | null>(null)

const coverPreview = ref<string | null>(null)
const coverFile = ref<File | null>(null)
const coverError = ref<string | null>(null)
const usingTrackArtwork = ref(false)
const coverDirection = ref('')
const selectedMoods = ref<BeatboxMoodTag[]>([])
const detectingMoods = ref(false)
const moodDetectError = ref<string | null>(null)
/** Snapshot of track mood emptiness at drawer open — used for write-when-empty persist */
const trackMoodWasEmpty = ref(true)

const generationMessage = ref('')
const generationProgress = ref(0)
const generationError = ref<string | null>(null)
const latestResult = ref<{ blob: Blob; filename: string } | null>(null)
const latestPreviewUrl = ref<string | null>(null)

const history = ref<TrackVideoExport[]>([])
const historyLoading = ref(false)
const deletingId = ref<string | null>(null)
const savingCloudVideo = ref(false)
/** Local mirror after a successful cloud save in this session. */
const cloudVideoPath = ref<string | null>(null)
const encoderReady = ref(false)
const encoderLoading = ref(false)
const selectedDimension = ref<TrackVideoDimension>('square')
const selectedQuality = ref<TrackVideoQuality>('maximum')
const selectedBackgroundPreset = ref<TrackVideoBackgroundPresetId>('black')
const customBackgroundColor = ref('#808080')
const coverPaddingPx = ref(0)

const PREVIEW_MAX_WIDTH = 240

let abortController: AbortController | null = null
let previewObjectUrl: string | null = null

const canUseTrackArtwork = computed(() => {
  if (!props.track?.artwork_path) return false
  return !isVideoArtwork(props.track.artwork_path)
})

const canGenerate = computed(() => {
  return !!(props.track?.storage_path && coverFile.value)
})

/** Paid / valid comp / admin — server re-checks on save. */
const canSaveCloudVideo = computed(() => {
  if (isAdmin.value) return true
  const sub = subscription.value
  if (!sub) return false
  if (sub.comp_plan_id && sub.comp_until && new Date(sub.comp_until) > new Date()) {
    return true
  }
  return (
    sub.status === 'active' ||
    sub.status === 'trialing' ||
    sub.status === 'past_due'
  )
})

const hasCloudVideo = computed(() => {
  const path = cloudVideoPath.value ?? props.track?.video_path
  return typeof path === 'string' && path.trim().length > 0
})

const saveCloudVideoLabel = computed(() => {
  if (savingCloudVideo.value) return 'Saving…'
  if (hasCloudVideo.value) return 'Replace cloud video'
  return 'Save video'
})

const coverPlaceholderText = computed(() => {
  if (props.track?.artwork_path && isVideoArtwork(props.track.artwork_path)) {
    return 'Video artwork cannot be used. Upload a still image.'
  }
  if (coverError.value) {
    return 'Could not load track artwork. Upload or generate a cover.'
  }
  if (!props.track?.artwork_path) {
    return 'No artwork on this track. Upload an image to continue.'
  }
  return 'Loading artwork...'
})

const selectedQualityDescription = computed(() => {
  return (
    TRACK_VIDEO_QUALITY_OPTIONS.find((option) => option.value === selectedQuality.value)
      ?.description || ''
  )
})

const selectedDimensionDescription = computed(() => {
  return (
    TRACK_VIDEO_DIMENSION_OPTIONS.find((option) => option.value === selectedDimension.value)
      ?.description || ''
  )
})

const outputSize = computed(() => resolveOutputSize(selectedDimension.value, selectedQuality.value))

const outputSizeLabel = computed(() => {
  const { width, height } = outputSize.value
  return `${width}×${height}`
})

const clampedCoverPaddingPx = computed(() =>
  clampPaddingPx(coverPaddingPx.value, outputSize.value)
)

const previewAspectClass = computed(() => {
  if (selectedDimension.value === 'portrait') return 'aspect-[9/16]'
  if (selectedDimension.value === 'landscape') return 'aspect-video'
  return 'aspect-square'
})

const previewCoverWrapperStyle = computed(() => {
  const scaledPadding = Math.round(
    clampedCoverPaddingPx.value * (PREVIEW_MAX_WIDTH / outputSize.value.width)
  )
  return scaledPadding > 0 ? { padding: `${scaledPadding}px` } : undefined
})

const resolvedBackgroundColor = computed(() =>
  resolveTrackVideoBackgroundColor(selectedBackgroundPreset.value, customBackgroundColor.value)
)

const previewBackgroundStyle = computed(() => ({
  backgroundColor: resolvedBackgroundColor.value,
}))

function selectBackgroundPreset(presetId: Exclude<TrackVideoBackgroundPresetId, 'custom'>) {
  selectedBackgroundPreset.value = presetId
}

function openCustomBackgroundPicker() {
  selectedBackgroundPreset.value = 'custom'
  customBackgroundInputRef.value?.click()
}

function handleCustomBackgroundInput(event: Event) {
  const input = event.target as HTMLInputElement
  customBackgroundColor.value = normalizeHexColor(input.value)
  selectedBackgroundPreset.value = 'custom'
}

function handlePaddingInput(event: Event) {
  const input = event.target as HTMLInputElement
  const digits = input.value.replace(/\D/g, '')
  input.value = digits
  coverPaddingPx.value = digits === '' ? 0 : Number(digits)
}

function handlePaddingFocus(event: FocusEvent) {
  ;(event.target as HTMLInputElement).select()
}

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

function parseTrackMoods(mood: unknown): BeatboxMoodTag[] {
  const raw: string[] = Array.isArray(mood)
    ? mood.map((m) => String(m).trim()).filter(Boolean)
    : typeof mood === 'string'
      ? mood.split(',').map((m) => m.trim()).filter(Boolean)
      : []
  const allowed = new Set<string>(BEATBOX_MOOD_TAGS)
  return raw.filter((m): m is BeatboxMoodTag => allowed.has(m))
}

function trackMoodIsEmpty(mood: unknown): boolean {
  if (mood == null) return true
  if (Array.isArray(mood)) return mood.filter(Boolean).length === 0
  if (typeof mood === 'string') return mood.trim().length === 0
  return true
}

function resetDrawerState() {
  abortController?.abort()
  abortController = null

  coverPreview.value = null
  coverFile.value = null
  coverError.value = null
  usingTrackArtwork.value = false
  coverDirection.value = ''
  selectedMoods.value = []
  detectingMoods.value = false
  moodDetectError.value = null
  trackMoodWasEmpty.value = true

  resetGenerationState()
  encoderLoading.value = false
  latestResult.value = null
  savingCloudVideo.value = false
  cloudVideoPath.value = null
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

  const entity = {
    id: props.track.id,
    artwork_path: props.track.artwork_path,
    artwork_provider: props.track.artwork_provider,
  }

  try {
    // Same-origin download avoids R2 CORS failures (e.g. http://localhost without :3000)
    let blob = await downloadArtwork(entity, 'track')

    if (!blob) {
      const url = await resolveArtworkUrlForEntity(entity, 'track')
      if (!url) throw new Error('Could not resolve track artwork URL')
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to load track artwork')
      blob = await response.blob()
    }

    const ext = props.track.artwork_path.split('.').pop()?.toLowerCase() || 'jpg'
    const mimeType = blob.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`
    const file = new File([blob], `cover.${ext}`, { type: mimeType })
    const { file: processedFile, preview } = await validateAndProcessArtwork(file)
    coverFile.value = processedFile
    coverPreview.value = preview
    usingTrackArtwork.value = true
    coverError.value = null
  } catch (err: unknown) {
    coverPreview.value = null
    coverFile.value = null
    usingTrackArtwork.value = false
    coverError.value = err instanceof Error ? err.message : 'Could not load track artwork'
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
    await preloadTrackVideoEncoder(handleProgress)
    encoderReady.value = true
  } catch (err: unknown) {
    generationError.value = err instanceof Error ? err.message : 'Failed to load encoder'
  } finally {
    encoderLoading.value = false
  }
}

async function initializeDrawer() {
  resetDrawerState()
  selectedDimension.value = props.preferLandscape ? 'landscape' : 'square'
  trackMoodWasEmpty.value = trackMoodIsEmpty(props.track?.mood)
  selectedMoods.value = parseTrackMoods(props.track?.mood)
  cloudVideoPath.value =
    typeof props.track?.video_path === 'string' && props.track.video_path.trim()
      ? props.track.video_path
      : null
  encoderReady.value = isTrackVideoEncoderLoaded()
  await Promise.all([loadTrackArtwork(), loadHistory(), refreshEntitlements()])
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
  } catch (err: unknown) {
    coverError.value = err instanceof Error ? err.message : 'Invalid image file'
    if (!usingTrackArtwork.value) {
      coverFile.value = null
      coverPreview.value = null
    }
  } finally {
    input.value = ''
  }
}

async function handleDetectMoods() {
  if (!props.track?.storage_path || detectingMoods.value || !supabase) return

  detectingMoods.value = true
  moodDetectError.value = null
  try {
    const audioData = await downloadAudioBlob(props.track, supabase)
    const moods = await analyzeMoodFromAudio(audioData)
    selectedMoods.value = moods
    showSuccess(`Detected: ${moods.join(', ')}`)
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to detect moods from audio'
    moodDetectError.value = message
    showError(message)
  } finally {
    detectingMoods.value = false
  }
}

function dispatchTrackUpdated(patch: Partial<Track>) {
  if (!props.track) return
  const updated = { ...props.track, ...patch }
  window.dispatchEvent(
    new CustomEvent('track-updated', {
      detail: { track: updated },
      bubbles: true,
    }),
  )
}

async function persistMoodsIfEmpty(moods: BeatboxMoodTag[]) {
  if (!trackMoodWasEmpty.value || moods.length === 0 || !props.track?.id || !supabase) {
    return
  }

  const { data, error } = await supabase
    .from('sounds')
    .update({ mood: moods })
    .eq('id', props.track.id)
    .select('id, mood')
    .maybeSingle()

  if (error) {
    console.warn('Failed to save detected moods to track:', error)
    return
  }

  trackMoodWasEmpty.value = false
  dispatchTrackUpdated({ mood: data?.mood ?? moods })
}

/** Upload AI/custom cover to storage and attach to the track so Sync/Edit persist it. */
async function persistCoverToTrack(file: File) {
  if (!props.track?.id || !supabase) return

  const uploaded = await uploadArtwork(file, 'track')

  if (props.track.artwork_path) {
    try {
      await deleteArtwork(
        {
          id: props.track.id,
          artwork_path: props.track.artwork_path,
          artwork_provider: props.track.artwork_provider,
        },
        'track',
      )
    } catch (err) {
      console.warn('Failed to delete previous artwork after cover generate:', err)
    }
  }

  const { data, error } = await supabase
    .from('sounds')
    .update({
      artwork_path: uploaded.artwork_path,
      artwork_provider: uploaded.artwork_provider,
    })
    .eq('id', props.track.id)
    .select('id, artwork_path, artwork_provider')
    .maybeSingle()

  if (error) {
    throw error
  }

  dispatchTrackUpdated({
    artwork_path: data?.artwork_path ?? uploaded.artwork_path,
    artwork_provider: data?.artwork_provider ?? uploaded.artwork_provider,
  })
}

async function handleGenerateCover() {
  if (!props.track || generatingCover.value) return

  const title = props.track.title?.trim()
  const artist = props.track.artist?.trim()
  if (!title || !artist) {
    coverError.value = 'Title and artist are required to generate cover art'
    return
  }

  generatingCover.value = true
  coverError.value = null
  try {
    const headers = await useAuthHeaders()
    const mood =
      selectedMoods.value.length > 0 ? selectedMoods.value.join(', ') : undefined
    const direction = coverDirection.value.trim().slice(0, COVER_DIRECTION_MAX) || undefined

    const result = await $fetch<{
      base64: string
      mimeType: string
      filename: string
      provider?: 'openai' | 'grok'
    }>('/api/integrations/cover/generate', {
      method: 'POST',
      headers,
      body: {
        title,
        artist,
        genre: props.track.genre || undefined,
        mood: mood || undefined,
        direction: direction || undefined,
      },
    })

    const binary = atob(result.base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const blob = new Blob([bytes], { type: result.mimeType || 'image/png' })
    const file = new File([blob], result.filename || 'cover-ai.png', {
      type: result.mimeType || 'image/png',
    })
    const { file: processedFile, preview } = await validateAndProcessArtwork(file)
    coverFile.value = processedFile
    coverPreview.value = preview

    const viaGrok = result.provider === 'grok'
    const generatedLabel = viaGrok
      ? 'Cover generated via Grok (OpenAI safety fallback)'
      : 'Cover generated'

    try {
      await persistCoverToTrack(processedFile)
      usingTrackArtwork.value = true
      showSuccess(`${generatedLabel} and saved to track`)
    } catch (persistErr: unknown) {
      usingTrackArtwork.value = false
      console.warn('Cover generated but failed to save to track:', persistErr)
      showSuccess(`${generatedLabel} (not saved to track yet)`)
      showError(
        persistErr instanceof Error
          ? persistErr.message
          : 'Cover preview ready, but saving to track failed',
      )
    }

    await persistMoodsIfEmpty(selectedMoods.value)
  } catch (err: unknown) {
    const message =
      (err as any)?.data?.statusMessage ||
      (err instanceof Error ? err.message : 'Failed to generate cover')
    coverError.value = message
    showError(message)
  } finally {
    generatingCover.value = false
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

    const audioData = await downloadAudioBlob(props.track, supabase)

    const result = await generateTrackVideo({
      coverFile: coverFile.value,
      audioBlob: audioData,
      audioStoragePath: props.track.storage_path,
      artistName: props.track.artist,
      trackTitle: props.track.title,
      audioDurationSeconds: props.track.duration || 0,
      quality: selectedQuality.value,
      dimension: selectedDimension.value,
      paddingPx: clampedCoverPaddingPx.value,
      backgroundColor: resolvedBackgroundColor.value,
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

    // Keep track artwork in sync with the cover used for the video
    const artworkEmpty =
      !props.track.artwork_path ||
      (typeof props.track.artwork_path === 'string' && !props.track.artwork_path.trim())
    if (artworkEmpty && coverFile.value) {
      try {
        await persistCoverToTrack(coverFile.value)
        usingTrackArtwork.value = true
      } catch (persistErr) {
        console.warn('Video saved but cover was not written to track:', persistErr)
      }
    }

    window.dispatchEvent(
      new CustomEvent('track-video-ready', {
        detail: { trackId: Number(props.track.id) },
        bubbles: true,
      }),
    )
    showSuccess('Video generated and saved on this device')
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    if (err instanceof Error && err.name === 'AbortError') return
    const message = err instanceof Error ? err.message : 'Failed to generate video'
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

async function handleSaveCloudVideo() {
  if (!latestResult.value || !props.track?.id || savingCloudVideo.value) return

  if (!canSaveCloudVideo.value) {
    showError('Cloud video save is included with paid plans')
    await navigateTo('/pricing')
    return
  }

  savingCloudVideo.value = true
  try {
    const headers = await useAuthHeaders()
    if (!headers.Authorization) {
      throw new Error('Sign in to save video to the cloud')
    }

    const { blob, filename } = latestResult.value
    const contentType = blob.type || 'video/mp4'

    const presign = await $fetch<{
      key: string
      uploadUrl: string
      contentType: string
      video_provider: 'r2'
    }>('/api/storage/presign-track-video-upload', {
      method: 'POST',
      headers,
      body: {
        soundId: props.track.id,
        filename,
        contentType,
        size: blob.size,
      },
    })

    const uploadResponse = await fetch(presign.uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: {
        'Content-Type': presign.contentType,
      },
    })

    if (!uploadResponse.ok) {
      throw new Error(`Cloud upload failed (${uploadResponse.status})`)
    }

    const confirmed = await $fetch<{
      video_path: string
      video_provider: 'r2'
      size: number
    }>('/api/storage/confirm-track-video', {
      method: 'POST',
      headers,
      body: {
        soundId: props.track.id,
        key: presign.key,
      },
    })

    cloudVideoPath.value = confirmed.video_path
    dispatchTrackUpdated({
      video_path: confirmed.video_path,
      video_provider: confirmed.video_provider,
    })
    showSuccess('Video saved to cloud')
  } catch (err: unknown) {
    const code = (err as any)?.data?.data?.code || (err as any)?.data?.code
    const statusMessage =
      (err as any)?.data?.statusMessage ||
      (err instanceof Error ? err.message : 'Failed to save video')
    if (code === 'paid_required' || statusMessage === 'paid_required') {
      showError('Cloud video save is included with paid plans')
      await navigateTo('/pricing')
    } else {
      showError(statusMessage)
    }
  } finally {
    savingCloudVideo.value = false
  }
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
