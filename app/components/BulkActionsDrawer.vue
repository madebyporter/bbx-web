<template>
  <MasterDrawer ref="drawerRef" :show="props.show" @update:show="(val) => emit('update:show', val)">
    <template #header>
      <h2 class="text-2xl">Bulk Actions ({{ selectedCount }} track{{ selectedCount > 1 ? 's' : '' }})</h2>
    </template>

    <div class="flex flex-col gap-6 grow">
      <p class="text-xs text-neutral-500">
        Only edited fields are applied. Clearing an edited field removes it from all selected tracks.
      </p>

      <!-- Metadata -->
      <div class="flex flex-col gap-4">
        <h3 class="font-semibold text-neutral-200">Metadata</h3>

        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2">
            <label class="text-sm text-neutral-400">Artist</label>
            <FormInputText
              v-model="draft.artist"
              type="text"
              :disabled="isProcessing"
              @update:model-value="dirty.artist = true"
            />
          </div>

          <div>
            <label class="text-sm text-neutral-400">Status</label>
            <select
              v-model="draft.statusId"
              :disabled="isProcessing"
              class="select-field w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded-sm bg-neutral-900 text-neutral-200 outline-none cursor-pointer disabled:opacity-50"
              @change="dirty.status = true"
            >
              <option :value="null">No Status</option>
              <option v-for="status in statuses" :key="status.id" :value="status.id">
                {{ status.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="text-sm text-neutral-400">Genre</label>
            <select
              v-model="draft.genre"
              :disabled="isProcessing"
              class="select-field w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded-sm bg-neutral-900 text-neutral-200 outline-none cursor-pointer disabled:opacity-50"
              @change="dirty.genre = true"
            >
              <option value="">Select genre…</option>
              <option
                v-for="genre in genres"
                :key="genre.id"
                :value="genre.name"
              >
                {{ genre.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="text-sm text-neutral-400">Year</label>
            <FormInputText
              v-model="draft.year"
              type="number"
              :disabled="isProcessing"
              @update:model-value="dirty.year = true"
            />
          </div>

          <div>
            <label class="text-sm text-neutral-400">BPM</label>
            <FormInputText
              v-model="draft.bpm"
              type="number"
              :disabled="isProcessing"
              @update:model-value="dirty.bpm = true"
            />
          </div>

          <div>
            <label class="text-sm text-neutral-400">Key</label>
            <select
              v-model="draft.key"
              :disabled="isProcessing"
              class="select-field w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded-sm bg-neutral-900 text-neutral-200 outline-none cursor-pointer disabled:opacity-50"
              @change="dirty.key = true"
            >
              <option value="">Select key…</option>
              <option v-for="keyOption in TRACK_KEYS" :key="keyOption" :value="keyOption">
                {{ keyOption }}
              </option>
            </select>
          </div>

          <div class="col-span-2">
            <label class="text-sm text-neutral-400">Mood</label>
            <FormInputText
              v-model="draft.mood"
              type="text"
              placeholder="e.g. Dark, Energetic"
              :disabled="isProcessing"
              @update:model-value="dirty.mood = true"
            />
          </div>

          <div class="col-span-2">
            <label class="text-sm text-neutral-400">Collections</label>
            <CollectionSelect
              :model-value="draft.collectionIds"
              :collections="collections"
              size="md"
              :disabled="isProcessing"
              @update:model-value="onCollectionsUpdate"
              @create-collection="queueCollectionCreation"
            />
            <p class="text-xs text-neutral-500 mt-1">
              When edited, replaces collections on all selected tracks.
            </p>
          </div>
        </div>
      </div>

      <!-- Privacy Toggle -->
      <div class="flex flex-col gap-3">
        <h3 class="font-semibold text-neutral-200">Visibility</h3>
        <div class="flex flex-col gap-2">
          <label class="text-sm text-neutral-400">Set visibility for {{ selectedCount }} track{{ selectedCount > 1 ? 's' : '' }}</label>
          <select
            v-model="selectedPrivacyValue"
            :disabled="isProcessing"
            class="select-field w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded-sm bg-neutral-900 text-neutral-200 cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed"
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

    <template #footer>
      <div class="flex flex-row gap-3 justify-end">
        <Button
          variant="ghost"
          class="px-4 py-2 border border-neutral-700 hover:border-neutral-600 text-neutral-300 hover:text-white bg-transparent hover:bg-transparent"
          :disabled="isProcessing"
          @click="handleCancel"
        >
          Cancel
        </Button>
        <Button
          variant="danger"
          :disabled="isProcessing"
          @click="showDeleteConfirm = true"
        >
          {{ isCollectionContext ? 'Remove from Collection' : 'Delete Tracks' }}
        </Button>
        <Button
          :disabled="isProcessing || !hasChanges"
          @click="handleApplyChanges"
        >
          Apply Changes
        </Button>
      </div>
    </template>
  </MasterDrawer>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { useSupabase } from '~/utils/supabase'
import { useAuth } from '~/composables/useAuth'
import { useGenres } from '~/composables/useGenres'
import { deleteAudio } from '~/utils/trackAudioStorage'
import { useToast } from '~/composables/useToast'
import { TRACK_KEYS } from '~/utils/trackMetadataOptions'
import { generateUniqueSlug } from '~/utils/collections'
import MasterDrawer from '~/components/MasterDrawer.vue'
import ConfirmDialog from '~/components/ConfirmDialog.vue'
import FormInputText from '~/components/FormInputText.vue'
import CollectionSelect from '~/components/CollectionSelect.vue'

interface Props {
  show: boolean
  selectedTracks: any[]
  selectedCount: number
  collectionId?: number
  isCollectionContext?: boolean
}

interface TrackStatus {
  id: number
  name: string
}

interface Collection {
  id: number
  name: string
  slug: string
}

type DirtyKey =
  | 'artist'
  | 'status'
  | 'genre'
  | 'year'
  | 'mood'
  | 'bpm'
  | 'key'
  | 'collections'

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:show': [value: boolean]
  'tracks-deleted': []
  'tracks-updated': []
  'close': []
}>()

const { supabase } = useSupabase()
const { user } = useAuth()
const { showProcessing, showSuccess, showError, removeToast } = useToast()
const { genres, ensureLoaded: ensureGenresLoaded } = useGenres()

const drawerRef = ref<any>(null)
const isProcessing = ref(false)
const showDeleteConfirm = ref(false)
const selectedPrivacyValue = ref<boolean | null>(null)
const resetting = ref(false)

const statuses = ref<TrackStatus[]>([])
const collections = ref<Collection[]>([])
const pendingCollections = ref<Array<{ tempId: number; name: string }>>([])

const dirty = reactive<Record<DirtyKey, boolean>>({
  artist: false,
  status: false,
  genre: false,
  year: false,
  mood: false,
  bpm: false,
  key: false,
  collections: false,
})

const draft = reactive({
  artist: '',
  statusId: null as number | null,
  genre: '',
  year: '' as string | number | null,
  mood: '',
  bpm: '' as string | number | null,
  key: '',
  collectionIds: [] as number[],
})

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

const hasDirtyMetadata = computed(() => Object.values(dirty).some(Boolean))

const hasChanges = computed(() => {
  return selectedPrivacyValue.value !== null || hasDirtyMetadata.value
})

const resetForm = () => {
  resetting.value = true
  selectedPrivacyValue.value = null
  dirty.artist = false
  dirty.status = false
  dirty.genre = false
  dirty.year = false
  dirty.mood = false
  dirty.bpm = false
  dirty.key = false
  dirty.collections = false
  draft.artist = ''
  draft.statusId = null
  draft.genre = ''
  draft.year = ''
  draft.mood = ''
  draft.bpm = ''
  draft.key = ''
  draft.collectionIds = []
  pendingCollections.value = []
  nextTick(() => {
    resetting.value = false
  })
}

const onCollectionsUpdate = (value: number[]) => {
  draft.collectionIds = value
  if (!resetting.value) dirty.collections = true
}

const fetchStatuses = async () => {
  if (!supabase || !user.value) return
  try {
    const { data, error } = await supabase
      .from('track_statuses')
      .select('id, name')
      .eq('user_id', user.value.id)
      .order('name')
    if (error) throw error
    statuses.value = (data || []) as TrackStatus[]
  } catch (error) {
    console.error('Error fetching statuses:', error)
    statuses.value = []
  }
}

const fetchCollections = async () => {
  if (!supabase || !user.value) return
  try {
    const { data, error } = await supabase
      .from('collections')
      .select('id, name, slug')
      .eq('user_id', user.value.id)
      .order('name')
    if (error) throw error
    collections.value = (data || []) as Collection[]
  } catch (error) {
    console.error('Error fetching collections:', error)
    collections.value = []
  }
}

const queueCollectionCreation = (name: string) => {
  const tempId = -Date.now()
  pendingCollections.value.push({ tempId, name })
  collections.value = [
    ...collections.value,
    { id: tempId, name, slug: '' },
  ]
  if (!draft.collectionIds.includes(tempId)) {
    draft.collectionIds = [...draft.collectionIds, tempId]
  }
  dirty.collections = true
}

const resolvePendingCollections = async () => {
  if (!supabase || !user.value || pendingCollections.value.length === 0) return

  const { data: existing } = await supabase
    .from('collections')
    .select('slug')
    .eq('user_id', user.value.id)

  const existingSlugs = (existing || []).map((c: any) => c.slug)

  for (const pending of [...pendingCollections.value]) {
    const slug = generateUniqueSlug(pending.name, existingSlugs)
    existingSlugs.push(slug)

    const { data, error } = await supabase
      .from('collections')
      .insert({
        user_id: user.value.id,
        name: pending.name,
        description: null,
        slug,
      })
      .select('id, name, slug')
      .single()

    if (error) throw error

    const idx = draft.collectionIds.indexOf(pending.tempId)
    if (idx >= 0) draft.collectionIds[idx] = data.id

    collections.value = collections.value.map((c) =>
      c.id === pending.tempId ? { id: data.id, name: data.name, slug: data.slug } : c,
    )
  }

  pendingCollections.value = []
}

const parseOptionalNumber = (value: string | number | null | undefined) => {
  if (value === '' || value == null) return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

const parseMoodArray = (value: string) => {
  const parts = value.split(',').map((m) => m.trim()).filter(Boolean)
  return parts.length > 0 ? parts : null
}

const syncCollectionsForTrack = async (trackId: number, targetIds: number[]) => {
  if (!supabase) return

  const { data: current, error: fetchError } = await supabase
    .from('collections_sounds')
    .select('collection_id')
    .eq('sound_id', trackId)

  if (fetchError) throw fetchError

  const currentIds = (current || []).map((c: any) => Number(c.collection_id))
  const toAdd = targetIds.filter((id) => !currentIds.includes(id))
  const toRemove = currentIds.filter((id) => !targetIds.includes(id))

  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from('collections_sounds')
      .delete()
      .eq('sound_id', trackId)
      .in('collection_id', toRemove)
    if (deleteError) throw deleteError
  }

  if (toAdd.length > 0) {
    const { error: insertError } = await supabase
      .from('collections_sounds')
      .insert(
        toAdd.map((collectionId) => ({
          collection_id: collectionId,
          sound_id: trackId,
          hidden: false,
        })),
      )
    if (insertError) throw insertError
  }
}

const handleClose = () => {
  emit('update:show', false)
  emit('close')
}

const handleCancel = () => {
  resetForm()
  handleClose()
}

const handleApplyChanges = async () => {
  if (!hasChanges.value || !supabase || props.selectedTracks.length === 0) return

  isProcessing.value = true
  const toastId = showProcessing('Updating selected tracks...')

  try {
    if (dirty.collections) {
      await resolvePendingCollections()
    }

    const trackIds = props.selectedTracks.map((track) => track.id)
    const patch: Record<string, unknown> = {}

    if (dirty.artist) patch.artist = draft.artist.trim() || null
    if (dirty.status) patch.status_id = draft.statusId
    if (dirty.genre) patch.genre = draft.genre.trim() || null
    if (dirty.year) patch.year = parseOptionalNumber(draft.year)
    if (dirty.bpm) patch.bpm = parseOptionalNumber(draft.bpm)
    if (dirty.key) patch.key = draft.key.trim() || null
    if (dirty.mood) patch.mood = parseMoodArray(draft.mood)
    if (selectedPrivacyValue.value !== null) patch.is_public = selectedPrivacyValue.value

    if (Object.keys(patch).length > 0) {
      const { error } = await supabase
        .from('sounds')
        .update(patch)
        .in('id', trackIds)
      if (error) throw error
    }

    if (dirty.collections) {
      const targetIds = draft.collectionIds.filter((id) => id > 0)
      for (const trackId of trackIds) {
        await syncCollectionsForTrack(trackId, targetIds)
      }
    }

    if (toastId) removeToast(toastId)
    showSuccess(
      `Updated ${props.selectedCount} track${props.selectedCount > 1 ? 's' : ''}`,
    )

    resetForm()
    emit('tracks-updated')
    handleClose()
  } catch (error: any) {
    if (toastId) removeToast(toastId)
    showError('Failed to update tracks: ' + (error.message || 'Unknown error'))
    console.error('Error applying bulk changes:', error)
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
          try {
            await deleteAudio(track, supabase)
          } catch (storageError) {
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

watch(
  () => props.show,
  async (open) => {
    if (open) {
      resetForm()
      await Promise.all([fetchStatuses(), fetchCollections(), ensureGenresLoaded()])
      return
    }
    showDeleteConfirm.value = false
    isProcessing.value = false
    resetForm()
  },
)

watch(
  () => props.selectedTracks,
  () => {
    if (props.show) resetForm()
  },
  { deep: true },
)
</script>
