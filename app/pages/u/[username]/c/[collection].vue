<template>
  <div class="flex flex-col gap-0 text-neutral-300 grow h-fit">
    <div v-if="loading" class="flex items-center justify-center p-8 w-full h-full grow">
      <LoadingLogo />
    </div>

    <div v-else-if="!collection" class="text-neutral-500 p-4">
      Collection not found.
    </div>

    <template v-else>
      <!-- Collection Header -->
      <LibraryHeader
        :title="collection.name"
        :description="collection.description"
        :count="displayedTracksCount"
        :is-own-profile="isOwnProfile"
        :show-view-mode-selector="false"
        :show-settings-button="isCollectionOwner"
        filter-context="music"
        @open-filter-sort="handleOpenFilterSort"
        @open-settings="showSettingsDrawer = true"
      />

      <!-- Tracks in Collection -->
      <div class="grow overflow-x-auto overflow-y-hidden h-fit w-full">
        <CollectionTracksTable 
          :tracks="displayedTracks" 
          :source-id="`collection-${collection?.id}`" 
          :is-own-profile="isOwnProfile"
          :loading="tracksLoading"
          :username="route.params.username as string"
          :collection-id="collection?.id"
          :viewer-user-type="viewerUserType"
          :profile-user-type="profileUserType"
          :no-filter-results="showNoFilterResults"
          :active-filter-chips="activeFiltersForDisplay"
          @edit-track="handleEdit"
          @tracks-removed="fetchTracks"
        />
      </div>
    </template>

    <!-- Collection Settings Drawer -->
    <CollectionSettingsDrawer 
      v-if="collection"
      v-model:show="showSettingsDrawer" 
      :collection-id="collection.id"
      :collection-name="collection.name"
      :collection-slug="collection.slug"
      @collection-updated="handleCollectionUpdated"
      @collection-deleted="handleCollectionDeleted"
    />
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
import CollectionSettingsDrawer from '~/components/CollectionSettingsDrawer.vue'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { supabase } = useSupabase()
const { updateQueue, queueSourceId } = usePlayer()
const config = useRuntimeConfig()
const siteUrl = config.public.SITE_URL || 'https://beatbox.studio'

// Inject search and filter/sort handler registration functions
const registerSearchHandler = inject<(handler: (query: string) => void) => void>('registerSearchHandler')
const unregisterSearchHandler = inject<() => void>('unregisterSearchHandler')
const registerFiltersAndSortHandler = inject<(handler: (params: any) => void) => void>('registerFiltersAndSortHandler')
const unregisterFiltersAndSortHandler = inject<() => void>('unregisterFiltersAndSortHandler')
const openFilterModal = inject<() => void>('openFilterModal')

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
const unfilteredTracks = ref<any[]>([]) // full list from fetch; filters are applied on top of this
const lastAppliedParams = ref<{ filters: any; sort: any } | null>(null)
const loading = ref(false)
const tracksLoading = ref(false)
const profileUserId = ref<string | null>(initialData.value?.profileUserId || null)
const searchQuery = ref('')
const viewerUserType = ref<'creator' | 'audio_pro' | null>(null)
const profileUserType = ref<'creator' | 'audio_pro' | null>(null)
const showSettingsDrawer = ref(false)

// Computed
const isOwnProfile = computed(() => {
  return !!(user.value && profileUserId.value && user.value.id === profileUserId.value)
})

const isCollectionOwner = computed(() => {
  return !!(user.value && collection.value && user.value.id === collection.value.user_id)
})

const displayedTracks = computed(() => {
  // Filter by search query
  let filtered = tracks.value
  
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
  return displayedTracks.value.length
})

// Active filter chips for "no results" quick-remove (verb labels, clickable)
interface ActiveFilterChip {
  id: string
  label: string
  remove: () => void
}
const activeFiltersForDisplay = computed<ActiveFilterChip[]>(() => {
  const params = lastAppliedParams.value
  if (!params?.filters) return []
  const chips: ActiveFilterChip[] = []
  const f = params.filters

  ;(f.genre || []).forEach((g: string) => {
    chips.push({
      id: `genre-${g}`,
      label: g,
      remove: () => removeFilter('genre', g, 'array')
    })
  })
  if (f.bpm?.min != null) {
    chips.push({
      id: 'bpm-min',
      label: `BPM ≥ ${f.bpm.min}`,
      remove: () => removeFilter('bpm', 'min', 'bpmMin')
    })
  }
  if (f.bpm?.max != null) {
    chips.push({
      id: 'bpm-max',
      label: `BPM ≤ ${f.bpm.max}`,
      remove: () => removeFilter('bpm', 'max', 'bpmMax')
    })
  }
  ;(f.key || []).forEach((k: string) => {
    chips.push({
      id: `key-${k}`,
      label: k,
      remove: () => removeFilter('key', k, 'array')
    })
  })
  ;(f.mood || []).forEach((m: string) => {
    chips.push({
      id: `mood-${m}`,
      label: m,
      remove: () => removeFilter('mood', m, 'array')
    })
  })
  if (f.year?.min != null) {
    chips.push({
      id: 'year-min',
      label: `From ${f.year.min}`,
      remove: () => removeFilter('year', 'min', 'yearMin')
    })
  }
  if (f.year?.max != null) {
    chips.push({
      id: 'year-max',
      label: `To ${f.year.max}`,
      remove: () => removeFilter('year', 'max', 'yearMax')
    })
  }
  ;(f.status || []).forEach((s: number | null) => {
    const label = s == null ? 'No Status' : `Status ${s}`
    chips.push({
      id: `status-${s}`,
      label,
      remove: () => removeFilter('status', s, 'array')
    })
  })
  return chips
})

