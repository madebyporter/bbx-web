<template>
  <div class="bg-white lg:bg-neutral-50 flex flex-col lg:flex-row gap-4 p-4 lg:pl-0">
    <div class="grow flex relative">
      <img src="/img/db/icon-search.svg" alt="Search" class="absolute z-10 top-[50%] translate-y-[-50%] px-4" />
      <input 
        ref="searchInput"
        type="text" 
        v-model="searchQuery"
        @input="onSearch"
        class="rounded-full bg-neutral-200 text-left p-4 px-12 grow z-0 relative w-full lg:w-auto" 
        placeholder="Search (CMD/CTRL+K)" 
      />
    </div>
    <div class="flex flex-row gap-4 w-full justify-between lg:w-auto">
      <button 
        @click="$emit('toggle-nav')"
        class="btn w-fit !px-2 flex items-center lg:hidden"
      >
        <img src="/img/db/icon-bars.svg" alt="Bars" class="min-w-4" />
      </button>
      <button @click="$emit('open-filter-modal')" class="btn w-full lg:w-fit">Filter & Sort</button>
      <button 
        v-if="user"
        @click="$emit('open-modal')" 
        class="btn w-full lg:w-fit"
      >
        Submit
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const searchQuery = ref('')
const searchInput = ref(null)
const emit = defineEmits(['open-modal', 'open-filter-modal', 'search', 'toggle-nav'])

// Get user from Netlify Identity
const { $identity } = useNuxtApp()
const user = ref(null)

// Watch for auth state changes
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  
  // Initialize Netlify Identity
  if ($identity) {
    // Get initial user state
    const currentUser = $identity.currentUser()
    if (currentUser) {
      user.value = currentUser
    }
    
    // Subscribe to auth changes
    $identity.on('init', (initUser) => {
      user.value = initUser
    })
    
    $identity.on('login', (loginUser) => {
      user.value = loginUser
      console.log('SearchFilter: User logged in', loginUser)
    })
    
    $identity.on('logout', () => {
      user.value = null
      console.log('SearchFilter: User logged out')
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  
  // Clean up Netlify Identity listeners
  if ($identity) {
    $identity.off('init')
    $identity.off('login')
    $identity.off('logout')
  }
})

const onSearch = () => {
  emit('search', searchQuery.value)
}

const handleKeydown = (e) => {
  // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault() // Prevent default browser behavior
    searchInput.value?.focus()
  }
}

const fetchResources = async () => {
  try {
    const data = await fetchResourcesWithTags()
    
    // Apply search filter
    let filteredData = data
    if (searchQuery.value) {
      const query = searchQuery.value.trim().toLowerCase()
      filteredData = data.filter(resource => {
        const name = resource.name?.toLowerCase() || ''
        const creator = resource.creator?.toLowerCase() || ''
        const tags = resource.tags?.map(tag => tag.toLowerCase()) || []
        const type = resource.type?.toLowerCase() || ''

        return name.includes(query) ||
          creator.includes(query) ||
          tags.some(tag => tag.includes(query)) ||
          type.includes(query)
      })
    }

    resources.value = filteredData
  } catch (error) {
    console.error('Error fetching resources:', error)
  }
}
</script>