<template>
  <!-- Logged-in users redirect to library; keep shell quiet while navigating -->
  <PageContentSkeleton v-if="user" />

  <div
    v-else
    ref="landingRoot"
    class="col-span-full max-w-full lg:max-w-none flex flex-col text-neutral-300"
  >
    <!-- Hero: one composition -->
    <section class="relative min-h-[calc(100dvh-3.5rem)] flex flex-col justify-end overflow-hidden border-b border-neutral-800">
      <!-- Full-bleed product visual plane -->
      <div
        class="absolute inset-0 pointer-events-none select-none"
        aria-hidden="true"
      >
        <div class="absolute inset-0 bg-neutral-950" />
        <div
          class="absolute inset-0 opacity-[0.55]"
          style="background:
            radial-gradient(ellipse 80% 50% at 70% 40%, rgba(229, 40, 0, 0.18), transparent 55%),
            radial-gradient(ellipse 60% 40% at 20% 80%, rgba(230, 153, 1, 0.12), transparent 50%);"
        />
        <div
          ref="heroVisual"
          class="absolute inset-x-0 top-[12%] bottom-0 px-2 sm:px-4 lg:px-8 flex items-start justify-center"
        >
          <div class="w-full max-w-5xl border border-neutral-800 bg-neutral-900/90 shadow-2xl shadow-black/40 overflow-hidden">
            <div class="flex items-center justify-between gap-4 px-3 py-2 border-b border-neutral-800 bg-neutral-900">
              <div class="text-sm font-semibold text-white">All Music</div>
              <div class="text-xs text-neutral-500 uppercase tracking-wider">12 tracks</div>
            </div>
            <div class="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_72px_88px] gap-0 text-xs text-neutral-500 border-b border-neutral-800 px-3 py-2">
              <span>Title</span>
              <span class="hidden sm:block">Collection</span>
              <span>Key</span>
              <span>Status</span>
            </div>
            <div
              v-for="(row, i) in heroRows"
              :key="i"
              class="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_72px_88px] gap-0 items-center px-3 py-3 border-b border-neutral-800/80 text-sm"
              :class="i === 1 ? 'bg-neutral-800/40' : ''"
            >
              <div class="flex items-center gap-2 min-w-0">
                <div
                  class="size-8 shrink-0 rounded-sm"
                  :style="{ background: row.swatch }"
                />
                <div class="min-w-0">
                  <div class="truncate text-neutral-100">{{ row.title }}</div>
                  <div class="truncate text-xs text-neutral-500">{{ row.version }}</div>
                </div>
              </div>
              <span class="hidden sm:block truncate text-neutral-400">{{ row.collection }}</span>
              <span class="text-neutral-400">{{ row.key }}</span>
              <span class="tag w-fit !normal-case">{{ row.status }}</span>
            </div>
          </div>
        </div>
        <div class="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-neutral-900 via-neutral-900/90 to-transparent" />
      </div>

      <div class="relative z-10 flex flex-col gap-6 p-4 sm:p-6 lg:p-10 max-w-3xl">
        <div ref="heroBrand" class="flex items-center gap-3">
          <img src="~/assets/img/bbx-logo.svg" alt="" class="size-12 sm:size-14" width="56" height="56" />
          <span class="text-3xl sm:text-5xl font-bold tracking-tight text-white">Beatbox</span>
        </div>
        <div ref="heroCopy" class="flex flex-col gap-3">
          <h1 class="text-2xl sm:text-4xl font-bold text-white leading-tight">
            Project management for music producers.
          </h1>
          <p class="text-base sm:text-lg text-neutral-300 max-w-xl">
            Keep every bounce, version, and collection in one studio workspace — then share it for feedback.
          </p>
        </div>
        <div ref="heroCtas" class="flex flex-wrap items-center gap-3">
          <Button @click="onHeroSignup">Create free account</Button>
          <Button variant="secondary" @click="onHeroSignin">Sign in</Button>
          <NuxtLink
            to="/software"
            class="text-link text-sm no-underline ml-1"
            @click="trackHomepageCta('hero', 'browse_tools', { destination: '/software' })"
          >
            Browse tools
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="border-b border-neutral-800 px-4 sm:px-6 lg:px-10 py-16 sm:py-20">
      <div class="max-w-3xl flex flex-col gap-2 mb-10">
        <h2 ref="howHeading" class="text-xl sm:text-2xl font-bold text-white">
          From bounce to shared collection
        </h2>
        <p class="text-neutral-400">
          A simple workflow for finishing and delivering music.
        </p>
      </div>
      <ol class="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 max-w-5xl list-none p-0 m-0">
        <li
          v-for="(step, i) in howSteps"
          :key="step.title"
          ref="howStepsEls"
          class="flex flex-col gap-2"
        >
          <span class="text-xs uppercase tracking-wider text-amber-500/90">{{ String(i + 1).padStart(2, '0') }}</span>
          <h3 class="text-lg font-semibold text-white">{{ step.title }}</h3>
          <p class="text-sm text-neutral-400 leading-relaxed">{{ step.body }}</p>
        </li>
      </ol>
    </section>

    <!-- Capabilities -->
    <section class="border-b border-neutral-800 px-4 sm:px-6 lg:px-10 py-16 sm:py-20">
      <div class="max-w-3xl flex flex-col gap-2 mb-10">
        <h2 class="text-xl sm:text-2xl font-bold text-white">
          Built for how producers actually work
        </h2>
        <p class="text-neutral-400">
          Library ops without the spreadsheet chaos.
        </p>
      </div>
      <div class="flex flex-col gap-10 max-w-3xl">
        <div
          v-for="cap in capabilities"
          :key="cap.title"
          class="flex flex-col gap-2 border-t border-neutral-800 pt-6"
        >
          <h3 class="text-lg font-semibold text-white">{{ cap.title }}</h3>
          <p class="text-sm text-neutral-400 leading-relaxed">{{ cap.body }}</p>
        </div>
      </div>
    </section>

    <!-- Who it's for -->
    <section class="border-b border-neutral-800 px-4 sm:px-6 lg:px-10 py-16 sm:py-20">
      <div class="max-w-3xl flex flex-col gap-2 mb-10">
        <h2 class="text-xl sm:text-2xl font-bold text-white">Who it’s for</h2>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-5xl">
        <div class="flex flex-row gap-4 items-start min-w-0">
          <picture class="shrink-0 size-20 sm:size-24 rounded-md overflow-hidden bg-neutral-900">
            <source :srcset="imgAudioProsWebp" type="image/webp" />
            <img
              :src="imgAudioProsJpg"
              alt="Audio professional mixing in a studio"
              class="size-full object-cover"
              width="640"
              height="640"
              loading="lazy"
              decoding="async"
            />
          </picture>
          <div class="flex flex-col gap-2 min-w-0">
            <h3 class="text-lg font-semibold text-white">Audio Pros</h3>
            <p class="text-sm text-neutral-400 leading-relaxed">
              Producers and engineers who need statuses, versions, analytics, and a library built to ship.
            </p>
          </div>
        </div>
        <div class="flex flex-row gap-4 items-start min-w-0">
          <picture class="shrink-0 size-20 sm:size-24 rounded-md overflow-hidden bg-neutral-900">
            <source :srcset="imgCreatorsWebp" type="image/webp" />
            <img
              :src="imgCreatorsJpg"
              alt="Creator in a home studio with headphones"
              class="size-full object-cover"
              width="640"
              height="640"
              loading="lazy"
              decoding="async"
            />
          </picture>
          <div class="flex flex-col gap-2 min-w-0">
            <h3 class="text-lg font-semibold text-white">Creators</h3>
            <p class="text-sm text-neutral-400 leading-relaxed">
              Artists and writers who want a lighter home for music and feedback.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Tools catalog (secondary) -->
    <section class="border-b border-neutral-800 px-4 sm:px-6 lg:px-10 py-16 sm:py-20">
      <div class="max-w-3xl flex flex-col gap-4">
        <h2 class="text-xl sm:text-2xl font-bold text-white">
          Plus a curated catalog of production tools
        </h2>
        <p class="text-neutral-400 leading-relaxed">
          DAWs, plugins, and kits producers actually use — mark what you use and show it on your profile.
        </p>
        <div class="flex flex-wrap gap-3">
          <NuxtLink
            to="/software"
            @click="trackHomepageCta('catalog', 'browse_software', { destination: '/software' })"
          >
            <Button variant="secondary">Browse software</Button>
          </NuxtLink>
          <NuxtLink
            to="/kits"
            @click="trackHomepageCta('catalog', 'browse_kits', { destination: '/kits' })"
          >
            <Button variant="ghost">Sounds &amp; kits</Button>
          </NuxtLink>
        </div>
      </div>

      <!-- Latest software cards (DatabaseGrid card pattern, read-only) -->
      <div
        v-if="latestSoftware.length > 0"
        class="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-2"
      >
        <NuxtLink
          v-for="resource in latestSoftware"
          :key="resource.id"
          :to="`/software/${resource.slug}`"
          class="bg-neutral-800/20 hover:bg-neutral-800/50 p-4 relative rounded-lg flex flex-col justify-between gap-4  transition-colors min-w-0"
          @click="trackHomepageCta('catalog', 'software_card', {
            destination: `/software/${resource.slug}`,
            resource_id: resource.id,
            resource_slug: resource.slug,
          })"
        >
          <div class="w-full h-full rounded-md overflow-hidden flex items-end grow">
            <img
              v-if="resource.image_url"
              :src="resourceImageUrl(resource.image_url)"
              :alt="resource.name"
              class="w-full h-auto object-cover"
              @error="onResourceImageError"
            />
          </div>
          <div class="flex flex-col gap-2">
            <div class="flex flex-col gap-0">
              <h3 class="text-lg font-medium text-white truncate">{{ resource.name }}</h3>
              <div class="flex items-center gap-2 text-sm text-neutral-400">
                <span class="truncate">{{ resource.creator }}</span>
                <span v-if="resource.price">•</span>
                <span v-if="resource.price" class="shrink-0">{{ resource.price }}</span>
              </div>
            </div>
            <div v-if="resource.tags.length" class="flex flex-wrap gap-2">
              <span v-for="tag in resource.tags.slice(0, 3)" :key="tag" class="tag">
                {{ tag }}
              </span>
            </div>
          </div>
          
        </NuxtLink>
      </div>
    </section>

    <!-- Final CTA -->
    <section
      ref="finalCta"
      class="px-4 sm:px-6 lg:px-10 py-20 sm:py-24 flex flex-col gap-6 max-w-3xl"
    >
      <div class="flex items-center gap-3">
        <img src="~/assets/img/bbx-logo.svg" alt="" class="size-10" width="40" height="40" />
        <span class="text-2xl font-bold text-white">Beatbox</span>
      </div>
      <h2 class="text-xl sm:text-2xl font-bold text-white">
        Start organizing your studio
      </h2>
      <p class="text-neutral-400">
        Project management for music producers — free to start.
      </p>
      <div>
        <Button @click="onFinalSignup">Create free account</Button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onMounted, ref, watch } from 'vue'
