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
          <div class="p-4 md:p-8 border-b border-neutral-800">
            <div class="flex flex-col gap-8 md:gap-16">
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
          <div v-if="isAdmin" class="p-4 border-b border-neutral-800 grid grid-cols-2 gap-4 items-center">
            <div><h2 class="text-white text-lg font-bold">Admin</h2></div>
            <div class="flex flex-row gap-4">
              <button class="btn" @click="onEdit">Edit</button>
              <button class="btn bg-red-500 hover:bg-red-600" @click="onDelete">Delete</button>
            </div>
          </div>
          <!-- Comments Section -->
          <div class="p-4">
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
import { computed, watch, inject, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSupabase } from '~/utils/supabase'
import { fetchResourceBySlug, deleteResource, getResourceUseStatus } from '~/utils/resourceQueries'
import type { Resource } from '~/utils/resourceQueries'
import ResourceComments from '~/components/ResourceComments.vue'
import ResourceActionFooter from '~/components/ResourceActionFooter.vue'
import LoadingLogo from '~/components/LoadingLogo.vue'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'
import { navigateTo } from '#app'

const props = defineProps<{
  typeSlug: string // 'software' or 'kits'
  slug: string
}>()

const route = useRoute()

// [SEO-TIMING] Top of script setup - log execution context
const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now()
const context = process.server ? 'SERVER' : process.client ? 'CLIENT' : 'UNKNOWN'
const routePath = typeof window !== 'undefined' ? window.location.pathname : (route?.path || 'SSR')
console.log(`[SEO-TIMING] [COMPONENT] ResourceDetailPage setup started | Context: ${context} | Timestamp: ${startTime}ms | Route: ${routePath}`)

// [SEO-TIMING] Critical: Check if this is SSR or client-side navigation
if (process.server) {
  console.log(`[SEO-TIMING] [COMPONENT] ✅ RUNNING ON SERVER (SSR) - SEO tags WILL be in HTML`)
} else if (process.client) {
  console.log(`[SEO-TIMING] [COMPONENT] ⚠️ RUNNING ON CLIENT ONLY - SEO tags set via JavaScript (not in initial HTML)`)
  // Check if this is initial page load or client-side navigation
  if (typeof window !== 'undefined' && window.performance) {
    try {
      const navEntries = (window.performance as any).getEntriesByType?.('navigation') || []
      const navType = navEntries[0]?.type
      const isInitialLoad = navType === 'navigate' || navType === 'reload'
      console.log(`[SEO-TIMING] [COMPONENT] Navigation type: ${navType} | Initial load: ${isInitialLoad}`)
    } catch (e) {
      // Navigation timing API might not be available
    }
  }
}
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
const { isAdmin } = useAuth()
const { showSuccess, showError } = useToast()
const handleEdit = inject<(resource: Resource) => void>('handleEdit')

// Fetch resource data server-side for SEO
const { data: resourceData, pending: loading, refresh } = await useAsyncData(
  () => `resource-${props.typeSlug}-${props.slug}`,
  async () => {
    const fetchStartTime = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const fetchContext = process.server ? 'SERVER' : process.client ? 'CLIENT' : 'UNKNOWN'
    console.log(`[SEO-TIMING] useAsyncData callback STARTED | Context: ${fetchContext} | Timestamp: ${fetchStartTime}ms | Slug: ${props.slug}`)
    
    if (!supabase) {
      console.log(`[SEO-TIMING] useAsyncData callback - Supabase not available | Context: ${fetchContext}`)
      return null
    }
    
    try {
      const data = await fetchResourceBySlug(props.slug, typeConfig.value.dbTypeSlug)
      const fetchEndTime = typeof performance !== 'undefined' ? performance.now() : Date.now()
      const fetchDuration = fetchEndTime - fetchStartTime
      console.log(`[SEO-TIMING] useAsyncData callback RESOLVED | Context: ${fetchContext} | Timestamp: ${fetchEndTime}ms | Duration: ${fetchDuration.toFixed(2)}ms | Data: ${data ? `Found resource "${data.name}" (ID: ${data.id})` : 'null'}`)
      return data
    } catch (error) {
      const fetchEndTime = typeof performance !== 'undefined' ? performance.now() : Date.now()
      console.error(`[SEO-TIMING] useAsyncData callback ERROR | Context: ${fetchContext} | Timestamp: ${fetchEndTime}ms | Error:`, error)
      return null
    }
  },
  {
    server: true,
    watch: [() => props.slug, () => props.typeSlug]
  }
)

const resource = computed(() => resourceData.value)

