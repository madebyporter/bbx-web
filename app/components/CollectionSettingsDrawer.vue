<template>
  <MasterDrawer ref="drawerRef" :show="props.show" @update:show="(val) => emit('update:show', val)">
    <template #header>
      <h2 class="text-2xl">Collection Settings</h2>
    </template>

    <div class="flex flex-col gap-4 grow">
      <!-- Edit Collection Name -->
      <div class="flex flex-col gap-3 border-b border-neutral-800 pb-6">
        <label class="font-semibold text-neutral-200">Collection Name</label>
        <input
          v-model="collectionName"
          type="text"
          placeholder="Collection name"
          class="p-3 border border-neutral-700 rounded bg-neutral-900 text-neutral-200"
          :disabled="isSaving"
        />
        <p v-if="nameError" class="text-xs text-red-500">{{ nameError }}</p>

        <!-- Artwork -->
        <label class="font-semibold text-neutral-200">Artwork</label>
        <div class="flex flex-col gap-2">
          <input
            ref="artworkInput"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov"
            class="hidden"
            :disabled="isSaving"
            @change="handleArtworkSelect"
          />

          <div
            v-if="displayArtworkPreview"
            class="flex items-center justify-between p-3 border border-neutral-700 rounded bg-neutral-900/50"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="size-16 rounded-sm overflow-hidden bg-neutral-800 shrink-0">
                <video
                  v-if="displayArtworkIsVideo"
                  :src="displayArtworkPreview"
                  autoplay
                  muted
                  loop
                  playsinline
                  class="size-full object-cover"
                />
                <img
                  v-else
                  :src="displayArtworkPreview"
                  alt="Collection artwork"
                  class="size-full object-cover"
                />
              </div>
              <div class="flex flex-col gap-1 min-w-0">
                <span class="text-sm text-neutral-300">
                  {{ newArtworkFile ? 'New artwork:' : 'Current artwork' }}
                </span>
                <span v-if="newArtworkFile" class="text-xs text-amber-400 truncate">{{ newArtworkFile.name }}</span>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="border border-neutral-700 hover:border-neutral-600 bg-neutral-900 text-neutral-200"
                :disabled="isSaving"
                @click="artworkInput?.click()"
              >
                Choose New File
              </Button>
              <button
                v-if="canRemoveArtwork"
                type="button"
                class="text-link text-sm text-red-400 hover:text-red-300 no-underline"
                :disabled="isSaving"
                @click="removeArtworkSelection"
              >
                Remove
              </button>
            </div>
          </div>

          <div
            v-else
            class="flex items-center justify-between p-3 border border-neutral-700 rounded bg-neutral-900/50"
          >
            <span class="text-sm text-neutral-500">No artwork</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="border border-neutral-700 hover:border-neutral-600 bg-neutral-900 text-neutral-200"
              :disabled="isSaving"
              @click="artworkInput?.click()"
            >
              Choose File
            </Button>
          </div>

          <p v-if="artworkError" class="text-xs text-red-500">{{ artworkError }}</p>
          <p class="text-xs text-neutral-500">
            JPG, PNG, WebP, GIF, MP4, MOV. Max 10MB, 1600x1600.
          </p>
        </div>

        <label class="flex items-center gap-3 p-3 border border-neutral-700 rounded bg-neutral-900/50 cursor-pointer hover:border-neutral-600">
          <input
            v-model="showOnProfile"
            type="checkbox"
            class="size-4 rounded border-neutral-600 bg-neutral-900 text-amber-500 focus:ring-amber-400"
            :disabled="isSaving"
          />
          <div class="flex flex-col gap-0.5 min-w-0">
            <span class="text-sm text-neutral-200">Show Collection on Profile</span>
            <span class="text-xs text-neutral-500">Appears in the Collections strip on your library</span>
          </div>
        </label>

        <Button
          :disabled="isSaving || !hasChanges"
          @click="handleSave"
        >
          {{ isSaving ? 'Saving...' : 'Save Changes' }}
        </Button>
      </div>

      <!-- Delete Collection -->
      <div class="flex flex-col gap-3 border-t border-neutral-800 pt-6">
        <label class="font-semibold text-red-400">Danger Zone</label>
        <div class="p-4 border border-red-900/50 rounded bg-red-900/10">
          <p class="text-sm text-neutral-300 mb-3">
            Deleting this collection will remove it permanently. This action cannot be undone.
          </p>
          <Button
            variant="danger"
            :disabled="isDeleting"
            @click="handleDelete"
          >
            {{ isDeleting ? 'Deleting...' : 'Delete Collection' }}
          </Button>
        </div>
      </div>
    </div>
  </MasterDrawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSupabase } from '~/utils/supabase'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'
import MasterDrawer from '~/components/MasterDrawer.vue'
import { generateSlug } from '~/utils/collections'
import { useArtwork, isVideoArtwork } from '~/composables/useArtwork'
import { normalizeArtworkProvider } from '~/utils/artworkStorage'
import type { StorageProvider } from '~/types/track'

