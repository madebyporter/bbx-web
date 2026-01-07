<template>
  <div class="flex flex-col grow justify-between overflow-hidden">
    <div v-if="loading" class="flex items-center justify-center p-8 h-full w-full grow">
      <LoadingLogo />
    </div>

    <div v-else-if="!resource" class="flex flex-col items-center justify-center p-8 h-full grow text-neutral-500">
      <h2 class="text-xl font-bold mb-2">Resource not found</h2>
      <p class="text-sm">The {{ resourceTypeLabel }} you're looking for doesn't exist.</p>
      <NuxtLink :to="listPath" class="mt-4 text-amber-400 hover:text-amber-500 transition-colors">
        Browse all {{ resourceTypeLabel }}s
      </NuxtLink>
    </div>

    <template v-else>
      <!-- Scrollable Content -->
      <div class="overflow-y-auto">
        <div class="flex flex-col gap-0">
          <!-- Resource Header -->
          <div class="p-8 border-b border-neutral-800">
            <div class="flex flex-col gap-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Name -->
                <div>
                  <h1 class="text-white text-2xl md:text-5xl">
                    {{ resource.name }}
                  </h1>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="flex flex-col gap-1 border-t border-neutral-800 pt-2">
                    <span class="text-neutral-500 uppercase text-xs">
                      Creator
                    </span> 
                    <span class="text-white text-sm">
                      {{ resource.creator }}
                    </span>
                  </div>
                  <div class="flex flex-col gap-1 border-t border-neutral-800 pt-2">
                    <span class="text-neutral-500 uppercase text-xs">
                      Price
                    </span> 
                    <span class="text-white text-sm">
                      {{ resource.price }}
                    </span>
                  </div>
                  <div class="flex flex-col gap-1 border-t border-neutral-800 pt-2">
                    <span class="text-neutral-500 uppercase text-xs">
                      OS
                    </span>
                    <div class="flex flex-row gap-4 items-center">
                      <div v-if="resource.os.includes('mac')" class="flex items-center">
                        <svg width="12" height="15" viewBox="0 0 12 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path class="fill-neutral-400"
                            d="M9.9375 7.40984C9.9375 7.47234 9.84375 9.31609 11.875 10.2848C11.5 11.4411 10.1875 14.0036 8.65625 14.0036C7.78125 14.0036 7.28125 13.4411 6.28125 13.4411C5.25 13.4411 4.6875 14.0036 3.90625 14.0036C2.40625 14.0661 0.96875 11.2536 0.5625 10.0973C0.25 9.22234 0.125 8.37859 0.125 7.56609C0.125 4.78484 1.96875 3.44109 3.71875 3.40984C4.5625 3.40984 5.625 4.00359 6.09375 4.00359C6.53125 4.00359 7.75 3.28484 8.875 3.37859C10.0312 3.47234 10.9062 3.90984 11.5 4.75359C10.4688 5.40984 9.9375 6.25359 9.9375 7.40984ZM8.1875 2.28484C7.5625 3.00359 6.8125 3.40984 6 3.34734C5.9375 2.50359 6.25 1.72234 6.8125 1.09734C7.3125 0.534843 8.1875 0.0660934 8.9375 0.00359344C8.9375 0.347343 9.03125 1.28484 8.1875 2.28484Z" />
                        </svg>
                      </div>
                      <div v-if="resource.os.includes('windows')" class="flex items-center">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path class="fill-neutral-400"
                            d="M0 1.94109V6.69109H5.71875V1.15984L0 1.94109ZM0 12.0973V7.40984H5.71875V12.8786L0 12.0973ZM6.34375 12.9723V7.40984H14V14.0036L6.34375 12.9723ZM6.34375 1.06609L14 0.00359344V6.69109H6.34375V1.06609Z" />
                        </svg>
                      </div>
                      <div v-if="resource.os.includes('linux')" class="text-neutral-400 text-xs">Linux</div>
                    </div>
                  </div>
                  <div class="flex flex-col gap-1 border-t border-neutral-800 pt-2" v-if="resource.tags && resource.tags.length > 0">
                    <span class="text-neutral-500 uppercase text-xs">
                      Tags
                    </span>
                    <div class="flex flex-row gap-2 items-center flex-wrap">
                      <div v-for="tag in resource.tags" :key="tag" class="tag">
                        {{ tag }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Image -->
              <div class="w-full h-auto bg-neutral-200 rounded-md overflow-hidden shrink-0">
                <img v-if="resource.image_url" :src="getImageUrl(resource.image_url)" :alt="resource.name"
                  class="w-full h-full object-cover" @error="handleImageError" />
                <div v-else class="w-full h-full flex items-center justify-center text-neutral-500">
                  No image
                </div>
              </div>

             

              
            </div>
          </div>
          <!-- Comments Section -->
          <div class="p-4 border-b border-neutral-800">
            <ResourceComments :resource-id="resource.id" />
          </div>
        </div>
      </div>

      <!-- Fixed Footer CTA -->
      <div class="shrink-0">
        <ResourceActionFooter :resource-id="resource.id" :resource-link="resource.link" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSupabase } from '~/utils/supabase'
