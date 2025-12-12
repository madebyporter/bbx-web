<template>
  <div class="flex flex-col gap-0 text-neutral-300 grow">
    <div v-if="loading" class="flex items-center justify-center p-8">
      <LoadingLogo />
    </div>

    <div v-else-if="tracks.length === 0" class="text-neutral-500 p-4">
      No tracks found in this group.
    </div>

    <template v-else>
      <!-- Group Header with Edit -->
      <div class="p-4 border-b border-neutral-800">
        <div class="flex items-center justify-between">
          <div v-if="!isEditingGroupName" class="flex items-center gap-3 justify-between">
            <div class="overflow-auto w-4/5 lg:w-full">
              <h1 class="text-lg lg:text-3xl font-bold truncate">{{ groupName }}</h1>
            </div>
            <button v-if="isOwnProfile" @click="isEditingGroupName = true"
              class="text-neutral-400 hover:text-white transition-colors text-sm" title="Rename group">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>

          <div v-else class="flex items-center gap-2 flex-1 max-w-md">
            <input v-model="newGroupName" type="text" class="input flex-1" placeholder="Enter new group name"
              @keyup.enter="saveGroupName" @keyup.esc="isEditingGroupName = false" />
            <button @click="saveGroupName" class="btn-sm">Save</button>
            <button @click="isEditingGroupName = false" class="btn-secondary-sm">Cancel</button>
          </div>

          <p class="text-sm text-neutral-500">
            {{ tracks.length }} {{ tracks.length === 1 ? 'track' : 'tracks' }}
          </p>
        </div>
        <p class="text-neutral-400 mt-2 text-sm">
          Grouped tracks/versions of similar recordings
        </p>
      </div>

      <!-- Stem Player -->
      <StemPlayer :tracks="tracks" />
      <!-- Tracks in Group -->
      <div class="grow">
        <TracksTable :tracks="tracks" :source-id="`group-${groupName}`" :is-own-profile="isOwnProfile" :loading="false"
          :username="username" @edit-track="handleEdit" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import { useSupabase } from '~/utils/supabase'
import TracksTable from '~/components/TracksTable.vue'
import StemPlayer from '~/components/StemPlayer.vue'
import LoadingLogo from '~/components/LoadingLogo.vue'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { supabase } = useSupabase()
const config = useRuntimeConfig()
const siteUrl = config.public.SITE_URL || 'https://beatbox.studio'

// Fetch initial group data server-side for SEO
const { data: initialData } = await useAsyncData(
  `group-${route.params.username}-${route.params.group}`,
  async () => {
    if (!supabase) return null
    
    const usernameParam = route.params.username as string
    const groupParam = route.params.group as string
    
    try {
      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', usernameParam)
        .single()
      
      if (profileError || !profileData) return null
      
      // Fetch tracks in this group (basic data for SEO)
      const { data: tracksData, error: tracksError } = await supabase
        .from('sounds')
        .select('*')
        .eq('user_id', profileData.id)
        .eq('track_group_name', groupParam)
        .order('version', { ascending: false })
        .limit(10) // Just fetch a few for SEO
      
      if (tracksError) return null
      
      return {
        profileUserId: profileData.id,
        username: usernameParam,
        groupName: groupParam,
        tracks: tracksData || []
      }
    } catch (error) {
      console.error('Error fetching group data:', error)
      return null
    }
  },
  {
    server: true // Ensure this runs on the server for SSR
  }
)

const tracks = ref<any[]>([])
const loading = ref(true)
const profileUserId = ref<string | null>(initialData.value?.profileUserId || null)
const username = ref(initialData.value?.username || '')
const groupName = ref(initialData.value?.groupName || '')
const isEditingGroupName = ref(false)
const newGroupName = ref(initialData.value?.groupName || '')

const isOwnProfile = computed(() => {
  return !!(user.value && profileUserId.value && user.value.id === profileUserId.value)
})

