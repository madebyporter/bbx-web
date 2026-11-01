<template>
  <div class="w-full min-w-0 overflow-x-hidden">
    <div class="w-full min-w-0 overflow-x-auto overflow-y-hidden no-scrollbar">
      <div :class="TRACK_TABLE_INNER_CLASS">
        <div
          class="grid text-sm text-left text-neutral-500 border-b border-neutral-800 bg-neutral-900 min-h-[65px] [&>*]:flex [&>*]:items-center [&>*]:p-4 [&>*]:min-w-0 [&>*]:overflow-hidden"
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
          class="group grid text-sm border-b border-neutral-900 min-h-[65px] [&>*]:flex [&>*]:items-center [&>*]:flex-nowrap [&>*]:p-4 [&>*]:min-w-0 [&>*]:overflow-hidden"
          :style="tableGridStyle"
        >
          <div class="flex items-center justify-center">
            <div class="size-10 rounded-sm bg-neutral-700 shrink-0" />
          </div>
          <div>
            <div class="h-4 w-[180px] max-w-full rounded bg-neutral-800 animate-pulse shrink-0" />
          </div>
          <div>
            <div class="h-4 w-[96px] max-w-full rounded bg-neutral-800 animate-pulse shrink-0" />
          </div>
          <div>
            <div class="h-4 w-[40px] max-w-full rounded bg-neutral-800 animate-pulse shrink-0" />
          </div>
          <template v-if="analyticsMode && isOwnProfile">
            <div><div class="h-4 w-8 max-w-full rounded bg-neutral-800 animate-pulse shrink-0" /></div>
            <div><div class="h-4 w-8 max-w-full rounded bg-neutral-800 animate-pulse shrink-0" /></div>
            <div><div class="h-4 w-16 max-w-full rounded bg-neutral-800 animate-pulse shrink-0" /></div>
            <div><div class="h-4 w-10 max-w-full rounded bg-neutral-800 animate-pulse shrink-0" /></div>
          </template>
          <template v-else>
            <div v-if="showCollection">
              <div class="h-4 w-[128px] max-w-full rounded bg-neutral-800 animate-pulse shrink-0" />
            </div>
            <div>
              <div class="h-4 w-[56px] max-w-full rounded bg-neutral-800 animate-pulse shrink-0" />
            </div>
            <div>
              <div class="h-4 w-8 max-w-full rounded bg-neutral-800 animate-pulse shrink-0" />
            </div>
            <div>
              <div class="h-4 w-10 max-w-full rounded bg-neutral-800 animate-pulse shrink-0" />
            </div>
            <div v-if="showStatus">
              <div class="h-[30px] w-full rounded bg-neutral-800 animate-pulse" />
            </div>
          </template>
          <div v-if="showActionsColumn" :class="TRACK_TABLE_STICKY_ACTIONS_CLASS">
            <div class="size-5 rounded bg-neutral-800 animate-pulse shrink-0" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { buildTrackGridStyle, TRACK_TABLE_INNER_CLASS, TRACK_TABLE_STICKY_ACTIONS_CLASS } from '~/utils/trackTableGrid'
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
