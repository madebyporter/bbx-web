export type AnalyticsUserType = 'creator' | 'audio_pro'

export type ResourceCategory = 'software' | 'kits'

export type PlaybackSource = 'library' | 'collection' | 'track_page'

export type TrackCommentContext = 'library' | 'collection'

export type CollectionInviteMethod = 'link' | 'user_search'

export type ResourceIUseThisAction = 'add' | 'remove'

export type AnalyticsPage =
  | 'profile'
  | 'collection'
  | 'software'
  | 'kits'
  | 'resource_detail'
  | 'homepage'
  | 'other'

export type HomepageCtaSection = 'hero' | 'catalog' | 'final_cta' | 'pricing'

export type HomepageCtaId =
  | 'create_account'
  | 'sign_in'
  | 'browse_tools'
  | 'browse_software'
  | 'browse_kits'
  | 'software_card'
  | 'signup_free'
  | 'signup_paid'

export type PricingSource = 'landing' | 'pricing_page' | 'auth_modal'

export type CheckoutContext = 'signup' | 'pricing' | 'upgrade'

export type AuthModalStep = 'plan' | 'signup' | 'signin' | 'forgot'

/** PostHog event names — snake_case object_action convention */
export type AnalyticsEventName =
  | 'signup_started'
  | 'signup_completed'
  | 'email_confirmed'
  | 'login_completed'
  | 'user_type_selected'
  | 'resource_search'
  | 'resource_filter_applied'
  | 'resource_detail_viewed'
  | 'resource_i_use_this'
  | 'resource_comment_created'
  | 'resource_submitted'
  | 'signup_cta_clicked'
  | 'homepage_cta_clicked'
  | 'track_uploaded'
  | 'track_played'
  | 'track_play_qualified'
  | 'collection_invite_sent'
  | 'collection_invite_accepted'
  | 'collection_invite_link_copied'
  | 'profile_member_invited'
  | 'shortlist_added'
  | 'shortlist_removed'
  | 'track_comment_created'
  | 'analytics_mode_toggled'
  | 'pricing_viewed'
  | 'pricing_interval_toggled'
  | 'plan_selected'
  | 'auth_modal_step_viewed'
  | 'upgrade_prompt_shown'
  | 'checkout_started'
  | 'checkout_completed'
  | 'checkout_canceled'
  | 'portal_opened'
  | 'finish_upgrade_banner_shown'
  | 'finish_upgrade_banner_clicked'
  | 'finish_upgrade_banner_dismissed'

export interface AnalyticsEventProperties {
  signup_started: {
    user_type: AnalyticsUserType
    plan?: string
    interval?: 'month' | 'year'
  }
  signup_completed: {
    user_type: AnalyticsUserType
    method: 'email'
    plan?: string
    interval?: 'month' | 'year'
  }
  email_confirmed: Record<string, never>
  login_completed: Record<string, never>
  user_type_selected: { user_type: AnalyticsUserType }
  resource_search: { query: string; category: ResourceCategory; results_count?: number }
  resource_filter_applied: {
    filter_type: string
    filter_value: string
    category: ResourceCategory
  }
  resource_detail_viewed: {
    resource_id: number
    slug: string
    category: ResourceCategory
  }
  resource_i_use_this: {
    resource_id: number
    action: ResourceIUseThisAction
    category?: ResourceCategory
  }
  resource_comment_created: { resource_id: number; category?: ResourceCategory }
  resource_submitted: { category: ResourceCategory; status: 'pending' }
  signup_cta_clicked: {
    source_page: string
    source_section?: HomepageCtaSection | string
    cta?: HomepageCtaId | string
    source_resource_id?: number
    plan?: string
    interval?: 'month' | 'year'
  }
  homepage_cta_clicked: {
    section: HomepageCtaSection
    cta: HomepageCtaId
    destination?: string
    resource_id?: number
    resource_slug?: string
  }
  track_uploaded: {
    track_id: number
    has_metadata?: boolean
    bulk?: boolean
  }
  track_played: {
    track_id: number
    owner_id: string
    is_own_track: boolean
    source: PlaybackSource
    collection_id?: number | null
  }
  track_play_qualified: {
    track_id: number
    owner_id: string
    is_own_track: boolean
    source: PlaybackSource
    collection_id?: number | null
    duration_seconds: number
  }
  collection_invite_sent: {
    collection_id: number
    method: CollectionInviteMethod
  }
  collection_invite_accepted: { collection_id: number }
  collection_invite_link_copied: { collection_id: number }
  profile_member_invited: { profile_id: string }
  shortlist_added: { track_id: number; audio_pro_id: string }
  shortlist_removed: { track_id: number }
  track_comment_created: {
    track_id: number
    context: TrackCommentContext
    collection_id?: number | null
  }
  analytics_mode_toggled: { enabled: boolean; page: 'profile' | 'collection' }
  pricing_viewed: { source: PricingSource }
  pricing_interval_toggled: { interval: 'month' | 'year'; source: PricingSource }
  plan_selected: { plan: string; interval: 'month' | 'year'; source: PricingSource }
  auth_modal_step_viewed: { step: AuthModalStep }
  upgrade_prompt_shown: { reason: 'tracks' | 'storage' | 'file_size' }
  checkout_started: {
    plan: string
    interval: 'month' | 'year'
    context: CheckoutContext
    /** @deprecated prefer plan */
    plan_slug?: string
  }
  checkout_completed: { plan?: string; interval?: 'month' | 'year' }
  checkout_canceled: { plan: string; interval: 'month' | 'year' }
  portal_opened: { source: 'pricing' | 'billing' | 'upgrade_prompt' | 'settings' }
  finish_upgrade_banner_shown: { plan: string; interval: 'month' | 'year' }
  finish_upgrade_banner_clicked: { plan: string; interval: 'month' | 'year' }
  finish_upgrade_banner_dismissed: { plan: string; interval: 'month' | 'year' }
}
