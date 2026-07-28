<template>
  <div class="w-full min-w-0 overflow-x-hidden">
    <div class="w-full min-w-0 overflow-x-auto overflow-y-hidden no-scrollbar">
      <div class="w-max min-w-full h-fit">
        <div
          class="text-sm text-left text-neutral-500 border-b border-neutral-800 bg-neutral-900 *:flex *:items-center *:p-4 min-h-[65px]"
          :style="tableGridStyle"
        >
          <div class="flex items-center justify-center" />
          <div>Title</div>
          <div>Artist</div>
          <div>Version</div>
          <template v-if="analyticsMode && isOwnProfile">
            <div>Plays</div>
            <div>Listeners</div>
            <div>Avg Listen</div>
            <div>Completion</div>
          </template>
          <template v-else>
            <div v-if="showCollection">Collection</div>
            <div>Genre</div>
            <div>BPM</div>
            <div>Duration</div>
            <div v-if="showStatus">Status</div>
          </template>
          <div
            v-if="showActionsColumn"
            :class="[TRACK_TABLE_STICKY_ACTIONS_CLASS, 'justify-start min-h-[65px]']"
          />
        </div>

        <div
          v-for="row in rowCount"
          :key="row"
          class="group text-sm border-b border-neutral-900 *:flex *:items-center *:p-4 items-stretch"
          :style="tableGridStyle"
        >
          <div class="flex items-center justify-center">
            <div class="size-10 rounded-sm bg-neutral-700 shrink-0" />
          </div>
          <div class="min-w-0">
            <div class="h-4 w-3/4 max-w-[200px] rounded bg-neutral-800 animate-pulse" />
          </div>
          <div>
            <div class="h-4 w-24 rounded bg-neutral-800 animate-pulse" />
          </div>
          <div>
            <div class="h-4 w-10 rounded bg-neutral-800 animate-pulse" />
          </div>
          <template v-if="analyticsMode && isOwnProfile">
            <div><div class="h-4 w-8 rounded bg-neutral-800 animate-pulse" /></div>
            <div><div class="h-4 w-8 rounded bg-neutral-800 animate-pulse" /></div>
            <div><div class="h-4 w-16 rounded bg-neutral-800 animate-pulse" /></div>
            <div><div class="h-4 w-10 rounded bg-neutral-800 animate-pulse" /></div>
          </template>
          <template v-else>
            <div v-if="showCollection">
              <div class="h-4 w-32 max-w-full rounded bg-neutral-800 animate-pulse" />
            </div>
            <div>
              <div class="h-4 w-14 rounded bg-neutral-800 animate-pulse" />
            </div>
            <div>
              <div class="h-4 w-8 rounded bg-neutral-800 animate-pulse" />
            </div>
            <div>
              <div class="h-4 w-10 rounded bg-neutral-800 animate-pulse" />
            </div>
            <div v-if="showStatus">
              <div class="h-[30px] w-full rounded bg-neutral-800 animate-pulse" />
            </div>
          </template>
          <div v-if="showActionsColumn" :class="TRACK_TABLE_STICKY_ACTIONS_CLASS">
            <div class="size-5 rounded bg-neutral-800 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { buildTrackGridStyle, TRACK_TABLE_STICKY_ACTIONS_CLASS } from '~/utils/trackTableGrid'
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

const showActionsColumn = computed(() => props.showActions)

const tableGridStyle = computed(() =>
  buildTrackGridStyle({
    showCollection: props.showCollection,
    showStatus: props.showStatus,
    showActions: showActionsColumn.value,
    analyticsMode: props.analyticsMode && props.isOwnProfile,
  })
)
</script>
