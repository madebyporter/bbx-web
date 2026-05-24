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
  | 'other'

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

export interface AnalyticsEventProperties {
  signup_started: { user_type: AnalyticsUserType }
  signup_completed: { user_type: AnalyticsUserType; method: 'email' }
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
  signup_cta_clicked: { source_page: string; source_resource_id?: number }
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
}
