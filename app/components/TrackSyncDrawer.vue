<template>
  <MasterDrawer :show="show" @update:show="onShowUpdate">
    <template #header>
      <div class="flex flex-col gap-0.5 min-w-0">
        <h2 class="text-xl truncate">{{ drawerTitle }}</h2>
        <p v-if="localTrack?.title" class="text-sm text-neutral-500 font-normal truncate">
          Push to connected platforms
        </p>
      </div>
    </template>

    <div class="flex flex-col gap-4">
      <template v-if="!hasTrackSync">
        <p>
          Track sync is included with Pro. Upgrade to connect YouTube or SoundCloud and push
          tracks in one step.
        </p>
        <NuxtLink to="/pricing" class="text-link no-underline" @click="close">
          View plans
        </NuxtLink>
      </template>

      <template v-else>
        <section v-if="artworkPreviewUrl || localVideoUrl" class="flex flex-col gap-2">
          <h3 class="text-neutral-100 font-medium">Media for sync</h3>
          <div class="flex flex-wrap gap-3">
            <div v-if="artworkPreviewUrl" class="flex flex-col gap-1.5 min-w-0">
              <p class="text-xs text-neutral-500">Artwork</p>
              <img
                :src="artworkPreviewUrl"
                alt="Track artwork"
                class="w-28 h-28 rounded-md object-cover border border-neutral-800 bg-neutral-950"
              >
            </div>
            <div v-if="localVideoUrl" class="flex flex-col gap-1.5 min-w-0 grow">
              <p class="text-xs text-neutral-500">Local video</p>
              <video
                :src="localVideoUrl"
                controls
                playsinline
                class="w-full max-w-sm max-h-56 rounded-md border border-neutral-800 bg-black object-contain"
              />
            </div>
          </div>
          <p v-if="recoveringArtwork" class="text-xs text-neutral-500">
            Saving cover from video…
          </p>
        </section>

        <section class="flex flex-col gap-2">
          <h3 class="text-neutral-100 font-medium">Metadata readiness</h3>
          <p class="text-xs text-neutral-500">
            Platforms get these fields on sync. Fill required fields before syncing.
          </p>
          <input
            ref="artworkFileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov"
            class="hidden"
            @change="uploadArtworkInline"
          >
          <ul class="flex flex-col gap-1.5">
            <li
              v-for="field in metadataFields"
              :key="field.key"
              class="flex flex-col gap-2 rounded-md border border-neutral-800 px-2.5 py-2"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-neutral-200">
                    {{ field.label }}
                    <span
                      v-if="field.severity === 'required'"
                      class="text-[10px] uppercase tracking-wide text-neutral-500 ml-1"
                    >required</span>
                    <span
                      v-else-if="field.severity === 'recommended'"
                      class="text-[10px] uppercase tracking-wide text-neutral-500 ml-1"
                    >recommended</span>
                  </p>
                  <p class="text-xs mt-0.5" :class="fieldStatusClass(field)">
                    <template v-if="field.severity === 'info'">{{ field.hint }}</template>
                    <template v-else-if="field.key === 'artwork' && artworkPreviewUrl">
                      Cover ready
                    </template>
                    <template v-else-if="field.filled">{{ field.valuePreview }}</template>
                    <template v-else>Empty</template>
                  </p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <a
                    v-if="field.key === 'artwork' && artworkPreviewUrl"
                    :href="artworkPreviewUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="size-8 rounded overflow-hidden border border-neutral-700 bg-neutral-950 shrink-0"
                    title="Open cover full size"
                    @click.stop
                  >
                    <img
                      :src="artworkPreviewUrl"
                      alt="Track artwork"
                      class="size-full object-cover"
                    >
                  </a>
                  <Button
                    v-if="canExpandField(field)"
                    variant="ghost"
                    size="sm"
                    class="shrink-0 border border-neutral-700 hover:border-neutral-600 bg-neutral-900 text-neutral-200"
                    @click="toggleExpandField(field.key)"
                  >
                    {{
                      expandedField === field.key
                        ? 'Done'
                        : field.filled
                          ? 'Change'
                          : 'Edit'
                    }}
                  </Button>
                </div>
              </div>

              <div
                v-if="expandedField === field.key"
                class="flex flex-col gap-2 border-t border-neutral-800 pt-2"
              >
                <!-- Title / Artist -->
                <template v-if="field.key === 'title' || field.key === 'artist'">
                  <input
                    v-model="draftText"
                    type="text"
                    class="w-full p-2.5 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200 outline-none focus:border-amber-400"
                    :placeholder="field.label"
                    @change="persistTextField(field.key)"
                    @keydown.enter.prevent="persistTextField(field.key)"
                  >
                </template>

                <!-- Genre -->
                <template v-else-if="field.key === 'genre'">
                  <select
                    v-model="draftGenre"
                    class="select-field w-full p-2.5 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200 outline-none focus:border-amber-400 cursor-pointer"
                    @change="persistGenre"
                  >
                    <option value="">Select genre…</option>
                    <option
                      v-for="genre in TRACK_GENRES"
                      :key="genre"
                      :value="genre"
                    >
                      {{ genre }}
                    </option>
                  </select>
                </template>

                <!-- BPM -->
                <template v-else-if="field.key === 'bpm'">
                  <div class="flex gap-2">
                    <input
                      v-model.number="draftBpm"
                      type="number"
                      min="0"
                      max="300"
                      placeholder="e.g. 120"
                      class="w-full p-2.5 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200 outline-none focus:border-amber-400"
                      @change="persistBpm"
                    >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      class="shrink-0 !p-0 size-10 border border-neutral-700 hover:bg-neutral-800 text-neutral-500 hover:text-neutral-400"
                      :disabled="analyzingBpm || !localTrack?.storage_path"
                      title="Analyze BPM"
                      @click="analyzeBpmInline"
                    >
                      <CircleSpark v-if="!analyzingBpm" class="w-5 h-5" stroke-width="1.5" />
                      <span v-else class="text-xs">…</span>
                    </Button>
                  </div>
                  <p v-if="bpmError" class="text-xs text-red-500">{{ bpmError }}</p>
                  <p v-else-if="analyzingBpm" class="text-xs text-amber-400">Analyzing BPM…</p>
                </template>

                <!-- Key -->
                <template v-else-if="field.key === 'key'">
                  <div class="flex gap-2">
                    <select
                      v-model="draftKey"
                      class="select-field w-full p-2.5 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200 outline-none focus:border-amber-400 cursor-pointer"
                      @change="persistKey"
                    >
                      <option value="">Select key…</option>
                      <option
                        v-if="draftKey && !(TRACK_KEYS as readonly string[]).includes(draftKey)"
                        :value="draftKey"
                      >
                        {{ draftKey }}
                      </option>
                      <option
                        v-for="keyOpt in TRACK_KEYS"
                        :key="keyOpt"
                        :value="keyOpt"
                      >
                        {{ keyOpt }}
                      </option>
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      class="shrink-0 !p-0 size-10 border border-neutral-700 hover:bg-neutral-800 text-neutral-500 hover:text-neutral-400"
                      :disabled="analyzingKey || !localTrack?.storage_path"
                      title="Analyze Key"
                      @click="analyzeKeyInline"
                    >
                      <CircleSpark v-if="!analyzingKey" class="w-5 h-5" stroke-width="1.5" />
                      <span v-else class="text-xs">…</span>
                    </Button>
                  </div>
                  <p v-if="keyError" class="text-xs text-red-500">{{ keyError }}</p>
                  <p v-else-if="analyzingKey" class="text-xs text-amber-400">Analyzing key…</p>
                </template>

                <!-- Mood -->
                <template v-else-if="field.key === 'mood'">
                  <div class="flex gap-2 items-start">
                    <div class="flex flex-wrap gap-2 min-w-0 grow">
                      <label
                        v-for="mood in BEATBOX_MOOD_TAGS"
                        :key="mood"
                        class="cursor-pointer"
                      >
                        <input
                          v-model="draftMoods"
                          type="checkbox"
                          :value="mood"
                          class="hidden"
                          @change="persistMoods"
                        >
                        <span :class="draftMoods.includes(mood) ? 'tag-active' : 'tag'">
                          {{ mood }}
                        </span>
                      </label>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      class="shrink-0 !p-0 size-10 border border-neutral-700 hover:bg-neutral-800 text-neutral-500 hover:text-neutral-400"
                      :disabled="detectingMoods || !localTrack?.storage_path"
                      title="Detect moods"
                      @click="detectMoodsInline"
                    >
                      <CircleSpark v-if="!detectingMoods" class="w-5 h-5" stroke-width="1.5" />
                      <span v-else class="text-xs">…</span>
                    </Button>
                  </div>
                  <p v-if="moodError" class="text-xs text-red-500">{{ moodError }}</p>
                  <p v-else-if="detectingMoods" class="text-xs text-amber-400">Detecting moods…</p>
                  <p v-else class="text-xs text-neutral-500">Toggle tags or detect from audio</p>
                </template>

                <!-- Description -->
                <template v-else-if="field.key === 'description'">
                  <textarea
                    v-model="draftDescription"
                    rows="6"
                    maxlength="2000"
                    placeholder="Optional sync description for YouTube / SoundCloud…"
                    class="w-full p-2.5 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200 placeholder-neutral-500 outline-none focus:border-amber-400 resize-y min-h-[120px]"
                    :disabled="generatingDescription"
                    @change="persistDescription"
                  />
                  <div class="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      class="shrink-0 !p-0 size-10 border border-neutral-700 hover:bg-neutral-800 text-neutral-500 hover:text-neutral-400"
                      :disabled="generatingDescription || !localTrack?.title || !localTrack?.artist"
                      title="Generate description"
                      @click="generateDescriptionInline"
                    >
                      <CircleSpark v-if="!generatingDescription" class="w-5 h-5" stroke-width="1.5" />
                      <span v-else class="text-xs">…</span>
                    </Button>
                    <p class="text-xs text-neutral-500">
                      {{
                        generatingDescription
                          ? 'Generating description…'
                          : 'Edit manually or generate from title, artist, genre, BPM, key, mood'
                      }}
                    </p>
                  </div>
                  <p v-if="descriptionError" class="text-xs text-red-500">{{ descriptionError }}</p>
                </template>

                <!-- Artwork -->
                <template v-else-if="field.key === 'artwork'">
                  <textarea
                    v-model="coverDirection"
                    rows="8"
                    :maxlength="COVER_DIRECTION_MAX"
                    placeholder="Optional cover direction…"
                    class="w-full p-2.5 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200 placeholder-neutral-500 outline-none focus:border-amber-400 resize-y min-h-[180px]"
                    :disabled="generatingArtwork || uploadingArtwork"
                  />
                  <div
                    v-if="generatingArtwork || uploadingArtwork"
                    class="flex flex-col gap-1.5"
                  >
                    <div class="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        class="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                        :class="coverProgress > 0 && coverProgress < 100 ? '' : 'animate-pulse'"
                        :style="{ width: `${Math.max(coverProgress, 8)}%` }"
                      />
                    </div>
                    <p class="text-xs text-amber-400">
                      {{ coverProgressLabel || (uploadingArtwork ? 'Uploading…' : 'Generating…') }}
                    </p>
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      :disabled="generatingArtwork || uploadingArtwork"
                      @click="openArtworkFilePicker"
                    >
                      Upload
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      :disabled="generatingArtwork || uploadingArtwork || !canGenerateArtwork"
                      @click="generateArtworkInline"
                    >
                      {{ generatingArtwork ? 'Generating…' : 'Generate cover' }}
                    </Button>
                    <select
                      v-if="coverModels.length"
                      v-model="selectedCoverModel"
                      class="select-field p-2 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200 text-sm outline-none focus:border-amber-400 cursor-pointer min-w-[11rem]"
                      :disabled="generatingArtwork || uploadingArtwork || loadingCoverModels"
                      :title="selectedCoverModelHint"
                    >
                      <option
                        v-for="model in coverModels"
                        :key="model.id"
                        :value="model.id"
                      >
                        {{ model.label }}
                      </option>
                    </select>
                  </div>
                  <p v-if="artworkError" class="text-xs text-red-500">{{ artworkError }}</p>
                  <p v-else class="text-xs text-neutral-500">
                    Upload your own or generate from title, artist, genre, and mood.
                  </p>
                </template>
              </div>
            </li>
          </ul>
          <p v-if="!requiredReady" class="text-xs text-red-400">
            Add title and artist before syncing.
          </p>
          <p v-else-if="hasRecommendedGaps" class="text-xs text-amber-400/90">
            Some recommended fields are empty. You can still sync.
          </p>
        </section>

        <section class="flex flex-col gap-2">
          <h3 class="text-neutral-100 font-medium">Platforms</h3>

          <p
            v-if="!youtubeConnected && !(soundcloudSyncUiEnabled && soundcloudConnected)"
            class="text-xs text-neutral-500"
          >
            Connect a platform below to sync.
          </p>

          <div
            v-if="youtubeConnected"
            class="flex flex-col rounded-md border border-neutral-800"
          >
            <div class="flex items-center justify-between gap-3 px-2.5 py-2">
              <label class="flex items-center gap-2 min-w-0 cursor-pointer">
                <input
                  v-model="youtubeSelected"
                  type="checkbox"
                  class="rounded border-neutral-600 bg-neutral-900 text-amber-500 focus:ring-amber-500"
                  :disabled="syncing"
                >
                <span class="text-neutral-100">YouTube</span>
              </label>
              <div class="flex items-center gap-2 shrink-0">
                <Button
                  v-if="youtubeNeedsVideo"
                  variant="primary"
                  size="sm"
                  @click="openGenerateVideo"
                >
                  Generate video
                </Button>
                <template v-else>
                  <span
                    v-if="youtubeStatus === 'synced'"
                    class="inline-flex shrink-0"
                    title="Synced"
                    aria-label="Synced"
                    role="img"
                  >
                    <CheckCircle class="size-4 text-green-400" stroke-width="1.5" />
                  </span>
                  <span
                    v-else
                    class="text-sm"
                    :class="youtubeStatusClass"
                  >{{ youtubeStatusLabel }}</span>
                  <Button
                    v-if="youtubeSelected && hasLocalVideo"
                    variant="ghost"
                    size="sm"
                    @click="openGenerateVideo"
                  >
                    Replace video
                  </Button>
                </template>
                <a
                  v-if="youtubePermalink"
                  :href="youtubePermalink"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-link text-sm no-underline"
                >View</a>
              </div>
            </div>

            <div
              v-if="youtubeSelected"
              class="flex flex-col gap-2 border-t border-neutral-800 px-2.5 py-2"
            >
              <label for="youtube-title" class="text-sm font-medium text-neutral-200">
                YouTube title
              </label>
              <div class="flex gap-2 items-stretch">
                <input
                  id="youtube-title"
                  v-model="draftYoutubeTitle"
                  type="text"
                  maxlength="100"
                  class="w-full min-w-0 p-2.5 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200 outline-none focus:border-amber-400"
                  :placeholder="localTrack?.title || 'YouTube title'"
                  :disabled="syncing || patchingField || generatingYoutubeTitle"
                  @change="persistYoutubeTitle"
                  @keydown.enter.prevent="persistYoutubeTitle"
                >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="shrink-0 !p-0 aspect-square w-auto self-stretch border border-neutral-700 hover:bg-neutral-800 text-neutral-500 hover:text-neutral-400"
                  :disabled="
                    generatingYoutubeTitle ||
                    syncing ||
                    !localTrack?.title ||
                    !localTrack?.artist
                  "
                  title="Generate SEO YouTube title"
                  @click="generateYoutubeTitleInline"
                >
                  <CircleSpark v-if="!generatingYoutubeTitle" class="w-5 h-5" stroke-width="1.5" />
                  <span v-else class="text-xs">…</span>
                </Button>
              </div>
              <p v-if="youtubeTitleError" class="text-xs text-red-500">{{ youtubeTitleError }}</p>
              <p v-else class="text-xs text-neutral-500">
                {{
                  generatingYoutubeTitle
                    ? 'Generating SEO title…'
                    : 'Optional. Empty uses the Beatbox title. Max 100 characters.'
                }}
              </p>
            </div>
          </div>

          <div
            v-if="soundcloudSyncUiEnabled && soundcloudConnected"
            class="flex items-center justify-between gap-3 rounded-md border border-neutral-800 px-2.5 py-2"
          >
            <label class="flex items-center gap-2 min-w-0 cursor-pointer">
              <input
                v-model="soundcloudSelected"
                type="checkbox"
                class="rounded border-neutral-600 bg-neutral-900 text-amber-500 focus:ring-amber-500"
                :disabled="syncing"
              >
              <span class="text-neutral-100">SoundCloud</span>
            </label>
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-xs" :class="soundcloudStatusClass">{{ soundcloudStatusLabel }}</span>
              <a
                v-if="soundcloudPermalink"
                :href="soundcloudPermalink"
                target="_blank"
                rel="noopener noreferrer"
                class="text-link text-xs no-underline"
              >View</a>
            </div>
          </div>

          <p v-if="syncError" class="text-xs text-red-400">{{ syncError }}</p>
        </section>

        <section class="flex flex-col gap-3 border-t border-neutral-800 p-2">
          <h3 class="text-neutral-100 font-medium">Add platform</h3>

          <div class="flex items-center justify-between gap-2">
            <div>
              <p class="text-neutral-200">
                YouTube
                <span v-if="youtubeConnected && youtubeUsername" class="text-neutral-500">
                  · {{ youtubeUsername }}
                </span>
              </p>
              <p class="text-xs text-neutral-500">
                {{ youtubeConnected ? 'Connected' : 'Connect to upload generated videos' }}
              </p>
            </div>
            <Button
              v-if="!youtubeConnected"
              variant="secondary"
              size="sm"
              :disabled="connectingYoutube"
              @click="connectYouTube"
            >
              {{ connectingYoutube ? 'Connecting…' : 'Connect' }}
            </Button>
            <Button
              v-else
              variant="ghost"
              size="sm"
              :disabled="disconnectingYoutube || syncing"
              @click="disconnectYouTube"
            >
              {{ disconnectingYoutube ? 'Disconnecting…' : 'Disconnect' }}
            </Button>
          </div>

          <div
            v-if="soundcloudSyncUiEnabled"
            class="flex items-center justify-between gap-2"
          >
            <div>
              <p class="text-neutral-200">
                SoundCloud
                <span v-if="soundcloudConnected && soundcloudUsername" class="text-neutral-500">
                  · {{ soundcloudUsername }}
                </span>
              </p>
              <p class="text-xs text-neutral-500">
                {{ soundcloudConnected ? 'Connected' : 'Not Connected' }}
              </p>
            </div>
            <Button
              v-if="!soundcloudConnected"
              variant="secondary"
              size="sm"
              :disabled="connectingSoundcloud"
              @click="connectSoundCloud"
            >
              {{ connectingSoundcloud ? 'Connecting…' : 'Connect' }}
            </Button>
            <Button
              v-else
              variant="ghost"
              size="sm"
              :disabled="disconnectingSoundcloud || syncing"
              @click="disconnectSoundCloud"
            >
              {{ disconnectingSoundcloud ? 'Disconnecting…' : 'Disconnect' }}
            </Button>
          </div>
        </section>

      </template>
    </div>

    <template v-if="hasTrackSync" #footer>
      <div class="flex flex-row gap-2 justify-end">
        <Button variant="ghost" :disabled="syncing" @click="close">Cancel</Button>
        <Button :disabled="!canSync || syncing" @click="runSync">
          {{ syncing ? 'Syncing…' : 'Sync selected' }}
        </Button>
      </div>
    </template>
  </MasterDrawer>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { CheckCircle, CircleSpark } from '@iconoir/vue'
