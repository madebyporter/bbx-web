<template>
  <div class="flex flex-col gap-0 text-neutral-300 grow">
    <div v-if="loading" class="text-neutral-500 p-4">Loading group...</div>

    <div v-else-if="tracks.length === 0" class="text-neutral-500 p-4">
      No tracks found in this group.
    </div>

    <template v-else>
      <!-- Group Header with Edit -->
      <div class="p-4 border-b border-neutral-800">
        <div class="flex items-center justify-between">
          <div v-if="!isEditingGroupName" class="flex items-center gap-3">
            <h1 class="text-3xl font-bold">{{ groupName }}</h1>
            <button 
              v-if="isOwnProfile"
              @click="isEditingGroupName = true"
              class="text-neutral-400 hover:text-white transition-colors text-sm"
              title="Rename group"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
              </svg>
            </button>
          </div>
          
          <div v-else class="flex items-center gap-2 flex-1 max-w-md">
            <input
              v-model="newGroupName"
              type="text"
              class="input flex-1"
              placeholder="Enter new group name"
              @keyup.enter="saveGroupName"
              @keyup.esc="isEditingGroupName = false"
            />
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

      <!-- Tracks in Group -->
      <div class="grow">
        <TracksTable 
          :tracks="tracks" 
          :source-id="`group-${groupName}`"
          :is-own-profile="isOwnProfile"
          :loading="false"
          :username="username"
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

const tracks = ref<any[]>([])
const loading = ref(true)
const profileUserId = ref<string | null>(null)
const username = ref('')
const groupName = ref('')
const isEditingGroupName = ref(false)
const newGroupName = ref('')

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
    
    // Fetch all tracks in this group
    const { data: tracksData, error: tracksError } = await supabase
      .from('sounds')
      .select('*')
      .eq('user_id', profileData.id)
      .eq('track_group_name', groupParam)
      .order('version', { ascending: false })
    
    if (tracksError) throw tracksError
    
    // Fetch collection names and slugs for each track
    const tracksWithCollections = await Promise.all((tracksData || []).map(async (track: any) => {
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
      
      return { ...track, collections: collectionData || [] }
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

