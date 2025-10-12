<template>
  <div class="flex flex-col gap-0 text-neutral-300 grow">
    <!-- Profile Header -->
    <LibraryHeader 
      :title="profileName" 
      :count="filteredTracks.length" 
    />
    
    <!-- Tracks Section -->
    <div class="grow">
      <TracksTable 
        :tracks="filteredTracks" 
        :source-id="`profile-${profileUserId}`"
        :is-own-profile="isOwnProfile" 
        :loading="loading"
        :username="username"
        @edit-track="handleEdit" 
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, inject } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import { useSupabase } from '~/utils/supabase'
import LibraryHeader from '~/components/LibraryHeader.vue'
import TracksTable from '~/components/TracksTable.vue'

const route = useRoute()
const { user, isReady } = useAuth()
const { supabase } = useSupabase()

// Inject search handler registration functions
const registerSearchHandler = inject<(handler: (query: string) => void) => void>('registerSearchHandler')
const unregisterSearchHandler = inject<() => void>('unregisterSearchHandler')

// State
const profileName = ref('')
const username = ref('')
const profileUserId = ref<string | null>(null)
const tracks = ref<any[]>([])
const loading = ref(true)
const searchQuery = ref('')

// Computed
const isOwnProfile = computed(() => {
  return !!(user.value && profileUserId.value && user.value.id === profileUserId.value)
})

const filteredTracks = computed(() => {
  if (!searchQuery.value) return tracks.value
  
  const query = searchQuery.value.trim().toLowerCase()
  return tracks.value.filter(track => {
    const title = track.title?.toLowerCase() || ''
    const artist = track.artist?.toLowerCase() || ''
    return title.includes(query) || artist.includes(query)
  })
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
    
    // Fetch collection names and slugs for each track
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
          collections: []
        }
      }
      
      // Get collection names and slugs
      const { data: collectionData } = await supabase
        .from('collections')
        .select('name, slug')
        .in('id', collectionIds)
      
      return {
        ...track,
        collections: collectionData || []
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

const handleSearch = (query: string) => {
  searchQuery.value = query
}

// Expose fetchTracks and handleSearch for parent to call
defineExpose({
  fetchTracks,
  handleSearch
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
  
  // Register search handler
  if (registerSearchHandler) {
    registerSearchHandler(handleSearch)
  }
  
  // Listen for track updates
  window.addEventListener('track-updated', handleTrackUpdate)
})

onUnmounted(() => {
  // Unregister search handler
  if (unregisterSearchHandler) {
    unregisterSearchHandler()
  }
  
  window.removeEventListener('track-updated', handleTrackUpdate)
})
</script>

