<template>
  <MasterDrawer ref="drawerRef" :show="props.show" @update:show="(val) => emit('update:show', val)">
    <template #header>
      <h2 class="text-2xl">Library Settings</h2>
    </template>

    <div class="flex flex-col gap-6 grow">
      <div class="flex flex-col gap-3">
        <label class="font-semibold text-neutral-200">Profile</label>

        <div class="flex flex-col gap-2">
          <label class="text-sm text-neutral-400">Display Name</label>
          <input
            v-model="draftDisplayName"
            type="text"
            placeholder="Enter display name"
            class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200 placeholder-neutral-500 outline-none focus:border-amber-400"
            :disabled="isSaving"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-sm text-neutral-400">Username</label>
          <input
            v-model="draftUsername"
            type="text"
            placeholder="Enter username"
            class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200 placeholder-neutral-500 outline-none focus:border-amber-400"
            :class="{ 'border-red-500': usernameError }"
            :disabled="isSaving"
            @input="usernameError = null"
          />
          <p v-if="usernameError" class="text-xs text-red-500">{{ usernameError }}</p>
          <p v-else class="text-xs text-neutral-500">
            Username can only contain letters, numbers, underscores, and hyphens.
          </p>
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-sm text-neutral-400">Bio</label>
          <textarea
            v-model="draftBio"
            rows="4"
            placeholder="Tell visitors about yourself"
            class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200 placeholder-neutral-500 outline-none focus:border-amber-400 resize-y min-h-[96px]"
            :disabled="isSaving"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-sm text-neutral-400">Website</label>
          <input
            v-model="draftWebsite"
            type="text"
            placeholder="https://example.com"
            class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200 placeholder-neutral-500 outline-none focus:border-amber-400"
            :class="{ 'border-red-500': websiteError }"
            :disabled="isSaving"
            @input="websiteError = null"
          />
          <p v-if="websiteError" class="text-xs text-red-500">{{ websiteError }}</p>
        </div>
      </div>

      <div class="flex flex-col gap-3 border-t border-neutral-800 pt-6">
        <label class="font-semibold text-neutral-200">Social Links</label>
        <div v-if="activeSocialRows.length === 0" class="text-sm text-neutral-500">
          No social links yet.
        </div>
        <div
          v-for="row in activeSocialRows"
          :key="row.platform"
          class="flex flex-col gap-2 p-3 border border-neutral-700 rounded bg-neutral-900/50"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm text-neutral-300">{{ getPlatformDisplayName(row.platform) }}</span>
            <button
              type="button"
              class="text-xs text-red-400 hover:text-red-300"
              :disabled="isSaving"
              @click="removeSocialLink(row.platform)"
            >
              Remove
            </button>
          </div>
          <input
            v-model="draftSocialLinks[row.platform]"
            type="text"
            placeholder="https://"
            class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200 placeholder-neutral-500 outline-none focus:border-amber-400"
            :disabled="isSaving"
          />
        </div>
        <Button
          v-if="nextSocialPlatform"
          type="button"
          variant="ghost"
          size="sm"
          class="self-start border border-neutral-700 hover:border-neutral-600 bg-neutral-900 text-neutral-200"
          :disabled="isSaving"
          @click="addSocialLink"
        >
          Add Social Link
        </Button>
        <p v-if="socialLinksError" class="text-xs text-red-500">{{ socialLinksError }}</p>
      </div>

      <div class="flex flex-col gap-3 border-t border-neutral-800 pt-6">
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
import { useRouter } from 'vue-router'
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
import {
  getNextAvailableSocialPlatform,
  getPlatformDisplayName,
  normalizeSocialLinks,
  normalizeUrl,
  normalizeUsername,
  SOCIAL_PLATFORMS,
  type SocialLinkPlatform,
  type SocialLinks,
  validateUrl,
  validateUsername,
} from '~/utils/profileFields'

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
    displayName?: string
    username?: string
    bio?: string
    website?: string
    socialLinks?: SocialLinks | null
  }>(),
  {
    isAudioPro: false,
    panels: null,
    displayName: '',
    username: '',
    bio: '',
    website: '',
    socialLinks: null,
  },
)

