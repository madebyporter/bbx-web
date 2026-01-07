<template>
  <div class="flex flex-row gap-2 items-stretch justify-between p-2 border-t border-neutral-800 bg-neutral-900">
    <!-- I Use This -->
    <div class="group flex flex-row gap-0 items-stretch justify-stretch rounded-sm overflow-hidden w-fit border border-neutral-800 hover:border-neutral-700 p-2">
      <div class="flex items-center justify-center bg-transparent text-white p-2 text-sm leading-snug">
        {{ useCount }}
      </div>
      <button
        @click="handleToggleUse"
        :disabled="loading"
        class="group flex items-center justify-center p-2 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :class="isUsing ? 'bg-transparent' : 'bg-transparent'"
      >
        <template v-if="isUsing">
          <img src="/img/db/icon-check.svg" alt="Remove from I Use This" class="min-w-4 min-h-4" />
        </template>
        <template v-else>
          <div class="w-4 h-4 border border-neutral-800 rounded-full group-hover:border-neutral-700 hover:bg-neutral-700"></div>
        </template>
      </button>
    </div>
    
    <!-- Download Button -->
    <a
      :href="resourceLink"
      target="_blank"
      rel="noopener noreferrer"
      class="btn grow flex items-center justify-center"
    >
      Download
    </a>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { toggleResourceUse, getResourceUseStatus } from '~/utils/resourceQueries'

const props = defineProps<{
  resourceId: number
  resourceLink: string
}>()

const { user } = useAuth()
const useCount = ref(0)
const isUsing = ref(false)
const loading = ref(false)

const fetchUseStatus = async () => {
  try {
    const status = await getResourceUseStatus(props.resourceId)
    useCount.value = status.count
    isUsing.value = status.isUsing
  } catch (error) {
    console.error('Error fetching use status:', error)
  }
}

const handleToggleUse = async () => {
  if (!user.value) {
    // Emit event to show signup modal
    const event = new CustomEvent('show-signup', { bubbles: true })
    window.dispatchEvent(event)
    return
  }
  
  if (loading.value) return
  
  loading.value = true
  try {
    const result = await toggleResourceUse(props.resourceId)
    useCount.value = result.count
    isUsing.value = result.isUsing
  } catch (error) {
    console.error('Error toggling resource use:', error)
    alert('Failed to update. Please try again.')
  } finally {
    loading.value = false
  }
}

// Watch for auth changes to update use status
watch(() => user.value, async (newUser) => {
  if (newUser) {
    await fetchUseStatus()
  } else {
    isUsing.value = false
  }
}, { immediate: true })
</script>

