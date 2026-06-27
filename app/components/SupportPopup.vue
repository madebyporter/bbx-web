<template>
  <Teleport to="body">
    <div v-if="props.show" class="fixed inset-0 z-[60]">
      <button
        type="button"
        class="absolute inset-0 bg-black/40 lg:bg-transparent cursor-default"
        aria-label="Close support form"
        @click="handleClose"
      />

      <aside
        ref="panelRef"
        class="absolute bottom-4 left-4 w-[min(325px,calc(100vw-2rem))] max-h-[min(44rem,calc(100dvh-2rem))] flex flex-col overflow-hidden rounded-md bg-neutral-900 ring-1 ring-neutral-800 shadow-lg"
        role="dialog"
        aria-labelledby="support-popup-title"
        @click.stop
      >
        <div class="flex items-center justify-between gap-2 px-3 py-2 border-b border-neutral-800 shrink-0">
          <h2 id="support-popup-title" class="text-sm font-semibold text-neutral-100">
            Send feedback
          </h2>
          <button
            type="button"
            class="flex justify-center items-center border border-neutral-800 hover:border-neutral-700 p-2 rounded-md cursor-pointer"
            aria-label="Close"
            @click="handleClose"
          >
            <img src="/img/db/icon-close.svg" alt="" class="size-4" />
          </button>
        </div>

        <div
          v-if="submitted"
          class="p-4 text-sm text-neutral-300 flex flex-col gap-2 grow overflow-auto min-h-0"
        >
          <p>Thanks — we've received your feedback.</p>
          <p class="text-neutral-500 leading-snug">
            Our team will review it and aim to get back to you within 48 hours.
          </p>
          <button
            type="button"
            class="mt-1 text-left text-sm font-medium text-amber-400 hover:text-amber-300 cursor-pointer"
            @click="resetAfterSuccess"
          >
            Send another
          </button>
        </div>

        <div v-else class="flex flex-col grow min-h-0">
          <form
            id="support-form"
            class="flex flex-col gap-4 p-3 grow overflow-auto min-h-0"
            @submit.prevent="handleSubmit"
          >
          <fieldset class="flex flex-col gap-2">
            <label for="support-type" class="nav-header">Type</label>
            <select
              id="support-type"
              v-model="type"
              class="w-full p-2.5 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200 text-sm outline-none focus:border-amber-400 cursor-pointer"
              required
            >
              <option value="Bugs">Bugs</option>
              <option value="Feedback">Feedback</option>
            </select>
          </fieldset>

          <fieldset class="flex flex-col gap-2">
            <label for="support-name" class="nav-header">Name</label>
            <input
              id="support-name"
              v-model="name"
              type="text"
              autocomplete="name"
              maxlength="200"
              required
              class="w-full p-2.5 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200 text-sm placeholder-neutral-500 outline-none focus:border-amber-400"
            />
          </fieldset>

          <fieldset class="flex flex-col gap-2">
            <label for="support-email" class="nav-header">Email</label>
            <input
              id="support-email"
              v-model="email"
              type="email"
              autocomplete="email"
              required
              class="w-full p-2.5 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200 text-sm placeholder-neutral-500 outline-none focus:border-amber-400"
            />
          </fieldset>

          <fieldset class="flex flex-col gap-2">
            <label for="support-subject" class="nav-header">Subject</label>
            <input
              id="support-subject"
              v-model="subject"
              type="text"
              required
              minlength="3"
              maxlength="200"
              placeholder="Short summary for the issue title"
              class="w-full p-2.5 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200 text-sm placeholder-neutral-500 outline-none focus:border-amber-400"
            />
          </fieldset>

          <fieldset class="flex flex-col gap-2">
            <label for="support-message" class="nav-header">Message</label>
            <textarea
              id="support-message"
              v-model="message"
              rows="5"
              required
              minlength="10"
              maxlength="10000"
              placeholder="Describe your idea or what went wrong..."
              class="w-full p-2.5 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200 text-sm placeholder-neutral-500 outline-none focus:border-amber-400 resize-y min-h-[7rem]"
            />
          </fieldset>

          <fieldset class="flex flex-col gap-2">
            <label for="support-screenshot" class="nav-header">Screenshot (optional)</label>
            <input
              id="support-screenshot"
              ref="fileInputRef"
              type="file"
              accept="image/jpeg,image/png"
              class="block w-full text-sm text-neutral-400 file:mr-2 file:rounded file:border file:border-neutral-700 file:bg-neutral-800 file:px-2 file:py-1.5 file:text-sm file:font-medium file:text-neutral-200 hover:file:bg-neutral-700 cursor-pointer"
              @change="onFileSelected"
            />
            <p class="text-[11px] text-neutral-500 leading-snug">
              JPEG or PNG, up to 4&nbsp;MB. Shown inline on the Notion issue.
            </p>
            <div
              v-if="attachmentPreviewUrl"
              class="relative rounded border border-neutral-700 overflow-hidden max-h-32 w-full bg-neutral-800"
            >
              <img
                :src="attachmentPreviewUrl"
                alt="Screenshot preview"
                class="w-full h-full object-contain max-h-32"
              />
              <button
                type="button"
                class="absolute top-1 right-1 rounded bg-neutral-900/80 text-neutral-200 text-xs px-1.5 py-0.5 cursor-pointer"
                @click="clearAttachment"
              >
                Remove
              </button>
            </div>
          </fieldset>

            <p v-if="submitError" class="text-sm text-red-500">{{ submitError }}</p>
          </form>

          <div class="shrink-0 p-3 border-t border-neutral-800">
            <Button
              type="submit"
              form="support-form"
              :disabled="submitting"
              full-width
            >
              {{ submitting ? 'Sending…' : 'Submit' }}
            </Button>
          </div>
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'
import { useSupabase } from '~/utils/supabase'
import Button from '~/components/Button.vue'
import type { SupportType } from '~/types/support'
import { SUPPORT_LIMITS } from '~/types/support'

