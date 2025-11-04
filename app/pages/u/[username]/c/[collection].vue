<template>
  <div class="flex flex-col gap-0 text-neutral-300 grow h-full">
    <div v-if="loading" class="flex items-center justify-center p-8 w-full h-full grow">
      <LoadingLogo />
    </div>

    <div v-else-if="!collection" class="text-neutral-500 p-4">
      Collection not found.
    </div>

    <template v-else>
      <!-- Collection Header with View Toggle -->
      <LibraryHeader
        :title="collection.name"
        :description="collection.description"
        :count="displayedTracksCount"
        :is-own-profile="isOwnProfile"
        v-model:show-view-menu="showViewMenu"
        v-model:view-mode="viewMode"
      />

      <!-- Tracks in Collection -->
      <div class="grow overflow-x-scroll xl:overflow-x-visible w-full">
        <CollectionTracksTable 
          :tracks="displayedTracks" 
          :source-id="`collection-${collection?.id}`" 
          :is-own-profile="isOwnProfile"
          :loading="tracksLoading"
          :username="route.params.username as string"
          :view-mode="viewMode"
          :collection-id="collection?.id"
          @edit-track="handleEdit"
          @toggle-hidden="toggleHidden"
          @tracks-removed="fetchTracks"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, inject, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import { useSupabase } from '~/utils/supabase'
import { usePlayer } from '~/composables/usePlayer'
import LoadingLogo from '~/components/LoadingLogo.vue'
import CollectionTracksTable from '~/components/CollectionTracksTable.vue'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { supabase } = useSupabase()
const { updateQueue, queueSourceId } = usePlayer()
const config = useRuntimeConfig()
const siteUrl = config.public.SITE_URL || 'https://beatbox.studio'

// Inject search handler registration functions
const registerSearchHandler = inject<(handler: (query: string) => void) => void>('registerSearchHandler')
const unregisterSearchHandler = inject<() => void>('unregisterSearchHandler')

// State
const collection = ref<any>(null)
const tracks = ref<any[]>([])
const loading = ref(true)
const tracksLoading = ref(false)
const profileUserId = ref<string | null>(null)
const searchQuery = ref('')
const viewMode = ref<'final' | 'all'>('final')
const showViewMenu = ref(false)

// Computed
const isOwnProfile = computed(() => {
  return !!(user.value && profileUserId.value && user.value.id === profileUserId.value)
})

const displayedTracks = computed(() => {
  // First filter by view mode (hidden status)
  let filtered = tracks.value
  
  if (viewMode.value === 'final') {
    // Show only non-hidden tracks
    filtered = tracks.value.filter(track => !track.hidden)
  }
  // If viewMode is 'all', show all tracks (including hidden)
  
  // Then filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.trim().toLowerCase()
    filtered = filtered.filter(track => {
      const title = track.title?.toLowerCase() || ''
      const artist = track.artist?.toLowerCase() || ''
      return title.includes(query) || artist.includes(query)
    })
  }
  
  return filtered
})

const displayedTracksCount = computed(() => {
  if (viewMode.value === 'final') {
    return tracks.value.filter(track => !track.hidden).length
  }
  return tracks.value.length
})

// Methods
const fetchCollection = async () => {
  const usernameParam = route.params.username as string
  const collectionSlug = route.params.collection as string
  
  if (!supabase) return
  
  loading.value = true
  
  try {
    // First, get the user profile to get their user_id
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, username')
      .eq('username', usernameParam)
      .single()
    
    if (profileError || !profileData) {
      console.error('User profile not found:', profileError)
      collection.value = null
      loading.value = false
      return
    }
    
    profileUserId.value = profileData.id as string
    
    // Now fetch the collection by slug and user_id
    const { data: collectionData, error: collectionError } = await supabase
      .from('collections')
      .select('*')
      .eq('slug', collectionSlug)
      .eq('user_id', profileData.id as string)
      .single()
    
    if (collectionError || !collectionData) {
      console.error('Collection not found:', collectionError)
      collection.value = null
      loading.value = false
      return
    }
    
    collection.value = collectionData
    
    // Fetch tracks in this collection
    await fetchTracks()
  } catch (error) {
    console.error('Error fetching collection:', error)
    collection.value = null
  } finally {
    loading.value = false
  }
}

const fetchTracks = async () => {
  if (!supabase || !collection.value) return
  
  tracksLoading.value = true
  
  try {
    // Fetch sounds via junction table with hidden status
    const { data, error } = await supabase
      .from('collections_sounds')
      .select(`
        sound_id,
        hidden,
        sounds(
          *,
          track_statuses!status_id(id, name)
        )
      `)
      .eq('collection_id', collection.value.id)
    
    if (error) throw error
    
    // Extract sounds and include hidden status
    const soundsListWithHidden = (data || [])
      .filter(item => item.sounds !== null)
      .map(item => ({
        ...(item.sounds as any),
        hidden: item.hidden || false,
        junction_sound_id: item.sound_id,
        track_status: (item.sounds as any).track_statuses
      }))
    
    // Fetch collection names and slugs for each track
    const tracksWithCollections = await Promise.all(soundsListWithHidden.map(async (track: any) => {
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
        collections: collectionData || [],
        track_status: track.track_statuses
      }
    }))
    
    tracks.value = tracksWithCollections
  } catch (error) {
    console.error('Error fetching tracks:', error)
    tracks.value = []
  } finally {
    tracksLoading.value = false
  }
}