import MasterDrawer from '~/components/MasterDrawer.vue'
import Button from '~/components/Button.vue'
import { useAuthHeaders } from '~/composables/useAuthHeaders'
import { useEntitlements } from '~/composables/useEntitlements'
import { useToast } from '~/composables/useToast'
import { useArtwork } from '~/composables/useArtwork'
import {
  analyzeBPM,
  analyzeKey,
  analyzeMoodFromAudio,
  BEATBOX_MOOD_TAGS,
  type BeatboxMoodTag,
} from '~/composables/useAudioAnalyzer'
import { useSupabase } from '~/utils/supabase'
import { getExportsForTrack } from '~/composables/useTrackVideoHistory'
import { uploadTrackVideoToYouTube } from '~/composables/useYouTubeUpload'
import { usePublishSiteOrigin } from '~/composables/useSiteOrigin'
import { captureVideoFrameAsFile } from '~/utils/captureVideoFrame'
import { downloadAudioBlob } from '~/utils/trackAudioStorage'
import { TRACK_GENRES, TRACK_KEYS } from '~/utils/trackMetadataOptions'
import { COVER_DIRECTION_MAX } from '~/utils/coverDirection'
import type { Track } from '~/types/track'
import {
  getMetadataFieldStatuses,
  hasRequiredMetadata,
  type MetadataFieldKey,
  type MetadataFieldStatus,
} from '~/utils/soundcloudTrackMetadata'

