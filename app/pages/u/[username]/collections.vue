<template>
  <div class="col-span-full max-w-full lg:max-w-none p-2 lg:p-0 flex flex-col gap-8 text-neutral-300">
    <div v-if="loading" class="text-neutral-500">Loading collections...</div>
    
    <div v-else-if="!profileUserId" class="text-neutral-500">
      User not found.
    </div>

    <template v-else>
      <!-- Header -->
      <div class="py-4">
        <h1 class="text-3xl font-bold mb-2">Collections</h1>
        <p class="text-neutral-400">
          {{ collections.length }} {{ collections.length === 1 ? 'collection' : 'collections' }}
        </p>
      </div>

      <!-- Collections Table -->
      <div v-if="collections.length === 0" class="text-neutral-500">
        {{ isOwnProfile ? 'No collections yet. Create one when uploading or editing a track.' : 'No collections available.' }}
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-neutral-800">
            <tr class="text-left text-neutral-500">
              <th class="pb-2 pr-4">Name</th>
              <th class="pb-2 pr-4">Description</th>
              <th class="pb-2 pr-4">Tracks</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="collection in collections" 
              :key="collection.id"
              class="border-b border-neutral-800/50 hover:bg-neutral-800/30"
            >
              <td class="py-3 pr-4">
                <NuxtLink 
                  :to="`/u/${username}/${collection.slug}`"
                  class="text-amber-400 hover:text-amber-300"
                >
                  {{ collection.name }}
                </NuxtLink>
              </td>
              <td class="py-3 pr-4 text-neutral-400">
                {{ collection.description || '-' }}
              </td>
              <td class="py-3 pr-4 text-neutral-400">
                {{ collection.sound_count || 0 }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import { useSupabase } from '~/utils/supabase'

const route = useRoute()
const { user } = useAuth()
const { supabase } = useSupabase()

// State
const collections = ref<any[]>([])
const loading = ref(true)
const profileUserId = ref<string | null>(null)
const username = ref('')

// Computed
const isOwnProfile = computed(() => {
  return !!(user.value && profileUserId.value && user.value.id === profileUserId.value)
})

// Methods
const fetchProfile = async () => {
  const usernameOrId = route.params.username as string
  
  if (!supabase) return
  
  try {
    // Try to fetch profile by username
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, username')
      .eq('username', usernameOrId)
      .single()

    if (error || !data) {
      // Fallback: try as UUID if username lookup fails
      profileUserId.value = usernameOrId
      username.value = usernameOrId
    } else {
      profileUserId.value = data.id as string
      username.value = data.username as string
    }
  } catch (error) {
    console.error('Error fetching profile:', error)
    // Fallback
    profileUserId.value = usernameOrId
    username.value = usernameOrId
  }
}

const fetchCollections = async () => {
  if (!supabase || !profileUserId.value) return
  
  loading.value = true
  
  try {
    // Fetch all collections for the user
    const { data: collectionsData, error: collectionsError } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', profileUserId.value)
      .order('created_at', { ascending: false })
    
    if (collectionsError) throw collectionsError
    
    // For each collection, count the tracks
    const collectionsWithCounts = await Promise.all(
      (collectionsData || []).map(async (collection: any) => {
        const { count } = await supabase
          .from('collections_sounds')
          .select('*', { count: 'exact', head: true })
          .eq('collection_id', collection.id)
        
        return {
          ...collection,
          sound_count: count || 0
        }
      })
    )
    
    collections.value = collectionsWithCounts
  } catch (error) {
    console.error('Error fetching collections:', error)
    collections.value = []
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(async () => {
  await fetchProfile()
  await fetchCollections()
})
</script>