const toggleHidden = async (trackId: number, currentHiddenState: boolean) => {
  if (!supabase || !collection.value) return
  
  try {
    // Optimistically update local state first for instant feedback
    const trackIndex = tracks.value.findIndex(t => t.id === trackId)
    if (trackIndex !== -1) {
      tracks.value[trackIndex].hidden = !currentHiddenState
    }
    
    // Update the hidden status in the junction table
    const { error } = await supabase
      .from('collections_sounds')
      .update({ hidden: !currentHiddenState })
      .eq('collection_id', collection.value.id)
      .eq('sound_id', trackId)
    
    if (error) {
      // Revert on error
      if (trackIndex !== -1) {
        tracks.value[trackIndex].hidden = currentHiddenState
      }
      throw error
    }
    
    // If the player's queue is from this collection, update it silently
    const collectionSourceId = `collection-${collection.value.id}`
    if (queueSourceId.value === collectionSourceId) {
      // Get the updated list of visible tracks (non-hidden)
      const visibleTracks = tracks.value.filter(t => !t.hidden)
      
      // Update the queue without triggering playback
      updateQueue(visibleTracks, collectionSourceId)
    }
  } catch (error) {
    console.error('Error toggling hidden status:', error)
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

// SEO Meta Tags
const updateSeoMeta = () => {
  if (!collection.value) return
  
  const username = route.params.username as string
  const title = `${collection.value.name} by ${username} | Beatbox`
  const description = collection.value.description || `Browse ${collection.value.name} by ${username} on Beatbox - ${displayedTracksCount.value} tracks`
  const url = `${siteUrl}/u/${username}/c/${collection.value.slug}`
  
  useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogUrl: url,
    ogType: 'music.playlist',
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
watch([collection, tracks], () => {
  updateSeoMeta()
}, { deep: true })

// Apply filters and sort to tracks
const updateFiltersAndSort = async (params: any) => {
  console.log('Collection page: Applying filters and sort:', params)
  
  if (!supabase || !collection.value) return
  
  tracksLoading.value = true
  
  try {
    // Fetch sounds via junction table with hidden status
    let query = supabase
      .from('collections_sounds')
      .select(`
        sound_id,
        hidden,
        sounds(
          *,
          track_statuses!status_id(id, name)
        )
      `)
      .eq('collection_id', collection.value.id)
    
    const { data, error } = await query
    
    if (error) throw error
    
    // Extract sounds and include hidden status
    let soundsList = (data || [])
      .filter(item => item.sounds !== null)
      .map(item => ({
        ...(item.sounds as any),
        hidden: item.hidden || false,
        junction_sound_id: item.sound_id,
        track_status: (item.sounds as any).track_statuses
      }))
    
    // Apply filters
    const { filters, sort } = params
    
    // Genre filter
    if (filters.genre?.length > 0) {
      soundsList = soundsList.filter(track => filters.genre.includes(track.genre))
    }
    
    // BPM range filter
    if (filters.bpm?.min) {
      soundsList = soundsList.filter(track => track.bpm && track.bpm >= filters.bpm.min)
    }
    if (filters.bpm?.max) {
      soundsList = soundsList.filter(track => track.bpm && track.bpm <= filters.bpm.max)
    }
    
    // Key filter
    if (filters.key?.length > 0) {
      soundsList = soundsList.filter(track => filters.key.includes(track.key))
    }
    
    // Mood filter (array overlap)
    if (filters.mood?.length > 0) {
      soundsList = soundsList.filter(track => {
        if (!track.mood || !Array.isArray(track.mood)) return false
        return filters.mood.some((m: string) => track.mood.includes(m))
      })
    }
    
    // Year range filter
    if (filters.year?.min) {
      soundsList = soundsList.filter(track => track.year && track.year >= filters.year.min)
    }
    if (filters.year?.max) {
      soundsList = soundsList.filter(track => track.year && track.year <= filters.year.max)
    }
    
    // Status filter
    if (filters.status?.length > 0) {
      soundsList = soundsList.filter(track => {
        if (filters.status.includes(null) && !track.status_id) return true
        return filters.status.includes(track.status_id)
      })
    }
    
    // Apply sort - handle status sort specially
    soundsList.sort((a, b) => {
      let aVal, bVal
      
      if (sort.sortBy === 'status') {
        aVal = a.track_status?.name || ''
        bVal = b.track_status?.name || ''
      } else {
        aVal = a[sort.sortBy]
        bVal = b[sort.sortBy]
      }
      
      if (sort.sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })
    
    // Fetch collection names and slugs for each track
    const tracksWithCollections = await Promise.all(soundsList.map(async (track: any) => {
      const { data: junctionData } = await supabase
        .from('collections_sounds')
        .select('collection_id')
        .eq('sound_id', track.id)
      
      const collectionIds = (junctionData || []).map((item: any) => item.collection_id)
      
      if (collectionIds.length === 0) {
        return { ...track, collections: [] }
      }
      
      const { data: collectionData } = await supabase
        .from('collections')
        .select('name, slug')
        .in('id', collectionIds)
      
      return {
        ...track,
        collections: collectionData || [],
        track_status: track.track_statuses
      }
    }))
    
    tracks.value = tracksWithCollections
  } catch (error) {
    console.error('Error filtering tracks:', error)
  } finally {
    tracksLoading.value = false
  }
}

// Expose handleSearch and updateFiltersAndSort for parent to call
defineExpose({
  handleSearch,
  updateFiltersAndSort
})

// Listen for track update events
const handleTrackUpdate = () => {
  console.log('[collection].vue: Received track update event, refetching tracks')
  fetchTracks()
}

// Lifecycle
onMounted(async () => {
  await fetchCollection()
  
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