import { navigateTo } from '#app'
import gsap from 'gsap'
import Button from '~/components/Button.vue'
import PageContentSkeleton from '~/components/PageContentSkeleton.vue'
import { useAuth } from '~/composables/useAuth'
import { useAnalytics } from '~/composables/useAnalytics'
import { usePageShellReady } from '~/composables/usePageShellReady'
import { useSupabase } from '~/utils/supabase'
import {
  fetchLatestApprovedResources,
  type Resource,
} from '~/utils/resourceQueries'
import type { HomepageCtaId, HomepageCtaSection } from '~/types/analytics'
import imgAudioProsWebp from '~/assets/img/landing/who-audio-pros.webp'
import imgAudioProsJpg from '~/assets/img/landing/who-audio-pros.jpg'
import imgCreatorsWebp from '~/assets/img/landing/who-creators.webp'
import imgCreatorsJpg from '~/assets/img/landing/who-creators.jpg'

const { user, isReady, init } = useAuth()
const { capture } = useAnalytics()
const { supabase } = useSupabase()
const username = ref<string | null>(null)
const latestSoftware = ref<Resource[]>([])

const openAuthModal = inject<(mode?: 'signin' | 'signup' | 'forgot') => void>('openAuthModal', () => {})

const heroBrand = ref<HTMLElement | null>(null)
const heroCopy = ref<HTMLElement | null>(null)
const heroCtas = ref<HTMLElement | null>(null)
const heroVisual = ref<HTMLElement | null>(null)
const howHeading = ref<HTMLElement | null>(null)
const howStepsEls = ref<HTMLElement[]>([])
const finalCta = ref<HTMLElement | null>(null)

