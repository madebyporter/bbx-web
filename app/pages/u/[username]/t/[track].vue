<template>
  <div class="flex flex-col gap-0 text-neutral-300 grow h-full">
    <div v-if="loading" class="flex items-center justify-center p-8 h-full w-full grow">
      <LoadingLogo />
    </div>

    <div v-else-if="!track" class="text-neutral-500 p-4">
      Track not found.
    </div>

    <template v-else>
      <!-- Track Header with Group Link -->
      <div class="p-4 border-b border-neutral-800">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <button @click="handlePlay"
              class="min-w-16 w-16 h-16 flex items-center justify-center bg-white hover:bg-neutral-100 rounded-full text-black transition-transform cursor-pointer">
              <svg v-if="isPlaying && currentTrack?.id === track.id" class="w-8 h-8" fill="currentColor"
                viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
              <svg v-else class="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            <div class="flex flex-col gap-1">
              <h1 class="text-3xl font-bold">{{ track.title || 'Untitled' }}</h1>
              <p class="text-neutral-400">{{ track.artist || 'Unknown Artist' }}</p>
              <p class="text-sm text-neutral-500 mt-2">
                Version: {{ track.version }}
                <span v-if="track.track_group_name" class="ml-2">
                  | Group:
                  <NuxtLink :to="`/u/${username}/g/${track.track_group_name}`" class="text-blue-400 hover:underline">
                    {{ track.track_group_name }}
                  </NuxtLink>
                </span>
              </p>
            </div>
          </div>
          
          <!-- Status Dropdown (Owner Only) -->
          <div v-if="isOwnProfile" class="flex items-center gap-2 w-full md:w-auto">
            <select 
              v-if="statuses.length > 0"
              :value="track.status_id || ''"
              @change="updateTrackStatus(track.id, $event.target.value ? parseInt($event.target.value) : null)"
              class="px-3 py-2 bg-neutral-800 border border-neutral-700 hover:border-neutral-600 rounded text-sm text-neutral-200 cursor-pointer outline-none min-w-[160px] w-full md:w-auto"
            >
              <option value="">No Status</option>
              <option v-for="status in statuses" :key="status.id" :value="status.id">
                {{ status.name }}
              </option>
            </select>
            <div v-else class="text-xs text-neutral-500">Loading...</div>
          </div>
        </div>

      </div>

      <!-- Playback Section -->
      <div class="p-4 border-b border-neutral-800">
        <div class="flex items-center gap-4">
          <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
            <div><span class="text-neutral-500">Duration:</span> {{ formatDuration(track.duration) }}</div>
            <div><span class="text-neutral-500">Genre:</span> {{ track.genre || '-' }}</div>
            <div><span class="text-neutral-500">BPM:</span> {{ track.bpm || '-' }}</div>
            <div><span class="text-neutral-500">Key:</span> {{ track.key || '-' }}</div>
            <div><span class="text-neutral-500">Year:</span> {{ track.year || '-' }}</div>
            <div><span class="text-neutral-500">Mood:</span> {{ track.mood?.join(', ') || '-' }}</div>
            <div>
              <span class="text-neutral-500">Collections: </span>
              <span v-if="collections.length === 0">-</span>
              <span v-else>
                <NuxtLink v-for="(collection, index) in collections" :key="collection.id"
                  :to="`/u/${username}/c/${collection.slug}`"
                  class="text-amber-400 hover:text-amber-300 hover:underline">{{ collection.name }}<span
                    v-if="index < collections.length - 1">, </span></NuxtLink>
              </span>
            </div>
          </div>
        </div>
        <!-- Download Sample Button -->
        <div class="mt-4">
          <button 
            @click="handleDownloadSample"
            :disabled="isDownloading"
            class="btn w-full md:w-auto flex items-center gap-2"
            :class="{ 'opacity-50 cursor-not-allowed': isDownloading }"
          >
            <svg v-if="!isDownloading" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ isDownloading ? 'Generating Sample...' : 'Download Sample' }}
          </button>
        </div>
      </div>

      <!-- Edit Section (if own profile) -->
      <div v-if="isOwnProfile" class="p-4 border-b border-neutral-800">
        <button @click="handleEdit" class="btn w-full">
          Edit Track Metadata
        </button>
      </div>

      <!-- Other Tracks in Group -->
      <div v-if="groupTracks.length > 1" class="p-4">
        <h3 class="text-lg font-semibold mb-4">Other tracks in this group ({{ groupTracks.length - 1 }})</h3>
        <div class="space-y-2">
          <NuxtLink v-for="otherTrack in groupTracks.filter(t => t.id !== track.id)" :key="otherTrack.id"
            :to="`/u/${username}/t/${generateTrackSlug(otherTrack)}`"
            class="block p-3 bg-neutral-800/30 hover:bg-neutral-800/50 rounded transition-colors">
            <div class="font-medium">{{ otherTrack.title }}</div>
            <div class="text-sm text-neutral-400">Version: {{ otherTrack.version }}</div>
          </NuxtLink>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import { useSupabase } from '~/utils/supabase'