const emit = defineEmits<{
  'update:show': [value: boolean]
  'panels-updated': [panels: ProfilePanels]
  'profile-updated': [
    payload: {
      displayName: string
      username: string
      bio: string
      website: string
      socialLinks: SocialLinks
    },
  ]
}>()

const router = useRouter()
const { supabase } = useSupabase()
const { user } = useAuth()
const { showSuccess, showError } = useToast()

const drawerRef = ref<InstanceType<typeof MasterDrawer> | null>(null)
const isSaving = ref(false)
const usernameError = ref<string | null>(null)
const websiteError = ref<string | null>(null)
const socialLinksError = ref<string | null>(null)

const draftDisplayName = ref('')
const draftUsername = ref('')
const draftBio = ref('')
const draftWebsite = ref('')
const draftSocialLinks = ref<SocialLinks>({})
const draftPanels = ref<ProfilePanels>({ ...DEFAULT_PROFILE_PANELS })

const savedDisplayName = ref('')
const savedUsername = ref('')
const savedBio = ref('')
const savedWebsite = ref('')
const savedSocialLinks = ref<SocialLinks>({})
const savedPanels = ref<ProfilePanels>({ ...DEFAULT_PROFILE_PANELS })

const activeSocialRows = computed(() =>
  SOCIAL_PLATFORMS
    .filter((platform) => draftSocialLinks.value[platform] !== undefined)
    .map((platform) => ({ platform })),
)

const nextSocialPlatform = computed(() => getNextAvailableSocialPlatform(draftSocialLinks.value))

const hasChanges = computed(() => {
  const panelsChanged = (Object.keys(draftPanels.value) as Array<keyof ProfilePanels>).some(
    (key) => draftPanels.value[key] !== savedPanels.value[key],
  )

  const socialChanged = SOCIAL_PLATFORMS.some((platform) => {
    const draftValue = draftSocialLinks.value[platform]?.trim() || ''
    const savedValue = savedSocialLinks.value[platform]?.trim() || ''
    return draftValue !== savedValue
  })

  return (
    panelsChanged
    || socialChanged
    || draftDisplayName.value.trim() !== savedDisplayName.value.trim()
    || normalizeUsername(draftUsername.value) !== normalizeUsername(savedUsername.value)
    || draftBio.value.trim() !== savedBio.value.trim()
    || draftWebsite.value.trim() !== savedWebsite.value.trim()
  )
})

const syncFromProps = () => {
  const nextPanels = normalizeProfilePanels(props.panels ?? DEFAULT_PROFILE_PANELS)
  const nextSocialLinks = normalizeSocialLinks(props.socialLinks)

  draftDisplayName.value = props.displayName || ''
  draftUsername.value = props.username || ''
  draftBio.value = props.bio || ''
  draftWebsite.value = props.website || ''
  draftSocialLinks.value = { ...nextSocialLinks }
  draftPanels.value = { ...nextPanels }

  savedDisplayName.value = draftDisplayName.value
  savedUsername.value = draftUsername.value
  savedBio.value = draftBio.value
  savedWebsite.value = draftWebsite.value
  savedSocialLinks.value = { ...nextSocialLinks }
  savedPanels.value = { ...nextPanels }

  usernameError.value = null
  websiteError.value = null
  socialLinksError.value = null
}

const addSocialLink = () => {
  const platform = nextSocialPlatform.value
  if (!platform) return
  draftSocialLinks.value = {
    ...draftSocialLinks.value,
    [platform]: 'https://',
  }
}

const removeSocialLink = (platform: SocialLinkPlatform) => {
  const next = { ...draftSocialLinks.value }
  delete next[platform]
  draftSocialLinks.value = next
}