type SyncStatus = 'synced' | 'not_synced' | 'pending' | 'failed' | 'syncing' | 'needs_video'

/** Hide SoundCloud connect/sync UI until the API is ready. Flip to true to restore. */
const soundcloudSyncUiEnabled = false

const props = defineProps<{
  show: boolean
  track: Track | null
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  'track-refreshed': [track: Track]
  'generate-video': [payload: { track: Track; preferLandscape?: boolean }]
}>()

const { has, refresh: refreshEntitlements } = useEntitlements()
const { showSuccess, showError } = useToast()
const publishSiteOrigin = usePublishSiteOrigin()
const {
  resolveArtworkUrlForEntity,
  uploadArtwork,
  deleteArtwork,
  validateAndProcessArtwork,
} = useArtwork()
const { supabase } = useSupabase()

const localTrack = ref<Track | null>(null)

/** Accordion: one metadata field open at a time */
const expandedField = ref<MetadataFieldKey | null>(null)
const draftText = ref('')
const draftGenre = ref('')
const draftBpm = ref<number | null>(null)
const draftKey = ref('')
const draftMoods = ref<BeatboxMoodTag[]>([])
const draftDescription = ref('')
const draftYoutubeTitle = ref('')
const generatingYoutubeTitle = ref(false)
const youtubeTitleError = ref<string | null>(null)
const coverDirection = ref('')
const generatingDescription = ref(false)
const descriptionError = ref<string | null>(null)

