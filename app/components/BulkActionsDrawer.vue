<template>
  <MasterDrawer ref="drawerRef" :show="props.show" @update:show="(val) => emit('update:show', val)">
    <template #header>
      <h2 class="text-2xl">Bulk Actions ({{ selectedCount }} track{{ selectedCount > 1 ? 's' : '' }})</h2>
    </template>

    <div class="flex flex-col gap-6 grow">
      <!-- Privacy Toggle -->
      <div class="flex flex-col gap-3">
        <h3 class="font-semibold text-neutral-200">Visibility</h3>
        <div class="flex flex-col gap-2">
          <label class="text-sm text-neutral-400">Set visibility for {{ selectedCount }} track{{ selectedCount > 1 ? 's' : '' }}</label>
          <select
            v-model="selectedPrivacyValue"
            :disabled="isProcessing"
            class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200 cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option :value="null">{{ privacyDropdownText }}</option>
            <option :value="true">Make All Public</option>
            <option :value="false">Make All Private</option>
          </select>
          <p class="text-xs text-neutral-500">
            <span v-if="allPublic">All {{ selectedCount }} track{{ selectedCount > 1 ? 's are' : ' is' }} currently public</span>
            <span v-else-if="allPrivate">All {{ selectedCount }} track{{ selectedCount > 1 ? 's are' : ' is' }} currently private</span>
            <span v-else>Mixed state: {{ publicCount }} public, {{ privateCount }} private</span>
          </p>
        </div>
      </div>

      <!-- Delete/Remove Action -->
      <div class="flex flex-col gap-3 border-t border-neutral-800 pt-6">
        <h3 class="font-semibold text-red-400">Danger Zone</h3>
        <div class="flex flex-col gap-2">
          <p class="text-sm text-neutral-400">
            <span v-if="isCollectionContext">
              Remove {{ selectedCount }} track{{ selectedCount > 1 ? 's' : '' }} from this collection.
            </span>
            <span v-else>
              Permanently delete {{ selectedCount }} track{{ selectedCount > 1 ? 's' : '' }} from your library. This action cannot be undone.
            </span>
          </p>
          <button
            @click="showDeleteConfirm = true"
            :disabled="isProcessing"
            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isCollectionContext ? 'Remove from Collection' : 'Delete Tracks' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Footer Actions -->
    <div class="flex flex-row gap-3 justify-end border-t border-neutral-800 pt-4 mt-auto">
      <button
        @click="handleCancel"
        :disabled="isProcessing"
        class="px-4 py-2 border border-neutral-700 hover:border-neutral-600 text-neutral-300 hover:text-white font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        Cancel
      </button>
      <button
        @click="handleApplyChanges"
        :disabled="isProcessing || !hasChanges"
        class="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-neutral-900 font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        Apply Changes
      </button>
    </div>

    <!-- Delete/Remove Confirmation Dialog -->
    <ConfirmDialog
      v-model:show="showDeleteConfirm"
      :title="isCollectionContext ? 'Remove Tracks' : 'Delete Tracks'"
      :message="isCollectionContext 
        ? `Remove ${selectedCount} track${selectedCount > 1 ? 's' : ''} from this collection?`
        : `Are you sure you want to delete ${selectedCount} track${selectedCount > 1 ? 's' : ''}? This will permanently delete the files and cannot be undone.`"
      :confirm-text="isCollectionContext ? 'Remove' : 'Delete'"
      cancel-text="Cancel"
      :confirm-danger="true"
      @confirm="handleDelete"
    />
  </MasterDrawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSupabase } from '~/utils/supabase'
import { useToast } from '~/composables/useToast'
import MasterDrawer from '~/components/MasterDrawer.vue'
import ConfirmDialog from '~/components/ConfirmDialog.vue'

interface Props {
  show: boolean
  selectedTracks: any[]
  selectedCount: number
  collectionId?: number
  isCollectionContext?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:show': [value: boolean]
  'tracks-deleted': []
  'tracks-updated': []
  'close': []
}>()

const { supabase } = useSupabase()
const { showProcessing, showSuccess, showError, removeToast } = useToast()

const drawerRef = ref<any>(null)
const isProcessing = ref(false)
const showDeleteConfirm = ref(false)
const selectedPrivacyValue = ref<boolean | null>(null)

// Privacy state analysis
const allPublic = computed(() => {
  return props.selectedTracks.every(track => track.is_public !== false)
})

const allPrivate = computed(() => {
  return props.selectedTracks.every(track => track.is_public === false)
})

const publicCount = computed(() => {
  return props.selectedTracks.filter(track => track.is_public !== false).length
})

const privateCount = computed(() => {
  return props.selectedTracks.filter(track => track.is_public === false).length
})

const privacyDropdownText = computed(() => {
  if (allPublic.value) {
    return 'All Public'
  } else if (allPrivate.value) {
    return 'All Private'
  } else {
    return '(Mixed)'
  }
})