interface Props {
  show: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const route = useRoute()
const { user } = useAuth()
const { showSuccess: showSuccessToast } = useToast()
const { supabase } = useSupabase()

const panelRef = ref<HTMLElement | null>(null)
const type = ref<SupportType>('Bugs')
const name = ref('')
const email = ref('')
const subject = ref('')
const message = ref('')
const submitting = ref(false)
const submitError = ref('')
const submitted = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const attachmentPreviewUrl = ref<string | null>(null)

function revokePreview() {
  if (attachmentPreviewUrl.value) {
    URL.revokeObjectURL(attachmentPreviewUrl.value)
    attachmentPreviewUrl.value = null
  }
}

function clearAttachment() {
  revokePreview()
  selectedFile.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

function onFileSelected(e: Event) {
  revokePreview()
  const input = e.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  if (!file) {
    selectedFile.value = null
    return
  }
  if (file.size > SUPPORT_LIMITS.attachmentMaxBytes) {
    submitError.value = 'Screenshot must be 4 MB or smaller.'
    input.value = ''
    selectedFile.value = null
    return
  }
  const okType = /^image\/(jpeg|jpg|png)$/i.test(file.type)
  if (!okType) {
    submitError.value = 'Please choose a JPEG or PNG image.'
    input.value = ''
    selectedFile.value = null
    return
  }
  submitError.value = ''
  selectedFile.value = file
  attachmentPreviewUrl.value = URL.createObjectURL(file)
}

async function prefillFromProfile() {
  if (!user.value) return

  if (user.value.email && !email.value.trim()) {
    email.value = user.value.email
  }

  if (supabase) {
    const { data } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('id', user.value.id)
      .maybeSingle()

    const displayName = (data as { display_name?: string | null } | null)?.display_name
    if (displayName?.trim() && !name.value.trim()) {
      name.value = displayName.trim()
      return
    }
  }

  if (!name.value.trim() && user.value.email) {
    const localPart = user.value.email.split('@')[0]
    if (localPart) name.value = localPart
  }
}

function handleClose() {
  emit('update:show', false)
  submitError.value = ''
  submitted.value = false
  clearAttachment()
}

function resetAfterSuccess() {
  submitted.value = false
  subject.value = ''
  message.value = ''
  type.value = 'Bugs'
  clearAttachment()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.show) {
    e.preventDefault()
    handleClose()
  }
}

async function handleSubmit() {
  submitError.value = ''
  submitting.value = true

  try {
    if (!supabase) {
      throw new Error('Unable to connect. Please try again.')
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) {
      throw new Error('Please sign in again to send feedback.')
    }

    let pageUrl = route.fullPath || '/'
    if (typeof window !== 'undefined') {
      pageUrl = `${window.location.origin}${route.fullPath || '/'}`
    }

    const fd = new FormData()
    fd.append('type', type.value)
    fd.append('name', name.value.trim())
    fd.append('email', email.value.trim())
    fd.append('subject', subject.value.trim())
    fd.append('message', message.value.trim())
    fd.append('pageUrl', pageUrl)
    if (selectedFile.value) {
      fd.append('file', selectedFile.value, selectedFile.value.name)
    }

    await $fetch('/api/support', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: fd,
    })

    submitted.value = true
    showSuccessToast('Feedback sent successfully')
  } catch (err: unknown) {
    const fetchErr = err as { data?: { statusMessage?: string }; message?: string }
    const msg =
      fetchErr?.data?.statusMessage ||
      (err instanceof Error ? err.message : null) ||
      'Something went wrong.'
    submitError.value = msg
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.show,
  (isOpen) => {
    if (isOpen) {
      prefillFromProfile()
    }
  }
)

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  revokePreview()
})
</script>
