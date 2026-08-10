<template>
  <nav
    ref="mobileNav"
    id="navbar"
    class="border-r border-neutral-800 bg-neutral-900 flex flex-col justify-between overflow-auto shrink-0 min-w-[250px] w-[250px] min-h-0
      max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-40 max-lg:w-full max-lg:-translate-x-full
      lg:relative lg:translate-x-0 lg:self-stretch lg:h-auto"
  >
    <div
      ref="logoSection"
      class="sticky top-0 p-4 flex justify-between items-center"
      :class="hasRevealedNav ? 'opacity-100' : 'opacity-0 pointer-events-none'"
    >
      <NuxtLink to="/" @click="closeMobileNavOnClick" class="cursor-pointer">
        <img src="~/assets/img/bbx-logo.svg" alt="BBX Logo" class="size-[44px] lg:size-12" />
      </NuxtLink>
      <Button
        variant="ghost"
        class="text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-md !px-2 w-fit h-full lg:hidden max-w-8"
        @click="toggleMobileNav"
      >
        <svg class="min-w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6.75 17.25L12 12L17.25 17.25M17.25 6.75L12 12L6.75 6.75" stroke="currentColor" stroke-width="2" />
        </svg>
      </Button>
    </div>
    <div
      ref="navItemsSection"
      class="grow flex flex-col gap-16 p-4"
      :class="hasRevealedNav ? 'opacity-100' : 'opacity-0 pointer-events-none'"
    >
      <div v-if="isReady && user" class="flex flex-col gap-4">
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
      ref="userNavSection"
      class="bg-neutral-900 ring-1 ring-neutral-800 text-neutral-200 h-fit rounded-sm flex flex-row items-center overflow-hidden m-2 p-2"
      :class="hasRevealedNav ? 'opacity-100' : 'opacity-0 pointer-events-none'"
    >
      <div class="flex flex-row gap-0 items-center w-full">
        <template v-if="isReady && user">
          <div class="flex flex-col gap-0 justify-start items-start w-full">
            <div class="w-full flex items-center overflow-auto text-ellipsis p-2 pt-3 bg-neutral-800">
              <span class="block text-xs font-medium w-full text-neutral-400 truncate">{{ user.email }}</span>
            </div>
            <div class="flex flex-col justify-start items-start gap-0 w-full divide-y divide-neutral-800">
              <div class="w-full flex items-center p-2">
                <button
                  type="button"
                  class="text-link text-xs hover:text-amber-400 no-underline"
                  @click="handleShowSettings"
                >
                  Settings
                </button>
              </div>
              <div class="w-full flex items-center p-2">
                <button
                  type="button"
                  class="text-link text-xs hover:text-amber-400 no-underline"
                  @click="handleShowSupport"
                >
                  Support
                </button>
              </div>
              <div v-if="isAdmin" class="w-full flex items-center p-2">
                <button
                  type="button"
                  class="text-link text-xs hover:text-amber-400 no-underline"
                  @click="handleShowAdminModal"
                >
                  Admin
                </button>
              </div>
              <div class="w-full flex items-center p-2">
                <button
                  type="button"
                  class="text-link text-xs hover:text-amber-400 no-underline"
                  @click="handleAuth"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <Button variant="ghost" class="!p-2 w-full hover:bg-neutral-800/25 rounded-xs text-left text-sm justify-start" @click="handleShowAuthModal">Sign in</Button>
        </template>
      </div>
    </div>

    <!-- Settings Drawer -->
    <SettingsDrawer 
      v-model:show="showSettingsDrawer" 
      @profile-updated="handleProfileUpdated"
    />

    <SupportPopup v-model:show="showSupportPopup" />
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import gsap from 'gsap'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'
import { useSupabase } from '~/utils/supabase'
import { useSetNavShellReady } from '~/composables/usePageShellReady'
import SettingsDrawer from '~/components/SettingsDrawer.vue'
import SupportPopup from '~/components/SupportPopup.vue'


const auth = useAuth()
const { user, isAdmin, isReady } = auth
const { showSuccess, showError } = useToast()
const { supabase } = useSupabase()

