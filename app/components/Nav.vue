<template>
  <nav ref="mobileNav" id="navbar"
    class="border-r border-neutral-800 bg-neutral-900 flex flex-col justify-between overflow-auto shrink-0 min-w-[250px] lg:max-w-[250px] lg:relative lg:translate-x-0 fixed inset-y-0 left-0 z-40 lg:z-40 w-full lg:w-fit"
    style="transform: translateX(-100%)">
    <div class="sticky top-0 p-4 flex justify-between items-center">
      <NuxtLink to="/" @click="closeMobileNavOnClick" class="cursor-pointer">
        <img src="~/assets/img/bbx-logo.svg" alt="BBX Logo" class="size-[44px] lg:size-12" />
      </NuxtLink>
      <button @click="toggleMobileNav" class="text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-md px-2 w-fit h-full lg:hidden cursor-pointer max-w-8 flex items-center justify-center">
        <svg class="min-w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6.75 17.25L12 12L17.25 17.25M17.25 6.75L12 12L6.75 6.75" stroke="currentColor" stroke-width="2" />
        </svg>
      </button>
    </div>
    <div class="grow flex flex-col gap-16 p-4">
      <div v-if="user" class="flex flex-col gap-4">
        <span class="nav-header">Library</span>
        <NuxtLink v-if="username" :to="`/u/${username}`" @click="closeMobileNavOnClick" class="nav-link" active-class="!font-bold !text-white">
          All Music</NuxtLink>
        <NuxtLink v-else :to="`/u/${user.id}`" @click="closeMobileNavOnClick" class="nav-link" active-class="!font-bold !text-white">All Music
        </NuxtLink>

        <NuxtLink v-if="username" :to="`/u/${username}/collections`" @click="closeMobileNavOnClick" class="nav-link"
          active-class="!font-bold !text-white">Collections</NuxtLink>
        <NuxtLink v-else :to="`/u/${user.id}/collections`" @click="closeMobileNavOnClick" class="nav-link" active-class="!font-bold !text-white">
          Collections</NuxtLink>
      </div>
      <div class="flex flex-col gap-4">
        <span class="nav-header">Resources</span>
        <NuxtLink to="/software" @click="closeMobileNavOnClick" class="nav-link" active-class="!font-bold !text-white">Software</NuxtLink>
        <NuxtLink to="/kits" @click="closeMobileNavOnClick" class="nav-link" active-class="!font-bold !text-white">Sounds & Kits</NuxtLink>
        <NuxtLink to="#" class="nav-link-later">
          Hardware <span class="tag">Later</span>
        </NuxtLink>
        <NuxtLink to="#" class="nav-link-later">
          Sync Libraries <span class="tag">Later</span>
        </NuxtLink>
        <NuxtLink to="#" class="nav-link-later">
          Events <span class="tag">Later</span>
        </NuxtLink>
      </div>
      <!-- <div class="flex flex-col gap-4">
        <span class="nav-header">People</span>
        <NuxtLink to="#" class="nav-link-later">
          Producers <span class="tag">Later</span>
        </NuxtLink>
        <NuxtLink to="#" class="nav-link-later">
          Engineers <span class="tag">Later</span>
        </NuxtLink>
        <NuxtLink to="#" class="nav-link-later">
          Musicians <span class="tag">Later</span>
        </NuxtLink>
      </div>
      <div class="flex flex-col gap-4">
        <span class="nav-header">Products</span>
        <NuxtLink to="#" class="nav-link-later">
          Studio <span class="tag">Later</span>
        </NuxtLink>
        <NuxtLink to="#" class="nav-link-later">
          Display <span class="tag">Later</span>
        </NuxtLink>
      </div> -->
    </div>

    <!-- Account UI -->
    <div
      class="bg-neutral-900 ring-1 ring-neutral-800 text-neutral-200 h-fit rounded-sm flex flex-row items-center overflow-hidden m-2 p-2">
      <div class="flex flex-row gap-0 items-center w-full">
        <template v-if="user">
          <div class="flex flex-col gap-0 justify-start items-start w-full">
            <div class="w-full flex items-center overflow-auto text-ellipsis p-2 pt-3 bg-neutral-800">
              <span class="block text-xs font-medium w-full text-neutral-400 truncate">{{ user.email }}</span>
            </div>
            <div class="flex flex-col justify-start items-start gap-0 w-full divide-y divide-neutral-800">
              <div class="w-full flex items-center p-2">
                <button v-if="isAdmin" @click="handleShowAdminModal"
                  class="cursor-pointer text-xs hover:text-amber-400">
                  Admin
                </button>
              </div>
              <div class="w-full flex items-center p-2">
                <button @click="handleAuth" class="cursor-pointer text-xs hover:text-amber-400">Logout</button>
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <button @click="handleShowAuthModal" class="cursor-pointer text-sm p-2 w-full hover:bg-neutral-800/25 rounded-xs text-left">Sign in</button>
        </template>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import gsap from 'gsap'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'
