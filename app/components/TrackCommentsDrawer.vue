<template>
  <MasterDrawer ref="drawerRef" :show="props.show" @update:show="(val) => emit('update:show', val)">
    <template #header>
      <div class="flex flex-col gap-0.5 min-w-0">
        <h2 class="text-xl truncate">Comments</h2>
        <p v-if="props.track?.title" class="text-sm text-neutral-500 font-normal truncate">
          {{ props.track.title }}
        </p>
      </div>
    </template>

    <div class="flex flex-col gap-6 h-full">
      <!-- Compose -->
      <div v-if="user" class="flex flex-col gap-2 shrink-0 border-b border-neutral-800 pb-4">
        <div class="text-sm text-neutral-400">
          Commenting as
          <span class="text-neutral-200 font-medium">{{ authorLabel }}</span>
        </div>
        <textarea
          v-model="newComment"
          placeholder="Add a comment..."
          class="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500 resize-y min-h-[88px]"
          rows="3"
        />
        <Button class="self-start" :disabled="!newComment.trim() || submitting" @click="handleSubmitComment">
          {{ submitting ? 'Posting...' : 'Post' }}
        </Button>
      </div>
      <div v-else class="p-4 border border-neutral-800 rounded-md text-sm text-neutral-400 shrink-0">
        <button
          type="button"
          class="text-link text-amber-400 hover:text-amber-500 no-underline"
          @click="() => openAuthModal && openAuthModal('signin')"
        >
          Sign in
        </button>
        to leave a comment.
      </div>

      <!-- List -->
      <div class="flex flex-col gap-3 grow min-h-0">
        <div v-if="loading" class="text-sm text-neutral-400 py-2">Loading comments...</div>
        <div v-else-if="comments.length === 0" class="text-sm text-neutral-500 py-2">
          No comments yet. Be the first to comment!
        </div>
        <div v-else class="flex flex-col gap-3 overflow-y-auto no-scrollbar">
          <div
            v-for="comment in comments"
            :key="comment.id"
            class="flex flex-col gap-2 p-4 border border-neutral-800 rounded-md"
          >
            <div class="flex flex-row flex-wrap gap-2 items-center justify-between">
              <div class="flex flex-row gap-2 items-center min-w-0">
                <span class="text-sm font-medium text-neutral-200 truncate">
                  {{ comment.user?.display_name || comment.user?.username || 'User' }}
                </span>
                <span class="text-xs text-neutral-500 shrink-0">
                  {{ formatDate(comment.created_at) }}
                </span>
              </div>
              <div v-if="comment.user_id === user?.id" class="flex flex-row gap-1 shrink-0">
                <Button
                  v-if="editingId !== comment.id"
                  variant="ghost"
                  size="sm"
                  class="!p-1.5 text-neutral-500 hover:text-amber-300"
                  title="Edit comment"
                  @click="startEdit(comment)"
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  class="!p-1.5 text-neutral-500 hover:text-red-300"
                  title="Delete comment"
                  :disabled="deletingId === comment.id"
                  @click="handleDelete(comment.id)"
                >
                  {{ deletingId === comment.id ? '...' : 'Delete' }}
                </Button>
              </div>
            </div>

            <template v-if="editingId === comment.id">
              <textarea
                v-model="editContent"
                class="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-200 focus:outline-none focus:border-amber-500 resize-y min-h-[72px]"
                rows="3"
              />
              <div class="flex flex-row gap-2">
                <Button size="sm" :disabled="!editContent.trim() || savingEdit" @click="saveEdit(comment.id)">
                  {{ savingEdit ? 'Saving...' : 'Save' }}
                </Button>
                <Button variant="ghost" size="sm" @click="cancelEdit">Cancel</Button>
              </div>
            </template>
            <p v-else class="text-sm text-neutral-300 whitespace-pre-wrap">{{ comment.content }}</p>
          </div>
        </div>
      </div>
    </div>
  </MasterDrawer>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject } from 'vue'
