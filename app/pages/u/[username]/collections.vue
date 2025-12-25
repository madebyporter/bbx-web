<template>
  <div class="col-span-full max-w-full lg:max-w-none p-2 lg:p-0 flex flex-col gap-8 text-neutral-300">
    <div v-if="loading" class="flex items-center justify-center p-8">
      <LoadingLogo />
    </div>
    
    <div v-else-if="!profileUserId" class="text-neutral-500 p-4">
      User not found.
    </div>
    
    <div v-else-if="!isOwnProfile" class="text-neutral-500 p-4">
      This page is only accessible to the profile owner.
    </div>

    <template v-else-if="isOwnProfile">
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
const { user, isReady } = useAuth()
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
        .select('id, username, display_name')
        .eq('username', usernameParam)
        .single()
      
      if (profileError || !profileData) return null
      
      return {
        profileUserId: profileData.id,
        username: profileData.username,
        display_name: profileData.display_name
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

// Set SEO meta tags IMMEDIATELY after data fetch for SSR compatibility
// This must be placed right after useAsyncData to ensure it runs during SSR
const usernameParam = route.params.username as string
const profileForSEO = initialData.value

// Calculate SEO values directly from data (available during SSR after await useAsyncData)
const profileName = (profileForSEO as any)?.display_name || (profileForSEO as any)?.username || usernameParam
const seoTitleValue = `${profileName}'s Collections`
const seoDescriptionValue = `Browse ${profileName}'s music collections on Beatbox`

// Use request URL for ogUrl to support deploy previews
const currentUrl = useRequestURL().href
const requestOrigin = useRequestURL().origin
const ogImageUrl = `${requestOrigin}/img/og-image.jpg`

// Use useHead directly to ensure meta tags are set during SSR
// NuxtSEO useSeoMeta may not work reliably for dynamic SSR
useHead({
  title: seoTitleValue,
  meta: [
    { name: 'description', content: seoDescriptionValue },
    { name: 'robots', content: 'noindex, nofollow' },
    { property: 'og:title', content: seoTitleValue },
    { property: 'og:description', content: seoDescriptionValue },
    { property: 'og:url', content: currentUrl },
    { property: 'og:type', content: 'website' },
    { property: 'og:image', content: ogImageUrl },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:alt', content: seoTitleValue },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: seoTitleValue },
    { name: 'twitter:description', content: seoDescriptionValue },
    { name: 'twitter:image', content: ogImageUrl }
  ]
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
  
  // Only fetch collections if user is the owner
  if (isOwnProfile.value) {
    await fetchCollections()
  } else {
    // If not owner, ensure loading is set to false
    loading.value = false
  }
  
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