const showNoFilterResults = computed(() =>
  displayedTracksCount.value === 0 &&
  unfilteredTracks.value.length > 0 &&
  activeFiltersForDisplay.value.length > 0
)

function removeFilter(key: string, value: unknown, mode: 'array' | 'bpmMin' | 'bpmMax' | 'yearMin' | 'yearMax') {
  const params = lastAppliedParams.value
  if (!params) return
  const next = {
    filters: { ...params.filters },
    sort: { ...params.sort }
  }
  if (mode === 'array') {
    const arr = [...(next.filters[key] || [])]
    const i = arr.indexOf(value)
    if (i !== -1) arr.splice(i, 1)
    next.filters[key] = arr
  } else if (mode === 'bpmMin') {
    next.filters.bpm = { ...next.filters.bpm, min: null }
  } else if (mode === 'bpmMax') {
    next.filters.bpm = { ...next.filters.bpm, max: null }
  } else if (mode === 'yearMin') {
    next.filters.year = { ...next.filters.year, min: null }
  } else if (mode === 'yearMax') {
    next.filters.year = { ...next.filters.year, max: null }
  }
  lastAppliedParams.value = next
  tracks.value = applyFiltersAndSortToList(unfilteredTracks.value, next)
}

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
    
    // Try to fetch the collection by slug and user_id (owned collection)
    let { data: collectionData, error: collectionError } = await supabase
      .from('collections')
      .select('*')
      .eq('slug', collectionSlug)
      .eq('user_id', profileData.id as string)
      .maybeSingle()
    
    // If not found and user is logged in, check if they're a member of a collection with this slug
    if ((collectionError || !collectionData) && user.value) {
      // First get collection IDs where user is a member
      const { data: memberCollections } = await supabase
        .from('collection_members')
        .select('collection_id')
        .eq('member_id', user.value.id)
      
      if (memberCollections && memberCollections.length > 0) {
        const memberCollectionIds = memberCollections.map((mc: any) => mc.collection_id)
        
        // Then fetch collections with matching slug and member collection IDs
        const { data: sharedCollection } = await supabase
          .from('collections')
          .select('*')
          .eq('slug', collectionSlug)
          .in('id', memberCollectionIds)
          .maybeSingle()
        
        if (sharedCollection) {
          collectionData = sharedCollection
          collectionError = null
        }
      }
    }
    
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

    // Default sort: latest upload first (created_at desc)
    tracksWithCollections.sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    unfilteredTracks.value = tracksWithCollections
    tracks.value = tracksWithCollections
    lastAppliedParams.value = null
  } catch (error) {
    console.error('Error fetching tracks:', error)
    tracks.value = []
    unfilteredTracks.value = []
  } finally {
    tracksLoading.value = false
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

// Set SEO meta tags using useSeoMeta (recommended by Nuxt for SEO)
// Use computed values to ensure reactivity and SSR compatibility
const username = route.params.username as string

// Calculate SEO values as computed properties
// Note: titleTemplate in nuxt.config will add "| Beatbox" automatically
const seoTitle = computed(() => {
  const collectionForSEO = initialData.value?.collection || collection.value
  return collectionForSEO 
    ? `${collectionForSEO.name} by ${username}`
    : `Collection by ${username}`
})

const seoDescription = computed(() => {
  const collectionForSEO = initialData.value?.collection || collection.value
  if (collectionForSEO?.description) {
    return collectionForSEO.description
  }
  if (collectionForSEO) {
    return `Browse ${collectionForSEO.name} by ${username} on Beatbox`
  }
  return `Browse music collection by ${username} on Beatbox`
})

const seoUrl = computed(() => {
  const collectionForSEO = initialData.value?.collection || collection.value
  return collectionForSEO 
    ? `${siteUrl}/u/${username}/c/${collectionForSEO.slug}`
    : `${siteUrl}/u/${username}/c/${route.params.collection}`
})

// Use useSeoMeta with computed values for reactivity and SSR support
useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogUrl: seoUrl,
  ogType: 'music.playlist',
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

// Handle open filter/sort from LibraryHeader
const handleOpenFilterSort = () => {
  if (openFilterModal) {
    openFilterModal()
  }
}

// Apply filter and sort to a list (no fetch). Used when we have unfilteredTracks.
function applyFiltersAndSortToList(list: any[], params: { filters: any; sort: any }): any[] {
  const { filters, sort } = params
  let result = [...list]

  if (filters.genre?.length > 0) {
    result = result.filter((track: any) => filters.genre.includes(track.genre))
  }
  if (filters.bpm?.min) {
    result = result.filter((track: any) => track.bpm != null && track.bpm >= filters.bpm.min)
  }
  if (filters.bpm?.max) {
    result = result.filter((track: any) => track.bpm != null && track.bpm <= filters.bpm.max)
  }
  if (filters.key?.length > 0) {
    result = result.filter((track: any) => filters.key.includes(track.key))
  }
  if (filters.mood?.length > 0) {
    result = result.filter((track: any) => {
      if (!track.mood || !Array.isArray(track.mood)) return false
      return filters.mood.some((m: string) => track.mood.includes(m))
    })
  }
  if (filters.year?.min) {
    result = result.filter((track: any) => track.year != null && track.year >= filters.year.min)
  }
  if (filters.year?.max) {
    result = result.filter((track: any) => track.year != null && track.year <= filters.year.max)
  }
  if (filters.status?.length > 0) {
    result = result.filter((track: any) => {
      if (filters.status.includes(null) && !track.status_id) return true
      return filters.status.includes(track.status_id)
    })
  }

  result.sort((a: any, b: any) => {
    const aVal = sort.sortBy === 'status' ? (a.track_status?.name || '') : a[sort.sortBy]
    const bVal = sort.sortBy === 'status' ? (b.track_status?.name || '') : b[sort.sortBy]
    if (sort.sortDirection === 'asc') return aVal > bVal ? 1 : -1
    return aVal < bVal ? 1 : -1
  })
  return result
}

// Apply filters and sort to tracks
const updateFiltersAndSort = async (params: any) => {
  console.log('Collection page: Applying filters and sort:', params)

  if (!supabase || !collection.value) return

  tracksLoading.value = true
  lastAppliedParams.value = { filters: { ...params.filters }, sort: { ...params.sort } }

  try {
    if (unfilteredTracks.value.length > 0) {
      tracks.value = applyFiltersAndSortToList(unfilteredTracks.value, params)
    } else {
      // Initial load with saved filters: fetch then filter
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

      const soundsListWithHidden = (data || [])
        .filter((item: any) => item.sounds !== null)
        .map((item: any) => ({
          ...(item.sounds as any),
          hidden: item.hidden || false,
          junction_sound_id: item.sound_id,
          track_status: (item.sounds as any).track_statuses
        }))

      const tracksWithCollections = await Promise.all(soundsListWithHidden.map(async (track: any) => {
        const { data: junctionData } = await supabase
          .from('collections_sounds')
          .select('collection_id')
          .eq('sound_id', track.id)
        const collectionIds = (junctionData || []).map((item: any) => item.collection_id)
        if (collectionIds.length === 0) return { ...track, collections: [] }
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

      unfilteredTracks.value = tracksWithCollections
      tracks.value = applyFiltersAndSortToList(tracksWithCollections, params)
    }
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
const { updateCurrentTrack } = usePlayer()

const handleTrackUpdate = (event?: CustomEvent) => {
  console.log('[collection].vue: Received track update event, refetching tracks')
  
  // If event has track data, update the player if it's the current track
  if (event?.detail?.track) {
    updateCurrentTrack(event.detail.track)
  }
  
  fetchTracks()
}

// Handle collection updates
const handleCollectionUpdated = async (newName: string, newSlug: string) => {
  if (collection.value) {
    collection.value.name = newName
    collection.value.slug = newSlug
    
    // Update URL if slug changed
    if (newSlug !== route.params.collection) {
      await router.replace(`/u/${route.params.username}/c/${newSlug}`)
    }
    
    // Refetch collection to ensure we have latest data
    await fetchCollection()
  }
}

// Handle collection deletion
const handleCollectionDeleted = () => {
  // Navigation is handled in the drawer component
  // This is just for cleanup if needed
  collection.value = null
}

// Lifecycle
onMounted(async () => {
  await fetchCollection()

  // Register search handler
  if (registerSearchHandler) {
    registerSearchHandler(handleSearch)
  }

  // Register filter/sort handler so layout can call updateFiltersAndSort when user applies
  if (registerFiltersAndSortHandler) {
    registerFiltersAndSortHandler(updateFiltersAndSort)
  }

  // Apply saved filter/sort from localStorage so initial view matches user preference
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('filterSort_music')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && (parsed.sort || parsed.filters)) {
          await updateFiltersAndSort(parsed)
        }
      }
    } catch (e) {
      console.error('Collection page: Error applying saved filter/sort:', e)
    }
  }

  // Listen for track updates
  window.addEventListener('track-updated', ((event: CustomEvent) => {
    handleTrackUpdate(event)
  }) as EventListener)
})

onUnmounted(() => {
  if (unregisterSearchHandler) {
    unregisterSearchHandler()
  }
  if (unregisterFiltersAndSortHandler) {
    unregisterFiltersAndSortHandler()
  }
  window.removeEventListener('track-updated', handleTrackUpdate)
})
</script>

