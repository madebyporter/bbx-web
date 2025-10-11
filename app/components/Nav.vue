<template>
  <nav ref="mobileNav" id="navbar" class="
        flex 
        flex-col
        gap-4
        border 
        border-neutral-800
        bg-neutral-900
        min-w-[235px]
        max-lg:fixed 
        max-lg:bottom-2 
        max-lg:left-2 
        max-lg:right-2 
        max-lg:top-[144px] 
        max-lg:z-50 
        max-lg:rounded-md 
        max-lg:[transform:translateX(-105%)]
        lg:col-start-1 
        lg:col-span-3 
        lg:fixed 
        lg:top-2
        lg:left-2
        lg:bottom-2
        lg:rounded-md
        xl:col-start-1 
        xl:col-span-2 
        ">
    <div class="sticky top-0 p-4">
      <img src="~/assets/img/bbx-logo.svg" alt="BBX Logo" class="size-12" />
    </div>
    <div class="flex flex-col gap-16 grow overflow-auto lg:pb-[130px] p-4">
      <div class="flex flex-col gap-4">
        <span class="nav-header">Library</span>
        <NuxtLink to="/u/madebyporter" class="nav-link" active-class="!font-bold !text-white">All Music</NuxtLink>
      </div>
      <div class="flex flex-col gap-4">
        <span class="nav-header">Resources</span>
        <NuxtLink to="/software" class="nav-link" active-class="!font-bold !text-white">Software</NuxtLink>
        <NuxtLink to="/sounds" class="nav-link" active-class="!font-bold !text-white">Sounds & Kits</NuxtLink>
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
      class="bg-neutral-900 ring-1 ring-neutral-800 text-neutral-200 h-fit absolute bottom-2 left-2 right-2 rounded-sm p-2 hidden lg:flex flex-row items-center overflow-hidden">
      <div class="flex flex-row gap-0 items-center w-full">
        <template v-if="user">
          <div class="flex flex-col gap-0 justify-start items-start w-full">
            <div class="w-full flex items-center overflow-auto text-ellipsis p-2 pt-3 bg-neutral-800">
              <span class="block text-xs font-medium w-full text-neutral-400">{{ user.email }}</span>
            </div>
            <div class="flex flex-col justify-start items-start gap-0 w-full divide-y divide-neutral-800">
              <div class="w-full flex items-center p-2">
                <button v-if="isAdmin" @click="handleShowAdminModal"
                  class="cursor-pointer text-xs hover:text-amber-400">
                  Manage Submissions
                </button>
              </div>
              <div class="w-full flex items-center p-2">
                <button @click="handleAuth" class="cursor-pointer text-xs hover:text-amber-400">Logout</button>
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <button @click="handleShowAuthModal" class="cursor-pointer text-sm">Login</button>
        </template>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'
import { useAuth } from '~/composables/useAuth'

const auth = useAuth()
const { user, isAdmin } = auth

const mobileNav = ref(null)
const showMobileNav = ref(false)

// Emit events to parent layout
const emit = defineEmits(['show-auth-modal', 'show-admin-modal', 'toggle-mobile-nav'])

const handleAuth = async () => {
  if (user.value) {
    await auth.signOut()
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
    x: showMobileNav.value ? 0 : '-105%',
    ease: 'power2.out'
  })
  
  emit('toggle-mobile-nav', showMobileNav.value)
}

const handleResize = () => {
  if (window.innerWidth >= 1024) {
    // Reset nav position on desktop
    gsap.set(mobileNav.value, { x: 0 })
  } else {
    // Reset nav position on mobile
    gsap.set(mobileNav.value, { x: '-105%' })
  }
  showMobileNav.value = false
}

// Expose mobile nav ref and toggle function for parent to control
defineExpose({
  mobileNav,
  toggleMobileNav
})

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>