const analyzingBpm = ref(false)
const analyzingKey = ref(false)
const detectingMoods = ref(false)
const generatingArtwork = ref(false)
const uploadingArtwork = ref(false)
const coverProgress = ref(0)
const coverProgressLabel = ref('')
const artworkFileInput = ref<HTMLInputElement | null>(null)
const coverModels = ref<Array<{ id: string; label: string; provider: string; hint: string }>>([])
const selectedCoverModel = ref('')
const loadingCoverModels = ref(false)

const selectedCoverModelHint = computed(() => {
  const match = coverModels.value.find((m) => m.id === selectedCoverModel.value)
  return match?.hint || 'Cover generation model'
})
const bpmError = ref<string | null>(null)
const keyError = ref<string | null>(null)
const moodError = ref<string | null>(null)
const artworkError = ref<string | null>(null)
const patchingField = ref(false)
let coverWaitTimer: ReturnType<typeof setInterval> | null = null

function clearCoverWaitTimer() {
  if (coverWaitTimer) {
    clearInterval(coverWaitTimer)
    coverWaitTimer = null
  }
}

function setCoverProgress(percent: number, label: string) {
  coverProgress.value = Math.min(100, Math.max(0, percent))
  coverProgressLabel.value = label
}

/** While waiting on the opaque generate API, creep progress so the bar stays alive. */
function startCoverWaitPulse(from = 12, to = 48) {
  clearCoverWaitTimer()
  setCoverProgress(from, 'Generating with AI…')
  coverWaitTimer = setInterval(() => {
    if (coverProgress.value < to) {
      coverProgress.value = Math.min(to, coverProgress.value + 1)
    }
  }, 400)
}

const soundcloudConnected = ref(false)
const soundcloudUsername = ref<string | null>(null)
const soundcloudSelected = ref(false)
const soundcloudStatus = ref<SyncStatus>('not_synced')
const soundcloudPermalink = ref<string | null>(null)

const youtubeConnected = ref(false)
const youtubeUsername = ref<string | null>(null)
const youtubeSelected = ref(false)
const youtubeStatus = ref<SyncStatus>('not_synced')
const youtubePermalink = ref<string | null>(null)
const youtubeExternalId = ref<string | null>(null)
const hasLocalVideo = ref(false)
const localVideoUrl = ref<string | null>(null)
const artworkPreviewUrl = ref<string | null>(null)
const recoveringArtwork = ref(false)

const syncError = ref<string | null>(null)
const connectingSoundcloud = ref(false)
const disconnectingSoundcloud = ref(false)
const connectingYoutube = ref(false)
const disconnectingYoutube = ref(false)
const syncing = ref(false)

/** Keep platform selections when temporarily handing off to Generate video */
const preserveStateOnClose = ref(false)

function revokeLocalVideoUrl() {
  if (localVideoUrl.value) {
    URL.revokeObjectURL(localVideoUrl.value)
    localVideoUrl.value = null
  }
}

const hasTrackSync = computed(() => has('track_sync'))
const drawerTitle = computed(() => {
  const title = localTrack.value?.title?.trim()
  return title ? `Sync “${title}”` : 'Sync track'
})

const metadataFields = computed(() => getMetadataFieldStatuses(localTrack.value))
const requiredReady = computed(() => hasRequiredMetadata(localTrack.value))
const hasRecommendedGaps = computed(() =>
  metadataFields.value.some((f) => f.severity === 'recommended' && !f.filled),
)

const youtubeNeedsVideo = computed(
  () =>
    youtubeConnected.value &&
    youtubeSelected.value &&
    !youtubeExternalId.value &&
    !hasLocalVideo.value,
)

const canSync = computed(() => {
  if (!requiredReady.value || syncing.value) return false
  const wantSc = soundcloudConnected.value && soundcloudSelected.value
  const wantYt = youtubeConnected.value && youtubeSelected.value
  if (!wantSc && !wantYt) return false
  // First YouTube upload needs a local MP4; metadata update reuses existing video id
  if (wantYt && !youtubeExternalId.value && !hasLocalVideo.value) return false
  return true
})

function statusLabel(status: SyncStatus, connected: boolean): string {
  switch (status) {
    case 'synced':
      return 'Synced'
    case 'pending':
    case 'syncing':
      return 'Syncing…'
    case 'failed':
      return 'Failed'
    case 'needs_video':
      return 'Needs video'
    default:
      return connected ? 'Not synced' : 'Not connected'
  }
}

function statusClassFor(status: SyncStatus): string {
  switch (status) {
    case 'synced':
      return 'text-green-400'
    case 'failed':
      return 'text-red-400'
    case 'pending':
    case 'syncing':
    case 'needs_video':
      return 'text-amber-400'
    default:
      return 'text-neutral-500'
  }
}

