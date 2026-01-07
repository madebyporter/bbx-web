<template>
  <div class="flex flex-col gap-4">
    <h3 class="text-lg font-bold text-neutral-200">Comments</h3>
    
    <!-- Comments List -->
    <div v-if="loading" class="text-sm text-neutral-400 py-4">
      Loading comments...
    </div>
    
    <div v-else-if="comments.length === 0" class="text-sm text-neutral-500 py-4">
      No comments yet. Be the first to comment!
    </div>
    
    <div v-else class="flex flex-col gap-4">
      <div v-for="comment in comments" :key="comment.id" class="flex flex-col gap-2 p-4 border border-neutral-800 rounded-md">
        <div class="flex flex-row gap-2 items-center">
          <span class="text-sm font-medium text-neutral-200">
            {{ comment.user?.display_name || comment.user?.username || 'Anonymous' }}
          </span>
          <span class="text-xs text-neutral-500">
            {{ formatDate(comment.created_at) }}
          </span>
        </div>
        <p class="text-sm text-neutral-300 whitespace-pre-wrap">{{ comment.content }}</p>
      </div>
    </div>
    
    <!-- Comment Form -->
    <div v-if="user" class="flex flex-col gap-2 mt-4">
      <textarea
        v-model="newComment"
        placeholder="Add a comment..."
        class="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500 resize-y min-h-[100px]"
        rows="4"
      />
      <button
        @click="handleSubmitComment"
        :disabled="!newComment.trim() || submitting"
        class="self-start px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-neutral-700 disabled:text-neutral-500 disabled:cursor-not-allowed text-neutral-900 font-medium rounded transition-colors cursor-pointer"
      >
        {{ submitting ? 'Posting...' : 'Post Comment' }}
      </button>
    </div>
    
    <div v-else class="mt-4 p-4 border border-neutral-800 rounded-md text-sm text-neutral-400">
      <NuxtLink to="/" class="text-amber-400 hover:text-amber-500 transition-colors">
        Sign in
      </NuxtLink>
      to leave a comment.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { fetchResourceComments, createResourceComment } from '~/utils/resourceQueries'
import type { ResourceComment } from '~/types/resource'

const props = defineProps<{
  resourceId: number
}>()

const { user } = useAuth()
const comments = ref<ResourceComment[]>([])
const loading = ref(false)
const newComment = ref('')
const submitting = ref(false)

const fetchComments = async () => {
  loading.value = true
  try {
    comments.value = await fetchResourceComments(props.resourceId)
  } catch (error) {
    console.error('Error fetching comments:', error)
  } finally {
    loading.value = false
  }
}

const handleSubmitComment = async () => {
  if (!newComment.value.trim() || submitting.value) return
  
  submitting.value = true
  try {
    const comment = await createResourceComment(props.resourceId, newComment.value)
    if (comment) {
      comments.value.push(comment)
      newComment.value = ''
    }
  } catch (error) {
    console.error('Error creating comment:', error)
    alert('Failed to post comment. Please try again.')
  } finally {
    submitting.value = false
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
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

onMounted(() => {
  fetchComments()
})
</script>

