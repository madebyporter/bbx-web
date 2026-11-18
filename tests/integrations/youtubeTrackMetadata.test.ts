import { describe, expect, it } from 'vitest'
import {
  buildBeatboxTrackDetailUrl,
  buildYouTubeDescription,
  generateTrackPageSlug,
  mapTrackToYouTubeSnippet,
} from '../../app/utils/youtubeTrackMetadata'

describe('youtubeTrackMetadata', () => {
  it('maps title description tags and public privacy', () => {
    const trackUrl = 'https://beatbox.studio/u/porter/t/confidence-1'
    const snippet = mapTrackToYouTubeSnippet(
      {
        title: 'Confidence',
        artist: 'Made by Porter',
        genre: 'Trap',
        mood: 'Dark',
        bpm: 130,
      },
      { trackUrl },
    )

    expect(snippet.title).toBe('Confidence')
    expect(snippet.privacyStatus).toBe('public')
    expect(snippet.tags).toContain('Trap')
    expect(snippet.tags).toContain('Dark')
    expect(snippet.description).toContain('BPM: 130')
    expect(snippet.description).toContain('Track details:')
    expect(snippet.description).toContain(trackUrl)
  })

  it('prefers youtube_title over Beatbox title', () => {
    const snippet = mapTrackToYouTubeSnippet({
      title: 'She’s Bouncy',
      youtube_title: 'She’s Bouncy (Official Audio) | Made by Porter',
      artist: 'Made by Porter',
    })
    expect(snippet.title).toBe('She’s Bouncy (Official Audio) | Made by Porter')
  })

  it('falls back to title when youtube_title is empty', () => {
    const snippet = mapTrackToYouTubeSnippet({
      title: 'She’s Bouncy',
      youtube_title: '   ',
    })
    expect(snippet.title).toBe('She’s Bouncy')
  })

  it('builds a fallback description', () => {
    expect(buildYouTubeDescription({})).toBe('Synced from Beatbox')
  })

  it('appends track detail URL under a Track details label', () => {
    const url = 'https://beatbox.studio/u/porter/t/big-timing-beat-42'
    const description = buildYouTubeDescription(
      { description: 'A dark trap cut.' },
      url,
    )
    expect(description).toBe(`A dark trap cut.\n\nTrack details:\n${url}`)
  })

  it('builds slug track detail URLs from username + title', () => {
    expect(generateTrackPageSlug({ title: 'Big Timing - Beat', id: 42 })).toBe(
      'big-timing-beat-42',
    )
    expect(
      buildBeatboxTrackDetailUrl('https://beatbox.studio', 'porter', {
        title: 'Big Timing - Beat',
        id: 42,
      }),
    ).toBe('https://beatbox.studio/u/porter/t/big-timing-beat-42')
    expect(
      buildBeatboxTrackDetailUrl('https://beatbox.studio', null, {
        title: 'Big Timing - Beat',
        id: 42,
      }),
    ).toBeNull()
  })
})