const soundcloudStatusLabel = computed(() =>
  statusLabel(soundcloudStatus.value, soundcloudConnected.value),
)
const soundcloudStatusClass = computed(() => statusClassFor(soundcloudStatus.value))
const youtubeStatusLabel = computed(() =>
  statusLabel(youtubeStatus.value, youtubeConnected.value),
)
const youtubeStatusClass = computed(() => statusClassFor(youtubeStatus.value))

function fieldStatusClass(field: MetadataFieldStatus): string {
  if (field.severity === 'info') return 'text-neutral-500'
  if (field.filled) return 'text-neutral-400'
  if (field.severity === 'required') return 'text-red-400'
  return 'text-amber-400'
}

function canExpandField(field: MetadataFieldStatus): boolean {
  if (field.severity === 'info') return false
  if (field.severity === 'recommended') return true
  return !field.filled
}

function moodTagsFromTrack(track: Track | null): BeatboxMoodTag[] {
  if (!track?.mood) return []
  const allowed = new Set<string>(BEATBOX_MOOD_TAGS)
  const raw = Array.isArray(track.mood)
    ? track.mood
    : String(track.mood)
        .split(',')
        .map((m) => m.trim())
  return raw.filter((m): m is BeatboxMoodTag => allowed.has(String(m)))
}

function hydrateDraftsForField(key: MetadataFieldKey) {
  const track = localTrack.value
  bpmError.value = null
  keyError.value = null
  moodError.value = null
  artworkError.value = null
  descriptionError.value = null

  if (!track) return

  if (key === 'title') draftText.value = track.title?.trim() || ''
  if (key === 'artist') draftText.value = track.artist?.trim() || ''
  if (key === 'genre') draftGenre.value = track.genre?.trim() || ''
  if (key === 'bpm') {
    draftBpm.value =
      track.bpm != null && Number.isFinite(Number(track.bpm)) ? Number(track.bpm) : null
  }
  if (key === 'key') draftKey.value = String(track.key || '').trim()
  if (key === 'mood') draftMoods.value = moodTagsFromTrack(track)
  if (key === 'description') draftDescription.value = String(track.description || '').trim()
  if (key === 'artwork') coverDirection.value = ''
}

async function loadCoverModels() {
  if (loadingCoverModels.value) return
  loadingCoverModels.value = true
  try {
    const headers = await useAuthHeaders()
    if (!headers.Authorization) return
    const data = await $fetch<{
      models: Array<{ id: string; label: string; provider: string; hint: string }>
      defaultModelId: string | null
    }>('/api/integrations/cover/models', { headers })
    coverModels.value = data.models || []
    if (
      !selectedCoverModel.value ||
      !coverModels.value.some((m) => m.id === selectedCoverModel.value)
    ) {
      selectedCoverModel.value = data.defaultModelId || coverModels.value[0]?.id || ''
    }
  } catch (err) {
    console.warn('Failed to load cover models:', err)
  } finally {
    loadingCoverModels.value = false
  }
}

function toggleExpandField(key: MetadataFieldKey) {
  if (expandedField.value === key) {
    expandedField.value = null
    return
  }
  hydrateDraftsForField(key)
  expandedField.value = key
  if (key === 'artwork') void loadCoverModels()
}

const canGenerateArtwork = computed(() => {
  const title = localTrack.value?.title?.trim()
  const artist = localTrack.value?.artist?.trim()
  return Boolean(title && artist)
})

async function patchLocalTrack(partial: Record<string, unknown>) {
  if (!localTrack.value?.id || !supabase) return null

  patchingField.value = true
  try {
    const { data, error } = await supabase
      .from('sounds')
      .update(partial)
      .eq('id', localTrack.value.id)
      .select()
      .maybeSingle()

    if (error) throw error

    localTrack.value = {
      ...localTrack.value,
      ...(data || partial),
    } as Track

    emit('track-refreshed', localTrack.value)
    window.dispatchEvent(
      new CustomEvent('track-updated', {
        detail: { track: localTrack.value },
        bubbles: true,
      }),
    )
    return localTrack.value
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save metadata'
    showError(message)
    throw err
  } finally {
    patchingField.value = false
  }
}

async function persistTextField(key: 'title' | 'artist') {
  const value = draftText.value.trim()
  if (!value) {
    showError(`${key === 'title' ? 'Title' : 'Artist'} is required`)
    return
  }
  try {
    await patchLocalTrack({ [key]: value })
  } catch {
    /* toasted */
  }
}

async function persistYoutubeTitle() {
  const value = draftYoutubeTitle.value.trim()
  draftYoutubeTitle.value = value
  try {
    await patchLocalTrack({ youtube_title: value || null })
  } catch {
    /* toasted */
  }
}

async function generateYoutubeTitleInline() {
  if (
    !localTrack.value?.title ||
    !localTrack.value?.artist ||
    generatingYoutubeTitle.value
  ) {
    return
  }

  generatingYoutubeTitle.value = true
  youtubeTitleError.value = null
  try {
    const headers = await useAuthHeaders()
    const result = await $fetch<{ youtube_title: string }>(
      '/api/integrations/track/youtube-title/generate',
      {
        method: 'POST',
        headers,
        body: {
          title: localTrack.value.title,
          artist: localTrack.value.artist,
          genre: localTrack.value.genre || undefined,
          mood: localTrack.value.mood || undefined,
          bpm: localTrack.value.bpm ?? undefined,
          key: localTrack.value.key || undefined,
          description: localTrack.value.description || undefined,
        },
      },
    )
    draftYoutubeTitle.value = result.youtube_title
    await patchLocalTrack({ youtube_title: result.youtube_title })
    showSuccess('YouTube title generated')
  } catch (err: any) {
    youtubeTitleError.value =
      err?.data?.statusMessage || err?.message || 'Failed to generate YouTube title'
  } finally {
    generatingYoutubeTitle.value = false
  }
}

function hydrateYoutubeTitleDraft(track: Track | null) {
  draftYoutubeTitle.value =
    typeof track?.youtube_title === 'string' ? track.youtube_title : ''
}

async function persistGenre() {
  const genre = draftGenre.value.trim() || null
  try {
    await patchLocalTrack({ genre })
  } catch {
    /* toasted */
  }
}

async function persistBpm() {
  const bpm =
    draftBpm.value != null && Number.isFinite(Number(draftBpm.value)) && Number(draftBpm.value) > 0
      ? Math.round(Number(draftBpm.value))
      : null
  try {
    await patchLocalTrack({ bpm })
  } catch {
    /* toasted */
  }
}

async function persistKey() {
  const key = draftKey.value.trim() || null
  try {
    await patchLocalTrack({ key })
  } catch {
    /* toasted */
  }
}

async function persistMoods() {
  const moods = [...draftMoods.value]
  try {
    await patchLocalTrack({ mood: moods.length ? moods : null })
  } catch {
    /* toasted */
  }
}

