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
        :show-view-mode-selector="profileUserType === 'audio_pro'"
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
          :viewer-user-type="viewerUserType"
          :profile-user-type="profileUserType"
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

// Fetch initial collection data server-side for SEO
const { data: initialData } = await useAsyncData(
  `collection-${route.params.username}-${route.params.collection}`,
  async () => {
    if (!supabase) return null
    
    const usernameParam = route.params.username as string
    const collectionSlug = route.params.collection as string
    
    try {
      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, username')
        .eq('username', usernameParam)
        .single()
      
      if (profileError || !profileData) return null
      
      // Fetch collection
      const { data: collectionData, error: collectionError } = await supabase
        .from('collections')
        .select('*')
        .eq('slug', collectionSlug)
        .eq('user_id', profileData.id)
        .single()
      
      if (collectionError || !collectionData) return null
      
      return {
        collection: collectionData,
        profileUserId: profileData.id
      }
    } catch (error) {
      console.error('Error fetching collection:', error)
      return null
    }
  },
  {
    server: true // Ensure this runs on the server for SSR
  }
)

// State
const collection = ref<any>(initialData.value?.collection || null)
const tracks = ref<any[]>([])
const loading = ref(false)
const tracksLoading = ref(false)
const profileUserId = ref<string | null>(initialData.value?.profileUserId || null)
const searchQuery = ref('')
const viewMode = ref<'final' | 'all'>('final')
const showViewMenu = ref(false)
const viewerUserType = ref<'creator' | 'audio_pro' | null>(null)
const profileUserType = ref<'creator' | 'audio_pro' | null>(null)

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
    
    // Fetch profile user type
    const { data: profileTypeData } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('id', profileData.id)
      .single()
    
    if (profileTypeData) {
      profileUserType.value = profileTypeData.user_type as 'creator' | 'audio_pro' | null
    }
    
    // Fetch viewer user type if logged in
    if (user.value) {
      const { data: viewerTypeData } = await supabase
        .from('user_profiles')
        .select('user_type')
        .eq('id', user.value.id)
        .single()
      
      if (viewerTypeData) {
        viewerUserType.value = viewerTypeData.user_type as 'creator' | 'audio_pro' | null
      }
    }
    
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
      
      // Get collection names and slugs - only for collections owned by the profile owner
      const { data: collectionData } = await supabase
        .from('collections')
        .select('name, slug')
        .in('id', collectionIds)
        .eq('user_id', profileUserId.value)
      
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

// Set SEO meta tags - use initialData for SSR, then reactive collection for updates
const username = route.params.username as string

// Get collection data from initialData (available during SSR) or reactive collection
const collectionForSEO = computed(() => initialData.value?.collection || collection.value)

const seoTitle = computed(() => 
  collectionForSEO.value 
    ? `${collectionForSEO.value.name} by ${username} | Beatbox`
    : `Collection by ${username} | Beatbox`
)

const seoDescription = computed(() => 
  collectionForSEO.value?.description 
    ? collectionForSEO.value.description
    : collectionForSEO.value
      ? `Browse ${collectionForSEO.value.name} by ${username} on Beatbox`
      : `Browse music collection by ${username} on Beatbox`
)

const seoUrl = computed(() => 
  collectionForSEO.value 
    ? `${siteUrl}/u/${username}/c/${collectionForSEO.value.slug}`
    : `${siteUrl}/u/${username}/c/${route.params.collection}`
)

// Set SEO meta tags using useHead to ensure they're evaluated during SSR
// Use key properties to ensure these override defaults from nuxt.config.ts
useHead({
  title: seoTitle,
  meta: [
    { name: 'description', content: seoDescription, key: 'description' },
    { property: 'og:title', content: seoTitle, key: 'og:title' },
    { property: 'og:description', content: seoDescription, key: 'og:description' },
    { property: 'og:url', content: seoUrl, key: 'og:url' },
    { property: 'og:type', content: 'music.playlist', key: 'og:type' },
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

