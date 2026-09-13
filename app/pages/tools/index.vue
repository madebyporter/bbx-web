<template>
  <div class="col-span-full max-w-full lg:max-w-none p-2 lg:p-0 flex flex-col gap-0 text-neutral-300">
    <LibraryHeader
      title="Music production tools"
      :count="tools.length"
      item-label="tool"
    />
    <div class="p-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <NuxtLink
          v-for="tool in tools"
          :key="tool.slug"
          :to="tool.href"
          class="relative border border-neutral-800 p-4 rounded-lg group hover:border-neutral-700 transition-colors"
        >
          <div class="w-full aspect-square bg-neutral-800 rounded-md overflow-hidden mb-4">
            <img
              :src="tool.imageUrl"
              :alt="tool.name"
              class="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
            />
          </div>
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1">
              <h2 class="text-lg font-medium group-hover:text-amber-400 transition-colors">
                {{ tool.name }}
              </h2>
              <p class="text-sm text-neutral-400">{{ tool.description }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <div v-for="tag in tool.tags" :key="tag" class="tag">
                {{ tag }}
              </div>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import LibraryHeader from '~/components/LibraryHeader.vue'
import { TOOLS_CATALOG } from '~/utils/toolsCatalog'
import { usePageShellReady } from '~/composables/usePageShellReady'
import { ref, onMounted } from 'vue'

const tools = TOOLS_CATALOG
const pageShellReady = ref(false)
usePageShellReady(pageShellReady)

const siteOrigin = useSiteOrigin()
const toolsCanonical = `${siteOrigin}/tools`
const toolsSeoTitle = 'Music Production Tools'
const toolsSeoDescription =
  'Free music production tools for producers — delay and reverb time calculators synced to your BPM.'

useSeoMeta({
  title: toolsSeoTitle,
  description: toolsSeoDescription,
  ogTitle: `${toolsSeoTitle} | Beatbox`,
  ogDescription: toolsSeoDescription,
  ogUrl: toolsCanonical,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: `${toolsSeoTitle} | Beatbox`,
  twitterDescription: toolsSeoDescription,
})

useHead({
  link: [{ rel: 'canonical', href: toolsCanonical, key: 'canonical' }],
})

onMounted(() => {
  pageShellReady.value = true
})
</script>
