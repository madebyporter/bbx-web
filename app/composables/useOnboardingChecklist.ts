import { computed, ref, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useSupabase } from '~/utils/supabase'

export type OnboardingUserType = 'creator' | 'audio_pro'

export type ChecklistItemId =
  | 'upload_first_track'
  | 'create_collection'
  | 'invite_review'
  | 'browse_producers'
  | 'add_music'
  | 'review_invited'

export interface ChecklistItem {
  id: ChecklistItemId
  label: string
  done: boolean
  href?: string
  action?: 'upload' | 'create_collection' | 'invite' | 'share'
}

const DISMISS_KEY = 'bbx_onboarding_checklist_dismissed'
const PRODUCERS_VISITED_KEY = 'bbx_producers_visited'
const SHARE_DONE_KEY = 'bbx_collection_share_done'
const PENDING_REVIEW_KEY = 'bbx_pending_review_collection'
const REVIEWED_COLLECTIONS_KEY = 'bbx_reviewed_collections'

function scopedKey(base: string, userId?: string | null) {
  return userId ? `${base}:${userId}` : base
}

export function markProducersVisited(userId?: string | null) {
  if (typeof window === 'undefined' || !userId) return
  localStorage.setItem(scopedKey(PRODUCERS_VISITED_KEY, userId), '1')
}

export function markCollectionShareDone(userId?: string | null) {
  if (typeof window === 'undefined' || !userId) return
  localStorage.setItem(scopedKey(SHARE_DONE_KEY, userId), '1')
}

function hasCollectionShareDone(userId?: string | null): boolean {
  if (typeof window === 'undefined' || !userId) return false
  return localStorage.getItem(scopedKey(SHARE_DONE_KEY, userId)) === '1'
}

export function setPendingReviewCollection(payload: {
  collectionId: number
  slug: string
  ownerUsername: string
  name?: string
}) {
  if (typeof window === 'undefined') return
  localStorage.setItem(PENDING_REVIEW_KEY, JSON.stringify(payload))
}

export function markCollectionReviewed(collectionId: number) {
  if (typeof window === 'undefined') return
  const existing = readReviewedCollectionIds()
  if (!existing.includes(collectionId)) {
    existing.push(collectionId)
    localStorage.setItem(REVIEWED_COLLECTIONS_KEY, JSON.stringify(existing))
  }
  const pending = readPendingReview()
  if (pending?.collectionId === collectionId) {
    localStorage.removeItem(PENDING_REVIEW_KEY)
  }
}

function readReviewedCollectionIds(): number[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(REVIEWED_COLLECTIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(Number).filter((n) => !Number.isNaN(n)) : []
  } catch {
    return []
  }
}

function readPendingReview(): {
  collectionId: number
  slug: string
  ownerUsername: string
  name?: string
} | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PENDING_REVIEW_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.collectionId || !parsed?.slug || !parsed?.ownerUsername) return null
    return parsed
  } catch {
    return null
  }
}

function isDismissed(userId?: string | null): boolean {
  if (typeof window === 'undefined' || !userId) return false
  return localStorage.getItem(scopedKey(DISMISS_KEY, userId)) === '1'
}

function hasVisitedProducers(userId?: string | null): boolean {
  if (typeof window === 'undefined' || !userId) return false
  return localStorage.getItem(scopedKey(PRODUCERS_VISITED_KEY, userId)) === '1'
}