interface Props {
  show: boolean
  collectionId: number
  collectionName: string
  collectionSlug: string
  collectionArtworkPath?: string | null
  collectionArtworkProvider?: StorageProvider | null
  collectionShowOnProfile?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  collectionShowOnProfile: false,
})
const emit = defineEmits<{
  'update:show': [value: boolean]
  'collection-updated': [
    name: string,
    slug: string,
    artworkPath: string | null,
    artworkProvider: StorageProvider | null,
    showOnProfile: boolean,
  ]
  'collection-deleted': []
}>()

const router = useRouter()
const { supabase } = useSupabase()
const { user } = useAuth()
const { showSuccess, showError } = useToast()
const { getArtworkUrl, validateAndProcessArtwork, uploadArtwork, deleteArtwork, resolveArtworkUrlForEntity } = useArtwork()

const drawerRef = ref<InstanceType<typeof MasterDrawer> | null>(null)

// Collection name editing
const collectionName = ref(props.collectionName)
const originalName = ref(props.collectionName)
const originalArtworkPath = ref<string | null>(props.collectionArtworkPath ?? null)
const originalArtworkProvider = ref<StorageProvider | null>(
  props.collectionArtworkProvider ? normalizeArtworkProvider(props.collectionArtworkProvider) : null,
)
const showOnProfile = ref(!!props.collectionShowOnProfile)
const originalShowOnProfile = ref(!!props.collectionShowOnProfile)
const nameError = ref<string | null>(null)
const isSaving = ref(false)

// Artwork editing
const artworkInput = ref<HTMLInputElement | null>(null)
const newArtworkFile = ref<File | null>(null)
const artworkPreview = ref<string | null>(null)
const artworkError = ref<string | null>(null)
const removeArtworkFlag = ref(false)
const currentArtworkUrl = ref<string | null>(null)

const loadCurrentArtworkUrl = async () => {
  if (!originalArtworkPath.value || removeArtworkFlag.value) {
    currentArtworkUrl.value = getArtworkUrl(originalArtworkPath.value, originalArtworkProvider.value)
    return
  }

  currentArtworkUrl.value = await resolveArtworkUrlForEntity(
    {
      id: props.collectionId,
      artwork_path: originalArtworkPath.value,
      artwork_provider: originalArtworkProvider.value,
    },
    'collection',
  )
}

const displayArtworkPreview = computed(() => {
  if (artworkPreview.value) return artworkPreview.value
  if (!removeArtworkFlag.value && currentArtworkUrl.value) return currentArtworkUrl.value
  return null
})

const displayArtworkIsVideo = computed(() => {
  if (newArtworkFile.value) return isVideoArtwork(newArtworkFile.value.name)
  if (!removeArtworkFlag.value) return isVideoArtwork(originalArtworkPath.value)
  return false
})

const canRemoveArtwork = computed(() => {
  return !!newArtworkFile.value || (!!originalArtworkPath.value && !removeArtworkFlag.value)
})

const hasArtworkChanges = computed(() => {
  return !!newArtworkFile.value || removeArtworkFlag.value
})

// Delete state
const isDeleting = ref(false)

// Computed
const hasNameChanges = computed(() => {
  return collectionName.value.trim() !== originalName.value.trim()
})

const hasShowOnProfileChanges = computed(() => {
  return showOnProfile.value !== originalShowOnProfile.value
})

const hasChanges = computed(() => {
  return hasNameChanges.value || hasArtworkChanges.value || hasShowOnProfileChanges.value
})

const resetArtworkState = (
  artworkPath: string | null = originalArtworkPath.value,
  artworkProvider: StorageProvider | null = originalArtworkProvider.value,
) => {
  originalArtworkPath.value = artworkPath
  originalArtworkProvider.value = artworkProvider
  newArtworkFile.value = null
  artworkPreview.value = null
  artworkError.value = null
  removeArtworkFlag.value = false
  if (artworkInput.value) {
    artworkInput.value.value = ''
  }
  void loadCurrentArtworkUrl()
}

const handleArtworkSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) {
    return
  }

  try {
    const { file: processedFile, preview } = await validateAndProcessArtwork(file)
    newArtworkFile.value = processedFile
    artworkPreview.value = preview
    artworkError.value = null
    removeArtworkFlag.value = false
  } catch (err: any) {
    artworkError.value = err.message || 'Invalid artwork file'
    newArtworkFile.value = null
    artworkPreview.value = null
  }

  if (target) target.value = ''
}

const removeArtworkSelection = () => {
  newArtworkFile.value = null
  artworkPreview.value = null
  artworkError.value = null
  removeArtworkFlag.value = true
  if (artworkInput.value) {
    artworkInput.value.value = ''
  }
}

