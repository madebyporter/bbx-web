import type { Track } from '~/types/track'
import { useSupabase } from '~/utils/supabase'
import { useAuth } from '~/composables/useAuth'
import { useAnalytics } from '~/composables/useAnalytics'

const PLAY_THRESHOLD_SECONDS = 3

export type PlaybackSource = 'library' | 'collection' | 'track_page'
export type PageViewType = 'profile' | 'collection' | 'track'

interface ListenSession {
  trackId: number
  ownerId: string
  listenerId: string | null
  source: PlaybackSource
  collectionId: number | null
  trackDurationSeconds: number | null
  durationSeconds: number
  countedAsPlay: boolean
  flushed: boolean
}

interface PlaybackContext {
  source: PlaybackSource
  collectionId: number | null
}

let activeSession: ListenSession | null = null
let playbackContext: PlaybackContext = { source: 'library', collectionId: null }
let lifecycleListenersAttached = false

function attachLifecycleListeners() {
  if (!import.meta.client || lifecycleListenersAttached) return
  lifecycleListenersAttached = true

  window.addEventListener('beforeunload', () => {
    void endListenSession()
  })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      void endListenSession()
    }
  })
}

export function setPlaybackContext(context: Partial<PlaybackContext>) {
  playbackContext = { ...playbackContext, ...context }
}

export function getPlaybackContext(): PlaybackContext {
  return playbackContext
}

function shouldTrackListener(track: Track): boolean {
  const { user } = useAuth()
  return user.value?.id !== track.user_id
}

export function beginListenSession(track: Track) {
  attachLifecycleListeners()

  if (!shouldTrackListener(track)) return

  if (activeSession && activeSession.trackId === track.id && !activeSession.flushed) {
    return
  }

  void endListenSession()

  activeSession = {
    trackId: track.id,
    ownerId: track.user_id,
    listenerId: useAuth().user.value?.id ?? null,
    source: playbackContext.source,
    collectionId: playbackContext.collectionId,
    trackDurationSeconds: track.duration ?? null,
    durationSeconds: 0,
    countedAsPlay: false,
    flushed: false,
  }
}

export function tickListenSession(currentTimeSeconds: number) {
  if (!activeSession || activeSession.flushed) return

  activeSession.durationSeconds = Math.max(activeSession.durationSeconds, currentTimeSeconds)

  if (!activeSession.countedAsPlay && currentTimeSeconds >= PLAY_THRESHOLD_SECONDS) {
    activeSession.countedAsPlay = true

    const { user } = useAuth()
    const { capture } = useAnalytics()
    const isOwnTrack = user.value?.id === activeSession.ownerId

    capture('track_play_qualified', {
      track_id: activeSession.trackId,
      owner_id: activeSession.ownerId,
      is_own_track: isOwnTrack,
      source: activeSession.source,
      collection_id: activeSession.collectionId,
      duration_seconds: Math.floor(currentTimeSeconds),
    })
  }
}

export async function endListenSession() {
  if (!activeSession || activeSession.flushed) return

  const session = activeSession
  activeSession = null
  session.flushed = true

  if (session.durationSeconds <= 0 && !session.countedAsPlay) return

  const { supabase } = useSupabase()
  if (!supabase) return

  try {
    const { error } = await supabase.from('track_listen_sessions').insert({
      track_id: session.trackId,
      owner_id: session.ownerId,
      listener_id: session.listenerId,
      duration_seconds: session.durationSeconds,
      track_duration_seconds: session.trackDurationSeconds,
      counted_as_play: session.countedAsPlay,
      source: session.source,
      collection_id: session.collectionId,
    })

    if (error) {
      console.error('Failed to record listen session:', error)
    }
  } catch (error) {
    console.error('Failed to record listen session:', error)
  }
}

export async function recordPageView(params: {
  profileId: string
  pageType: PageViewType
  resourceId?: number | null
}) {
  const { user } = useAuth()
  const viewerId = user.value?.id ?? null

  if (viewerId && viewerId === params.profileId) return

  const { supabase } = useSupabase()
  if (!supabase) return

  try {
    const { error } = await supabase.from('profile_page_views').insert({
      profile_id: params.profileId,
      viewer_id: viewerId,
      page_type: params.pageType,
      resource_id: params.resourceId ?? null,
    })

    if (error) {
      console.error('Failed to record page view:', error)
    }
  } catch (error) {
    console.error('Failed to record page view:', error)
  }
}