// Check if there are pending changes
const hasChanges = computed(() => {
  return selectedPrivacyValue.value !== null
})

const handleClose = () => {
  emit('update:show', false)
  emit('close')
}

const handleCancel = () => {
  // Reset any pending changes
  selectedPrivacyValue.value = null
  handleClose()
}

const handleApplyChanges = async () => {
  if (!hasChanges.value || !supabase || props.selectedTracks.length === 0) return

  isProcessing.value = true
  const toastId = showProcessing('Updating track visibility...')

  try {
    const value = selectedPrivacyValue.value

    // Get track IDs
    const trackIds = props.selectedTracks.map(track => track.id)

    // Batch update all tracks
    const { error } = await supabase
      .from('sounds')
      .update({ is_public: value })
      .in('id', trackIds)

    if (error) throw error

    if (toastId) removeToast(toastId)
    showSuccess(
      `Successfully ${value ? 'made public' : 'made private'} ${props.selectedCount} track${props.selectedCount > 1 ? 's' : ''}`
    )

    // Reset dropdown to show current state
    selectedPrivacyValue.value = null

    // Emit update event
    emit('tracks-updated')
    
    // Close drawer after successful update
    handleClose()
  } catch (error: any) {
    if (toastId) removeToast(toastId)
    showError('Failed to update track visibility: ' + (error.message || 'Unknown error'))
    console.error('Error updating privacy:', error)
  } finally {
    isProcessing.value = false
  }
}

const handleDelete = async () => {
  if (!supabase || props.selectedTracks.length === 0) return

  showDeleteConfirm.value = false
  isProcessing.value = true

  const count = props.selectedTracks.length

  // Handle collection context (remove from collection)
  if (props.isCollectionContext && props.collectionId) {
    const toastId = showProcessing(`Removing ${count} track${count > 1 ? 's' : ''} from collection...`)

    try {
      const selectedIds = props.selectedTracks.map(track => track.id)

      // Remove tracks from collection via junction table
      const { error } = await supabase
        .from('collections_sounds')
        .delete()
        .in('sound_id', selectedIds)
        .eq('collection_id', props.collectionId)

      if (toastId) removeToast(toastId)

      if (error) {
        showError('Failed to remove tracks from collection')
        console.error('Remove error:', error)
      } else {
        showSuccess(`Successfully removed ${count} track${count > 1 ? 's' : ''} from collection`)
        
        // Emit delete event (reused for collection removal)
        emit('tracks-deleted')
        
        // Close drawer after successful removal
        handleClose()
      }
    } catch (error: any) {
      if (toastId) removeToast(toastId)
      showError('Failed to remove tracks from collection: ' + (error.message || 'Unknown error'))
      console.error('Bulk remove error:', error)
    } finally {
      isProcessing.value = false
    }
    return
  }

  // Handle profile context (delete tracks permanently)
  const toastId = showProcessing(`Deleting ${count} track${count > 1 ? 's' : ''}...`)

  try {
    let deleteErrors = 0

    // Delete files from storage and records from database
    for (const track of props.selectedTracks) {
      try {
        // Delete file from storage
        if (track.storage_path) {
          const { error: storageError } = await supabase.storage
            .from('sounds')
            .remove([track.storage_path])

          if (storageError) {
            console.error('Storage deletion error:', storageError)
            deleteErrors++
            continue
          }
        }

        // Delete database record
        const { error: dbError } = await supabase
          .from('sounds')
          .delete()
          .eq('id', track.id)

        if (dbError) {
          console.error('Database deletion error:', dbError)
          deleteErrors++
        }
      } catch (error) {
        console.error('Error deleting track:', error)
        deleteErrors++
      }
    }

    if (toastId) removeToast(toastId)

    if (deleteErrors === 0) {
      showSuccess(`Successfully deleted ${count} track${count > 1 ? 's' : ''}`)
    } else if (deleteErrors < count) {
      showError(`Deleted ${count - deleteErrors} of ${count} tracks. ${deleteErrors} failed.`)
    } else {
      showError('Failed to delete tracks')
    }

    // Emit delete event
    emit('tracks-deleted')

    // Close drawer after successful deletion
    handleClose()
  } catch (error: any) {
    if (toastId) removeToast(toastId)
    showError('Failed to delete tracks: ' + (error.message || 'Unknown error'))
    console.error('Bulk delete error:', error)
  } finally {
    isProcessing.value = false
  }
}

// Watch for show changes to reset state
watch(() => props.show, (newVal) => {
  if (!newVal) {
    showDeleteConfirm.value = false
    isProcessing.value = false
    selectedPrivacyValue.value = null
  }
})

// Watch for selected tracks changes to reset dropdown
watch(() => props.selectedTracks, () => {
  selectedPrivacyValue.value = null
}, { deep: true })
</script>