async function persistDescription() {
  const description = draftDescription.value.trim() || null
  try {
    await patchLocalTrack({ description })
  } catch {
    /* toasted */
  }
}

async function generateDescriptionInline() {
  if (!localTrack.value?.title || !localTrack.value?.artist || generatingDescription.value) {
    return
  }

  generatingDescription.value = true
  descriptionError.value = null
  try {
    const headers = await useAuthHeaders()
    const result = await $fetch<{ description: string }>('/api/integrations/track/description/generate', {
      method: 'POST',
      headers,
      body: {
        title: localTrack.value.title,
        artist: localTrack.value.artist,
        genre: localTrack.value.genre || undefined,
        mood: localTrack.value.mood || undefined,
        bpm: localTrack.value.bpm ?? undefined,
        key: localTrack.value.key || undefined,
      },
    })
    draftDescription.value = result.description
    await patchLocalTrack({ description: result.description })
    showSuccess('Description generated')
  } catch (err: any) {
    descriptionError.value =
      err?.data?.statusMessage || err?.message || 'Failed to generate description'
  } finally {
    generatingDescription.value = false
  }
}

async function analyzeBpmInline() {
  if (!localTrack.value?.storage_path || !supabase || analyzingBpm.value) return
  analyzingBpm.value = true
  bpmError.value = null
  try {
    const audioData = await downloadAudioBlob(localTrack.value, supabase)
    const detected = await analyzeBPM(audioData)
    draftBpm.value = detected
    await patchLocalTrack({ bpm: detected })
  } catch (err: unknown) {
    bpmError.value = err instanceof Error ? err.message : 'Failed to analyze BPM'
  } finally {
    analyzingBpm.value = false
  }
}

async function analyzeKeyInline() {
  if (!localTrack.value?.storage_path || !supabase || analyzingKey.value) return
  analyzingKey.value = true
  keyError.value = null
  try {
    const audioData = await downloadAudioBlob(localTrack.value, supabase)
    const detected = await analyzeKey(audioData)
    draftKey.value = detected
    await patchLocalTrack({ key: detected })
  } catch (err: unknown) {
    keyError.value = err instanceof Error ? err.message : 'Failed to analyze key'
  } finally {
    analyzingKey.value = false
  }
}

async function detectMoodsInline() {
  if (!localTrack.value?.storage_path || !supabase || detectingMoods.value) return
  detectingMoods.value = true
  moodError.value = null
  try {
    const audioData = await downloadAudioBlob(localTrack.value, supabase)
    const moods = await analyzeMoodFromAudio(audioData)
    draftMoods.value = moods
    await patchLocalTrack({ mood: moods.length ? moods : null })
    if (moods.length) showSuccess(`Detected: ${moods.join(', ')}`)
  } catch (err: unknown) {
    moodError.value = err instanceof Error ? err.message : 'Failed to detect moods'
  } finally {
    detectingMoods.value = false
  }
}

async function persistArtworkFile(file: File, successMessage: string) {
  if (!localTrack.value?.id || !supabase) return

  setCoverProgress(70, 'Processing image…')
  const { file: processedFile } = await validateAndProcessArtwork(file)

  setCoverProgress(82, 'Uploading to storage…')
  const uploaded = await uploadArtwork(processedFile, 'track')

  if (localTrack.value.artwork_path) {
    try {
      await deleteArtwork(
        {
          id: localTrack.value.id,
          artwork_path: localTrack.value.artwork_path,
          artwork_provider: localTrack.value.artwork_provider,
        },
        'track',
      )
    } catch (err) {
      console.warn('Failed to delete previous artwork:', err)
    }
  }

  setCoverProgress(92, 'Saving to track…')
  await patchLocalTrack({
    artwork_path: uploaded.artwork_path,
    artwork_provider: uploaded.artwork_provider,
  })
  await refreshArtworkPreview()
  setCoverProgress(100, 'Done')
  showSuccess(successMessage)
}

function openArtworkFilePicker() {
  artworkFileInput.value?.click()
}

async function uploadArtworkInline(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || uploadingArtwork.value || generatingArtwork.value || !localTrack.value?.id) {
    input.value = ''
    return
  }

  uploadingArtwork.value = true
  artworkError.value = null
  setCoverProgress(15, 'Reading file…')
  try {
    await persistArtworkFile(file, 'Cover uploaded')
  } catch (err: unknown) {
    artworkError.value = err instanceof Error ? err.message : 'Failed to upload cover'
  } finally {
    uploadingArtwork.value = false
    coverProgress.value = 0
    coverProgressLabel.value = ''
    input.value = ''
  }
}