// Methods
const handleSave = async () => {
  if (!supabase || !props.collectionId || !user.value) return
  
  const trimmedName = collectionName.value.trim()
  if (!trimmedName) {
    nameError.value = 'Collection name is required'
    return
  }
  
  if (!hasChanges.value) {
    return
  }
  
  isSaving.value = true
  nameError.value = null
  artworkError.value = null
  
  try {
    const updateData: {
      name: string
      slug: string
      artwork_path?: string | null
      artwork_provider?: StorageProvider | null
      show_on_profile?: boolean
    } = {
      name: trimmedName,
      slug: props.collectionSlug,
    }

    if (hasShowOnProfileChanges.value) {
      updateData.show_on_profile = showOnProfile.value
    }

    if (hasNameChanges.value) {
      const newSlug = generateSlug(trimmedName)

      const { data: existingCollection } = await supabase
        .from('collections')
        .select('id')
        .eq('slug', newSlug)
        .eq('user_id', user.value.id)
        .neq('id', props.collectionId)
        .maybeSingle()

      if (existingCollection) {
        nameError.value = 'A collection with this name already exists'
        isSaving.value = false
        return
      }

      updateData.slug = newSlug
    }

    let nextArtworkPath = originalArtworkPath.value
    let nextArtworkProvider = originalArtworkProvider.value

    if (newArtworkFile.value) {
      const uploadedArtwork = await uploadArtwork(newArtworkFile.value, 'collection', {
        collectionId: props.collectionId,
      })
      if (originalArtworkPath.value) {
        await deleteArtwork(
          {
            id: props.collectionId,
            artwork_path: originalArtworkPath.value,
            artwork_provider: originalArtworkProvider.value,
          },
          'collection',
        )
      }
      updateData.artwork_path = uploadedArtwork.artwork_path
      updateData.artwork_provider = uploadedArtwork.artwork_provider
      nextArtworkPath = uploadedArtwork.artwork_path
      nextArtworkProvider = uploadedArtwork.artwork_provider
    } else if (removeArtworkFlag.value && originalArtworkPath.value) {
      await deleteArtwork(
        {
          id: props.collectionId,
          artwork_path: originalArtworkPath.value,
          artwork_provider: originalArtworkProvider.value,
        },
        'collection',
      )
      updateData.artwork_path = null
      updateData.artwork_provider = normalizeArtworkProvider(null)
      nextArtworkPath = null
      nextArtworkProvider = normalizeArtworkProvider(null)
    }

    const { error } = await supabase
      .from('collections')
      .update(updateData)
      .eq('id', props.collectionId)
      .eq('user_id', user.value.id)
    
    if (error) throw error
    
    originalName.value = trimmedName
    originalShowOnProfile.value = showOnProfile.value
    resetArtworkState(nextArtworkPath, nextArtworkProvider)
    showSuccess('Collection updated successfully')
    emit(
      'collection-updated',
      trimmedName,
      updateData.slug,
      nextArtworkPath,
      nextArtworkProvider,
      showOnProfile.value,
    )
  } catch (error: any) {
    console.error('Error updating collection:', error)
    nameError.value = error.message || 'Failed to update collection'
  } finally {
    isSaving.value = false
  }
}

const handleDelete = async () => {
  if (!confirm('Are you sure you want to delete this collection? This action cannot be undone.')) return
  
  isDeleting.value = true
  
  try {
    if (!supabase || !props.collectionId || !user.value) {
      throw new Error('Missing required data')
    }
    
    if (originalArtworkPath.value) {
      await deleteArtwork(
        {
          id: props.collectionId,
          artwork_path: originalArtworkPath.value,
          artwork_provider: originalArtworkProvider.value,
        },
        'collection',
      )
    }

    // Delete collection (cascade will handle collections_sounds and collection_members)
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', props.collectionId)
      .eq('user_id', user.value.id)
    
    if (error) throw error
    
    showSuccess('Collection deleted successfully')
    emit('collection-deleted')
    
    // Navigate to collections page - get username first
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('id', user.value.id)
      .maybeSingle()
    
    const username = profileData?.username || user.value.id
    router.push(`/u/${username}/collections`)
  } catch (error: any) {
    console.error('Error deleting collection:', error)
    showError('Failed to delete collection: ' + (error.message || 'Unknown error'))
  } finally {
    isDeleting.value = false
  }
}

// Watch for drawer opening to fetch data
watch(() => props.show, (newVal) => {
  if (newVal && props.collectionId) {
    collectionName.value = props.collectionName
    originalName.value = props.collectionName
    resetArtworkState(
      props.collectionArtworkPath ?? null,
      props.collectionArtworkProvider
        ? normalizeArtworkProvider(props.collectionArtworkProvider)
        : null,
    )
    showOnProfile.value = !!props.collectionShowOnProfile
    originalShowOnProfile.value = !!props.collectionShowOnProfile
  }
}, { immediate: true })

// Watch for prop changes
watch(() => props.collectionName, (newVal) => {
  collectionName.value = newVal
  originalName.value = newVal
})

watch(() => props.collectionShowOnProfile, (newVal) => {
  if (!hasShowOnProfileChanges.value) {
    showOnProfile.value = !!newVal
    originalShowOnProfile.value = !!newVal
  }
})

watch(() => [props.collectionArtworkPath, props.collectionArtworkProvider], ([path, provider]) => {
  if (!hasArtworkChanges.value) {
    resetArtworkState(
      path ?? null,
      provider ? normalizeArtworkProvider(provider) : null,
    )
  }
})
</script>
