import { describe, expect, it } from 'vitest'
import {
  buildYouTubeDescription,
  mapTrackToYouTubeSnippet,
} from '../../app/utils/youtubeTrackMetadata'

describe('youtubeTrackMetadata', () => {
  it('maps title description tags and unlisted privacy', () => {
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
    expect(snippet.privacyStatus).toBe('unlisted')
    expect(snippet.tags).toContain('Trap')
    expect(snippet.tags).toContain('Dark')
    expect(snippet.description).toContain('BPM: 130')
    expect(snippet.description).toContain('https://beatbox.studio/u/porter/t/1')
  })

  it('builds a fallback description', () => {
    expect(buildYouTubeDescription({})).toBe('Synced from Beatbox')
  })
})
