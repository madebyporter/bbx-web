<template>
  <MasterDrawer :show="props.show" @update:show="(val) => emit('update:show', val)">
    <template #header>
      <h2 class="text-2xl">New collection</h2>
    </template>

    <div class="flex flex-col gap-3 grow">
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
import { nextTick, ref, watch } from 'vue'
import MasterDrawer from '~/components/MasterDrawer.vue'
import Button from '~/components/Button.vue'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'
import { useSupabase } from '~/utils/supabase'
import { generateUniqueSlug } from '~/utils/collections'

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

const collectionName = ref('')
const nameError = ref('')
const isCreating = ref(false)
const nameInputRef = ref<HTMLInputElement | null>(null)

watch(
  () => props.show,
  async (open) => {
    if (open) {
      collectionName.value = ''
      nameError.value = ''
      await nextTick()
      nameInputRef.value?.focus()
    }
  },
)

const handleCancel = () => {
  emit('update:show', false)
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

    showSuccess('Collection created')
    emit('created', {
      id: Number(data.id),
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
