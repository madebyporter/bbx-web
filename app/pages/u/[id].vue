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
        @tracks-deleted="fetchTracks" 
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, inject, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import { useSupabase } from '~/utils/supabase'
import LibraryHeader from '~/components/LibraryHeader.vue'
import TracksTable from '~/components/TracksTable.vue'

const route = useRoute()
const { user, isReady } = useAuth()
const { supabase } = useSupabase()
const config = useRuntimeConfig()
const siteUrl = config.public.SITE_URL || 'https://beatbox.studio'

// Inject search handler registration functions
const registerSearchHandler = inject<(handler: (query: string) => void) => void>('registerSearchHandler')
const unregisterSearchHandler = inject<() => void>('unregisterSearchHandler')

// Fetch initial profile data server-side for SEO
const { data: initialData } = await useAsyncData(
  `profile-${route.params.id}`,
  async () => {
    if (!supabase) return null
    
    const usernameOrId = route.params.id as string
    
    try {
      // Try to fetch profile by username
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, username, display_name')
        .eq('username', usernameOrId)
        .single()

      if (error || !data) return null
      
      // Fetch initial tracks for SEO (just first 10)
      const { data: tracksData } = await supabase
        .from('sounds')
        .select('*')
        .eq('user_id', data.id)
        .order('created_at', { ascending: false })
        .limit(10)
      
      return {
        profile: data,
        tracks: tracksData || []
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }
)

// State
const profileName = ref(initialData.value?.profile?.display_name || initialData.value?.profile?.username || '')
const username = ref(initialData.value?.profile?.username || '')
const profileUserId = ref<string | null>(initialData.value?.profile?.id || null)
const tracks = ref<any[]>(initialData.value?.tracks || [])
const loading = ref(false)
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

// Methods - Keep fetchProfile for backwards compatibility but simplified
const fetchProfile = async () => {
  // Profile already loaded server-side, just ensure values are set
  if (!profileUserId.value && initialData.value?.profile) {
    profileUserId.value = initialData.value.profile.id
    profileName.value = initialData.value.profile.display_name || initialData.value.profile.username
    username.value = initialData.value.profile.username
  }
}

const fetchTracks = async () => {
  if (!supabase || !profileUserId.value) {
    console.log('fetchTracks: Missing supabase or profileUserId', { supabase: !!supabase, profileUserId: profileUserId.value })
    return
  }
  
  loading.value = true
  console.log('fetchTracks: Querying sounds for user:', profileUserId.value)
  
  // Load saved sort preferences from localStorage
  let sortBy = 'created_at'
  let sortDirection: 'asc' | 'desc' = 'desc'
  
  try {
    const savedFilters = localStorage.getItem('filterSort_music')
    if (savedFilters) {
      const parsed = JSON.parse(savedFilters)
      if (parsed.sort) {
        sortBy = parsed.sort.sortBy || 'created_at'
        sortDirection = parsed.sort.sortDirection || 'desc'
        console.log('fetchTracks: Using saved sort:', sortBy, sortDirection)
      }
    }
  } catch (e) {
    console.error('fetchTracks: Error loading saved sort:', e)
  }
  
  try {
    const { data, error } = await supabase
      .from('sounds')
      .select(`
        *,
        track_statuses!status_id(id, name)
      `)
      .eq('user_id', profileUserId.value)
      .order(sortBy, { ascending: sortDirection === 'asc' })

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
          collections: [],
          track_status: track.track_statuses
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

// Set SEO meta tags - use initialData for SSR, then reactive values for updates
const profileForSEO = computed(() => initialData.value?.profile)
const tracksForSEO = computed(() => initialData.value?.tracks || tracks.value)

const seoTitle = computed(() => {
  const name = profileForSEO.value?.display_name || profileForSEO.value?.username || profileName.value
  return name 
    ? `${name}'s Music Library | Beatbox`
    : 'Music Library | Beatbox'
})

const seoDescription = computed(() => {
  const trackCount = tracksForSEO.value.length > 0 ? `${tracksForSEO.value.length}+ tracks` : 'Music collection'
  const name = profileForSEO.value?.display_name || profileForSEO.value?.username || profileName.value
  return name
    ? `Explore ${name}'s music collection on Beatbox - ${trackCount}`
    : 'Explore music collection on Beatbox'
})

const seoUrl = computed(() => {
  const usernameValue = profileForSEO.value?.username || username.value || route.params.id
  return `${siteUrl}/u/${usernameValue}`
})

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogUrl: seoUrl,
  ogType: 'profile',
  ogImage: `${siteUrl}/img/og-image.jpg`,
  ogImageWidth: '1200',
  ogImageHeight: '630',
  twitterCard: 'summary_large_image',
  twitterTitle: seoTitle,
  twitterDescription: seoDescription,
  twitterImage: `${siteUrl}/img/og-image.jpg`
})

useHead({
  link: [
    { rel: 'canonical', href: seoUrl }
  ]
})

// Apply filters and sort to tracks
const updateFiltersAndSort = async (params: any) => {
  console.log('All Music page: Applying filters and sort:', params)
  
  if (!supabase || !profileUserId.value) return
  
  loading.value = true
  
  try {
    let query = supabase
      .from('sounds')
      .select(`
        *,
        track_statuses!status_id(id, name)
      `)
      .eq('user_id', profileUserId.value)
    
    // Apply music filters
    const { filters, sort } = params
    
    // Genre filter
    if (filters.genre?.length > 0) {
      query = query.in('genre', filters.genre)
    }
    
    // BPM range filter
    if (filters.bpm?.min) {
      query = query.gte('bpm', filters.bpm.min)
    }
    if (filters.bpm?.max) {
      query = query.lte('bpm', filters.bpm.max)
    }
    
    // Key filter
    if (filters.key?.length > 0) {
      query = query.in('key', filters.key)
    }
    
    // Mood filter (array overlap)
    if (filters.mood?.length > 0) {
      query = query.overlaps('mood', filters.mood)
    }
    
    // Year range filter
    if (filters.year?.min) {
      query = query.gte('year', filters.year.min)
    }
    if (filters.year?.max) {
      query = query.lte('year', filters.year.max)
    }
    
    // Status filter
    if (filters.status?.length > 0) {
      query = query.in('status_id', filters.status)
    }
    
    // Apply sort
    query = query.order(sort.sortBy, { ascending: sort.sortDirection === 'asc' })
    
    const { data, error } = await query
    
    if (error) throw error
    
    // Fetch collection names and slugs for each track
    const tracksWithCollections = await Promise.all((data || []).map(async (track: any) => {
      const { data: junctionData } = await supabase
        .from('collections_sounds')
        .select('collection_id')
        .eq('sound_id', track.id)
      
      const collectionIds = (junctionData || []).map((item: any) => item.collection_id)
      
      if (collectionIds.length === 0) {
        return {
          ...track,
          collections: [],
          track_status: track.track_statuses
        }
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
    loading.value = false
  }
}

// Expose fetchTracks, handleSearch, and updateFiltersAndSort for parent to call
defineExpose({
  fetchTracks,
  handleSearch,
  updateFiltersAndSort
})

// Listen for track update events
const handleTrackUpdate = async (event: any) => {
  const updatedTrack = event?.detail?.track
  
  if (updatedTrack) {
    // Update the specific track in place instead of refetching everything
    console.log('[id].vue: Updating track in place:', updatedTrack.id)
    const index = tracks.value.findIndex(t => t.id === updatedTrack.id)
    if (index !== -1) {
      // Preserve scroll position by updating in place
      tracks.value[index] = updatedTrack
      console.log('[id].vue: Track updated in place, scroll position preserved')
    } else {
      console.log('[id].vue: Track not found in current list, may need to refetch')
    }
  } else {
    // Fallback: refetch if no track data provided (e.g., track deleted)
    console.log('[id].vue: No track data provided, refetching all tracks')
    await fetchTracks()
  }
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