async function generateArtworkInline() {
  if (
    !canGenerateArtwork.value ||
    generatingArtwork.value ||
    uploadingArtwork.value ||
    !localTrack.value?.id ||
    !supabase
  ) {
    return
  }

  generatingArtwork.value = true
  artworkError.value = null
  setCoverProgress(8, 'Starting…')
  startCoverWaitPulse(12, 48)
  try {
    const title = localTrack.value.title.trim()
    const artist = localTrack.value.artist.trim()
    const moodStr = moodTagsFromTrack(localTrack.value).join(', ') || undefined

    setCoverProgress(18, 'Generating with AI…')
    const { generateCoverViaJob } = await import('~/utils/coverGenerateClient')
    const result = await generateCoverViaJob({
      title,
      artist,
      genre: localTrack.value.genre?.trim() || undefined,
      mood: moodStr,
      direction: coverDirection.value.trim().slice(0, COVER_DIRECTION_MAX) || undefined,
      model: selectedCoverModel.value || undefined,
    })

    clearCoverWaitTimer()
    setCoverProgress(55, 'Decoding image…')
    const binary = atob(result.base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const blob = new Blob([bytes], { type: result.mimeType || 'image/png' })
    const file = new File([blob], result.filename || 'cover-ai.png', {
      type: result.mimeType || 'image/png',
    })

    await persistArtworkFile(file, 'Cover saved')
  } catch (err: any) {
    const statusCode = Number(err?.statusCode || err?.status || err?.response?.status || 0)
    const raw =
      err?.data?.statusMessage || err?.message || 'Failed to generate cover'
    if (
      statusCode === 504 ||
      statusCode === 408 ||
      /504|gateway timeout|timed?\s*out/i.test(String(raw))
    ) {
      artworkError.value =
        'Cover generation timed out. Wait for the background job or try Flare (faster).'
    } else {
      artworkError.value = raw
    }
  } finally {
    clearCoverWaitTimer()
    generatingArtwork.value = false
    coverProgress.value = 0
    coverProgressLabel.value = ''
  }
}

function onShowUpdate(value: boolean) {
  emit('update:show', value)
}

function close() {
  preserveStateOnClose.value = false
  expandedField.value = null
  revokeLocalVideoUrl()
  emit('update:show', false)
}

function openGenerateVideo() {
  if (!localTrack.value) return
  preserveStateOnClose.value = true
  emit('generate-video', {
    track: localTrack.value,
    preferLandscape: youtubeConnected.value && youtubeSelected.value,
  })
  emit('update:show', false)
}

function mapProviderStatus(status: string | undefined): SyncStatus {
  if (status === 'synced') return 'synced'
  if (status === 'failed') return 'failed'
  if (status === 'pending') return 'pending'
  return 'not_synced'
}

async function refreshArtworkPreview() {
  artworkPreviewUrl.value = null
  if (!localTrack.value?.artwork_path) return
  try {
    artworkPreviewUrl.value = await resolveArtworkUrlForEntity(
      {
        id: localTrack.value.id,
        artwork_path: localTrack.value.artwork_path,
        artwork_provider: localTrack.value.artwork_provider,
      },
      'track',
    )
  } catch {
    artworkPreviewUrl.value = null
  }
}

async function refreshLocalVideo() {
  revokeLocalVideoUrl()
  if (!localTrack.value?.id || !import.meta.client) {
    hasLocalVideo.value = false
    return
  }
  try {
    const exports = await getExportsForTrack(localTrack.value.id)
    hasLocalVideo.value = exports.length > 0
    const latest = exports[0]
    if (latest?.blob) {
      localVideoUrl.value = URL.createObjectURL(latest.blob)
    }
  } catch {
    hasLocalVideo.value = false
  }
}

/** If track has a local video but no artwork, capture a frame and save it to the track. */
async function recoverArtworkFromLocalVideo() {
  if (
    recoveringArtwork.value ||
    !localTrack.value?.id ||
    localTrack.value.artwork_path ||
    !supabase ||
    !import.meta.client
  ) {
    return
  }

  recoveringArtwork.value = true
  try {
    const exports = await getExportsForTrack(localTrack.value.id)
    const latest = exports[0]
    if (!latest?.blob) return

    const frameFile = await captureVideoFrameAsFile(latest.blob)
    const uploaded = await uploadArtwork(frameFile, 'track')
    const { data, error } = await supabase
      .from('sounds')
      .update({
        artwork_path: uploaded.artwork_path,
        artwork_provider: uploaded.artwork_provider,
      })
      .eq('id', localTrack.value.id)
      .select('id, artwork_path, artwork_provider')
      .maybeSingle()

    if (error) throw error

    const updatedTrack: Track = {
      ...localTrack.value,
      artwork_path:
        (typeof data?.artwork_path === 'string' ? data.artwork_path : null) ??
        uploaded.artwork_path,
      artwork_provider:
        (data?.artwork_provider as Track['artwork_provider']) ??
        uploaded.artwork_provider,
    }
    localTrack.value = updatedTrack
    emit('track-refreshed', updatedTrack)
    window.dispatchEvent(
      new CustomEvent('track-updated', {
        detail: { track: updatedTrack },
        bubbles: true,
      }),
    )
    await refreshArtworkPreview()
    showSuccess('Cover saved from video')
  } catch (err) {
    console.warn('Could not recover artwork from local video:', err)
  } finally {
    recoveringArtwork.value = false
  }
}

async function loadIntegrations(opts?: { preserveSelections?: boolean }) {
  const headers = await useAuthHeaders()
  if (!headers.Authorization) return

  const data = await $fetch<{
    integrations: {
      soundcloud: { connected: boolean; username?: string | null }
      youtube: { connected: boolean; username?: string | null }
    }
  }>('/api/integrations', { headers })

  soundcloudConnected.value = Boolean(data.integrations.soundcloud.connected)
  soundcloudUsername.value = data.integrations.soundcloud.username || null
  if (!soundcloudSyncUiEnabled) {
    soundcloudSelected.value = false
  } else if (soundcloudConnected.value && !opts?.preserveSelections) {
    soundcloudSelected.value = true
  }

  youtubeConnected.value = Boolean(data.integrations.youtube?.connected)
  youtubeUsername.value = data.integrations.youtube?.username || null
  if (youtubeConnected.value && !opts?.preserveSelections) {
    youtubeSelected.value = true
  }
}

async function loadSyncStatus() {
  if (!localTrack.value?.id) return
  const headers = await useAuthHeaders()
  if (!headers.Authorization) return

  const data = await $fetch<{
    providers: Record<
      string,
      {
        status: string
        externalId?: string | null
        permalink: string | null
        lastError: string | null
      }
    >
  }>('/api/integrations/sync-status', {
    headers,
    query: { sound_id: localTrack.value.id },
  })

  const sc = data.providers.soundcloud
  soundcloudStatus.value = mapProviderStatus(sc?.status)
  soundcloudPermalink.value = sc?.permalink || null

  const yt = data.providers.youtube
  youtubeStatus.value = mapProviderStatus(yt?.status)
  youtubePermalink.value = yt?.permalink || null
  youtubeExternalId.value =
    typeof yt?.externalId === 'string' && yt.externalId.trim() ? yt.externalId.trim() : null

  syncError.value = yt?.lastError || sc?.lastError || null
}

async function refreshDrawerData(opts?: { preserveSelections?: boolean }) {
  try {
    await refreshEntitlements()
    if (!has('track_sync')) return
    await Promise.all([
      loadIntegrations(opts),
      loadSyncStatus(),
      refreshLocalVideo(),
      refreshArtworkPreview(),
    ])
    await recoverArtworkFromLocalVideo()
  } catch (err: unknown) {
    const message =
      (err as any)?.data?.statusMessage ||
      (err instanceof Error ? err.message : 'Failed to load sync')
    showError(message)
  }
}

async function connectSoundCloud() {
  connectingSoundcloud.value = true
  try {
    const headers = await useAuthHeaders()
    const returnTo = `${window.location.pathname}${window.location.search}`
    const data = await $fetch<{ authorizeUrl: string }>(
      '/api/integrations/soundcloud/connect',
      { headers, query: { return_to: returnTo } },
    )
    window.location.href = data.authorizeUrl
  } catch (err: unknown) {
    const message =
      (err as any)?.data?.statusMessage ||
      (err instanceof Error ? err.message : 'Failed to start SoundCloud connect')
    showError(message)
    connectingSoundcloud.value = false
  }
}

async function disconnectSoundCloud() {
  disconnectingSoundcloud.value = true
  try {
    const headers = await useAuthHeaders()
    await $fetch('/api/integrations/soundcloud', { method: 'DELETE', headers })
    soundcloudConnected.value = false
    soundcloudUsername.value = null
    soundcloudSelected.value = false
    showSuccess('SoundCloud disconnected')
  } catch (err: unknown) {
    showError(
      (err as any)?.data?.statusMessage ||
        (err instanceof Error ? err.message : 'Failed to disconnect'),
    )
  } finally {
    disconnectingSoundcloud.value = false
  }
}

async function connectYouTube() {
  connectingYoutube.value = true
  try {
    const headers = await useAuthHeaders()
    const returnTo = `${window.location.pathname}${window.location.search}`
    const data = await $fetch<{ authorizeUrl: string }>(
      '/api/integrations/youtube/connect',
      { headers, query: { return_to: returnTo } },
    )
    window.location.href = data.authorizeUrl
  } catch (err: unknown) {
    showError(
      (err as any)?.data?.statusMessage ||
        (err instanceof Error ? err.message : 'Failed to start YouTube connect'),
    )
    connectingYoutube.value = false
  }
}

async function disconnectYouTube() {
  disconnectingYoutube.value = true
  try {
    const headers = await useAuthHeaders()
    await $fetch('/api/integrations/youtube', { method: 'DELETE', headers })
    youtubeConnected.value = false
    youtubeUsername.value = null
    youtubeSelected.value = false
    youtubeExternalId.value = null
    youtubePermalink.value = null
    youtubeStatus.value = 'not_synced'
    showSuccess('YouTube disconnected')
  } catch (err: unknown) {
    showError(
      (err as any)?.data?.statusMessage ||
        (err instanceof Error ? err.message : 'Failed to disconnect'),
    )
  } finally {
    disconnectingYoutube.value = false
  }
}

async function runSync() {
  if (!localTrack.value?.id || !canSync.value) return
  syncing.value = true
  syncError.value = null
  const errors: string[] = []

  try {
    if (soundcloudSelected.value && soundcloudConnected.value) {
      soundcloudStatus.value = 'syncing'
      try {
        const headers = await useAuthHeaders()
        const result = await $fetch<{ permalink?: string | null }>(
          '/api/integrations/soundcloud/sync',
          {
            method: 'POST',
            headers,
            body: { sound_id: localTrack.value.id },
          },
        )
        soundcloudStatus.value = 'synced'
        soundcloudPermalink.value = result.permalink || null
        showSuccess('Synced to SoundCloud')
      } catch (err: unknown) {
        soundcloudStatus.value = 'failed'
        const message =
          (err as any)?.data?.statusMessage ||
          (err instanceof Error ? err.message : 'SoundCloud sync failed')
        errors.push(message)
      }
    }

    if (youtubeSelected.value && youtubeConnected.value) {
      youtubeStatus.value = 'syncing'
      try {
        const headers = await useAuthHeaders()

        if (youtubeExternalId.value) {
          const result = await $fetch<{
            permalink?: string | null
            videoId?: string
            updated?: boolean
          }>('/api/integrations/youtube/sync', {
            method: 'POST',
            headers,
            body: { sound_id: localTrack.value.id },
          })
          youtubeStatus.value = 'synced'
          youtubePermalink.value = result.permalink || youtubePermalink.value
          if (result.videoId) youtubeExternalId.value = result.videoId
          showSuccess('Updated YouTube listing')
        } else {
          await refreshLocalVideo()
          if (!hasLocalVideo.value) {
            throw new Error('Generate a video for this track first')
          }
          const exports = await getExportsForTrack(localTrack.value.id)
          const latest = exports[0]
          if (!latest?.blob) throw new Error('No video export found')

          const username = (localTrack.value as any).username as string | undefined
          const trackUrl = username
            ? `${publishSiteOrigin}/u/${username}/t/${localTrack.value.id}`
            : `${publishSiteOrigin}/u/${localTrack.value.user_id}`

          const result = await uploadTrackVideoToYouTube({
            track: localTrack.value,
            videoBlob: latest.blob,
            trackUrl,
          })
          youtubeStatus.value = 'synced'
          youtubePermalink.value = result.permalink
          youtubeExternalId.value = result.videoId
          showSuccess('Synced to YouTube')
        }
      } catch (err: unknown) {
        youtubeStatus.value = 'failed'
        const message =
          (err as any)?.data?.statusMessage ||
          (err instanceof Error ? err.message : 'YouTube sync failed')
        errors.push(message)
        try {
          const headers = await useAuthHeaders()
          await $fetch('/api/integrations/youtube/sync-complete', {
            method: 'POST',
            headers,
            body: { sound_id: localTrack.value.id, error: message },
          })
        } catch {
          // ignore status write failure
        }
      }
    }

    if (errors.length) {
      syncError.value = errors.join(' · ')
      showError(syncError.value)
    }
  } finally {
    syncing.value = false
    if (localTrack.value?.id) {
      window.dispatchEvent(
        new CustomEvent('track-sync-updated', {
          detail: { trackId: localTrack.value.id },
          bubbles: true,
        }),
      )
    }
  }
}

function applyUpdatedTrack(track: Track) {
  if (!localTrack.value || track.id !== localTrack.value.id) return
  localTrack.value = { ...localTrack.value, ...track }
  if (Object.prototype.hasOwnProperty.call(track, 'youtube_title')) {
    hydrateYoutubeTitleDraft(localTrack.value)
  }
  emit('track-refreshed', localTrack.value)
  void refreshArtworkPreview()
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible' && props.show) {
    void refreshLocalVideo()
  }
}