// Fetch use count server-side for structured data
// Note: Key must always be a string - use props for stability during navigation
const { data: useStatusData } = await useAsyncData(
  `use-status-detail-${props.typeSlug}-${props.slug}`,
  async () => {
    const useFetchStartTime = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const useFetchContext = process.server ? 'SERVER' : process.client ? 'CLIENT' : 'UNKNOWN'
    console.log(`[SEO-TIMING] useStatusData callback STARTED | Context: ${useFetchContext} | Timestamp: ${useFetchStartTime}ms | ResourceID: ${resourceData.value?.id || 'null'}`)
    
    if (!resourceData.value?.id) {
      console.log(`[SEO-TIMING] useStatusData callback - No resource ID, returning defaults | Context: ${useFetchContext}`)
      return { count: 0, isUsing: false }
    }
    try {
      const status = await getResourceUseStatus(resourceData.value.id)
      const useFetchEndTime = typeof performance !== 'undefined' ? performance.now() : Date.now()
      const useFetchDuration = useFetchEndTime - useFetchStartTime
      console.log(`[SEO-TIMING] useStatusData callback RESOLVED | Context: ${useFetchContext} | Timestamp: ${useFetchEndTime}ms | Duration: ${useFetchDuration.toFixed(2)}ms | Count: ${status.count} | IsUsing: ${status.isUsing}`)
      return status
    } catch (error) {
      const useFetchEndTime = typeof performance !== 'undefined' ? performance.now() : Date.now()
      console.error(`[SEO-TIMING] useStatusData callback ERROR | Context: ${useFetchContext} | Timestamp: ${useFetchEndTime}ms | Error:`, error)
      return { count: 0, isUsing: false }
    }
  },
  {
    server: true,
    watch: [() => resourceData.value?.id],
    default: () => ({ count: 0, isUsing: false })
  }
)

const useCount = computed(() => useStatusData.value?.count || 0)

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

// SEO meta tags and structured data - watch for changes
watch(() => [resource.value, useCount.value], ([newResource, count]) => {
  const watchContext = process.server ? 'SERVER' : process.client ? 'CLIENT' : 'UNKNOWN'
  const watchTime = typeof performance !== 'undefined' ? performance.now() : Date.now()
  
  if (!newResource) {
    console.log(`[SEO-TIMING] watch callback - No resource data available | Context: ${watchContext} | Timestamp: ${watchTime}ms`)
    return
  }
  
  // [SEO-TIMING] Before useHead - log what SEO values exist
  const seoTitle = `${newResource.name} - ${typeConfig.value.seoLabel}`
  const seoDescription = `${newResource.name} by ${newResource.creator}. ${newResource.price}. ${newResource.tags?.join(', ')}.`
  const seoUrl = `${siteUrl}${route.path}`
  const seoImage = newResource.image_url ? getImageUrl(newResource.image_url) : `${siteUrl}/img/og-image.jpg`
  
  console.log(`[SEO-TIMING] BEFORE useHead | Context: ${watchContext} | Timestamp: ${watchTime}ms`)
  console.log(`[SEO-TIMING] SEO values available:`, {
    title: seoTitle,
    description: seoDescription.substring(0, 60) + '...',
    url: seoUrl,
    image: seoImage,
    resourceName: newResource.name,
    resourceId: newResource.id,
    useCount: count,
    hasResourceData: !!newResource,
    hasUseCount: count > 0
  })
  
  // Structured data (JSON-LD) for rich snippets
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: newResource.name,
    description: `${newResource.name} by ${newResource.creator}. ${newResource.price}.`,
    applicationCategory: typeConfig.value.seoLabel,
    creator: {
      '@type': 'Person',
      name: newResource.creator
    },
    offers: {
      '@type': 'Offer',
      price: newResource.price,
      priceCurrency: 'USD'
    },
    image: seoImage,
    url: seoUrl
  }
  
  // Add aggregate rating if we have use counts
  if (count && count > 0) {
    structuredData.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: '4.5', // Could be calculated from actual ratings if available
      ratingCount: count.toString()
    }
  }
  
  const beforeUseHeadTime = typeof performance !== 'undefined' ? performance.now() : Date.now()
  console.log(`[SEO-TIMING] CALLING useHead | Context: ${watchContext} | Timestamp: ${beforeUseHeadTime}ms`)
  
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
    ],
    script: [
      {
        type: 'application/ld+json',
        children: JSON.stringify(structuredData)
      }
    ]
  })
  
  // [SEO-TIMING] After useHead - log confirmation
  const afterUseHeadTime = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const useHeadDuration = afterUseHeadTime - beforeUseHeadTime
  console.log(`[SEO-TIMING] AFTER useHead | Context: ${watchContext} | Timestamp: ${afterUseHeadTime}ms | Duration: ${useHeadDuration.toFixed(2)}ms | SEO tags set`)
}, { immediate: true })