const validateForm = (): boolean => {
  usernameError.value = null
  websiteError.value = null
  socialLinksError.value = null

  const displayName = draftDisplayName.value.trim()
  if (!displayName) {
    showError('Display name cannot be empty')
    return false
  }

  const usernameValidationError = validateUsername(draftUsername.value)
  if (usernameValidationError) {
    usernameError.value = usernameValidationError
    return false
  }
  draftUsername.value = normalizeUsername(draftUsername.value)

  const websiteValidationError = validateUrl(draftWebsite.value, { allowEmpty: true })
  if (websiteValidationError) {
    websiteError.value = websiteValidationError
    return false
  }

  const normalizedSocialLinks: SocialLinks = {}
  for (const platform of SOCIAL_PLATFORMS) {
    const rawValue = draftSocialLinks.value[platform]
    if (rawValue === undefined) continue

    const trimmed = rawValue.trim()
    if (!trimmed || trimmed === 'https://') continue

    const normalized = normalizeUrl(trimmed)
    if (!normalized) {
      socialLinksError.value = `Please enter a valid ${getPlatformDisplayName(platform)} URL`
      return false
    }
    normalizedSocialLinks[platform] = normalized
  }

  draftSocialLinks.value = { ...normalizedSocialLinks }
  return true
}

watch(
  () => [
    props.show,
    props.panels,
    props.displayName,
    props.username,
    props.bio,
    props.website,
    props.socialLinks,
  ] as const,
  ([show]) => {
    if (show) syncFromProps()
  },
  { immediate: true, deep: true },
)

const handleCancel = () => {
  syncFromProps()
  emit('update:show', false)
}

const handleSave = async () => {
  if (!supabase || !user.value || !props.profileId) return
  if (user.value.id !== props.profileId) {
    showError('You can only edit your own library settings')
    return
  }
  if (!hasChanges.value || !validateForm()) return

  isSaving.value = true
  try {
    if (normalizeUsername(draftUsername.value) !== normalizeUsername(savedUsername.value)) {
      const { data: existingUser, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', draftUsername.value)
        .neq('id', props.profileId)
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }
      if (existingUser) {
        usernameError.value = 'This username is already taken'
        return
      }
    }

    const nextPanels = normalizeProfilePanels(draftPanels.value)
    const nextDisplayName = draftDisplayName.value.trim()
    const nextUsername = normalizeUsername(draftUsername.value)
    const nextBio = draftBio.value.trim()
    const nextWebsite = normalizeUrl(draftWebsite.value, { allowEmpty: true }) || ''
    const nextSocialLinks = normalizeSocialLinks(draftSocialLinks.value)

    const { error } = await supabase
      .from('user_profiles')
      .update({
        display_name: nextDisplayName,
        username: nextUsername,
        bio: nextBio || null,
        website: nextWebsite || null,
        social_links: nextSocialLinks,
        profile_panels: nextPanels,
      })
      .eq('id', props.profileId)

    if (error) throw error

    savedDisplayName.value = nextDisplayName
    savedUsername.value = nextUsername
    savedBio.value = nextBio
    savedWebsite.value = nextWebsite
    savedSocialLinks.value = { ...nextSocialLinks }
    savedPanels.value = { ...nextPanels }

    draftDisplayName.value = nextDisplayName
    draftUsername.value = nextUsername
    draftBio.value = nextBio
    draftWebsite.value = nextWebsite
    draftSocialLinks.value = { ...nextSocialLinks }
    draftPanels.value = { ...nextPanels }

    emit('panels-updated', nextPanels)
    emit('profile-updated', {
      displayName: nextDisplayName,
      username: nextUsername,
      bio: nextBio,
      website: nextWebsite,
      socialLinks: nextSocialLinks,
    })

    if (nextUsername !== normalizeUsername(props.username || '')) {
      await router.replace(`/u/${nextUsername}`)
    }

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
