<template>
  <div class="col-span-full max-w-full lg:max-w-none p-2 lg:p-0 flex flex-col gap-8 text-neutral-300">
    <div v-if="loading" class="text-neutral-500">Loading collection...</div>
    
    <div v-else-if="!collection" class="text-neutral-500">
      Collection not found.
    </div>

    <template v-else>
      <!-- Collection Header -->
      <div class="py-4">
        <h1 class="text-3xl font-bold mb-2">{{ collection.name }}</h1>
        <p v-if="collection.description" class="text-neutral-400 mb-4">
          {{ collection.description }}
        </p>
        <p class="text-sm text-neutral-500">
          {{ tracks.length }} {{ tracks.length === 1 ? 'track' : 'tracks' }}
        </p>
      </div>

      <!-- Tracks in Collection -->
      <div>
        <h2 class="text-xl font-semibold mb-4">Tracks</h2>
        <TracksTable 
          :tracks="tracks"
          :is-own-profile="isOwnProfile"
          :loading="tracksLoading"
          @edit-track="handleEdit"
        />
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

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { supabase } = useSupabase()

// State
const collection = ref<any>(null)
const tracks = ref<any[]>([])
const loading = ref(true)
const tracksLoading = ref(false)
const profileUserId = ref<string | null>(null)

// Computed
const isOwnProfile = computed(() => {
  return !!(user.value && profileUserId.value && user.value.id === profileUserId.value)
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
    
    profileUserId.value = profileData.id
    
    // Now fetch the collection by slug and user_id
    const { data: collectionData, error: collectionError } = await supabase
      .from('collections')
      .select('*')
      .eq('slug', collectionSlug)
      .eq('user_id', profileData.id)
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
    // Fetch sounds via junction table
    const { data, error } = await supabase
      .from('collections_sounds')
      .select(`
        sounds(*)
      `)
      .eq('collection_id', collection.value.id)
    
    if (error) throw error
    
    // Extract sounds from the nested structure and add collection names
    const soundsList = (data || [])
      .map(item => item.sounds)
      .filter(sound => sound !== null)
    
    // Fetch collection names for each track
    const tracksWithCollections = await Promise.all(soundsList.map(async (track: any) => {
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
    tracks.value = []
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

// Listen for track update events
const handleTrackUpdate = () => {
  console.log('[collection].vue: Received track update event, refetching tracks')
  fetchTracks()
}

// Lifecycle
onMounted(async () => {
  await fetchCollection()
  
  // Listen for track updates
  window.addEventListener('track-updated', handleTrackUpdate)
})

onUnmounted(() => {
  window.removeEventListener('track-updated', handleTrackUpdate)
})
</script>

