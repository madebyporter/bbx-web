<template>
  <div class="col-span-full max-w-full lg:max-w-none p-2 lg:p-0 flex flex-col gap-0 text-neutral-300">
    <LibraryHeader
      title="Delay & Reverb Time Calculator"
      :count="1"
      item-label="tool"
    />

    <div class="p-4 flex flex-col gap-6">
      <!-- BPM input -->
      <div class="flex flex-col gap-2 max-w-xs">
        <label for="tools-bpm" class="nav-header">BPM</label>
        <input
          id="tools-bpm"
          v-model="bpmInput"
          type="text"
          autocomplete="off"
          class="w-full p-3 border border-neutral-700 hover:border-neutral-600 rounded bg-neutral-900 text-neutral-200 placeholder-neutral-500 outline-none focus:border-amber-400"
          @click="onBpmInputClick"
        />
      </div>

      <!-- Reverb table -->
      <section class="flex flex-col gap-2">
        <h2 class="text-lg font-medium text-white">Reverb</h2>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-left" style="table-layout: fixed; min-width: 640px">
            <colgroup>
              <col style="width: 28%" />
              <col style="width: 24%" />
              <col style="width: 24%" />
              <col style="width: 24%" />
            </colgroup>
            <thead>
              <tr class="text-sm text-neutral-500 border-b border-neutral-800">
                <th class="font-normal p-2">Reverb Size</th>
                <th class="font-normal p-2">Pre-Delay</th>
                <th class="font-normal p-2">Decay Time</th>
                <th class="font-normal p-2">Total Reverb Time</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in reverbRows"
                :key="row.label"
                class="border-b border-neutral-800 align-middle"
              >
                <td class="p-2 text-sm text-neutral-200 whitespace-nowrap">{{ row.label }}</td>
                <td class="p-2">
                  <CopyValueCard
                    :primary-value="formatCalcNumber(row.preDelayMs)"
                    :primary-display="`${formatCalcNumber(row.preDelayMs)} ms`"
                    primary-unit="ms"
                  />
                </td>
                <td class="p-2">
                  <CopyValueCard
                    :primary-value="formatCalcNumber(row.decayMs)"
                    :primary-display="`${formatCalcNumber(row.decayMs)} ms`"
                    primary-unit="ms"
                  />
                </td>
                <td class="p-2">
                  <CopyValueCard
                    :primary-value="formatCalcNumber(row.totalMs)"
                    :primary-display="`${formatCalcNumber(row.totalMs)} ms`"
                    primary-unit="ms"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Delay lengths table -->
      <section class="flex flex-col gap-2">
        <h2 class="text-lg font-medium text-white">
          Delay lengths for different note values
        </h2>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-left" style="table-layout: fixed; min-width: 640px">
            <colgroup>
              <col style="width: 28%" />
              <col style="width: 24%" />
              <col style="width: 24%" />
              <col style="width: 24%" />
            </colgroup>
            <thead>
              <tr class="text-sm text-neutral-500 border-b border-neutral-800">
                <th class="font-normal p-2">Note</th>
                <th class="font-normal p-2">Normal</th>
                <th class="font-normal p-2">Dotted</th>
                <th class="font-normal p-2">Triplet</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in delayRows"
                :key="row.label"
                class="border-b border-neutral-800 align-middle"
              >
                <td class="p-2 text-sm text-neutral-200 whitespace-nowrap">
                  <span>{{ row.label }}</span>
                  <span v-if="row.subtitle" class="text-neutral-500"> ({{ row.subtitle }})</span>
                </td>
                <td class="p-2">
                  <CopyValueCard
                    :primary-value="formatCalcNumber(row.normal.ms)"
                    :primary-display="`${formatCalcNumber(row.normal.ms)} ms`"
                    primary-unit="ms"
                    :secondary-value="formatCalcNumber(row.normal.hz)"
                    :secondary-display="`${formatCalcNumber(row.normal.hz)} Hz`"
                    secondary-unit="hz"
                  />
                </td>
                <td class="p-2">
                  <CopyValueCard
                    :primary-value="formatCalcNumber(row.dotted.ms)"
                    :primary-display="`${formatCalcNumber(row.dotted.ms)} ms`"
                    primary-unit="ms"
                    :secondary-value="formatCalcNumber(row.dotted.hz)"
                    :secondary-display="`${formatCalcNumber(row.dotted.hz)} Hz`"
                    secondary-unit="hz"
                  />
                </td>
                <td class="p-2">
                  <CopyValueCard
                    :primary-value="formatCalcNumber(row.triplet.ms)"
                    :primary-display="`${formatCalcNumber(row.triplet.ms)} ms`"
                    primary-unit="ms"
                    :secondary-value="formatCalcNumber(row.triplet.hz)"
                    :secondary-display="`${formatCalcNumber(row.triplet.hz)} Hz`"
                    secondary-unit="hz"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <CopyCursorToast />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import LibraryHeader from '~/components/LibraryHeader.vue'
import CopyValueCard from '~/components/CopyValueCard.vue'
import CopyCursorToast from '~/components/CopyCursorToast.vue'
import {
  calculateDelayRows,
  calculateReverbRows,
  formatCalcNumber,
} from '~/utils/delayReverbCalculator'
import { usePageShellReady } from '~/composables/usePageShellReady'

const bpmInput = ref('120')
const pageShellReady = ref(false)
usePageShellReady(pageShellReady)

const onBpmInputClick = (event: MouseEvent) => {
  const el = event.currentTarget
  if (el instanceof HTMLInputElement) {
    el.select()
  }
}

const safeBpm = computed(() => {
  const value = Number(bpmInput.value)
  return Number.isFinite(value) && value > 0 ? value : 120
})

const reverbRows = computed(() => calculateReverbRows(safeBpm.value))
const delayRows = computed(() => calculateDelayRows(safeBpm.value))

const siteOrigin = useSiteOrigin()
const canonical = `${siteOrigin}/tools/delay-reverb`
const seoTitle = 'Delay & Reverb Time Calculator'
const seoDescription =
  'Calculate BPM-synced delay times, pre-delay, and reverb decay for music production. Click any value to copy.'

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: `${seoTitle} | Beatbox`,
  ogDescription: seoDescription,
  ogUrl: canonical,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: `${seoTitle} | Beatbox`,
  twitterDescription: seoDescription,
})

useHead({
  link: [{ rel: 'canonical', href: canonical, key: 'canonical' }],
})

onMounted(() => {
  pageShellReady.value = true
})
</script>
