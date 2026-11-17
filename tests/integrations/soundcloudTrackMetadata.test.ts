import { describe, expect, it } from 'vitest'
import {
  buildSoundCloudDescription,
  buildSoundCloudTagList,
  getMetadataFieldStatuses,
  hasRequiredMetadata,
  mapTrackToSoundCloudFields,
} from '../../app/utils/soundcloudTrackMetadata'

describe('soundcloudTrackMetadata', () => {
  it('requires title and artist', () => {
    expect(hasRequiredMetadata({ title: '', artist: 'A' })).toBe(false)
    expect(hasRequiredMetadata({ title: 'T', artist: '' })).toBe(false)
    expect(hasRequiredMetadata({ title: 'T', artist: 'A' })).toBe(true)
  })

  it('builds tag list with mood, bpm, key, version', () => {
    const tags = buildSoundCloudTagList({
      mood: 'Dark, Chill',
      bpm: 140,
      key: 'A Minor',
      version: 'v1.0',
    })
    expect(tags).toContain('Dark')
    expect(tags).toContain('Chill')
    expect(tags).toContain('bpm:140')
    expect(tags).toContain('140bpm')
    expect(tags).toContain('"A Minor"')
    expect(tags).toContain('v1.0')
  })

  it('maps track fields for SoundCloud upload', () => {
    const fields = mapTrackToSoundCloudFields(
      {
        title: 'Confidence',
        artist: 'Made by Porter',
        genre: 'Trap',
        bpm: 130,
        is_public: false,
        year: 2024,
      },
      { trackUrl: 'https://beatbox.studio/u/porter/t/1' },
    )

    expect(fields.title).toBe('Confidence')
    expect(fields.artist).toBe('Made by Porter')
    expect(fields.genre).toBe('Trap')
    expect(fields.sharing).toBe('private')
    expect(fields.releaseDate).toBe('2024-01-01')
    expect(fields.description).toContain('BPM: 130')
    expect(fields.description).toContain('https://beatbox.studio/u/porter/t/1')
  })

  it('marks recommended empties in readiness checklist', () => {
    const fields = getMetadataFieldStatuses({
      title: 'Song',
      artist: 'Artist',
    })
    const genre = fields.find((f) => f.key === 'genre')
    const description = fields.find((f) => f.key === 'description')
    expect(genre?.filled).toBe(false)
    expect(description?.severity).toBe('info')
    expect(buildSoundCloudDescription({ title: 'X' })).toBe('Synced from Beatbox')
  })
})
