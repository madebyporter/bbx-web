import type { Track } from '~/types/track'
import { mapTrackToYouTubeSnippet } from '~/utils/youtubeTrackMetadata'
import { useAuthHeaders } from '~/composables/useAuthHeaders'

const UPLOAD_URL =
  'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status'

export async function uploadTrackVideoToYouTube(params: {
  track: Track
  videoBlob: Blob
  trackUrl?: string | null
  onProgress?: (message: string) => void
}): Promise<{ videoId: string; permalink: string }> {
  const headers = await useAuthHeaders()
  if (!headers.Authorization) {
    throw new Error('Not authenticated')
  }

  params.onProgress?.('Getting YouTube access…')
  const tokenRes = await $fetch<{ accessToken: string }>(
    '/api/integrations/youtube/access-token',
    { method: 'POST', headers },
  )

  const snippet = mapTrackToYouTubeSnippet(params.track, {
    trackUrl: params.trackUrl,
  })

  params.onProgress?.('Starting YouTube upload…')
  const sessionRes = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenRes.accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': params.videoBlob.type || 'video/mp4',
      'X-Upload-Content-Length': String(params.videoBlob.size),
    },
    body: JSON.stringify({
      snippet: {
        title: snippet.title,
        description: snippet.description,
        tags: snippet.tags,
      },
      status: {
        privacyStatus: snippet.privacyStatus,
        selfDeclaredMadeForKids: false,
      },
    }),
  })

  if (!sessionRes.ok) {
    const errText = await sessionRes.text()
    throw new Error(errText.slice(0, 300) || `YouTube session failed (${sessionRes.status})`)
  }

  const uploadUri = sessionRes.headers.get('Location')
  if (!uploadUri) {
    throw new Error('YouTube did not return an upload session URL')
  }

  params.onProgress?.('Uploading video…')
  const putRes = await fetch(uploadUri, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenRes.accessToken}`,
      'Content-Type': params.videoBlob.type || 'video/mp4',
      'Content-Length': String(params.videoBlob.size),
    },
    body: params.videoBlob,
  })

  const putText = await putRes.text()
  let putJson: Record<string, unknown> = {}
  try {
    putJson = putText ? (JSON.parse(putText) as Record<string, unknown>) : {}
  } catch {
    putJson = {}
  }

  if (!putRes.ok) {
    throw new Error(
      (typeof putJson.message === 'string' && putJson.message) ||
        putText.slice(0, 300) ||
        `YouTube upload failed (${putRes.status})`,
    )
  }

  const videoId = String(putJson.id || '')
  if (!videoId) {
    throw new Error('YouTube upload succeeded but no video id was returned')
  }

  const permalink = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`

  params.onProgress?.('Saving sync status…')
  await $fetch('/api/integrations/youtube/sync-complete', {
    method: 'POST',
    headers,
    body: {
      sound_id: params.track.id,
      video_id: videoId,
      permalink,
    },
  })

  return { videoId, permalink }
}
