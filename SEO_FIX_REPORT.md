# SEO Meta Tags Fix - Diagnosis Report & Validation

## Issue Summary
Social/SMS link previews were showing default meta tags from `nuxt.config.ts` instead of dynamic profile-specific meta tags for routes like `/u/madebyporter`.

## Root Cause Analysis

### Primary Issue: Duplicate Meta Tags + SSR Timing
1. **Duplicate meta tags**: `nuxt.config.ts` had global defaults for:
   - `description` - conflicted with page-specific descriptions
   - `og:title` / `og:description` - not set globally but would conflict if added
   - `canonical` URL - hardcoded to `https://beatbox.studio` for all pages (WRONG for dynamic routes)

2. **Computed refs timing**: Using `computed()` refs in `useSeoMeta` could evaluate before `initialData` was fully available during SSR, causing meta tags to use fallback values.

3. **Missing deduplication keys**: Meta tags from `nuxt.config.ts` and page-level `useSeoMeta` were not properly deduplicated, potentially causing bots to see the first (default) occurrence.

## Fixes Applied

### 1. Fixed `app/pages/u/[id].vue`
**Changes:**
- ✅ Changed from `computed()` refs to plain strings computed AFTER `await useAsyncData`
- ✅ Added server-side logging to verify data availability during SSR
- ✅ Added `key: 'canonical'` to canonical link for proper deduplication

**Before:**
```typescript
const seoTitle = computed(() => { ... })
useSeoMeta({ title: seoTitle, ... })
```

**After:**
```typescript
// Compute as plain strings after data is available
const seoTitle = name ? `${name}'s Music Library` : 'Music Library'
useSeoMeta({ title: seoTitle, ... })
```

### 2. Fixed `nuxt.config.ts`
**Changes:**
- ✅ Removed global `description` meta tag (pages must set their own)
- ✅ Removed global `canonical` link (must be per-route)
- ✅ Added `key: 'og-image'` and `key: 'twitter-image'` to allow page-level overrides
- ✅ Kept only truly global invariants (charset, viewport, theme-color, og:site_name, twitter:card)

**Removed:**
- `{ name: 'description', ... }` - causes duplicates
- `{ rel: 'canonical', href: 'https://beatbox.studio' }` - wrong for dynamic routes

**Kept with keys:**
- `og:image` with `key: 'og-image'` - allows pages to override
- `twitter:image` with `key: 'twitter-image'` - allows pages to override

## Validation Checklist

### Phase 1: Verify Raw HTML (What Bots See)

1. **Run diagnosis script:**
   ```bash
   node scripts/diagnose-seo.js https://beatbox.studio/u/madebyporter
   ```

2. **Check output for:**
   - ✅ Exactly 1 `<title>` tag
   - ✅ Exactly 1 `<meta name="description">`
   - ✅ Exactly 1 `<meta property="og:title">`
   - ✅ Exactly 1 `<meta property="og:description">`
   - ✅ Exactly 1 `<meta property="og:image">`
   - ✅ Exactly 1 `<meta name="twitter:title">`
   - ✅ Exactly 1 `<meta name="twitter:description">`
   - ✅ Exactly 1 `<link rel="canonical">`
   - ✅ No duplicate tags
   - ✅ Values are dynamic (contain profile name, not defaults)

3. **View Source in browser:**
   - Right-click → "View Page Source"
   - Search for `<title>` - should show profile-specific title
   - Search for `og:title` - should show profile-specific OG title
   - Search for `canonical` - should show profile-specific URL

### Phase 2: Verify SSR Logs

1. **Check server logs during build/SSR:**
   ```bash
   npm run build
   # or
   npm run dev
   ```

2. **Look for:**
   ```
   [SSR SEO] Profile data fetched: { hasData: true, username: 'madebyporter', ... }
   [SSR SEO] Setting meta tags: { title: "Made by Porter's Music Library", ... }
   ```

3. **If logs show `hasData: false` or default values:**
   - Data fetch is not completing before meta tags are set
   - Check Supabase connection during SSR
   - Verify `server: true` is set on `useAsyncData`

### Phase 3: Test with Bot User Agents

1. **Test with curl (simulates bot):**
   ```bash
   curl -A "facebookexternalhit/1.1" https://beatbox.studio/u/madebyporter | grep -i "og:title"
   ```

2. **Expected output:**
   ```html
   <meta property="og:title" content="Made by Porter's Music Library">
   ```

3. **Test with Twitter bot:**
   ```bash
   curl -A "Twitterbot/1.0" https://beatbox.studio/u/madebyporter | grep -i "twitter:title"
   ```

## Files Changed

1. **`app/pages/u/[id].vue`**
   - Changed SEO computation from computed refs to plain strings
   - Added server-side logging
   - Added canonical key for deduplication

2. **`nuxt.config.ts`**
   - Removed conflicting global meta tags
   - Removed global canonical URL
   - Added keys to og:image and twitter:image for override support

3. **`scripts/diagnose-seo.js`** (NEW)
   - Raw HTML fetcher and analyzer
   - Detects duplicates and missing tags
   - Generates diagnosis reports

## Testing Commands

```bash
# Diagnose a specific profile URL
node scripts/diagnose-seo.js https://beatbox.studio/u/madebyporter

# Compare two different profiles (should have different meta)
node scripts/diagnose-seo.js https://beatbox.studio/u/madebyporter > profile1.txt
node scripts/diagnose-seo.js https://beatbox.studio/u/another-user > profile2.txt
diff profile1.txt profile2.txt

# Test with Facebook bot
curl -A "facebookexternalhit/1.1" https://beatbox.studio/u/madebyporter > bot-response.html
grep -i "og:title" bot-response.html

# Test with Twitter bot
curl -A "Twitterbot/1.0" https://beatbox.studio/u/madebyporter > twitter-response.html
grep -i "twitter:title" twitter-response.html
```

## Expected Results After Fix

✅ **Raw HTML contains:**
- Single `<title>`: `Made by Porter's Music Library | Beatbox`
- Single `<meta name="description">`: `Explore Made by Porter's music collection...`
- Single `<meta property="og:title">`: `Made by Porter's Music Library`
- Single `<meta property="og:description">`: Dynamic description
- Single `<link rel="canonical">`: `https://beatbox.studio/u/madebyporter`
- All values are profile-specific, not defaults

✅ **Social media previews show:**
- Correct profile name in title
- Correct description
- Correct canonical URL
- Profile-specific OG image (if custom images are added later)

## Notes

- The fix uses plain strings instead of computed refs to ensure SSR has correct values
- Global defaults in `nuxt.config.ts` are minimized to prevent conflicts
- Keys are used for deduplication where needed (canonical, og:image, twitter:image)
- Server-side logging helps diagnose SSR timing issues

## Next Steps (If Issues Persist)

1. **If duplicates still appear:**
   - Check if other pages/components are also setting meta tags
   - Verify Unhead deduplication is working (check Nuxt version)
   - Consider using `useServerSeoMeta` instead of `useSeoMeta`

2. **If defaults still show:**
   - Verify `useAsyncData` is actually running on server (check logs)
   - Check Netlify/Nitro caching - may need to clear cache
   - Verify route is not being served as static fallback

3. **If data is missing:**
   - Check Supabase connection during SSR
   - Verify environment variables are set correctly
   - Check server logs for database errors

