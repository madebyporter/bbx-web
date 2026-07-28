<template>
  <div v-if="isMounted && hasMenuItems" ref="menuAnchorRef" class="relative shrink-0">
    <Button
      variant="ghost"
      size="sm"
      class="text-neutral-500 hover:text-amber-300 bg-neutral-800/50 hover:bg-neutral-700/50 rounded-md !p-2"
      title="Track actions"
      @click.stop="toggleMenu"
    >
      <MoreVert class="w-4 h-4" />
    </Button>

    <Teleport to="body">
      <div
        v-if="menuOpen"
        ref="menuPanelRef"
        class="fixed z-[100] flex flex-col gap-1 min-w-[160px] bg-neutral-800 border border-neutral-700 rounded-md shadow-lg p-1"
        :style="menuStyle"
        @click.stop
      >
        <Button
          v-if="showEdit"
          variant="ghost"
          size="sm"
          class="!justify-start w-full text-neutral-200 hover:text-amber-300 hover:bg-neutral-700/50"
          @click="handleEdit"
        >
          Edit
        </Button>
        <Button
          v-if="showComments"
          variant="ghost"
          size="sm"
          class="!justify-start w-full text-neutral-200 hover:text-amber-300 hover:bg-neutral-700/50"
          @click="handleComments"
        >
          Comments
        </Button>
        <Button
          v-if="showGenerateVideo"
          variant="ghost"
          size="sm"
          class="!justify-start w-full text-neutral-200 hover:text-amber-300 hover:bg-neutral-700/50"
          @click="handleGenerateVideo"
        >
          Generate video
        </Button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { MoreVert } from '@iconoir/vue'
import Button from '~/components/Button.vue'
import type { Track } from '~/types/track'

const props = defineProps<{
  track: Track
  isOwnProfile: boolean
  profileUserType?: 'creator' | 'audio_pro' | null
  isLoggedIn: boolean
  collectionId?: number | null
}>()

const emit = defineEmits<{
  'edit-track': [track: Track]
}>()

const menuAnchorRef = ref<HTMLElement | null>(null)
const menuPanelRef = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
const anchorRect = ref<DOMRect | null>(null)
const isMounted = ref(false)

const showEdit = computed(() => props.isOwnProfile && props.profileUserType === 'audio_pro')
const showComments = computed(() => props.isLoggedIn)
const showGenerateVideo = computed(() => props.isOwnProfile && props.profileUserType === 'audio_pro')
const hasMenuItems = computed(() => showEdit.value || showComments.value || showGenerateVideo.value)

const MENU_SPACE_THRESHOLD = 180

const menuStyle = computed(() => {
  if (!anchorRect.value) return {}

  const rect = anchorRect.value
  const right = window.innerWidth - rect.right
  const spaceBelow = window.innerHeight - rect.bottom

  if (spaceBelow < MENU_SPACE_THRESHOLD) {
    return {
      bottom: `${window.innerHeight - rect.top + 4}px`,
      right: `${right}px`,
    }
  }

  return {
    top: `${rect.bottom + 4}px`,
    right: `${right}px`,
  }
})

function closeMenu() {
  menuOpen.value = false
  anchorRect.value = null
}

function updateMenuPosition() {
  if (!menuAnchorRef.value) return
  anchorRect.value = menuAnchorRef.value.getBoundingClientRect()
}

function toggleMenu() {
  const wasOpen = menuOpen.value
  menuOpen.value = !menuOpen.value

  if (!wasOpen && menuOpen.value) {
    nextTick(() => updateMenuPosition())
  } else if (!menuOpen.value) {
    anchorRect.value = null
  }
}

function handleEdit() {
  closeMenu()
  emit('edit-track', props.track)
}

function handleComments() {
  closeMenu()
  const event = new CustomEvent('open-track-comments', {
    detail: {
      track: { id: props.track.id, title: props.track.title },
      collectionId: props.collectionId ?? null,
    },
    bubbles: true,
    composed: true,
  })
  window.dispatchEvent(event)
}

function handleGenerateVideo() {
  closeMenu()
  const event = new CustomEvent('open-generate-track-video', {
    detail: {
      track: props.track,
    },
    bubbles: true,
    composed: true,
  })
  window.dispatchEvent(event)
}

function handleClickOutside(event: Event) {
  if (!menuOpen.value) return
  const target = event.target as Node
  if (menuAnchorRef.value?.contains(target)) return
  if (menuPanelRef.value?.contains(target)) return
  closeMenu()
}

function handleScrollOrResize() {
  if (!menuOpen.value) return
  updateMenuPosition()
}

onMounted(() => {
  isMounted.value = true
  document.addEventListener('click', handleClickOutside, true)
  window.addEventListener('scroll', handleScrollOrResize, true)
  window.addEventListener('resize', handleScrollOrResize)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true)
  window.removeEventListener('scroll', handleScrollOrResize, true)
  window.removeEventListener('resize', handleScrollOrResize)
})
</script>
