import { createError } from 'h3'
import { downloadR2Object, readArtworkBucket } from './r2'
import { getServiceSupabase } from './supabaseAuth'

function filenameFromPath(path: string, fallback: string): string {
  const base = path.split('/').pop() || fallback
  return base || fallback
}

function guessAudioContentType(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.wav')) return 'audio/wav'
  if (lower.endsWith('.flac')) return 'audio/flac'
  if (lower.endsWith('.aiff') || lower.endsWith('.aif')) return 'audio/aiff'
  if (lower.endsWith('.m4a')) return 'audio/mp4'
  if (lower.endsWith('.ogg')) return 'audio/ogg'
  return 'audio/mpeg'
}

function guessImageContentType(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  return 'image/jpeg'
}

export async function loadTrackAudioBuffer(track: {
  storage_path: string
  storage_provider?: string | null
}): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
  const filename = filenameFromPath(track.storage_path, 'track.mp3')
  const contentType = guessAudioContentType(filename)

  if (track.storage_provider === 'r2') {
    const buffer = await downloadR2Object(track.storage_path)
    return { buffer, filename, contentType }
  }

  const supabase = getServiceSupabase()
  const { data, error } = await supabase.storage.from('sounds').download(track.storage_path)
  if (error || !data) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to download track audio: ${error?.message || 'unknown error'}`,
    })
  }

  const buffer = Buffer.from(await data.arrayBuffer())
  return { buffer, filename, contentType }
}

export async function loadTrackArtworkBuffer(track: {
  artwork_path?: string | null
  artwork_provider?: string | null
}): Promise<{ buffer: Buffer; filename: string; contentType: string } | null> {
  if (!track.artwork_path) return null

  const filename = filenameFromPath(track.artwork_path, 'artwork.jpg')
  const contentType = guessImageContentType(filename)

  if (track.artwork_provider === 'r2') {
    const bucket = readArtworkBucket('track')
    const buffer = await downloadR2Object(track.artwork_path, bucket)
    return { buffer, filename, contentType }
  }

  const supabase = getServiceSupabase()
  const { data, error } = await supabase.storage.from('artwork').download(track.artwork_path)
  if (error || !data) {
    console.warn('Failed to download track artwork for sync:', error?.message)
    return null
  }

  const buffer = Buffer.from(await data.arrayBuffer())
  return { buffer, filename, contentType }
}
