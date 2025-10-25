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
        <div class="flex items-center gap-4">
          <button @click="handlePlay"
            class="w-16 h-16 flex items-center justify-center bg-white hover:bg-neutral-100 rounded-full text-black transition-transform cursor-pointer">
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
import LoadingLogo from '~/components/LoadingLogo.vue'

const route = useRoute()
const { user } = useAuth()
const { supabase } = useSupabase()
const { loadQueue, currentTrack, isPlaying } = usePlayer()
const config = useRuntimeConfig()
const siteUrl = config.public.SITE_URL || 'https://beatbox.studio'

const track = ref<any>(null)
const groupTracks = ref<any[]>([])
const collections = ref<any[]>([])
const loading = ref(true)
const profileUserId = ref<string | null>(null)
const username = ref('')

const isOwnProfile = computed(() => {
  return !!(user.value && profileUserId.value && user.value.id === profileUserId.value)
})

const fetchTrack = async () => {
  const usernameParam = route.params.username as string
  const trackSlugParam = route.params.track as string
  
  username.value = usernameParam
  
  // Extract track ID from slug (format: "slug-123")
  const trackIdMatch = trackSlugParam.match(/-(\d+)$/)
  const trackId = trackIdMatch ? parseInt(trackIdMatch[1]) : null
  
  if (!supabase || !trackId) {
    loading.value = false
    return
  }
  
  loading.value = true
  
  try {
    // Get user profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', usernameParam)
      .single()
    
    if (profileError || !profileData) {
      loading.value = false
      return
    }
    
    profileUserId.value = profileData.id as string
    
    // Fetch the specific track
    const { data: trackData, error: trackError } = await supabase
      .from('sounds')
      .select('*')
      .eq('id', trackId)
      .eq('user_id', profileData.id)
      .single()
    
    if (trackError || !trackData) {
      loading.value = false
      return
    }
    
    track.value = trackData
    
    // Fetch collections
    const { data: junctionData } = await supabase
      .from('collections_sounds')
      .select('collection_id')
      .eq('sound_id', trackData.id)
    
    if (junctionData && junctionData.length > 0) {
      const collectionIds = junctionData.map((item: any) => item.collection_id)
      const { data: colData } = await supabase
        .from('collections')
        .select('id, name, slug')
        .in('id', collectionIds)
        .order('name')
      
      collections.value = colData || []
    } else {
      collections.value = []
    }
    
    // Fetch other tracks in the same group
    if (trackData.track_group_name) {
      const { data: groupData } = await supabase
        .from('sounds')
        .select('*')
        .eq('user_id', profileData.id)
        .eq('track_group_name', trackData.track_group_name)
        .order('version', { ascending: false })
      
      groupTracks.value = groupData || []
    }
    
  } catch (error) {
    console.error('Error fetching track:', error)
  } finally {
    loading.value = false
  }
}

const handlePlay = () => {
  if (track.value) {
    loadQueue([track.value], `track-${track.value.id}`, 0)
  }
}

const handleEdit = () => {
  const event = new CustomEvent('edit-track', { 
    detail: track.value,
    bubbles: true,
    composed: true
  })
  window.dispatchEvent(event)
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

// SEO Meta Tags
const updateSeoMeta = () => {
  if (!track.value || !username.value) return
  
  const trackTitle = track.value.title || 'Untitled'
  const artist = track.value.artist || username.value
  const title = `${trackTitle} by ${artist} | Beatbox`
  
  // Build description with track details
  const details = []
  if (track.value.genre) details.push(track.value.genre)
  if (track.value.bpm) details.push(`${track.value.bpm} BPM`)
  if (track.value.key) details.push(track.value.key)
  const detailsStr = details.length > 0 ? ` - ${details.join(', ')}` : ''
  
  const description = `Listen to ${trackTitle} by ${artist} on Beatbox${detailsStr}`
  const url = `${siteUrl}/u/${username.value}/t/${route.params.track}`
  
  useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogUrl: url,
    ogType: 'music.song',
    twitterCard: 'summary',
    twitterTitle: title,
    twitterDescription: description
  })
  
  useHead({
    link: [
      { rel: 'canonical', href: url }
    ]
  })
}

// Watch for data changes to update SEO
watch(track, () => {
  updateSeoMeta()
}, { deep: true })

// Listen for track update events
const handleTrackUpdate = () => {
  console.log('[track].vue: Received track update event, refetching track')
  fetchTrack()
}

onMounted(async () => {
  await fetchTrack()
  
  // Listen for track updates
  window.addEventListener('track-updated', handleTrackUpdate)
})

onUnmounted(() => {
  window.removeEventListener('track-updated', handleTrackUpdate)
})
</script>