const fetchGroupTracks = async () => {
  const usernameParam = route.params.username as string
  const groupParam = route.params.group as string
  
  username.value = usernameParam
  groupName.value = groupParam
  newGroupName.value = groupParam
  
  if (!supabase) return
  
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
    
    // Load saved sort preferences from localStorage
    let sortBy = 'version'
    let sortDirection: 'asc' | 'desc' = 'desc'
    
    try {
      const savedFilters = localStorage.getItem('filterSort_music')
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters)
        if (parsed.sort) {
          sortBy = parsed.sort.sortBy || 'version'
          sortDirection = parsed.sort.sortDirection || 'desc'
        }
      }
    } catch (e) {
      console.error('Group page: Error loading saved sort:', e)
    }
    
    // Fetch all tracks in this group
    const { data: tracksData, error: tracksError } = await supabase
      .from('sounds')
      .select(`
        *,
        track_statuses!status_id(id, name)
      `)
      .eq('user_id', profileData.id)
      .eq('track_group_name', groupParam)
      .order(sortBy, { ascending: sortDirection === 'asc' })
    
    if (tracksError) throw tracksError
    
    // Fetch collection names and slugs for each track
    const tracksWithCollections = await Promise.all((tracksData || []).map(async (track: any) => {
      const { data: junctionData } = await supabase
        .from('collections_sounds')
        .select('collection_id')
        .eq('sound_id', track.id)
      
      const collectionIds = (junctionData || []).map((item: any) => item.collection_id)
      
      if (collectionIds.length === 0) {
        return { ...track, collections: [], track_status: track.track_statuses }
      }
      
      const { data: collectionData } = await supabase
        .from('collections')
        .select('name, slug')
        .in('id', collectionIds)
      
      return { ...track, collections: collectionData || [], track_status: track.track_statuses }
    }))
    
    tracks.value = tracksWithCollections
    
  } catch (error) {
    console.error('Error fetching group tracks:', error)
  } finally {
    loading.value = false
  }
}

const saveGroupName = async () => {
  if (!supabase || !newGroupName.value || newGroupName.value === groupName.value) {
    isEditingGroupName.value = false
    return
  }
  
  try {
    // Update all tracks in this group with new group name
    const { error } = await supabase
      .from('sounds')
      .update({ track_group_name: newGroupName.value })
      .eq('user_id', profileUserId.value)
      .eq('track_group_name', groupName.value)
    
    if (error) throw error
    
    // Navigate to new group URL
    router.push(`/u/${username.value}/g/${newGroupName.value}`)
    
  } catch (error) {
    console.error('Error renaming group:', error)
  } finally {
    isEditingGroupName.value = false
  }
}

const handleEdit = (track: any) => {
  const event = new CustomEvent('edit-track', { 
    detail: track,
    bubbles: true,
    composed: true
  })
  window.dispatchEvent(event)
}

// Set SEO meta tags using useSeoMeta (recommended by Nuxt for SEO)
// Use computed values to ensure reactivity and SSR compatibility
// Note: titleTemplate in nuxt.config will add "| Beatbox" automatically
const seoTitle = computed(() => {
  const groupUsername = initialData.value?.username || username.value
  const groupNameValue = initialData.value?.groupName || groupName.value
  if (groupNameValue && groupUsername) {
    return `${groupNameValue} by ${groupUsername}`
  }
  return 'Track Group'
})

const seoDescription = computed(() => {
  const groupUsername = initialData.value?.username || username.value
  const groupNameValue = initialData.value?.groupName || groupName.value
  const trackCount = initialData.value?.tracks?.length || tracks.value.length
  if (!groupNameValue || !groupUsername) {
    return 'View track group on Beatbox'
  }
  const countStr = trackCount > 0 ? ` - ${trackCount} tracks` : ''
  return `View different versions of ${groupNameValue} by ${groupUsername} on Beatbox${countStr}`
})

const seoUrl = computed(() => {
  const groupUsername = initialData.value?.username || username.value || route.params.username
  const groupNameValue = initialData.value?.groupName || groupName.value || route.params.group
  return `${siteUrl}/u/${groupUsername}/g/${groupNameValue}`
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

// Apply filters and sort to tracks
const updateFiltersAndSort = async (params: any) => {
  console.log('Group page: Applying filters and sort:', params)
  
  if (!supabase || !profileUserId.value || !groupName.value) return
  
  loading.value = true
  
  try {
    let query = supabase
      .from('sounds')
      .select(`
        *,
        track_statuses!status_id(id, name)
      `)
      .eq('user_id', profileUserId.value)
      .eq('track_group_name', groupName.value)
    
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
        return { ...track, collections: [], track_status: track.track_statuses }
      }
      
      const { data: collectionData } = await supabase
        .from('collections')
        .select('name, slug')
        .in('id', collectionIds)
      
      return { ...track, collections: collectionData || [], track_status: track.track_statuses }
    }))
    
    tracks.value = tracksWithCollections
  } catch (error) {
    console.error('Error filtering tracks:', error)
  } finally {
    loading.value = false
  }
}

// Expose updateFiltersAndSort for parent to call
defineExpose({
  updateFiltersAndSort
})

// Listen for track update events
const handleTrackUpdate = () => {
  console.log('[group].vue: Received track update event, refetching tracks')
  fetchGroupTracks()
}

onMounted(async () => {
  await fetchGroupTracks()
  
  // Listen for track updates
  window.addEventListener('track-updated', handleTrackUpdate)
})

onUnmounted(() => {
  window.removeEventListener('track-updated', handleTrackUpdate)
})
</script>

