<template>
  <div class="w-full min-w-0 overflow-x-hidden">
    <div class="w-full min-w-0 overflow-x-auto overflow-y-hidden no-scrollbar">
      <div :class="TRACK_TABLE_INNER_CLASS">
        <!-- Header -->
        <div
          class="flex flex-nowrap items-stretch text-sm text-left text-neutral-500 border-b border-neutral-800 bg-neutral-900 min-h-[65px] min-w-max w-full"
        >
          <div
            v-for="(col, index) in columns"
            :key="`h-${index}`"
            class="flex items-center p-4 shrink-0"
            :class="col.sticky ? TRACK_TABLE_STICKY_ACTIONS_CLASS : ''"
            :style="{ width: col.width, minWidth: col.width }"
          >
            {{ col.label }}
          </div>
        </div>

        <!-- Rows -->
        <div
          v-for="row in rowCount"
          :key="row"
          class="group flex flex-nowrap items-stretch text-sm border-b border-neutral-900 min-h-[65px] min-w-max w-full"
        >
          <div
            v-for="(col, index) in columns"
            :key="`${row}-${index}`"
            class="flex items-center p-4 shrink-0 overflow-hidden"
            :class="col.sticky ? TRACK_TABLE_STICKY_ACTIONS_CLASS : ''"
            :style="{ width: col.width, minWidth: col.width }"
          >
            <div
              v-if="col.kind === 'art'"
              class="size-10 rounded-sm bg-neutral-700 shrink-0"
            />
            <div
              v-else-if="col.kind === 'action'"
              class="size-5 rounded bg-neutral-800 animate-pulse shrink-0"
            />
            <div
              v-else-if="col.kind === 'status'"
              class="h-[30px] w-full rounded bg-neutral-800 animate-pulse"
            />
            <div
              v-else
              class="h-4 rounded bg-neutral-800 animate-pulse shrink-0"
              :style="{ width: col.barWidth, maxWidth: '100%' }"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  TRACK_GRID_WIDTH,
  TRACK_TABLE_INNER_CLASS,
  TRACK_TABLE_STICKY_ACTIONS_CLASS,
} from '~/utils/trackTableGrid'
import { TRACK_PAGE_SIZE } from '~/utils/trackPagination'

const props = withDefaults(
  defineProps<{
    isOwnProfile?: boolean
    profileUserType?: 'creator' | 'audio_pro' | null
    analyticsMode?: boolean
    showActions?: boolean
    showCollection?: boolean
    showStatus?: boolean
    rowCount?: number
  }>(),
  {
    isOwnProfile: false,
    profileUserType: null,
    analyticsMode: false,
    showActions: true,
    showCollection: false,
    showStatus: false,
    rowCount: TRACK_PAGE_SIZE,
  }
)

type SkeletonCol = {
  label: string
  width: string
  barWidth: string
  kind: 'art' | 'text' | 'status' | 'action'
  sticky?: boolean
}

const columns = computed((): SkeletonCol[] => {
  const analytics = props.analyticsMode && props.isOwnProfile
  const cols: SkeletonCol[] = [
    { label: '', width: TRACK_GRID_WIDTH.tiny, barWidth: '40px', kind: 'art' },
    {
      label: 'Title',
      width: TRACK_GRID_WIDTH.medium,
      barWidth: '180px',
      kind: 'text',
    },
    {
      label: 'Artist',
      width: analytics ? TRACK_GRID_WIDTH.medium : TRACK_GRID_WIDTH.small,
      barWidth: '96px',
      kind: 'text',
    },
    { label: 'Version', width: TRACK_GRID_WIDTH.tiny, barWidth: '40px', kind: 'text' },
  ]

  if (analytics) {
    cols.push(
      { label: 'Plays', width: TRACK_GRID_WIDTH.tiny, barWidth: '32px', kind: 'text' },
      { label: 'Listeners', width: TRACK_GRID_WIDTH.tiny, barWidth: '32px', kind: 'text' },
      { label: 'Avg Listen', width: TRACK_GRID_WIDTH.small, barWidth: '64px', kind: 'text' },
      { label: 'Completion', width: TRACK_GRID_WIDTH.small, barWidth: '40px', kind: 'text' },
    )
  } else {
    if (props.showCollection) {
      cols.push({
        label: 'Collection',
        width: TRACK_GRID_WIDTH.medium,
        barWidth: '128px',
        kind: 'text',
      })
    }
    cols.push(
      { label: 'Genre', width: TRACK_GRID_WIDTH.small, barWidth: '56px', kind: 'text' },
      { label: 'BPM', width: TRACK_GRID_WIDTH.tiny, barWidth: '32px', kind: 'text' },
      { label: 'Duration', width: TRACK_GRID_WIDTH.tiny, barWidth: '40px', kind: 'text' },
    )
    if (props.showStatus) {
      cols.push({
        label: 'Status',
        width: TRACK_GRID_WIDTH.small,
        barWidth: '100%',
        kind: 'status',
      })
    }
  }

  if (props.showActions) {
    cols.push({
      label: '',
      width: TRACK_GRID_WIDTH.tiny,
      barWidth: '20px',
      kind: 'action',
      sticky: true,
    })
  }

  return cols
})
</script>
