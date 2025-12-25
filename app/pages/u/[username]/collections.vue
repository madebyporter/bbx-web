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
      <div v-if="filteredCollections.length === 0 && !searchQuery" class="text-neutral-500">
        {{ isOwnProfile ? 'No collections yet. Create one when uploading or editing a track.' : 'No collections available.' }}
      </div>
      
      <div v-else-if="filteredCollections.length === 0 && searchQuery" class="text-neutral-500">
        No collections match your search.
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
                <NuxtLink 
                  :to="`/u/${username}/c/${collection.slug}`"
                  class="text-amber-400 hover:text-amber-300"
                >
                  {{ collection.name }}
                </NuxtLink>
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

// Fetch initial profile data server-side for SEO
const { data: initialData } = await useAsyncData(
  `profile-${route.params.username}-collections`,
  async () => {
    if (!supabase) return null
    
    const usernameParam = route.params.username as string
    
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, username')
        .eq('username', usernameParam)
        .single()
      
      if (profileError || !profileData) return null
      
      return {
        profileUserId: profileData.id,
        username: profileData.username
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  },
  {
    server: true // Ensure this runs on the server for SSR
  }
)

// Set SEO meta tags - calculate values directly after data fetch for SSR compatibility
const usernameParam = route.params.username as string
const profileForSEO = initialData.value

const seoTitleValue = profileForSEO?.username 
  ? `${profileForSEO.username}'s Collections`
  : `${usernameParam}'s Collections`
const seoDescriptionValue = profileForSEO?.username
  ? `Browse ${profileForSEO.username}'s music collections on Beatbox`
  : `Browse music collections on Beatbox`

const currentUrl = useRequestURL().href
const siteConfig = useSiteConfig()
const ogImageUrl = `${siteConfig.url}/img/og-image.jpg`

// Use useSeoMeta with direct values for proper SSR - calculated after await useAsyncData
// NuxtSEO module handles canonical URLs automatically
useSeoMeta({
  title: seoTitleValue,
  description: seoDescriptionValue,
  ogTitle: seoTitleValue,
  ogDescription: seoDescriptionValue,
  ogUrl: currentUrl,
  ogType: 'website',
  ogImage: ogImageUrl,
  ogImageWidth: '1200',
  ogImageHeight: '630',
  twitterCard: 'summary_large_image',
  twitterTitle: seoTitleValue,
  twitterDescription: seoDescriptionValue,
  twitterImage: ogImageUrl
})

// Inject search handler registration functions
const registerSearchHandler = inject<(handler: (query: string) => void) => void>('registerSearchHandler')
const unregisterSearchHandler = inject<() => void>('unregisterSearchHandler')

// State
const collections = ref<any[]>([])
const loading = ref(true)
const profileUserId = ref<string | null>(initialData.value?.profileUserId || null)
const username = ref(initialData.value?.username || usernameParam)
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

const handleSearch = (query: string) => {
  searchQuery.value = query
}

// Expose handleSearch for parent to call
defineExpose({
  handleSearch
})

// Lifecycle
onMounted(async () => {
  // Only fetch profile if we don't have initialData (client-side navigation)
  if (!initialData.value) {
    await fetchProfile()
  }
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

