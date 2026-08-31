# Nuxt 3 Minimal Starter

Look at the [Nuxt 3 documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install the dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm run dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm run build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm run preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Version History

- 0.0.0
  - Initial project scaffold
- 0.1.0
  - Tag system for resources
- 0.2.0
  - OS tags for resources
- 0.3.0
  - Filter and sort for resources
- 0.4.0
  - Primary navigation
- 0.5.0
  - Resource submission flow
- 0.6.0
  - Search keyboard shortcut
- 0.7.0
  - Pricing formatting with regex and hard filter on software
- 0.8.0
  - Mobile styles
- 0.9.0
  - User area UI
  - User logins and authentication
- 0.10.0
  - Admin roles and permissions
- 0.11.0
  - Google Analytics
- 0.12.0
  - SEO metadata and favicons
- 0.13.0
  - Rebuilt tagging system
  - Image drag and drop for submissions
- 0.14.0
  - User profiles
  - Creators table linking resources to creators
- 0.15.0
  - "I use this" feature with public use counts
- 0.16.0
  - Migrated data layer to Supabase with improved initialization and error handling
- 0.17.0
  - Dark mode
- 0.18.0
  - Enhanced search and cross-component communication
- 0.19.0
  - Resource management and editing
  - ManageSubmissions admin interface
- 0.20.0
  - MasterDrawer modal system
- 0.21.0
  - Custom price sorting
- 0.22.0
  - Upgraded project to Nuxt 4 structure
- 0.23.0
  - Music upload and editing
- 0.24.0
  - Collections management for tracks
- 0.25.0
  - Music player
- 0.26.0
  - Music metadata extraction and handling
- 0.27.0
  - Track version grouping with auto-hide for older versions
- 0.28.0
  - Authentication flow with email confirmation
- 0.29.0
  - Zero state with upload button for empty tracks table
- 0.30.0
  - Player shuffle and queue improvements
- 0.31.0
  - Track status management and filtering
- 0.32.0
  - Bulk selection and removal of tracks
- 0.33.0
  - Server-side rendering and SEO for user profiles, collections, and tracks
- 0.34.0
  - Software listing on user profile pages
- 0.35.0
  - Bio and social links on user profiles
- 0.36.0
  - Profile visibility settings and members section
- 0.37.0
  - Signup with user type selection and profile creation
- 0.38.0
  - Download sample functionality
- 0.39.0
  - SearchModal for site-wide search
- 0.40.0
  - Resource detail pages with comments
- 0.41.0
  - Software sidebar with scroll position management
- 0.42.0
  - Collection sharing and invitations
- 0.43.0
  - Account and collection settings
- 0.44.0
  - Filter and sort handlers for music pages
  - Clear All confirmation dialog
- 0.45.0
  - Track comments
- 0.46.0
  - PostHog analytics integration
- 0.47.0
  - Support feedback form with Notion integration
- 0.48.0
  - Daily Resend contact sync
- 0.49.0
  - Drag-and-drop upload with musical key extraction
- 0.50.0
  - "Latest Versions Only" filter for music tracks
- 0.51.0
  - Persisted filter and sort preferences for music tracks
- 0.52.0
  - Track versioning logic in uploads
  - Improved artwork handling in music components
- 0.53.0
  - Fixed software page canonical URLs for Google indexing
  - Added dynamic sitemap.xml
  - Added robots.txt with sitemap reference
- 0.54.0
  - Server-side rendering of software and kits list pages for crawlers
  - SEO metadata (title, description, canonical, Open Graph) on list pages
- 0.54.1
  - Fixed admin Manage Submissions empty queue when admin role loads after mount
- 0.55.0
  - Global shell loading orchestration: nav paints immediately, search and page skeletons until route ready, player defers until content reveals
- 0.55.1
  - Sticky actions column merged into track table grid rows for correct row alignment
- 0.55.2
  - Video generator falls back to CDN when local FFmpeg assets are missing on deploy
- 0.55.3
  - Resource detail pages (software/kits) always mount during SSR so crawlers get title, description, and canonical
  - Canonical URLs always use https://beatbox.studio (not www)
- 0.55.4
  - Fix video encoder hang by using ffmpeg's bundled worker instead of Vite's broken worker?url bundle
- 0.55.5
  - Fixed site search navigation to software/kit detail pages
  - Fixed 400 errors searching tracks and collections (removed invalid user_profiles join)
- 0.55.6
  - Added stored resource descriptions scraped from product link meta tags
  - Resource detail pages and SEO use description when available
  - Submit/Edit Resource drawer includes Description field with Pull from link
- 0.56.0
  - New music uploads route to Cloudflare R2 while existing tracks stay on Supabase
  - Added storage_provider on sounds and server presign APIs for R2 upload, playback, and delete
- 0.56.1
  - Resource descriptions fall back to OpenAI generation from product name and creator when link meta is missing
  - Backfill script uses meta scrape first, then AI generation for remaining resources
- 0.56.2
  - Fixed GA4 gtag stub so config and page views actually send to Google Analytics
- 0.56.3
  - Keep the bottom music player stable across navigations (session-sticky shell/player state)
  - Page skeletons no longer hide or reanimate global chrome; player visibility hydrates from saved state
  - Fix sidebar account block jumping by removing main height transitions and keeping player in the layout flex column
- 0.57.0
  - Anonymous homepage landing page for Beatbox as project management for music producers
  - Logged-in users still redirect to their library; software catalog linked as secondary CTA
- 0.57.1
  - Landing catalog section shows three latest software cards below the browse CTAs
- 0.57.2
  - Who it’s for section includes optimized Audio Pros and Creators photos beside each point
- 0.57.3
  - Homepage CTAs send PostHog `homepage_cta_clicked` with section and CTA id (hero, catalog, final_cta)
- 0.57.4
  - Capabilities section adds hero-style HTML close-ups for music library, collections, and status/feedback
- 0.57.5
  - Accept: text/markdown content negotiation for landing, resource detail, and producer library pages (curated markdown for agents)
- 0.57.6
  - Publish RFC 9727 API catalog at `/.well-known/api-catalog` with OpenAPI, docs, and health links
- 0.57.7
  - Homepage Link response headers for agent discovery (api-catalog, describedby, service-desc, service-doc)
- 0.57.8
  - Auth.md agent registration discovery with OAuth Protected Resource and Authorization Server metadata
- 0.57.9
  - Publish OpenID Connect discovery at `/.well-known/openid-configuration` (issuer, token, JWKS, grants)
- 0.57.10
  - Fix post-login homepage stuck on skeleton by redirecting when auth becomes ready mid-page
  - Declare MasterDrawer `close` emit so SubmitResource close listener is valid
- 0.57.11
  - Publish A2A Agent Card at `/.well-known/agent-card.json` for agent-to-agent discovery
- 0.57.12
  - Publish Agent Skills discovery index at `/.well-known/agent-skills/index.json` (v0.2.0)
- 0.57.13
  - Publish Web Bot Auth JWKS at `/.well-known/http-message-signatures-directory` with Ed25519 key and request signing helper
- 0.57.14
  - Register WebMCP tools on page load via navigator.modelContext (search, navigate, catalog, API discovery)
- 0.57.15
  - Add `npm run publish:dns-aid` to publish DNS-AID HTTPS records (`_index._agents`, `_a2a._agents`) via Cloudflare API
- 0.57.16
  - Fix R2 browser uploads: disable SDK flexible checksums on presigned PUTs and add `npm run r2:set-cors` / dashboard CORS for localhost + production origins
- 0.57.17
  - Fix collection list and detail meta titles (`{username}'s Collections`, `{name} Collection by {username}`)
- 0.57.18
  - Remove hardcoded R2 bucket name from `scripts/set-r2-cors.mjs` so Netlify secrets scan can pass
- 0.57.19
  - Cache-bust default OG/Twitter image URL and allow Twitterbot so X link previews can show the large card
- 0.57.20
  - Serve default OG/Twitter image from Netlify origin (bypass Cloudflare) as `/og.png` so X can fetch the card image
- 0.57.21
  - Host OG image on jsDelivr; strip invalid `Set-Cookie: undefined` and skip Accept negotiation for social bots
- 0.57.22
  - Hide homepage and library behind a full-viewport auth gate until session is known, then show the correct destination
- 0.61.0
  - Profile Collections strip (like Software) with per-collection “Show on Profile”
  - Library Settings drawer: panel first-view defaults (Bio/Collections/Software/Music) stored on the profile
  - Members management moved into Library Settings; removed from profile panel nav
- 0.60.1
  - Reload the player from the start when a new version of the currently playing track is uploaded or its audio file is replaced
- 0.60.0
  - Reuse artwork from the latest same-name track version on upload so new versions inherit the current cover without re-uploading
  - Shared artwork files are only deleted from storage when no other track or collection still references them
- 0.59.0
  - Move track and collection artwork to private Cloudflare R2 buckets with presigned upload and playback URLs
  - Add `artwork_provider` on sounds and collections; legacy Supabase artwork keeps working until backfill
  - New `ArtworkMedia` component, batch presign API, and `npm run backfill:artwork-to-r2` migration script
- 0.58.0
  - Collection cover art on index and detail headers (gray placeholder or uploaded image)
  - Upload, replace, or remove collection artwork in Collection Settings drawer