function onTrackVideoReady(event: Event) {
  const trackId = (event as CustomEvent<{ trackId?: number }>).detail?.trackId
  if (!localTrack.value?.id || trackId == null) return
  if (Number(trackId) !== Number(localTrack.value.id)) return
  void refreshLocalVideo()
}

watch(
  () => props.show,
  async (open) => {
    if (!open) return
    const returningFromVideo = preserveStateOnClose.value
    preserveStateOnClose.value = false
    if (!returningFromVideo) {
      localTrack.value = props.track ? { ...props.track } : null
      hydrateYoutubeTitleDraft(localTrack.value)
      syncError.value = null
      expandedField.value = null
    }
    await refreshDrawerData({ preserveSelections: returningFromVideo })
  },
)

watch(
  () => props.track,
  (track) => {
    if (props.show && track) {
      localTrack.value = { ...track }
      hydrateYoutubeTitleDraft(localTrack.value)
    }
  },
)

function onTrackUpdated(event: Event) {
  const detail = (event as CustomEvent<{ track?: Track } | Track>).detail
  const track =
    detail && typeof detail === 'object' && 'track' in detail && detail.track
      ? detail.track
      : (detail as Track | undefined)
  if (track?.id) applyUpdatedTrack(track)
}

watch(
  () => props.show,
  (open) => {
    if (!import.meta.client) return
    if (open) {
      window.addEventListener('track-updated', onTrackUpdated)
      document.addEventListener('visibilitychange', onVisibilityChange)
      void refreshLocalVideo()
    } else {
      window.removeEventListener('track-updated', onTrackUpdated)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  },
)

if (import.meta.client) {
  // Keep listening while mounted so video saves during Generate handoff are not missed
  window.addEventListener('track-video-ready', onTrackVideoReady)
}

onUnmounted(() => {
  clearCoverWaitTimer()
  if (!import.meta.client) return
  window.removeEventListener('track-updated', onTrackUpdated)
  window.removeEventListener('track-video-ready', onTrackVideoReady)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  revokeLocalVideoUrl()
})
</script>
