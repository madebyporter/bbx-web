import { describe, expect, it } from 'vitest'
import {
  buildYouTubeDescription,
  mapTrackToYouTubeSnippet,
} from '../../app/utils/youtubeTrackMetadata'

describe('youtubeTrackMetadata', () => {
  it('maps title description tags and public privacy', () => {
    const snippet = mapTrackToYouTubeSnippet(
      {
        title: 'Confidence',
        artist: 'Made by Porter',
        genre: 'Trap',
        mood: 'Dark',
        bpm: 130,
      },
      { trackUrl: 'https://beatbox.studio/u/porter/t/1' },
    )

    expect(snippet.title).toBe('Confidence')
    expect(snippet.privacyStatus).toBe('public')
    expect(snippet.tags).toContain('Trap')
    expect(snippet.tags).toContain('Dark')
    expect(snippet.description).toContain('BPM: 130')
    expect(snippet.description).toContain('https://beatbox.studio/u/porter/t/1')
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
})
