<template>
  <div class="flex flex-col gap-0 text-neutral-300 grow">
    <div v-if="loading" class="text-neutral-500 p-4">Loading track...</div>

    <div v-else-if="!track" class="text-neutral-500 p-4">
      Track not found.
    </div>

    <template v-else>
      <!-- Track Header with Group Link -->
      <div class="p-4 border-b border-neutral-800">
        <h1 class="text-3xl font-bold">{{ track.title || 'Untitled' }}</h1>
        <p class="text-neutral-400">{{ track.artist || 'Unknown Artist' }}</p>
        <p class="text-sm text-neutral-500 mt-2">
          Version: {{ track.version }} 
          <span v-if="track.track_group_name" class="ml-2">
            | Group: 
            <NuxtLink 
              :to="`/u/${username}/track/${track.track_group_name}`"
              class="text-blue-400 hover:underline"
            >
              {{ track.track_group_name }}
            </NuxtLink>
          </span>
        </p>
      </div>

      <!-- Playback Section -->
      <div class="p-4 border-b border-neutral-800">
        <div class="flex items-center gap-4">
          <button 
            @click="handlePlay"
            class="w-16 h-16 flex items-center justify-center bg-white rounded-full text-black hover:scale-105 transition-transform"
          >
            <svg v-if="isPlaying && currentTrack?.id === track.id" class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
            <svg v-else class="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
          
          <div class="flex-1 grid grid-cols-2 gap-4 text-sm">
            <div><span class="text-neutral-500">Duration:</span> {{ formatDuration(track.duration) }}</div>
            <div><span class="text-neutral-500">Genre:</span> {{ track.genre || '-' }}</div>
            <div><span class="text-neutral-500">BPM:</span> {{ track.bpm || '-' }}</div>
            <div><span class="text-neutral-500">Year:</span> {{ track.year || '-' }}</div>
            <div><span class="text-neutral-500">Mood:</span> {{ track.mood?.join(', ') || '-' }}</div>
            <div><span class="text-neutral-500">Collections:</span> {{ collectionNames }}</div>
          </div>
        </div>
      </div>

      <!-- Edit Section (if own profile) -->
      <div v-if="isOwnProfile" class="p-4 border-b border-neutral-800">
        <button @click="handleEdit" class="btn-secondary">
          Edit Track Metadata
        </button>
      </div>

      <!-- Other Tracks in Group -->
      <div v-if="groupTracks.length > 1" class="p-4">
        <h3 class="text-lg font-semibold mb-4">Other tracks in this group ({{ groupTracks.length - 1 }})</h3>
        <div class="space-y-2">
          <NuxtLink 
            v-for="otherTrack in groupTracks.filter(t => t.id !== track.id)" 
            :key="otherTrack.id"
            :to="`/u/${username}/${generateTrackSlug(otherTrack)}`"
            class="block p-3 bg-neutral-800/30 hover:bg-neutral-800/50 rounded transition-colors"
          >
            <div class="font-medium">{{ otherTrack.title }}</div>
            <div class="text-sm text-neutral-400">Version: {{ otherTrack.version }}</div>
          </NuxtLink>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import { useSupabase } from '~/utils/supabase'
import { usePlayer } from '~/composables/usePlayer'

const route = useRoute()
const { user } = useAuth()
const { supabase } = useSupabase()
const { loadQueue, currentTrack, isPlaying } = usePlayer()

const track = ref<any>(null)
const groupTracks = ref<any[]>([])
const loading = ref(true)
const profileUserId = ref<string | null>(null)
const username = ref('')
const collectionNames = ref('')

const isOwnProfile = computed(() => {
  return !!(user.value && profileUserId.value && user.value.id === profileUserId.value)
})

const fetchTrack = async () => {
  const usernameParam = route.params.username as string
  const trackSlugParam = route.params.track as string
  
  username.value = usernameParam
  
  // Extract track ID from slug (format: "slug-123")
  const trackId = parseInt(trackSlugParam.split('-').pop() || '0')
  
  if (!supabase || !trackId) return
  
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
    
    // Fetch collection names
    const { data: junctionData } = await supabase
      .from('collections_sounds')
      .select('collection_id')
      .eq('sound_id', trackData.id)
    
    if (junctionData && junctionData.length > 0) {
      const collectionIds = junctionData.map((item: any) => item.collection_id)
      const { data: colData } = await supabase
        .from('collections')
        .select('name')
        .in('id', collectionIds)
      
      collectionNames.value = colData?.map((c: any) => c.name).join(', ') || '-'
    } else {
      collectionNames.value = '-'
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

