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
          class="p-3 border border-neutral-700 rounded-sm bg-neutral-900 text-neutral-200"
          :disabled="isSaving"
        />
        <p v-if="nameError" class="text-xs text-red-500">{{ nameError }}</p>

        <!-- Artwork -->
        <label class="font-semibold text-neutral-200">Artwork</label>
        <ArtworkPicker
          v-model="artworkSelection"
          v-model:cover-direction="coverDirection"
          kind="collection"
          :current-path="originalArtworkPath"
          :current-provider="originalArtworkProvider"
          :current-entity-id="collectionId"
          :generate-context="artworkGenerateContext"
          :disabled="isSaving"
        />
        <p v-if="artworkError" class="text-xs text-red-500">{{ artworkError }}</p>

        <label class="flex items-center gap-3 p-3 border border-neutral-700 rounded-sm bg-neutral-900/50 cursor-pointer hover:border-neutral-600">
          <input
            v-model="showOnProfile"
            type="checkbox"
            class="size-4 rounded-sm border-neutral-600 bg-neutral-900 text-amber-500 focus:ring-amber-400"
            :disabled="isSaving"
          />
          <div class="flex flex-col gap-0.5 min-w-0">
            <span class="text-sm text-neutral-200">Show Collection on Profile</span>
            <span class="text-xs text-neutral-500">Appears in the Collections strip on your library</span>
          </div>
        </label>

        <Button
          type="button"
          variant="link"
          class="self-start text-sm text-red-400 hover:text-red-300 no-underline"
          :disabled="isDeleting || isSaving"
          @click="handleDelete"
        >
          {{ isDeleting ? 'Deleting…' : 'Delete collection' }}
        </Button>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-row gap-3 justify-end">
        <Button
          :disabled="isSaving || !hasChanges"
          @click="handleSave"
        >
          {{ isSaving ? 'Saving...' : 'Save Changes' }}
        </Button>
      </div>
    </template>
  </MasterDrawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSupabase } from '~/utils/supabase'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'
import MasterDrawer from '~/components/MasterDrawer.vue'
import ArtworkPicker from '~/components/ArtworkPicker.vue'
import Button from '~/components/Button.vue'
import { generateSlug } from '~/utils/collections'
import { useArtwork } from '~/composables/useArtwork'
import { normalizeArtworkProvider } from '~/utils/artworkStorage'
import type { StorageProvider } from '~/types/track'
import type { ArtworkSelection } from '~/types/artworkSelection'
import { isArtworkSelectionDirty } from '~/types/artworkSelection'
import { COVER_DIRECTION_MAX } from '~/utils/coverDirection'

interface Props {
  show: boolean
  collectionId: number
  collectionName: string
  collectionSlug: string
  collectionArtworkPath?: string | null
  collectionArtworkProvider?: StorageProvider | null
  collectionShowOnProfile?: boolean
  collectionCoverDirection?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  collectionShowOnProfile: false,
  collectionCoverDirection: null,
})
const emit = defineEmits<{
  'update:show': [value: boolean]
  'collection-updated': [
    name: string,
    slug: string,
    artworkPath: string | null,
    artworkProvider: StorageProvider | null,
    showOnProfile: boolean,
    coverDirection: string | null,
  ]
  'collection-deleted': []
}>()

const router = useRouter()
const { supabase } = useSupabase()
const { user } = useAuth()
const { showSuccess, showError } = useToast()
const { uploadArtwork, deleteArtwork } = useArtwork()

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
const coverDirection = ref((props.collectionCoverDirection || '').slice(0, COVER_DIRECTION_MAX))
const originalCoverDirection = ref((props.collectionCoverDirection || '').slice(0, COVER_DIRECTION_MAX))
const nameError = ref<string | null>(null)
const isSaving = ref(false)

// Artwork editing
const artworkSelection = ref<ArtworkSelection>({ kind: 'unchanged' })
const artworkError = ref<string | null>(null)
const artistLabel = ref('Artist')