/** Shell ready for anon landing immediately; logged-in users stay in loading until redirect */
const pageShellReady = computed(() => !user.value)
usePageShellReady(pageShellReady)

const trackHomepageCta = (
  section: HomepageCtaSection,
  cta: HomepageCtaId,
  extras?: {
    destination?: string
    resource_id?: number
    resource_slug?: string
  }
) => {
  capture('homepage_cta_clicked', {
    section,
    cta,
    ...(extras?.destination ? { destination: extras.destination } : {}),
    ...(extras?.resource_id != null ? { resource_id: extras.resource_id } : {}),
    ...(extras?.resource_slug ? { resource_slug: extras.resource_slug } : {}),
  })
}

const openSignupFrom = (section: HomepageCtaSection) => {
  trackHomepageCta(section, 'create_account')
  capture('signup_cta_clicked', {
    source_page: '/',
    source_section: section,
    cta: 'create_account',
  })
  openAuthModal('signup')
}

const openSigninFrom = (section: HomepageCtaSection) => {
  trackHomepageCta(section, 'sign_in')
  openAuthModal('signin')
}

const onHeroSignup = () => openSignupFrom('hero')
const onHeroSignin = () => openSigninFrom('hero')
const onFinalSignup = () => openSignupFrom('final_cta')

const resourceImageUrl = (url: string) =>
  url.startsWith('http') ? url : `https://storage.googleapis.com/bbx-resources/${url}`

const onResourceImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.src = '/img/db/placeholder.png'
}

