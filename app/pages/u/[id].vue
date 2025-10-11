<template>
  <div class="col-span-full max-w-full lg:max-w-none p-2 lg:p-0 flex flex-col gap-8 text-neutral-300">
    <!-- Profile Header -->
    <div class="py-4">
      <h1 class="text-3xl font-bold mb-2">{{ profileName }}</h1>
      <p class="text-sm text-neutral-500">
        {{ tracks.length }} {{ tracks.length === 1 ? 'track' : 'tracks' }}
      </p>
    </div>
    <!-- Tracks Section -->
    <div>
      <h2 class="text-xl font-semibold mb-4">Tracks</h2>
      <TracksTable :tracks="tracks" :is-own-profile="isOwnProfile" :loading="loading" @edit-track="handleEdit" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import { useSupabase } from '~/utils/supabase'
import TracksTable from '~/components/TracksTable.vue'

const route = useRoute()
const { user, isReady } = useAuth()
const { supabase } = useSupabase()

// State
const profileName = ref('')
const username = ref('')
const profileUserId = ref<string | null>(null)
const tracks = ref<any[]>([])
const loading = ref(true)

// Computed
const isOwnProfile = computed(() => {
  return !!(user.value && profileUserId.value && user.value.id === profileUserId.value)
})

// Methods
const fetchProfile = async () => {
  const usernameOrId = route.params.id as string
  
  if (!supabase) return
  
  try {
    // Try to fetch profile by username
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, username, display_name')
      .eq('username', usernameOrId)
      .single()

    if (error || !data) {
      // Fallback: try as UUID if username lookup fails
      profileUserId.value = usernameOrId
      profileName.value = usernameOrId
      username.value = usernameOrId
    } else {
      profileUserId.value = data.id as string
      profileName.value = (data.display_name || data.username || usernameOrId) as string
      username.value = data.username as string
    }
  } catch (error) {
    console.error('Error fetching profile:', error)
    // Fallback
    profileUserId.value = usernameOrId
    profileName.value = usernameOrId
    username.value = usernameOrId
  }
}

const fetchTracks = async () => {
  if (!supabase || !profileUserId.value) {
    console.log('fetchTracks: Missing supabase or profileUserId', { supabase: !!supabase, profileUserId: profileUserId.value })
    return
  }
  
  loading.value = true
  console.log('fetchTracks: Querying sounds for user:', profileUserId.value)
  
  try {
    const { data, error } = await supabase
      .from('sounds')
      .select('*')
      .eq('user_id', profileUserId.value)
      .order('created_at', { ascending: false })

    console.log('fetchTracks: Query result', { data, error, count: data?.length })
    
    if (error) throw error
    
    // Fetch collection names for each track
    const tracksWithCollections = await Promise.all((data || []).map(async (track: any) => {
      // Get collection IDs for this track
      const { data: junctionData } = await supabase
        .from('collections_sounds')
        .select('collection_id')
        .eq('sound_id', track.id)
      
      const collectionIds = (junctionData || []).map((item: any) => item.collection_id)
      
      if (collectionIds.length === 0) {
        return {
          ...track,
          collection_names: '-'
        }
      }
      
      // Get collection names
      const { data: collectionData } = await supabase
        .from('collections')
        .select('name')
        .in('id', collectionIds)
      
      const collectionNames = (collectionData || [])
        .map((item: any) => item.name)
        .join(', ')
      
      return {
        ...track,
        collection_names: collectionNames || '-'
      }
    }))
    
    tracks.value = tracksWithCollections
  } catch (error) {
    console.error('Error fetching tracks:', error)
    alert('Failed to load tracks: ' + (error as any).message)
  } finally {
    loading.value = false
  }
}

const handleEdit = (track: any) => {
  // Emit event to parent layout to open modal in edit mode
  const event = new CustomEvent('edit-track', { 
    detail: track,
    bubbles: true,
    composed: true
  })
  window.dispatchEvent(event)
}

// Expose fetchTracks for parent to call
defineExpose({
  fetchTracks
})

// Listen for track update events
const handleTrackUpdate = () => {
  console.log('[id].vue: Received track update event, refetching tracks')
  fetchTracks()
}

// Lifecycle
onMounted(async () => {
  await fetchProfile()
  await fetchTracks()
  
  // Listen for track updates
  window.addEventListener('track-updated', handleTrackUpdate)
})

onUnmounted(() => {
  window.removeEventListener('track-updated', handleTrackUpdate)
})
</script>