import { useSupabase } from '~/utils/supabase'


const auth = useAuth()
const { user, isAdmin } = auth
const { showSuccess, showError } = useToast()
const { supabase } = useSupabase()

const mobileNav = ref(null)
const showMobileNav = ref(false)
const username = ref<string | null>(null)
const wasDesktop = ref(false)

// Emit events to parent layout
const emit = defineEmits(['show-auth-modal', 'show-admin-modal', 'toggle-mobile-nav'])

const handleAuth = async () => {
  if (user.value) {
    try {
      await auth.signOut()
      showSuccess('Logged out successfully')
    } catch (error) {
      console.error('Logout error:', error)
      showError('Failed to logout')
    }
  } else {
    emit('show-auth-modal')
  }
}

const handleShowAuthModal = () => {
  emit('show-auth-modal')
}

const handleShowAdminModal = () => {
  emit('show-admin-modal')
}

const toggleMobileNav = () => {
  showMobileNav.value = !showMobileNav.value
  
  gsap.to(mobileNav.value, {
    duration: 0.3,
    x: showMobileNav.value ? '0%' : '-100%',
    ease: 'power2.out'
  })
  
  emit('toggle-mobile-nav', showMobileNav.value)
}

const closeMobileNav = () => {
  if (showMobileNav.value) {
    showMobileNav.value = false
    
    gsap.to(mobileNav.value, {
      duration: 0.3,
      x: '-100%',
      ease: 'power2.out'
    })
    
    emit('toggle-mobile-nav', false)
  }
}

const closeMobileNavOnClick = () => {
  // Only close on mobile (screen width < 1024px)
  if (window.innerWidth < 1024) {
    closeMobileNav()
  }
}

const fetchUsername = async () => {
  if (!user.value || !supabase) {
    username.value = null
    return
  }
  
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('id', user.value.id)
      .maybeSingle()
    
    if (data && !error) {
      username.value = data.username as string
    } else if (error) {
      console.error('Error fetching username:', error)
    }
  } catch (error) {
    console.error('Error fetching username:', error)
  }
}

const handleResize = () => {
  const isDesktop = window.innerWidth >= 1024
  
  if (isDesktop) {
    // On desktop, clear transforms and let CSS handle positioning
    gsap.set(mobileNav.value, { clearProps: 'transform' })
    wasDesktop.value = true
  } else {
    // On mobile - only hide if switching from desktop to mobile
    if (wasDesktop.value) {
      gsap.set(mobileNav.value, { x: '-100%' })
      showMobileNav.value = false
      emit('toggle-mobile-nav', false)
    }
    wasDesktop.value = false
  }
}

// Watch for user changes and fetch username
watch(user, () => {
  fetchUsername()
}, { immediate: true })

// Expose mobile nav ref and toggle function for parent to control
defineExpose({
  mobileNav,
  toggleMobileNav
})

onMounted(() => {
  // Initialize wasDesktop flag based on initial screen size
  wasDesktop.value = window.innerWidth >= 1024
  // Set initial position based on screen size
  handleResize()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>