const loadLatestSoftware = async () => {
  latestSoftware.value = await fetchLatestApprovedResources('software', 3)
}

const siteOrigin = useSiteOrigin()
const seoTitle = 'Project management for music producers'
const seoDescription =
  'Beatbox is project management for music producers — organize tracks, version bounces, share collections for feedback, plus a curated catalog of production tools.'

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: `${seoTitle} | Beatbox`,
  ogDescription: seoDescription,
  ogUrl: siteOrigin,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: `${seoTitle} | Beatbox`,
  twitterDescription: seoDescription,
})

useHead({
  link: [{ rel: 'canonical', href: siteOrigin, key: 'canonical' }],
})

const heroRows = [
  {
    title: 'Night Drive — Final',
    version: 'v3',
    collection: 'EP Masters',
    key: 'Am',
    status: 'Done',
    swatch: 'linear-gradient(135deg, #E52800, #E69901)',
  },
  {
    title: 'Night Drive — Vocal Up',
    version: 'v2',
    collection: 'EP Masters',
    key: 'Am',
    status: 'Review',
    swatch: 'linear-gradient(135deg, #E67300, #E6B85B)',
  },
  {
    title: 'Low End Sketch',
    version: 'v1',
    collection: 'Ideas',
    key: 'F#m',
    status: 'WIP',
    swatch: 'linear-gradient(135deg, #404040, #737373)',
  },
  {
    title: 'Club Edit 132',
    version: 'v4',
    collection: 'Client A',
    key: 'Gm',
    status: 'Sent',
    swatch: 'linear-gradient(135deg, #E53A17, #E69544)',
  },
]

const howSteps = [
  {
    title: 'Collect',
    body: 'Upload tracks into your library with the metadata you already care about.',
  },
  {
    title: 'Organize',
    body: 'Group versions, build collections, and set status so nothing gets lost mid-project.',
  },
  {
    title: 'Share',
    body: 'Invite collaborators or send a collection link when it’s ready for ears.',
  },
]

const capabilities = [
  {
    title: 'Music library',
    body: 'Filter, sort, and play your catalog in one place — built like a studio tool, not a generic file dump.',
  },
  {
    title: 'Collections & versions',
    body: 'Keep every bounce of a track together, focus on latest versions, and ship collections that actually make sense.',
  },
  {
    title: 'Status & feedback',
    body: 'Mark what’s WIP, in review, or done — then gather comments without losing the thread.',
  },
]

const fetchUsername = async () => {
  if (!user.value || !supabase) {
    username.value = null
    return
  }

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('id', user.value.id)
      .maybeSingle()

    if (data && !error) {
      username.value = data.username as string
    } else {
      username.value = null
    }
  } catch {
    username.value = null
  }
}

const redirectLoggedInUser = async () => {
  await fetchUsername()
  if (username.value) {
    await navigateTo(`/u/${username.value}`, { replace: true })
  } else if (user.value) {
    await navigateTo(`/u/${user.value.id}`, { replace: true })
  }
}

const runEntranceMotion = async () => {
  await nextTick()
  if (!import.meta.client || user.value) return

  const brand = heroBrand.value
  const copy = heroCopy.value
  const ctas = heroCtas.value
  const visual = heroVisual.value

  if (brand && copy && ctas) {
    gsap.set([brand, copy, ctas], { opacity: 0, y: 16 })
    if (visual) gsap.set(visual, { opacity: 0, y: 24 })

    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
    tl.to(brand, { opacity: 1, y: 0, duration: 0.45 })
      .to(copy, { opacity: 1, y: 0, duration: 0.45 }, '-=0.25')
      .to(ctas, { opacity: 1, y: 0, duration: 0.4 }, '-=0.2')
    if (visual) {
      tl.to(visual, { opacity: 1, y: 0, duration: 0.7 }, '-=0.35')
    }
  }

  const steps = howStepsEls.value
  if (howHeading.value && steps.length) {
    gsap.set([howHeading.value, ...steps], { opacity: 0, y: 20 })
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          gsap.to(howHeading.value, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' })
          gsap.to(steps, {
            opacity: 1,
            y: 0,
            duration: 0.45,
            stagger: 0.1,
            ease: 'power2.out',
          })
          observer.disconnect()
        }
      },
      { threshold: 0.25 }
    )
    observer.observe(howHeading.value)
  }

  if (finalCta.value) {
    gsap.set(finalCta.value, { opacity: 0, y: 16 })
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          gsap.to(finalCta.value, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' })
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(finalCta.value)
  }
}

onMounted(async () => {
  await init()
  if (user.value) {
    await redirectLoggedInUser()
    return
  }
  await Promise.all([loadLatestSoftware(), runEntranceMotion()])
})

watch(isReady, async (ready) => {
  if (!ready) return
  if (user.value) {
    await redirectLoggedInUser()
  }
})
</script>
