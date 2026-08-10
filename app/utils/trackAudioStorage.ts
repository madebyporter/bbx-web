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

export async function uploadAudio(
  file: File,
  supabase: SupabaseClient | null,
): Promise<AudioUploadResult> {
  if (!supabase) {
    throw new Error('Storage is not available')
  }

  const accessToken = await getAccessToken(supabase)
  if (!accessToken) {
    throw new Error('Not authenticated')
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
    },
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  const uploadResponse = await fetch(presign.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': presign.contentType,
    },
  })

  if (!uploadResponse.ok) {
    throw new Error(`Upload failed (${uploadResponse.status})`)
  }

  return {
    storage_path: presign.key,
    storage_provider: presign.storage_provider,
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

  const playbackUrl = await getPlaybackUrl(track, supabase)
  if (!playbackUrl) {
    throw new Error('Failed to get download URL')
  }

  const response = await fetch(playbackUrl)
  if (!response.ok) {
    throw new Error(`Failed to download audio file (${response.status})`)
  }

  return response.blob()
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
