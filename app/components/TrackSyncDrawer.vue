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

    <div class="flex flex-col gap-4 h-full text-sm text-neutral-300">
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
          <ul class="flex flex-col gap-1.5">
            <li
              v-for="field in metadataFields"
              :key="field.key"
              class="flex items-start justify-between gap-2 rounded-md border border-neutral-800 px-2.5 py-2"
            >
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
                  <template v-else-if="field.filled">{{ field.valuePreview }}</template>
                  <template v-else>Empty</template>
                </p>
              </div>
              <Button
                v-if="field.severity !== 'info' && !field.filled"
                variant="ghost"
                size="sm"
                class="shrink-0"
                @click="openEditTrack"
              >
                Edit
              </Button>
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

          <div
            class="flex items-center justify-between gap-3 rounded-md border border-neutral-800 px-2.5 py-2"
          >
            <label class="flex items-center gap-2 min-w-0 cursor-pointer">
              <input
                v-model="youtubeSelected"
                type="checkbox"
                class="rounded border-neutral-600 bg-neutral-900 text-amber-500 focus:ring-amber-500"
                :disabled="!youtubeConnected || syncing"
              >
              <span class="text-neutral-100">YouTube</span>
            </label>
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-xs" :class="youtubeStatusClass">{{ youtubeStatusLabel }}</span>
              <a
                v-if="youtubePermalink"
                :href="youtubePermalink"
                target="_blank"
                rel="noopener noreferrer"
                class="text-link text-xs no-underline"
              >View</a>
            </div>
          </div>
          <div
            v-if="youtubeConnected && youtubeSelected"
            class="flex items-center justify-between gap-2 px-1"
          >
            <p
              class="text-xs"
              :class="hasLocalVideo ? 'text-green-400' : 'text-amber-400'"
            >
              <template v-if="hasLocalVideo">
                Local video ready for YouTube upload.
              </template>
              <template v-else>
                Generate a video first (cover art can be AI-generated if missing).
              </template>
            </p>
            <Button variant="ghost" size="sm" @click="openGenerateVideo">
              {{ hasLocalVideo ? 'Replace video' : 'Generate video' }}
            </Button>
          </div>

          <div
            class="flex items-center justify-between gap-3 rounded-md border border-neutral-800 px-2.5 py-2"
          >
            <label class="flex items-center gap-2 min-w-0 cursor-pointer">
              <input
                v-model="soundcloudSelected"
                type="checkbox"
                class="rounded border-neutral-600 bg-neutral-900 text-amber-500 focus:ring-amber-500"
                :disabled="!soundcloudConnected || syncing"
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

          <div class="flex items-center justify-between gap-2">
            <div>
              <p class="text-neutral-200">
                SoundCloud
                <span v-if="soundcloudConnected && soundcloudUsername" class="text-neutral-500">
                  · {{ soundcloudUsername }}
                </span>
              </p>
              <p class="text-xs text-neutral-500">
                {{ soundcloudConnected ? 'Connected' : 'Requires SoundCloud Artist Pro app credentials' }}
              </p>
            </div>
            <Button
              v-if="!soundcloudConnected"
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

        <section class="sticky bottom-0 flex flex-row gap-2 justify-end border-t border-neutral-800 bg-neutral-900 p-2 mt-auto z-20">
          <Button variant="ghost" :disabled="syncing" @click="close">Cancel</Button>
          <Button :disabled="!canSync || syncing" @click="runSync">
            {{ syncing ? 'Syncing…' : 'Sync selected' }}
          </Button>
        </section>
      </template>
    </div>
  </MasterDrawer>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import MasterDrawer from '~/components/MasterDrawer.vue'
import Button from '~/components/Button.vue'
import { useAuthHeaders } from '~/composables/useAuthHeaders'
import { useEntitlements } from '~/composables/useEntitlements'
import { useToast } from '~/composables/useToast'
import { useArtwork } from '~/composables/useArtwork'
import { useSupabase } from '~/utils/supabase'
import { getExportsForTrack } from '~/composables/useTrackVideoHistory'
import { uploadTrackVideoToYouTube } from '~/composables/useYouTubeUpload'
import { usePublishSiteOrigin } from '~/composables/useSiteOrigin'
import { captureVideoFrameAsFile } from '~/utils/captureVideoFrame'
import type { Track } from '~/types/track'
import {
  getMetadataFieldStatuses,
  hasRequiredMetadata,
  type MetadataFieldStatus,
} from '~/utils/soundcloudTrackMetadata'

type SyncStatus = 'synced' | 'not_synced' | 'pending' | 'failed' | 'syncing' | 'needs_video'

const props = defineProps<{
  show: boolean
  track: Track | null
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  'track-refreshed': [track: Track]
  'generate-video': [track: Track]
}>()

const { has, refresh: refreshEntitlements } = useEntitlements()
const { showSuccess, showError } = useToast()
const publishSiteOrigin = usePublishSiteOrigin()
const { resolveArtworkUrlForEntity, uploadArtwork } = useArtwork()
const { supabase } = useSupabase()

const localTrack = ref<Track | null>(null)

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
  () => youtubeConnected.value && youtubeSelected.value && !hasLocalVideo.value,
)

const canSync = computed(() => {
  if (!requiredReady.value || syncing.value) return false
  const wantSc = soundcloudConnected.value && soundcloudSelected.value
  const wantYt = youtubeConnected.value && youtubeSelected.value
  if (!wantSc && !wantYt) return false
  if (wantYt && !hasLocalVideo.value) return false
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
const youtubeStatusLabel = computed(() => {
  if (youtubeNeedsVideo.value) return 'Needs video'
  return statusLabel(youtubeStatus.value, youtubeConnected.value)
})
const youtubeStatusClass = computed(() =>
  statusClassFor(youtubeNeedsVideo.value ? 'needs_video' : youtubeStatus.value),
)

function fieldStatusClass(field: MetadataFieldStatus): string {
  if (field.severity === 'info') return 'text-neutral-500'
  if (field.filled) return 'text-neutral-400'
  if (field.severity === 'required') return 'text-red-400'
  return 'text-amber-400'
}

function onShowUpdate(value: boolean) {
  emit('update:show', value)
}

function close() {
  preserveStateOnClose.value = false
  revokeLocalVideoUrl()
  emit('update:show', false)
}

function openEditTrack() {
  if (!localTrack.value) return
  window.dispatchEvent(
    new CustomEvent('edit-track', {
      detail: localTrack.value,
      bubbles: true,
    }),
  )
}

function openGenerateVideo() {
  if (!localTrack.value) return
  preserveStateOnClose.value = true
  emit('generate-video', localTrack.value)
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

    localTrack.value = {
      ...localTrack.value,
      artwork_path: data?.artwork_path ?? uploaded.artwork_path,
      artwork_provider: data?.artwork_provider ?? uploaded.artwork_provider,
    }
    emit('track-refreshed', localTrack.value)
    window.dispatchEvent(
      new CustomEvent('track-updated', {
        detail: { track: localTrack.value },
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
  if (soundcloudConnected.value && !opts?.preserveSelections) {
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
      { status: string; permalink: string | null; lastError: string | null }
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
        showSuccess('Synced to YouTube')
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
      syncError.value = null
    }
    await refreshDrawerData({ preserveSelections: returningFromVideo })
  },
)

watch(
  () => props.track,
  (track) => {
    if (props.show && track) localTrack.value = { ...track }
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
  if (!import.meta.client) return
  window.removeEventListener('track-updated', onTrackUpdated)
  window.removeEventListener('track-video-ready', onTrackVideoReady)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  revokeLocalVideoUrl()
})
</script>