import { usePlayer } from '~/composables/usePlayer'
import { useToast } from '~/composables/useToast'
import LoadingLogo from '~/components/LoadingLogo.vue'

const route = useRoute()
const { user } = useAuth()
const { supabase } = useSupabase()
const { loadQueue, currentTrack, isPlaying, togglePlayPause } = usePlayer()
const { showSuccess, showError } = useToast()
const config = useRuntimeConfig()
const siteUrl = config.public.SITE_URL || 'https://beatbox.studio'

const username = ref(route.params.username as string)
const groupTracks = ref<any[]>([])
const collections = ref<any[]>([])
const profileUserId = ref<string | null>(null)
const statuses = ref<Array<{ id: number; name: string }>>([])
const isDownloading = ref(false)

// Fetch track data server-side for SEO
// Use server: true to ensure it runs during SSR
const { data: trackData, pending: loading } = await useAsyncData(
  `track-${route.params.track}`,
  async () => {
    if (!supabase) return null
    
    const usernameParam = route.params.username as string
    const trackSlugParam = route.params.track as string
    
    // Extract track ID from slug (format: "slug-123")
    const trackIdMatch = trackSlugParam.match(/-(\d+)$/)
    const trackId = trackIdMatch ? parseInt(trackIdMatch[1]) : null
    
    if (!trackId) return null
    
    try {
      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', usernameParam)
        .single()
      
      if (profileError || !profileData) return null
      
      // Store profile ID
      profileUserId.value = profileData.id as string
      
      // Check if current user is the profile owner (only available on client)
      const isProfileOwner = process.client && user.value && user.value.id === profileData.id
      
      // Fetch the specific track
      // Always filter by user_id to ensure we get tracks from this profile
      // RLS will handle visibility (public tracks visible to all, private only to owner/members)
      const { data: trackData, error: trackError } = await supabase
        .from('sounds')
        .select('*')
        .eq('id', trackId)
        .eq('user_id', profileData.id)
        .maybeSingle() // Use maybeSingle() instead of single() to avoid errors if not found
      
      if (trackError) {
        console.error('Error fetching track:', trackError)
        return null
      }
      
      if (!trackData) {
        return null // Track not found
      }
      
      // Initialize track_statuses as null
      trackData.track_statuses = null
      
      // Only fetch track_statuses if the current user is the track owner
      // Non-owners should not see track statuses
      // Only try to fetch on client-side where user context is available
      if (process.client && isProfileOwner && trackData.status_id) {
        try {
          // Fetch track_status only for the owner
          // Wrap in try-catch to handle RLS gracefully
          const { data: statusData, error: statusError } = await supabase
            .from('track_statuses')
            .select('id, name')
            .eq('id', trackData.status_id)
            .single()
          
          if (!statusError && statusData) {
            trackData.track_statuses = statusData
          }
        } catch (error) {
          // Silently fail - track_statuses will remain null
          console.debug('Could not fetch track_status (expected for non-owners):', error)
        }
      }
      
      // Hide status_id from non-owners
      if (!isProfileOwner) {
        trackData.status_id = null
      }
      
      return trackData
    } catch (error) {
      console.error('Error fetching track:', error)
      return null
    }
  },
  {
    server: true // Ensure this runs on the server for SSR
  }
)

// Store initial data for SEO (available during SSR)
const initialTrackData = trackData.value

const track = computed(() => trackData.value)

const isOwnProfile = computed(() => {
  return !!(user.value && profileUserId.value && user.value.id === profileUserId.value)
})