import MasterDrawer from '~/components/MasterDrawer.vue'
import { useAuth } from '~/composables/useAuth'
import { useSupabase } from '~/utils/supabase'
import { useToast } from '~/composables/useToast'
import {
  fetchTrackComments,
  createTrackComment,
  updateTrackComment,
  deleteTrackComment,
} from '~/utils/trackCommentQueries'
import type { TrackComment } from '~/types/trackComment'

const props = defineProps<{
  show: boolean
  track: { id: number; title?: string } | null
  collectionId?: number | null
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const { user } = useAuth()
const { supabase } = useSupabase()
const { showError, showSuccess } = useToast()
const openAuthModal = inject<(mode?: 'signin' | 'signup' | 'forgot') => void>('openAuthModal')

const drawerRef = ref<InstanceType<typeof MasterDrawer> | null>(null)
const comments = ref<TrackComment[]>([])
const loading = ref(false)
const submitting = ref(false)
const newComment = ref('')
const editingId = ref<number | null>(null)
const editContent = ref('')
const savingEdit = ref(false)
const deletingId = ref<number | null>(null)
const authorProfile = ref<{ username: string; display_name: string | null } | null>(null)

const authorLabel = computed(() => {
  if (authorProfile.value?.display_name) return authorProfile.value.display_name
  if (authorProfile.value?.username) return authorProfile.value.username
  return user.value?.email?.split('@')[0] || 'You'
})

const loadAuthorProfile = async () => {
  if (!supabase || !user.value?.id) {
    authorProfile.value = null
    return
  }
  const { data } = await supabase
    .from('user_profiles')
    .select('username, display_name')
    .eq('id', user.value.id)
    .maybeSingle()
  authorProfile.value = data ?? null
}

const loadComments = async () => {
  if (!props.track?.id) {
    comments.value = []
    return
  }
  loading.value = true
  try {
    comments.value = await fetchTrackComments(props.track.id, props.collectionId ?? null)
  } catch {
    showError('Failed to load comments')
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.show, props.track?.id, props.collectionId] as const,
  ([show, trackId]) => {
    if (show && trackId) {
      loadAuthorProfile()
      loadComments()
      newComment.value = ''
      cancelEdit()
    }
  },
  { immediate: true }
)

const handleSubmitComment = async () => {
  if (!props.track?.id || !newComment.value.trim() || submitting.value) return
  submitting.value = true
  try {
    const comment = await createTrackComment(
      props.track.id,
      newComment.value,
      props.collectionId ?? null
    )
    if (comment) {
      comments.value = [comment, ...comments.value]
      newComment.value = ''
      showSuccess('Comment posted')
    }
  } catch {
    showError('Failed to post comment')
  } finally {
    submitting.value = false
  }
}

const startEdit = (comment: TrackComment) => {
  editingId.value = comment.id
  editContent.value = comment.content
}

const cancelEdit = () => {
  editingId.value = null
  editContent.value = ''
}

const saveEdit = async (commentId: number) => {
  if (!editContent.value.trim() || savingEdit.value) return
  savingEdit.value = true
  try {
    const updated = await updateTrackComment(commentId, editContent.value)
    if (updated) {
      comments.value = comments.value.map((c) => (c.id === commentId ? updated : c))
      cancelEdit()
      showSuccess('Comment updated')
    }
  } catch {
    showError('Failed to update comment')
  } finally {
    savingEdit.value = false
  }
}

const handleDelete = async (commentId: number) => {
  if (deletingId.value != null) return
  deletingId.value = commentId
  try {
    await deleteTrackComment(commentId)
    comments.value = comments.value.filter((c) => c.id !== commentId)
    if (editingId.value === commentId) cancelEdit()
    showSuccess('Comment deleted')
  } catch {
    showError('Failed to delete comment')
  } finally {
    deletingId.value = null
  }
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}
</script>
