import type { SupabaseClient } from '@supabase/supabase-js'
import type { StorageProvider } from '~/types/track'

export interface AudioStorageTrack {
  id: number
  storage_path: string
  storage_provider?: StorageProvider | null
}

export interface AudioUploadResult {
  storage_path: string
  storage_provider: 'r2'
  size: number
}

export function normalizeStorageProvider(provider?: string | null): StorageProvider {
  return provider === 'r2' ? 'r2' : 'supabase'
}

export function getAudioCacheKey(track: AudioStorageTrack): string {
  return `${normalizeStorageProvider(track.storage_provider)}:${track.storage_path}`
}

async function getAccessToken(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token || null
}

export async function getPlaybackUrl(
  track: AudioStorageTrack,
  supabase: SupabaseClient | null,
): Promise<string | null> {
  if (!supabase) return null

  const provider = normalizeStorageProvider(track.storage_provider)

  if (provider === 'supabase') {
    const { data, error } = await supabase.storage
      .from('sounds')
      .createSignedUrl(track.storage_path, 86400)

    if (error) {
      console.error('Error getting Supabase signed URL:', error)
      return null
    }

    return data?.signedUrl || null
  }

  try {
    const accessToken = await getAccessToken(supabase)
    const response = await $fetch<{ playbackUrl: string }>('/api/storage/presign-play', {
      method: 'POST',
      body: { trackId: track.id },
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
    return response.playbackUrl
  } catch (error) {
    console.error('Error getting R2 playback URL:', error)
    return null
  }
}

function shouldProxyR2UploadThroughApi(): boolean {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1'
}

/** Localhost only — Netlify functions 502 on full MP3 proxy (body size / timeout). */
function shouldProxyR2AudioDownloadThroughApi(): boolean {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1'
}

function audioDownloadErrorMessage(err: unknown): string {
  const statusMessage =
    err && typeof err === 'object' && 'data' in err
      ? String((err as { data?: { statusMessage?: string } }).data?.statusMessage || '')
      : ''
  const message = err instanceof Error ? err.message : statusMessage || String(err || '')
  const lower = `${message} ${statusMessage}`.toLowerCase()
  if (
    lower.includes('failed to fetch') ||
    lower.includes('cors') ||
    lower.includes('access-control-allow-origin')
  ) {
    return 'Could not download audio (R2 CORS). Add GET/HEAD AllowedOrigins * on the sounds bucket.'
  }
  if (lower.includes('413') || lower.includes('too large')) {
    return 'Track is too large to proxy through the API. Use direct R2 download (bucket CORS GET *).'
  }
  return statusMessage || message || 'Failed to download audio file'
}

export async function uploadAudio(
  file: File,
  supabase: SupabaseClient | null,
  options: { replacingTrackId?: number | null } = {},
): Promise<AudioUploadResult> {
  if (!supabase) {
    throw new Error('Storage is not available')
  }

  const accessToken = await getAccessToken(supabase)
  if (!accessToken) {
    throw new Error('Not authenticated')
  }

  const replacingTrackId = options.replacingTrackId ?? null

  // Localhost → same-origin API (R2 CORS only allows production + :3000 today)
  if (shouldProxyR2UploadThroughApi()) {
    const form = new FormData()
    form.append('file', file)
    const query =
      replacingTrackId != null ? `?replacingTrackId=${encodeURIComponent(String(replacingTrackId))}` : ''
    const result = await $fetch<{
      storage_path: string
      storage_provider: 'r2'
      size?: number
    }>(`/api/storage/upload${query}`, {
      method: 'POST',
      body: form,
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    return {
      storage_path: result.storage_path,
      storage_provider: result.storage_provider,
      size: result.size ?? file.size,
    }
  }

  const presign = await $fetch<{
    key: string
    uploadUrl: string
    contentType: string
    storage_provider: 'r2'
  }>('/api/storage/presign-upload', {
    method: 'POST',
    body: {
      filename: file.name,
      contentType: file.type || 'audio/mpeg',
      size: file.size,
      replacingTrackId,
    },
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  const uploadResponse = await fetch(presign.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': presign.contentType,
      'Content-Length': String(file.size),
    },
  })

  if (!uploadResponse.ok) {
    throw new Error(`Upload failed (${uploadResponse.status})`)
  }

  const verified = await $fetch<{ key: string; size: number }>('/api/storage/verify-upload', {
    method: 'POST',
    body: { key: presign.key, replacingTrackId },
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  return {
    storage_path: verified.key,
    storage_provider: presign.storage_provider,
    size: verified.size,
  }
}

export async function downloadAudioBlob(
  track: AudioStorageTrack,
  supabase: SupabaseClient | null,
): Promise<Blob> {
  if (!supabase) {
    throw new Error('Storage is not available')
  }

  const provider = normalizeStorageProvider(track.storage_provider)

  if (provider === 'supabase') {
    const { data, error } = await supabase.storage
      .from('sounds')
      .download(track.storage_path)

    if (error) throw error
    if (!data) throw new Error('Failed to download audio file')
    return data
  }

  const accessToken = await getAccessToken(supabase)
  if (!accessToken) {
    throw new Error('Not authenticated')
  }

  // Localhost: same-origin API (avoids R2 browser CORS on odd ports)
  if (shouldProxyR2AudioDownloadThroughApi()) {
    try {
      return await $fetch<Blob>('/api/storage/download-audio', {
        method: 'GET',
        query: { trackId: track.id },
        headers: { Authorization: `Bearer ${accessToken}` },
        responseType: 'blob',
      })
    } catch (err) {
      // Fall through to signed URL if proxy rejects (e.g. file too large)
      console.warn('Same-origin audio download failed, trying signed URL:', err)
    }
  }

  try {
    const playbackUrl = await getPlaybackUrl(track, supabase)
    if (!playbackUrl) {
      throw new Error('Failed to get download URL')
    }

    const response = await fetch(playbackUrl)
    if (!response.ok) {
      throw new Error(`Failed to download audio file (${response.status})`)
    }

    return response.blob()
  } catch (err) {
    throw new Error(audioDownloadErrorMessage(err))
  }
}

export async function deleteAudio(
  track: AudioStorageTrack,
  supabase: SupabaseClient | null,
): Promise<void> {
  if (!supabase) {
    throw new Error('Storage is not available')
  }

  if (!track.storage_path) return

  const provider = normalizeStorageProvider(track.storage_provider)

  if (provider === 'supabase') {
    const { error } = await supabase.storage
      .from('sounds')
      .remove([track.storage_path])

    if (error) throw error
    return
  }

  const accessToken = await getAccessToken(supabase)
  if (!accessToken) {
    throw new Error('Not authenticated')
  }

  await $fetch('/api/storage/delete-object', {
    method: 'POST',
    body: { trackId: track.id },
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}
