<template>
  <MasterDrawer :show="props.show" @update:show="(val) => emit('update:show', val)">
    <template #header>
      <h2 class="text-2xl">New collection</h2>
    </template>

    <div class="flex flex-col gap-4 grow">
      <div class="flex flex-col gap-3">
        <label class="font-semibold text-neutral-200" for="new-collection-name">Collection name</label>
        <input
          id="new-collection-name"
          ref="nameInputRef"
          v-model="collectionName"
          type="text"
          placeholder="Collection name"
          class="p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200 placeholder-neutral-500 outline-none focus:border-amber-400"
          :disabled="isCreating"
          @keydown.enter.prevent="handleCreate"
        />
        <p v-if="nameError" class="text-xs text-red-500">{{ nameError }}</p>
      </div>

      <div class="flex flex-col gap-2">
        <label class="font-semibold text-neutral-200">Artwork</label>
        <ArtworkPicker
          v-model="artworkSelection"
          v-model:cover-direction="coverDirection"
          kind="collection"
          :generate-context="artworkGenerateContext"
          :disabled="isCreating"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex flex-row gap-3 justify-end">
        <Button
          variant="ghost"
          class="px-4 py-2 border border-neutral-700 hover:border-neutral-600 text-neutral-300 hover:text-white bg-transparent hover:bg-transparent"
          :disabled="isCreating"
          @click="handleCancel"
        >
          Cancel
        </Button>
        <Button
          :disabled="isCreating || !collectionName.trim()"
          @click="handleCreate"
        >
          {{ isCreating ? 'Creating…' : 'Create' }}
        </Button>
      </div>
    </template>
  </MasterDrawer>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import MasterDrawer from '~/components/MasterDrawer.vue'
import ArtworkPicker from '~/components/ArtworkPicker.vue'
import Button from '~/components/Button.vue'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'
import { useArtwork } from '~/composables/useArtwork'
import { useSupabase } from '~/utils/supabase'
import { generateUniqueSlug } from '~/utils/collections'
import type { ArtworkSelection } from '~/types/artworkSelection'
import { COVER_DIRECTION_MAX } from '~/utils/coverDirection'

interface Props {
  show: boolean
  existingSlugs?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  existingSlugs: () => [],
})

const emit = defineEmits<{
  'update:show': [value: boolean]
  created: [payload: { id: number; name: string; slug: string }]
}>()

const { user } = useAuth()
const { supabase } = useSupabase()
const { showSuccess, showError } = useToast()
const { uploadArtwork } = useArtwork()

const collectionName = ref('')
const nameError = ref('')
const isCreating = ref(false)
const nameInputRef = ref<HTMLInputElement | null>(null)
const artworkSelection = ref<ArtworkSelection>({ kind: 'unchanged' })
const coverDirection = ref('')
const artistLabel = ref('Artist')

const artworkGenerateContext = computed(() => ({
  title: collectionName.value.trim() || 'Collection',
  artist: artistLabel.value,
}))

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

watch(
  () => props.show,
  async (open) => {
    if (open) {
      collectionName.value = ''
      nameError.value = ''
      artworkSelection.value = { kind: 'unchanged' }
      coverDirection.value = ''
      void loadArtistLabel()
      await nextTick()
      nameInputRef.value?.focus()
    }
  },
)

const handleCancel = () => {
  emit('update:show', false)
}

const applyArtwork = async (collectionId: number) => {
  const selection = artworkSelection.value
  const direction = coverDirection.value.trim().slice(0, COVER_DIRECTION_MAX) || null
  const patch: Record<string, unknown> = {}

  if (selection.kind === 'file') {
    const uploaded = await uploadArtwork(selection.file, 'collection', { collectionId })
    patch.artwork_path = uploaded.artwork_path
    patch.artwork_provider = uploaded.artwork_provider
  } else if (selection.kind === 'reuse') {
    patch.artwork_path = selection.path
    patch.artwork_provider = selection.provider
  }

  if (direction) {
    patch.cover_direction = direction
  }

  if (Object.keys(patch).length === 0) return

  await supabase!
    .from('collections')
    .update(patch)
    .eq('id', collectionId)
    .eq('user_id', user.value!.id)
}

const handleCreate = async () => {
  const name = collectionName.value.trim()
  if (!name) {
    nameError.value = 'Enter a collection name'
    return
  }
  if (!supabase || !user.value || isCreating.value) return

  nameError.value = ''
  isCreating.value = true

  try {
    const slug = generateUniqueSlug(name, props.existingSlugs)

    const { data, error } = await supabase
      .from('collections')
      .insert({
        user_id: user.value.id,
        name,
        description: null,
        slug,
      })
      .select('id, name, slug')
      .single()

    if (error) throw error
    if (!data?.id || !data?.name || !data?.slug) {
      throw new Error('Collection created without id/name/slug')
    }

    const id = Number(data.id)
    try {
      await applyArtwork(id)
    } catch (artErr) {
      console.error('Collection created but artwork failed:', artErr)
      showError('Collection created, but artwork could not be saved')
    }

    showSuccess('Collection created')
    emit('created', {
      id,
      name: String(data.name),
      slug: String(data.slug),
    })
    emit('update:show', false)
  } catch (err: any) {
    console.error('Error creating collection:', err)
    showError(err.message || 'Failed to create collection')
  } finally {
    isCreating.value = false
  }
}
</script>