export function useOnboardingChecklist() {
  const { user, isReady } = useAuth()
  const { supabase } = useSupabase()

  const userType = ref<OnboardingUserType | null>(null)
  const username = ref<string | null>(null)
  const dismissed = ref(false)
  const loading = ref(false)

  const soundsCount = ref(0)
  const collectionsCount = ref(0)
  const hasInviteActivity = ref(false)
  const firstOwnedCollectionSlug = ref<string | null>(null)
  const shortlistCount = ref(0)
  const sharedMembership = ref<{
    collectionId: number
    slug: string
    ownerUsername: string
    name: string
  } | null>(null)

  const refreshTick = ref(0)

  const items = computed<ChecklistItem[]>(() => {
    void refreshTick.value
    if (!userType.value) return []

    if (userType.value === 'audio_pro') {
      const uname = username.value
      const uid = user.value?.id
      const shareHref = uname
        ? firstOwnedCollectionSlug.value
          ? `/u/${uname}/c/${firstOwnedCollectionSlug.value}?share=1`
          : `/u/${uname}/collections`
        : undefined
      return [
        {
          id: 'upload_first_track' as const,
          label: 'Upload your first track',
          done: soundsCount.value >= 1,
          action: 'upload' as const,
        },
        {
          id: 'create_collection' as const,
          label: 'Create a collection',
          done: collectionsCount.value >= 1,
          href: uname ? `/u/${uname}/collections` : undefined,
          action: 'create_collection' as const,
        },
        {
          id: 'invite_review' as const,
          label: 'Share collection',
          done: hasInviteActivity.value || hasCollectionShareDone(uid),
          href: shareHref,
          action: 'share' as const,
        },
      ]
    }

    const pending = sharedMembership.value
    const uid = user.value?.id
    const creatorItems: ChecklistItem[] = [
      {
        id: 'browse_producers',
        label: 'Browse producers',
        // Only count an intentional visit for this user — not other accounts on the same browser
        done: hasVisitedProducers(uid),
        href: '/producers',
      },
      {
        id: 'add_music',
        label: 'Add music to your library',
        done: shortlistCount.value >= 1 || soundsCount.value >= 1,
        href: '/producers',
        action: 'upload',
      },
    ]

    if (pending) {
      const reviewed = readReviewedCollectionIds().includes(pending.collectionId)
      creatorItems.push({
        id: 'review_invited',
        label: pending.name
          ? `Review tracks in ${pending.name}`
          : 'Review invited tracks',
        done: reviewed,
        href: `/u/${pending.ownerUsername}/c/${pending.slug}`,
      })
    }

    return creatorItems
  })

  const visible = computed(() => {
    void refreshTick.value
    if (!isReady.value || !user.value || dismissed.value) return false
    if (!userType.value) return false
    if (items.value.length === 0) return false
    return items.value.some((item) => !item.done)
  })

  function dismiss() {
    if (typeof window !== 'undefined' && user.value?.id) {
      localStorage.setItem(scopedKey(DISMISS_KEY, user.value.id), '1')
    }
    dismissed.value = true
  }

  function bump() {
    refreshTick.value += 1
  }

  async function refresh() {
    if (!user.value || !supabase) return

    loading.value = true
    try {
      dismissed.value = isDismissed(user.value.id)

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('user_type, username')
        .eq('id', user.value.id)
        .maybeSingle()

      userType.value = (profile?.user_type as OnboardingUserType) || 'creator'
      username.value = typeof profile?.username === 'string' ? profile.username : null

      const [{ count: soundCount }, { count: collectionCount }] = await Promise.all([
        supabase
          .from('sounds')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.value.id),
        supabase
          .from('collections')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.value.id),
      ])

      soundsCount.value = soundCount || 0
      collectionsCount.value = collectionCount || 0

      if (userType.value === 'audio_pro') {
        const { data: ownedCollections } = await supabase
          .from('collections')
          .select('id, slug')
          .eq('user_id', user.value.id)
          .order('created_at', { ascending: true })

        const collectionIds = (ownedCollections || []).map((c) => c.id)
        firstOwnedCollectionSlug.value =
          typeof ownedCollections?.[0]?.slug === 'string' ? ownedCollections[0].slug : null

        let memberCount = 0
        if (collectionIds.length > 0) {
          const { count } = await supabase
            .from('collection_members')
            .select('*', { count: 'exact', head: true })
            .in('collection_id', collectionIds)
          memberCount = count || 0
        }

        const { count: profileMembers } = await supabase
          .from('profile_members')
          .select('*', { count: 'exact', head: true })
          .eq('profile_id', user.value.id)

        hasInviteActivity.value = memberCount > 0 || (profileMembers || 0) > 0
      } else {
        firstOwnedCollectionSlug.value = null
        const { count: shortCount } = await supabase
          .from('track_shortlists')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', user.value.id)

        shortlistCount.value = shortCount || 0

        const pending = readPendingReview()
        if (pending) {
          sharedMembership.value = {
            collectionId: pending.collectionId,
            slug: pending.slug,
            ownerUsername: pending.ownerUsername,
            name: pending.name || 'collection',
          }
        } else {
          const { data: memberships } = await supabase
            .from('collection_members')
            .select('collection_id, collections(id, name, slug, user_id)')
            .eq('member_id', user.value.id)
            .limit(5)

          const first = (memberships || [])[0] as any
          const col = first?.collections
          if (col?.id && col?.slug && col?.user_id) {
            const { data: owner } = await supabase
              .from('user_profiles')
              .select('username')
              .eq('id', col.user_id)
              .maybeSingle()

            if (typeof owner?.username === 'string' && owner.username) {
              sharedMembership.value = {
                collectionId: Number(col.id),
                slug: String(col.slug),
                ownerUsername: owner.username,
                name: typeof col.name === 'string' ? col.name : 'collection',
              }
            } else {
              sharedMembership.value = null
            }
          } else {
            sharedMembership.value = null
          }
        }
      }

      bump()
    } catch (err) {
      console.error('Onboarding checklist refresh failed:', err)
    } finally {
      loading.value = false
    }
  }

  watch(
    () => user.value?.id,
    (id) => {
      if (id) void refresh()
      else {
        userType.value = null
        dismissed.value = false
      }
    },
    { immediate: true },
  )

  return {
    visible,
    items,
    loading,
    userType,
    username,
    dismiss,
    refresh,
    bump,
  }
}