/*
 * [SEO-TIMING] LOG ANALYSIS - What to look for in the logs:
 * 
 * ===== CRITICAL FINDING FROM CURRENT LOGS =====
 * All logs show "Context: CLIENT" - NO SERVER execution detected.
 * This means:
 * - Component is NOT running on server during SSR
 * - SEO meta tags are set via JavaScript after page load
 * - Search engines/crawlers will NOT see the SEO tags (they read initial HTML only)
 * - Social media bots will NOT see OG tags (they don't execute JavaScript)
 * 
 * ===== ROOT CAUSE =====
 * The navigation is client-side (SPA routing), not a direct page load.
 * When clicking a link from another page, Nuxt does client-side navigation
 * which skips SSR and runs everything on the client.
 * 
 * ===== HOW TO TEST SSR PROPERLY =====
 * 1. Open browser DevTools → Network tab
 * 2. Do a HARD REFRESH (Cmd+Shift+R / Ctrl+Shift+R) on /software/lala
 *    OR navigate directly to http://localhost:3000/software/lala in a new tab
 * 3. Check SERVER CONSOLE (terminal running `npm run dev`) for SERVER logs
 * 4. Check BROWSER CONSOLE for CLIENT logs (during hydration)
 * 
 * ===== EXPECTED BEHAVIOR FOR PROPER SSR =====
 * 1. SERVER console should show:
 *    - "Context: SERVER" logs first
 *    - useAsyncData resolving on SERVER
 *    - useHead executing on SERVER
 * 
 * 2. BROWSER console should show:
 *    - "Context: CLIENT" logs second (during hydration)
 *    - Data should already be available (no fetch needed)
 * 
 * ===== WHAT TO LOOK FOR =====
 * ✅ GOOD: "BEFORE useHead | Context: SERVER" with valid data
 *    → SEO tags ARE in the initial HTML
 * 
 * ❌ BAD: "BEFORE useHead | Context: CLIENT" only
 *    → SEO tags are set via JS, NOT in initial HTML
 *    → Current situation - needs fixing
 * 
 * ===== POTENTIAL FIXES =====
 * 1. Ensure SSR is enabled: nuxt.config.ts has `ssr: true` ✅ (already set)
 * 2. Check if route has `ssr: false` or is wrapped in `<ClientOnly>`
 * 3. For SSG/prerendering: ensure routes are being prerendered at build time
 * 4. Consider using `navigateTo` with `external: true` for critical SEO pages
 */

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.src = '/img/placeholder.png'
}

// Admin actions
const onEdit = () => {
  if (resource.value && handleEdit) {
    handleEdit(resource.value as Resource)
  }
}

const onDelete = async () => {
  if (!resource.value) return
  const ok = confirm('Are you sure you want to delete this resource?')
  if (!ok) return
  try {
    const success = await deleteResource(resource.value.id)
    if (success) {
      showSuccess('Resource deleted.')
      navigateTo(listPath.value)
    } else {
      showError('Failed to delete resource.')
    }
  } catch (e: any) {
    showError(e?.message || 'Failed to delete resource.')
  }
}

// [SEO-TIMING] onMounted - client-side hydration timing
onMounted(() => {
  const mountedTime = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const mountedContext = process.server ? 'SERVER' : process.client ? 'CLIENT' : 'UNKNOWN'
  console.log(`[SEO-TIMING] onMounted | Context: ${mountedContext} | Timestamp: ${mountedTime}ms | Route: ${window.location.pathname}`)
  console.log(`[SEO-TIMING] onMounted - Resource data available:`, {
    hasResource: !!resource.value,
    resourceName: resource.value?.name || 'null',
    resourceId: resource.value?.id || 'null',
    useCount: useCount.value,
    hasUseStatusData: !!useStatusData.value
  })
  
  // Check if SEO tags are in DOM
  if (typeof document !== 'undefined') {
    const title = document.querySelector('title')?.textContent
    const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content')
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content')
    const jsonLd = document.querySelector('script[type="application/ld+json"]')?.textContent
    
    console.log(`[SEO-TIMING] onMounted - DOM SEO state:`, {
      title,
      metaDescription: metaDescription?.substring(0, 60) + '...',
      ogTitle,
      hasJsonLd: !!jsonLd,
      jsonLdPreview: jsonLd ? JSON.parse(jsonLd)?.name : null
    })
  }
})
</script>

