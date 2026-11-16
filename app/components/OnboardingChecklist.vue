<template>
  <div
    v-if="visible"
    class="mx-2 mb-2 ring-1 ring-neutral-800 bg-neutral-900 text-neutral-200 rounded-sm overflow-hidden"
  >
    <div class="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
      <p class="text-xs font-semibold text-neutral-300 uppercase tracking-wide">Get started</p>
      <div
        role="button"
        tabindex="0"
        class="p-1 cursor-pointer"
        aria-label="Dismiss checklist"
        @click="handleDismiss"
        @keydown.enter.prevent="handleDismiss"
      >
        <Xmark class="size-4 text-neutral-500 hover:text-neutral-300" />
      </div>
    </div>
    <ul class="flex flex-col divide-y divide-neutral-800">
      <li
        v-for="item in items"
        :key="item.id"
        class="px-3 py-2"
      >
        <div class="flex items-start gap-2">
          <span
            class="mt-0.5 size-3.5 rounded-full border shrink-0"
            :class="item.done ? 'bg-amber-500 border-amber-500' : 'border-neutral-600'"
            aria-hidden="true"
          />
          <div class="min-w-0 flex-1">
            <p
              class="text-xs leading-snug"
              :class="item.done ? 'text-neutral-500 line-through' : 'text-neutral-200'"
            >
              {{ item.label }}
            </p>
            <div v-if="!item.done" class="mt-1 flex flex-wrap gap-2">
              <button
                v-if="item.action === 'upload'"
                type="button"
                class="text-link text-xs hover:text-amber-400 no-underline"
                @click="handleUpload"
              >
                Upload
              </button>
              <NuxtLink
                v-if="item.href"
                :to="item.href"
                class="text-link text-xs hover:text-amber-400 no-underline"
                @click="handleItemClick(item.id)"
              >
                {{ ctaLabel(item) }}
              </NuxtLink>
              <button
                v-else-if="item.action === 'create_collection' || item.action === 'invite' || item.action === 'share'"
                type="button"
                class="text-link text-xs hover:text-amber-400 no-underline"
                @click="handleHrefFallback(item)"
              >
                {{ ctaLabel(item) }}
              </button>
            </div>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { Xmark } from '@iconoir/vue'
import { useAnalytics } from '~/composables/useAnalytics'
import {
  useOnboardingChecklist,
  type ChecklistItem,
  type ChecklistItemId,
} from '~/composables/useOnboardingChecklist'

const { visible, items, dismiss, refresh, username } = useOnboardingChecklist()
const { capture } = useAnalytics()

function handleDismiss() {
  capture('onboarding_checklist_dismissed', {})
  dismiss()
}

function ctaLabel(item: ChecklistItem) {
  if (item.action === 'share' || item.id === 'invite_review') return 'Share'
  if (item.id === 'browse_producers' || item.id === 'add_music') return 'Browse'
  return 'Open'
}

function handleItemClick(id: ChecklistItemId) {
  capture('onboarding_checklist_item_clicked', { item_id: id })
}

function handleUpload() {
  capture('onboarding_checklist_item_clicked', { item_id: 'upload_first_track' })
  window.dispatchEvent(new CustomEvent('open-upload-modal'))
}

function handleHrefFallback(item: ChecklistItem) {
  handleItemClick(item.id)
  if (item.href) {
    void navigateTo(item.href)
    return
  }
  if (username.value) {
    void navigateTo(`/u/${username.value}/collections`)
  }
}

function onChecklistRefresh() {
  void refresh()
}

onMounted(() => {
  window.addEventListener('music-uploaded', onChecklistRefresh)
  window.addEventListener('bbx-onboarding-refresh', onChecklistRefresh)
  document.addEventListener('visibilitychange', onChecklistRefresh)
})

onUnmounted(() => {
  window.removeEventListener('music-uploaded', onChecklistRefresh)
  window.removeEventListener('bbx-onboarding-refresh', onChecklistRefresh)
  document.removeEventListener('visibilitychange', onChecklistRefresh)
})
</script>
