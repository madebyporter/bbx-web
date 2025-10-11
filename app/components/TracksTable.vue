<template>
  <div class="py-2">
    <div v-if="loading" class="text-neutral-500">Loading tracks...</div>
    
    <div v-else-if="tracks.length === 0" class="text-neutral-500">
      {{ isOwnProfile ? 'No tracks uploaded yet.' : 'No tracks available.' }}
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="border-b border-neutral-800">
          <tr class="text-left text-neutral-500">
            <th class="pb-2 pr-4">Title</th>
            <th class="pb-2 pr-4">Artist</th>
            <th class="pb-2 pr-4">Version</th>
            <th class="pb-2 pr-4">Collection</th>
            <th class="pb-2 pr-4">Genre</th>
            <th class="pb-2 pr-4">BPM</th>
            <th class="pb-2 pr-4">Duration</th>
            <th v-if="isOwnProfile" class="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="track in tracks" 
            :key="track.id"
            class="border-b border-neutral-800/50 hover:bg-neutral-800/30"
          >
            <td class="py-3 pr-4">{{ track.title || 'Untitled' }}</td>
            <td class="py-3 pr-4 text-neutral-400">{{ track.artist || 'Unknown' }}</td>
            <td class="py-3 pr-4 text-neutral-400">{{ track.version || 'v1.0' }}</td>
            <td class="py-3 pr-4 text-neutral-400">{{ track.collection_names || '-' }}</td>
            <td class="py-3 pr-4 text-neutral-400">{{ track.genre || '-' }}</td>
            <td class="py-3 pr-4 text-neutral-400">{{ track.bpm || '-' }}</td>
            <td class="py-3 pr-4 text-neutral-400">{{ formatDuration(track.duration) }}</td>
            <td v-if="isOwnProfile" class="py-3">
              <button
                @click="$emit('edit-track', track)"
                class="text-amber-400 hover:text-amber-300 text-xs"
                title="Edit track"
              >
                Edit
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  tracks: any[]
  isOwnProfile: boolean
  loading: boolean
}

defineProps<Props>()
defineEmits<{
  'edit-track': [track: any]
}>()

const formatDuration = (seconds: number | null | undefined): string => {
  if (!seconds || seconds === 0) return '-'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}
</script>

