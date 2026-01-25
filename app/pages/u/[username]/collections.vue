<template>
  <div class="col-span-full max-w-full lg:max-w-none p-2 lg:p-0 flex flex-col gap-8 text-neutral-300">
    <div v-if="loading" class="flex items-center justify-center p-8">
      <LoadingLogo />
    </div>
    
    <div v-else-if="!profileUserId" class="text-neutral-500 p-4">
      User not found.
    </div>

    <template v-else>
      <!-- Header -->
      <div class="p-4">
        <h1 class="text-3xl font-bold mb-2">Collections</h1>
        <p class="text-neutral-400">
          {{ filteredCollections.length }} {{ filteredCollections.length === 1 ? 'collection' : 'collections' }}
        </p>
      </div>

      <!-- Collections Table -->
      <div v-if="filteredCollections.length === 0 && !searchQuery" class="p-8 text-center">
        <div class="text-neutral-500">
          {{ isOwnProfile ? 'No collections yet. Create one when uploading or editing a track.' : 'No collections available.' }}
        </div>
      </div>
      
      <div v-else-if="filteredCollections.length === 0 && searchQuery" class="p-8 text-center">
        <div class="text-neutral-500">
          No collections match your search.
        </div>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-neutral-800">
            <tr class="text-left text-neutral-500">
              <th class="p-4">Name</th>
              <th class="p-4">Description</th>
              <th class="p-4">Tracks</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="collection in filteredCollections" 
              :key="collection.id"
              :data-collection-id="collection.id"
              class="border-b border-neutral-800/50 hover:bg-neutral-800/30"
            >
              <td class="p-4">
                <div class="flex items-center gap-2">
                  <NuxtLink 
                    :to="collection.is_shared ? `/u/${collection.owner_username || collection.user_id}/c/${collection.slug}` : `/u/${username}/c/${collection.slug}`"
                    class="text-amber-400 hover:text-amber-300"
                  >
                    {{ collection.name }}
                  </NuxtLink>
                  <span v-if="collection.is_shared" class="text-xs px-2 py-0.5 bg-neutral-700 text-neutral-300 rounded">
                    Shared with me
                  </span>
                </div>
              </td>
              <td class="p-4 text-neutral-400">
                {{ collection.description || '-' }}
              </td>
              <td class="p-4 text-neutral-400">
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
import { ref, computed, onMounted, onUnmounted, inject } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import { useSupabase } from '~/utils/supabase'
import LoadingLogo from '~/components/LoadingLogo.vue'

const route = useRoute()
const { user } = useAuth()
const { supabase } = useSupabase()

// Inject search handler registration functions
const registerSearchHandler = inject<(handler: (query: string) => void) => void>('registerSearchHandler')
const unregisterSearchHandler = inject<() => void>('unregisterSearchHandler')

// State
const collections = ref<any[]>([])
const loading = ref(true)
const profileUserId = ref<string | null>(null)
const username = ref('')
const searchQuery = ref('')

// Computed
const isOwnProfile = computed(() => {
  return !!(user.value && profileUserId.value && user.value.id === profileUserId.value)
})

const filteredCollections = computed(() => {
  if (!searchQuery.value) return collections.value
  
  const query = searchQuery.value.trim().toLowerCase()
  return collections.value.filter(collection => {
    const name = collection.name?.toLowerCase() || ''
    const description = collection.description?.toLowerCase() || ''
    return name.includes(query) || description.includes(query)
  })
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
    // Fetch collections owned by the user
    const { data: ownedCollections, error: ownedError } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', profileUserId.value)
      .order('created_at', { ascending: false })
    
    if (ownedError) throw ownedError
    
    // Fetch collections where user is a member (if viewing own profile or if logged in user is viewing)
    let sharedCollections: any[] = []
    if (user.value) {
      const { data: memberCollections, error: memberError } = await supabase
        .from('collection_members')
        .select(`
          collection_id,
          collections(*)
        `)
        .eq('member_id', user.value.id)
      
      if (!memberError && memberCollections) {
        sharedCollections = memberCollections
          .map((mc: any) => mc.collections)
          .filter((c: any) => c !== null && c.user_id !== profileUserId.value) // Exclude owned collections
      }
    }
    
    // Combine owned and shared collections, mark shared ones
    const allCollections = [
      ...(ownedCollections || []).map((c: any) => ({ ...c, is_shared: false })),
      ...sharedCollections.map((c: any) => ({ ...c, is_shared: true }))
    ]
    
    // Deduplicate by ID (in case of any overlap)
    const uniqueCollections = Array.from(
      new Map(allCollections.map((c: any) => [c.id, c])).values()
    )
    
    // For each collection, count the tracks and fetch owner username if shared
    const collectionsWithCounts = await Promise.all(
      uniqueCollections.map(async (collection: any) => {
        const { count } = await supabase
          .from('collections_sounds')
          .select('*', { count: 'exact', head: true })
          .eq('collection_id', collection.id)
        
        let ownerUsername = username.value
        
        // If shared collection, fetch owner username
        if (collection.is_shared && collection.user_id) {
          try {
            const { data: ownerData } = await supabase
              .from('user_profiles')
              .select('username')
              .eq('id', collection.user_id)
              .maybeSingle()
            
            if (ownerData?.username) {
              ownerUsername = ownerData.username
            }
          } catch (error) {
            console.error('Error fetching collection owner:', error)
          }
        }
        
        return {
          ...collection,
          sound_count: count || 0,
          owner_username: ownerUsername
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

const handleSearch = (query: string) => {
  searchQuery.value = query
}

// Expose handleSearch for parent to call
defineExpose({
  handleSearch
})

// Lifecycle
onMounted(async () => {
  await fetchProfile()
  await fetchCollections()
  
  // Register search handler
  if (registerSearchHandler) {
    registerSearchHandler(handleSearch)
  }
})

onUnmounted(() => {
  // Unregister search handler
  if (unregisterSearchHandler) {
    unregisterSearchHandler()
  }
})
</script>

