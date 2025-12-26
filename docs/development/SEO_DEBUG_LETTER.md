# Letter to ChatGPT: SEO Meta Tags Not Appearing in Social/SMS Link Previews

## Problem Statement

We're experiencing an issue where dynamic SEO meta tags (Open Graph, Twitter Cards, etc.) are not appearing in social media and SMS link previews (iMessage, Twitter/X, Facebook, Slack, etc.). When we share a profile URL like `https://beatbox.studio/u/madebyporter`, the preview shows default meta tags from `nuxt.config.ts` instead of the dynamic profile-specific meta tags.

## Current Setup

### Tech Stack
- **Framework**: Nuxt 3 with SSR enabled (`ssr: true` in `nuxt.config.ts`)
- **Hosting**: Netlify (using Nitro preset)
- **Database**: Supabase (PostgreSQL)

### Current Implementation

We have a dynamic route at `/app/pages/u/[id].vue` that displays user profiles. Here's how we're currently handling SEO:

1. **Data Fetching**: We use `useAsyncData` with `server: true` to fetch profile data during SSR:
   ```typescript
   const { data: initialData } = await useAsyncData(
     `profile-${route.params.id}`,
     async () => {
       // Fetches profile data from Supabase
       // Returns: { profile: {...}, tracks: [...] }
     },
     {
       server: true // Ensure this runs on the server for SSR
     }
   )
   ```

2. **SEO Meta Tags**: We use `useSeoMeta` with computed values that reference the fetched data:
   ```typescript
   const seoTitle = computed(() => {
     const profileForSEO = initialData.value?.profile
     const name = profileForSEO?.display_name || profileForSEO?.username || profileName.value || route.params.id
     return name ? `${name}'s Music Library` : 'Music Library'
   })

   useSeoMeta({
     title: seoTitle,
     description: seoDescription,
     ogTitle: seoTitle,
     ogDescription: seoDescription,
     ogUrl: seoUrl,
     ogType: 'profile',
     ogImage: `${siteUrl}/img/og-image.jpg`,
     // ... other meta tags
   })
   ```

3. **Canonical URL**: We use `useHead` for the canonical link:
   ```typescript
   useHead({
     link: [
       { rel: 'canonical', href: seoUrl }
     ]
   })
   ```

4. **Default Meta Tags**: In `nuxt.config.ts`, we have default meta tags:
   ```typescript
   app: {
     head: {
       titleTemplate: '%s | Beatbox',
       title: 'Beatbox - A curated collection of music production tools.',
       meta: [
         { name: 'description', content: 'Beatbox - A curated collection...' },
         { property: 'og:type', content: 'website' },
         // ... other defaults
       ],
       link: [
         { rel: 'canonical', href: 'https://beatbox.studio' },
       ]
     }
   }
   ```

## The Issue

Based on analysis, we understand that:

1. **Social/SMS bots only read the raw HTML response** - they don't execute JavaScript or wait for client-side hydration
2. **We're seeing a "flash" of default meta tags** - the browser shows correct meta after hydration, but "View Source" shows defaults
3. **This indicates SSR is not producing the dynamic head snapshot** - the server-rendered HTML contains default meta tags instead of profile-specific ones

## What We Need Help With

Even though we're using:
- `useAsyncData` with `server: true` 
- `await` on the data fetch
- `useSeoMeta` with computed values that reference `initialData.value`
- SSR enabled in Nuxt config

The meta tags are still not appearing in the SSR HTML. We need to understand:

1. **Is the data actually available during SSR render?** - How can we verify that `initialData.value` is populated when `useSeoMeta` is called during the server render pass?

2. **Are the computed values being evaluated during SSR?** - Since we're using computed refs that reference `initialData.value`, is there a timing issue where the computed evaluates before the data is available?

3. **Should we use `useServerSeoMeta` instead?** - We've seen references to `useServerSeoMeta` in Nuxt docs. Is this what we need for dynamic routes?

4. **Is there a blocking/awaiting issue?** - Even though we `await` the `useAsyncData`, is there something preventing the SSR render from waiting for the meta tags to be set?

5. **Could this be a Netlify/Nitro caching issue?** - Could the CDN be serving cached HTML that doesn't have the dynamic meta tags?

## What We've Already Fixed

- ✅ Canonical URL is now hardcoded to `https://beatbox.studio` (was using environment variable that pointed to Netlify preview URL)
- ✅ We have `server: true` on `useAsyncData`
- ✅ We're using `await` on the data fetch

## What We Need

We need a solution that ensures:
1. Profile data is fetched and available during SSR
2. Meta tags are computed and set during the SSR render pass (not after)
3. The raw HTML response (what bots see) contains the correct dynamic meta tags
4 This works on Netlify with Nitro

Please help us identify what's missing or misconfigured in our current setup that's preventing the dynamic meta tags from appearing in the SSR HTML response.