import { fetchResourceBySlug } from '~/utils/resourceQueries'
import type { Resource } from '~/utils/resourceQueries'
import ResourceComments from '~/components/ResourceComments.vue'
import ResourceActionFooter from '~/components/ResourceActionFooter.vue'
import LoadingLogo from '~/components/LoadingLogo.vue'

const props = defineProps<{
  typeSlug: string // 'software' or 'kits'
  slug: string
}>()

const route = useRoute()
const { supabase } = useSupabase()
const config = useRuntimeConfig()
const siteUrl = config.public.SITE_URL || 'https://beatbox.studio'

// Map route type to database type slug and labels
const typeConfig = computed(() => {
  const type = props.typeSlug
  if (type === 'software') {
    return {
      dbTypeSlug: 'software',
      label: 'software',
      seoLabel: 'Music Production Software',
      listPath: '/software'
    }
  } else if (type === 'kits') {
    return {
      dbTypeSlug: 'sounds',
      label: 'kit',
      seoLabel: 'Music Production Kit',
      listPath: '/kits'
    }
  }
  // Default fallback
  return {
    dbTypeSlug: 'software',
    label: 'resource',
    seoLabel: 'Resource',
    listPath: '/software'
  }
})

const resourceTypeLabel = computed(() => typeConfig.value.label)
const listPath = computed(() => typeConfig.value.listPath)

// Fetch resource data server-side for SEO
const { data: resourceData, pending: loading, refresh } = await useAsyncData(
  () => `resource-${props.typeSlug}-${props.slug}`,
  async () => {
    if (!supabase) return null
    
    try {
      const data = await fetchResourceBySlug(props.slug, typeConfig.value.dbTypeSlug)
      return data
    } catch (error) {
      console.error('Error fetching resource:', error)
      return null
    }
  },
  {
    server: true,
    watch: [() => props.slug, () => props.typeSlug]
  }
)

const resource = computed(() => resourceData.value)

// Watch for prop changes and refresh data
watch(() => props.slug, async (newSlug, oldSlug) => {
  if (newSlug && newSlug !== oldSlug) {
    await refresh()
  }
})

watch(() => props.typeSlug, async (newType, oldType) => {
  if (newType && newType !== oldType) {
    await refresh()
  }
})

// Helper function - must be defined before watch that uses it
const getImageUrl = (url: string) => {
  if (!url) return '/img/placeholder.png'
  if (url.startsWith('http')) return url
  const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return '/img/placeholder.png'
  return `${supabaseUrl}/storage/v1/object/public/resource-images/${url}`
}

// SEO meta tags - watch for changes
watch(() => resource.value, (newResource) => {
  if (!newResource) return
  
  const seoTitle = `${newResource.name} - ${typeConfig.value.seoLabel}`
  const seoDescription = `${newResource.name} by ${newResource.creator}. ${newResource.price}. ${newResource.tags?.join(', ')}.`
  const seoUrl = `${siteUrl}${route.path}`
  const seoImage = newResource.image_url ? getImageUrl(newResource.image_url) : `${siteUrl}/img/og-image.jpg`
  
  useHead({
    title: seoTitle,
    meta: [
      { name: 'description', content: seoDescription },
      { property: 'og:title', content: seoTitle },
      { property: 'og:description', content: seoDescription },
      { property: 'og:url', content: seoUrl },
      { property: 'og:type', content: 'website' },
      { property: 'og:image', content: seoImage },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: seoTitle },
      { name: 'twitter:description', content: seoDescription },
      { name: 'twitter:image', content: seoImage }
    ],
    link: [
      { rel: 'canonical', href: seoUrl }
    ]
  })
}, { immediate: true })

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.src = '/img/placeholder.png'
}
</script>

