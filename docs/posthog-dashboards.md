# PostHog Dashboard Setup

Create these four dashboards in your PostHog project after deploying with `NUXT_PUBLIC_POSTHOG_KEY` set.

## 1. SEO & Pre-signup Funnel

**Purpose:** Measure whether resource pages drive value before signup.

| Insight | Type | Configuration |
|---------|------|----------------|
| Visitor funnel | Funnel | `resource_detail_viewed` → `resource_i_use_this` (action=add) OR `signup_cta_clicked` → `signup_completed` |
| Resource detail views | Trends | Event `resource_detail_viewed`, breakdown by `category` |
| Search usage | Trends | Event `resource_search`, breakdown by `query` (top 20) |
| Signup from resources | Trends | `signup_cta_clicked` where `source_page` contains `/software` or `/kits` |
| Return visitors | Retention | First event `resource_detail_viewed`, return within 7 days |

## 2. Activation & Onboarding

**Purpose:** % of signups reaching persona-specific “aha” within 7 days.

| Insight | Type | Configuration |
|---------|------|----------------|
| Signup funnel | Funnel (7d) | `signup_completed` → `email_confirmed` → split by `user_type` person property |
| Audio pro activation | Funnel (7d) | `signup_completed` (user_type=audio_pro) → `track_uploaded` → (`collection_invite_sent` OR `profile_member_invited` OR `track_play_qualified` where is_own_track=false on owner's tracks — use external play proxy) |
| Creator activation | Funnel (7d) | `signup_completed` (user_type=creator) → `track_played` (is_own_track=false) → `shortlist_added` |
| Time to first upload | Trends | From `signup_completed` to first `track_uploaded` (use PostHog paths or SQL) |
| Time to first shortlist | Trends | From `signup_completed` to first `shortlist_added` |

## 3. Engagement & Retention

**Purpose:** Are users coming back and using core features?

| Insight | Type | Configuration |
|---------|------|----------------|
| WAU by user type | Trends | Any event, weekly, breakdown `user_type` person property |
| D1 / D7 / D30 retention | Retention | Cohort from `signup_completed`, return = any event |
| Stickiness | Formula | DAU / WAU |
| Feature adoption | Trends | Weekly unique users for: `shortlist_added`, `track_comment_created`, `collection_invite_sent`, `track_uploaded` |

## 4. Value Outcomes (Marketplace Health)

**Purpose:** Two-sided marketplace balance and sharing effectiveness.

| Insight | Type | Configuration |
|---------|------|----------------|
| Qualified plays | Trends | `track_play_qualified` where `is_own_track=false`, weekly |
| Shortlist activity | Trends | `shortlist_added`, weekly unique users |
| Invite conversion | Funnel | `collection_invite_link_copied` OR `collection_invite_sent` → `collection_invite_accepted` |
| Comments density | Trends | `track_comment_created` count per week |
| Analytics engagement | Trends | `analytics_mode_toggled` where `enabled=true` (audio pros checking outcomes) |
| Creator vs audio pro activity | Trends | Compare WAU with person `user_type` = creator vs audio_pro |

## Person properties (set on identify)

- `user_type`: `creator` | `audio_pro`
- `username`
- `signup_date`

## Event reference

See [`app/types/analytics.ts`](../app/types/analytics.ts) for the full typed event catalog.

## Notes

- Per-track play counts for audio pro dashboards remain in Supabase (`get_track_analytics`), not PostHog.
- `track_play_qualified` fires once per listen session when playback reaches 3 seconds (aligned with `track_listen_sessions`).
- PostHog is disabled when `NUXT_PUBLIC_POSTHOG_KEY` is unset (safe for local dev).