const mobileNav = ref<HTMLElement | null>(null)
const logoSection = ref<HTMLElement | null>(null)
const navItemsSection = ref<HTMLElement | null>(null)
const userNavSection = ref<HTMLElement | null>(null)
const showMobileNav = ref(false)
const username = ref<string | null>(null)
const usernameLoaded = ref(false)
const wasDesktop = ref(false)
const showSettingsDrawer = ref(false)
const showSupportPopup = ref(false)
// Module-level so layout/Nav remounts do not re-run the session entrance animation
const hasRevealedNav = useState('nav-has-revealed', () => false)
const setNavShellReady = useSetNavShellReady()

const navDataReady = computed(() => isReady.value && usernameLoaded.value)

// Emit events to parent layout
const emit = defineEmits(['show-auth-modal', 'show-admin-modal', 'toggle-mobile-nav'])

const handleAuth = async () => {
  if (user.value) {
    try {
      await auth.signOut()
      username.value = null
      usernameLoaded.value = true
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

const handleShowSettings = () => {
  showSettingsDrawer.value = true
}

const handleShowSupport = () => {
  showSupportPopup.value = true
}

const handleProfileUpdated = () => {
  // Refresh username after profile update
  fetchUsername()
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
    usernameLoaded.value = true
    return
  }

  usernameLoaded.value = false

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('id', user.value.id)
      .maybeSingle()

    if (data && !error) {
      const profileData = data as { username: string | null } | null
      if (profileData?.username) {
        username.value = profileData.username
      }
    } else if (error) {
      console.error('Error fetching username:', error)
    }
  } catch (error) {
    console.error('Error fetching username:', error)
  } finally {
    usernameLoaded.value = true
  }
}

const revealNavSections = async () => {
  if (!navDataReady.value) return

  await nextTick()

  if (!logoSection.value || !navItemsSection.value || !userNavSection.value) return

  // Already revealed this session (e.g. layout remounted) — show instantly, no re-animation
  if (hasRevealedNav.value) {
    gsap.set([logoSection.value, navItemsSection.value, userNavSection.value], { opacity: 1 })
    setNavShellReady?.(true)
    return
  }

  hasRevealedNav.value = true

  const enableSection = (element: HTMLElement) => {
    element.classList.remove('pointer-events-none')
  }

  gsap
    .timeline({
      onComplete: () => {
        setNavShellReady?.(true)
      },
    })
    .to(logoSection.value, {
      opacity: 1,
      duration: 0.25,
      ease: 'power2.out',
      onStart: () => {
        if (logoSection.value) enableSection(logoSection.value)
      },
    })
    .to(
      navItemsSection.value,
      {
        opacity: 1,
        duration: 0.25,
        ease: 'power2.out',
        onStart: () => {
          if (navItemsSection.value) enableSection(navItemsSection.value)
        },
      },
      '+=0.1'
    )
    .to(
      userNavSection.value,
      {
        opacity: 1,
        duration: 0.25,
        ease: 'power2.out',
        onStart: () => {
          if (userNavSection.value) enableSection(userNavSection.value)
        },
      },
      '+=0.1'
    )
}

const handleResize = () => {
  const isDesktop = window.innerWidth >= 1024
  if (!mobileNav.value) return

  if (isDesktop) {
    // Clear GSAP mobile drawer styles so flex stretch can fill main height
    gsap.set(mobileNav.value, { clearProps: 'transform,height,top,bottom,flex,width,margin' })
    wasDesktop.value = true
  } else if (wasDesktop.value) {
    gsap.set(mobileNav.value, { x: '-100%' })
    showMobileNav.value = false
    emit('toggle-mobile-nav', false)
    wasDesktop.value = false
  }
}

// Watch for user changes and fetch username
watch(user, () => {
  fetchUsername()
}, { immediate: true })

watch(navDataReady, (ready) => {
  if (ready) {
    revealNavSections()
  }
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

  if (navDataReady.value) {
    revealNavSections()
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>
