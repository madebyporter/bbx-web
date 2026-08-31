<template>
  <MasterDrawer ref="drawerRef" :show="props.show" @update:show="(val) => emit('update:show', val)">
    <template #header>
      <h2 class="text-2xl">Library Settings</h2>
    </template>

    <div class="flex flex-col gap-6 grow">
      <div class="flex flex-col gap-3">
        <label class="font-semibold text-neutral-200">Show Panels on First View</label>
        <p class="text-sm text-neutral-400">
          Choose which sections are open the first time someone visits your library. Visitors can still open or close panels themselves; their choice is remembered.
        </p>
        <div class="flex flex-col gap-2">
          <label
            v-for="panel in panelOptions"
            :key="panel.key"
            class="flex items-center gap-3 p-3 border border-neutral-700 rounded bg-neutral-900/50 cursor-pointer hover:border-neutral-600"
          >
            <input
              v-model="draftPanels[panel.key]"
              type="checkbox"
              class="size-4 rounded border-neutral-600 bg-neutral-900 text-amber-500 focus:ring-amber-400"
              :disabled="isSaving"
            />
            <span class="text-sm text-neutral-200">{{ panel.label }}</span>
          </label>
        </div>
      </div>

      <div
        v-if="isAudioPro && profileId"
        class="flex flex-col gap-3 border-t border-neutral-800 pt-6"
      >
        <ManageMembers :profile-id="profileId" />
      </div>
    </div>

    <div class="flex flex-row gap-3 justify-end border-t border-neutral-800 pt-4 mt-auto">
      <Button
        variant="ghost"
        class="px-4 py-2 border border-neutral-700 hover:border-neutral-600 text-neutral-300 hover:text-white bg-transparent hover:bg-transparent"
        :disabled="isSaving"
        @click="handleCancel"
      >
        Cancel
      </Button>
      <Button
        :disabled="isSaving || !hasChanges"
        @click="handleSave"
      >
        {{ isSaving ? 'Saving...' : 'Save Changes' }}
      </Button>
    </div>
  </MasterDrawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import MasterDrawer from '~/components/MasterDrawer.vue'
import ManageMembers from '~/components/ManageMembers.vue'
import Button from '~/components/Button.vue'
import { useSupabase } from '~/utils/supabase'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'
import {
  DEFAULT_PROFILE_PANELS,
  normalizeProfilePanels,
  type ProfilePanels,
} from '~/utils/profilePanels'

const panelOptions: Array<{ key: keyof ProfilePanels; label: string }> = [
  { key: 'bio', label: 'Bio' },
  { key: 'collections', label: 'Collections' },
  { key: 'software', label: 'Software' },
  { key: 'music', label: 'Music' },
]

const props = withDefaults(
  defineProps<{
    show: boolean
    profileId: string
    isAudioPro?: boolean
    panels?: ProfilePanels | null
  }>(),
  {
    isAudioPro: false,
    panels: null,
  },
)

const emit = defineEmits<{
  'update:show': [value: boolean]
  'panels-updated': [panels: ProfilePanels]
}>()

const { supabase } = useSupabase()
const { user } = useAuth()
const { showSuccess, showError } = useToast()

const drawerRef = ref<InstanceType<typeof MasterDrawer> | null>(null)
const isSaving = ref(false)
const draftPanels = ref<ProfilePanels>({ ...DEFAULT_PROFILE_PANELS })
const savedPanels = ref<ProfilePanels>({ ...DEFAULT_PROFILE_PANELS })

const hasChanges = computed(() => {
  return (Object.keys(draftPanels.value) as Array<keyof ProfilePanels>).some(
    (key) => draftPanels.value[key] !== savedPanels.value[key],
  )
})

const syncFromProps = () => {
  const next = normalizeProfilePanels(props.panels ?? DEFAULT_PROFILE_PANELS)
  draftPanels.value = { ...next }
  savedPanels.value = { ...next }
}

watch(
  () => [props.show, props.panels] as const,
  ([show]) => {
    if (show) syncFromProps()
  },
  { immediate: true, deep: true },
)

const handleCancel = () => {
  draftPanels.value = { ...savedPanels.value }
  emit('update:show', false)
}

const handleSave = async () => {
  if (!supabase || !user.value || !props.profileId) return
  if (user.value.id !== props.profileId) {
    showError('You can only edit your own library settings')
    return
  }
  if (!hasChanges.value) return

  isSaving.value = true
  try {
    const nextPanels = normalizeProfilePanels(draftPanels.value)
    const { error } = await supabase
      .from('user_profiles')
      .update({ profile_panels: nextPanels })
      .eq('id', props.profileId)

    if (error) throw error

    savedPanels.value = { ...nextPanels }
    draftPanels.value = { ...nextPanels }
    emit('panels-updated', nextPanels)
    showSuccess('Library settings saved')
    emit('update:show', false)
  } catch (error: any) {
    console.error('Error saving library settings:', error)
    showError(error?.message || 'Failed to save library settings')
  } finally {
    isSaving.value = false
  }
}
</script>