// Fetch collections and group tracks client-side (not critical for SEO)
const fetchCollectionsAndGroup = async () => {
  if (!supabase || !track.value) return
  
  try {
    // Only show collections if user is logged in
    if (!user.value) {
      collections.value = []
      return
    }
    
    // Fetch collections that contain this track AND are owned by the logged-in user
    const { data: junctionData } = await supabase
      .from('collections_sounds')
      .select('collection_id')
      .eq('sound_id', track.value.id)
    
    if (junctionData && junctionData.length > 0) {
      const collectionIds = junctionData.map((item: any) => item.collection_id)
      const { data: colData } = await supabase
        .from('collections')
        .select('id, name, slug')
        .in('id', collectionIds)
        .eq('user_id', user.value.id) // Only show collections owned by logged-in user
        .order('name')
      
      collections.value = colData || []
    } else {
      collections.value = []
    }
    
    // Fetch other tracks in the same group
    if (track.value.track_group_name && profileUserId.value) {
      const { data: groupData } = await supabase
        .from('sounds')
        .select('*')
        .eq('user_id', profileUserId.value)
        .eq('track_group_name', track.value.track_group_name)
        .order('version', { ascending: false })
      
      groupTracks.value = groupData || []
    }
  } catch (error) {
    console.error('Error fetching collections and group:', error)
  }
}

const handlePlay = async () => {
  if (!track.value) return
  
  // If this track is already playing, toggle play/pause
  if (currentTrack.value?.id === track.value.id && isPlaying.value) {
    togglePlayPause()
    return
  }
  
  // If this track is loaded but paused, just resume
  if (currentTrack.value?.id === track.value.id && !isPlaying.value) {
    await togglePlayPause()
    return
  }
  
  // Otherwise, load and play the track
  await loadQueue([track.value], `track-${track.value.id}`, 0)
}

const handleEdit = () => {
  const event = new CustomEvent('edit-track', { 
    detail: track.value,
    bubbles: true,
    composed: true
  })
  window.dispatchEvent(event)
}

const handleDownloadSample = async () => {
  if (!track.value || isDownloading.value) return
  
  isDownloading.value = true
  
  try {
    const trackId = track.value.id
    const storagePath = track.value.storage_path
    const usernameParam = username.value
    
    if (!trackId || !storagePath) {
      showError('Track information missing')
      return
    }
    
    // Call Netlify function - use absolute URL to bypass Vue Router
    // Add cache-busting parameter to prevent browser caching
    const baseUrl = window.location.origin
    const timestamp = Date.now()
    const functionUrl = `${baseUrl}/.netlify/functions/download-sample?trackId=${trackId}&storagePath=${encodeURIComponent(storagePath)}&username=${encodeURIComponent(usernameParam)}&_t=${timestamp}`
    
    const response = await fetch(functionUrl, {
      cache: 'no-store' // Prevent browser caching
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to generate sample' }))
      throw new Error(error.error || 'Failed to generate sample')
    }
    
    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers.get('Content-Disposition')
    let filename = `sample-${trackId}.mp3`
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/i)
      if (filenameMatch) {
        filename = filenameMatch[1]
      }
    }
    
    // Download the file
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
    
    showSuccess('Sample downloaded successfully')
  } catch (error: any) {
    console.error('Error downloading sample:', error)
    showError(error.message || 'Failed to download sample')
  } finally {
    isDownloading.value = false
  }
}