const artworkGenerateContext = computed(() => ({
  title: collectionName.value.trim() || props.collectionName || 'Collection',
  artist: artistLabel.value,
}))

const hasArtworkChanges = computed(() => isArtworkSelectionDirty(artworkSelection.value))

const loadArtistLabel = async () => {
  if (!supabase || !user.value) return
  const { data } = await supabase
    .from('user_profiles')
    .select('display_name, username')
    .eq('id', user.value.id)
    .maybeSingle()
  artistLabel.value =
    (data?.display_name as string)?.trim() ||
    (data?.username as string)?.trim() ||
    'Artist'
}

// Delete state
const isDeleting = ref(false)

// Computed
const hasNameChanges = computed(() => {
  return collectionName.value.trim() !== originalName.value.trim()
})

const hasShowOnProfileChanges = computed(() => {
  return showOnProfile.value !== originalShowOnProfile.value
})

const hasCoverDirectionChanges = computed(() => {
  return coverDirection.value.trim() !== originalCoverDirection.value.trim()
})

const hasChanges = computed(() => {
  return (
    hasNameChanges.value ||
    hasArtworkChanges.value ||
    hasShowOnProfileChanges.value ||
    hasCoverDirectionChanges.value
  )
})

const resetArtworkState = (
  artworkPath: string | null = originalArtworkPath.value,
  artworkProvider: StorageProvider | null = originalArtworkProvider.value,
) => {
  originalArtworkPath.value = artworkPath
  originalArtworkProvider.value = artworkProvider
  artworkSelection.value = { kind: 'unchanged' }
  artworkError.value = null
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
    const nextCoverDirection = coverDirection.value.trim().slice(0, COVER_DIRECTION_MAX) || null

    const updateData: {
      name: string
      slug: string
      artwork_path?: string | null
      artwork_provider?: StorageProvider | null
      show_on_profile?: boolean
      cover_direction?: string | null
    } = {
      name: trimmedName,
      slug: props.collectionSlug,
    }

    if (hasShowOnProfileChanges.value) {
      updateData.show_on_profile = showOnProfile.value
    }

    if (hasCoverDirectionChanges.value) {
      updateData.cover_direction = nextCoverDirection
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
    const selection = artworkSelection.value

    if (selection.kind === 'file') {
      const uploadedArtwork = await uploadArtwork(selection.file, 'collection', {
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
    } else if (selection.kind === 'reuse') {
      if (originalArtworkPath.value && originalArtworkPath.value !== selection.path) {
        await deleteArtwork(
          {
            id: props.collectionId,
            artwork_path: originalArtworkPath.value,
            artwork_provider: originalArtworkProvider.value,
          },
          'collection',
        )
      }
      updateData.artwork_path = selection.path
      updateData.artwork_provider = selection.provider
      nextArtworkPath = selection.path
      nextArtworkProvider = selection.provider
    } else if (selection.kind === 'remove' && originalArtworkPath.value) {
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
    originalCoverDirection.value = nextCoverDirection || ''
    coverDirection.value = nextCoverDirection || ''
    resetArtworkState(nextArtworkPath, nextArtworkProvider)
    showSuccess('Collection updated successfully')
    emit(
      'collection-updated',
      trimmedName,
      updateData.slug,
      nextArtworkPath,
      nextArtworkProvider,
      showOnProfile.value,
      nextCoverDirection,
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
    coverDirection.value = (props.collectionCoverDirection || '').slice(0, COVER_DIRECTION_MAX)
    originalCoverDirection.value = coverDirection.value
    void loadArtistLabel()
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

watch(() => props.collectionCoverDirection, (newVal) => {
  if (!hasCoverDirectionChanges.value) {
    coverDirection.value = (newVal || '').slice(0, COVER_DIRECTION_MAX)
    originalCoverDirection.value = coverDirection.value
  }
})
</script>