function generateTrackSlug(t: any): string {
  if (t.title) {
    const slug = t.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    return `${slug}-${t.id}`
  }
  return `track-${t.id}`
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '-'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// Fetch statuses for the current user
const fetchStatuses = async () => {
  if (!supabase || !user.value || !isOwnProfile.value) return
  
  try {
    const { data, error } = await supabase
      .from('track_statuses')
      .select('id, name')
      .eq('user_id', user.value.id)
      .order('name')
    
    if (error) throw error
    
    // If user has no statuses, create defaults for them
    if (!data || data.length === 0) {
      await supabase.rpc('create_default_statuses_for_user', { target_user_id: user.value.id })
      
      // Fetch again after creating defaults
      const { data: newData } = await supabase
        .from('track_statuses')
        .select('id, name')
        .eq('user_id', user.value.id)
        .order('name')
      
      statuses.value = newData || []
    } else {
      statuses.value = data
    }
  } catch (error) {
    console.error('Error fetching statuses:', error)
    statuses.value = []
  }
}

// Update track status immediately
const updateTrackStatus = async (trackId: number, statusId: number | null) => {
  if (!supabase) return
  
  try {
    const { error } = await supabase
      .from('sounds')
      .update({ status_id: statusId })
      .eq('id', trackId)
    
    if (error) throw error
    
    // Update local track data
    if (track.value) {
      track.value.status_id = statusId
      if (statusId === null) {
        track.value.track_statuses = null
      } else {
        const status = statuses.value.find(s => s.id === statusId)
        if (status) {
          track.value.track_statuses = { id: status.id, name: status.name }
        }
      }
    }
    
    showSuccess('Status updated successfully')
  } catch (error) {
    console.error('Error updating track status:', error)
    showError('Failed to update status')
  }
}

// Set SEO meta tags - use initialTrackData for SSR, then trackData for updates
const usernameParam = route.params.username as string

// Use initialTrackData (available during SSR) or trackData (for client updates)
// This pattern ensures SEO has data during SSR
const trackForSEO = computed(() => {
  // During SSR, initialTrackData should be available
  // On client, trackData.value will be reactive
  return initialTrackData || trackData.value
})

const seoTitle = computed(() => {
  if (!trackForSEO.value) {
    return `Track by ${usernameParam} | Beatbox`
  }
  const trackTitle = trackForSEO.value.title || 'Untitled'
  const artist = trackForSEO.value.artist || usernameParam || 'Unknown Artist'
  return `${trackTitle} by ${artist} | Beatbox`
})

const seoDescription = computed(() => {
  if (!trackForSEO.value) {
    return `Listen to music by ${usernameParam} on Beatbox`
  }
  const trackTitle = trackForSEO.value.title || 'Untitled'
  const artist = trackForSEO.value.artist || usernameParam || 'Unknown Artist'
  
  const details = []
  if (trackForSEO.value.genre) details.push(trackForSEO.value.genre)
  if (trackForSEO.value.bpm) details.push(`${trackForSEO.value.bpm} BPM`)
  if (trackForSEO.value.key) details.push(trackForSEO.value.key)
  const detailsStr = details.length > 0 ? ` - ${details.join(', ')}` : ''
  
  return `Listen to ${trackTitle} by ${artist} on Beatbox${detailsStr}`
})

const seoUrl = computed(() => `${siteUrl}/u/${usernameParam}/t/${route.params.track}`)

// Set SEO meta tags using useHead to ensure they're evaluated during SSR
// Since useAsyncData with await ensures data is available during SSR, the computed properties
// will have the correct values when useHead is called
// Use key properties to ensure these override defaults from nuxt.config.ts
useHead({
  title: seoTitle,
  meta: [
    { name: 'description', content: seoDescription, key: 'description' },
    { property: 'og:title', content: seoTitle, key: 'og:title' },
    { property: 'og:description', content: seoDescription, key: 'og:description' },
    { property: 'og:url', content: seoUrl, key: 'og:url' },
    { property: 'og:type', content: 'music.song', key: 'og:type' },
    { property: 'og:image', content: `${siteUrl}/img/og-image.jpg`, key: 'og:image' },
    { property: 'og:image:width', content: '1200', key: 'og:image:width' },
    { property: 'og:image:height', content: '630', key: 'og:image:height' },
    { name: 'twitter:card', content: 'summary_large_image', key: 'twitter:card' },
    { name: 'twitter:title', content: seoTitle, key: 'twitter:title' },
    { name: 'twitter:description', content: seoDescription, key: 'twitter:description' },
    { name: 'twitter:image', content: `${siteUrl}/img/og-image.jpg`, key: 'twitter:image' }
  ],
  link: [
    { rel: 'canonical', href: seoUrl, key: 'canonical' }
  ]
})

// Listen for track update events (client-side only)
const handleTrackUpdate = () => {
  console.log('[track].vue: Received track update event, refreshing data')
  refreshNuxtData(`track-${route.params.track}`)
}

onMounted(async () => {
  // Fetch collections and group tracks (not critical for SEO)
  await fetchCollectionsAndGroup()
  
  // Fetch statuses if owner
  if (isOwnProfile.value) {
    await fetchStatuses()
  }
  
  // Listen for track updates
  window.addEventListener('track-updated', handleTrackUpdate)
})

onUnmounted(() => {
  window.removeEventListener('track-updated', handleTrackUpdate)
})
</script>

