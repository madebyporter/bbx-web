/** Format a number to up to 2 decimal places, trimming trailing zeros. */
export function formatCalcNumber(value: number): string {
  if (!Number.isFinite(value)) return '0'
  const rounded = Math.round(value * 100) / 100
  return String(rounded)
}

export function beatMsFromBpm(bpm: number): number {
  if (!bpm || bpm <= 0) return 0
  return 60000 / bpm
}

export interface ReverbRow {
  label: string
  preDelayMs: number
  decayMs: number
  totalMs: number
}

export interface DelayCell {
  ms: number
  hz: number
}

export interface DelayRow {
  label: string
  subtitle: string
  normal: DelayCell
  dotted: DelayCell
  triplet: DelayCell
}

/** Note length as fraction of a quarter note (1 beat). */
const DELAY_NOTES: Array<{ label: string; subtitle: string; beats: number }> = [
  { label: '1/1', subtitle: '1 Bar', beats: 4 },
  { label: '1/2', subtitle: '2 Beats', beats: 2 },
  { label: '1/4', subtitle: '1 Beat', beats: 1 },
  { label: '1/8', subtitle: '', beats: 0.5 },
  { label: '1/16', subtitle: '', beats: 0.25 },
  { label: '1/32', subtitle: '', beats: 0.125 },
  { label: '1/64', subtitle: '', beats: 0.0625 },
  { label: '1/128', subtitle: '', beats: 0.03125 },
  { label: '1/256', subtitle: '', beats: 0.015625 },
  { label: '1/512', subtitle: '', beats: 0.0078125 },
]

/** Reverb sizes: total beats + pre-delay as fraction of a beat. */
const REVERB_SIZES: Array<{ label: string; totalBeats: number; preDelayBeats: number }> = [
  { label: 'Hall (2 Bars)', totalBeats: 8, preDelayBeats: 1 / 8 }, // 1/32 note
  { label: 'Large Room (1 Bar)', totalBeats: 4, preDelayBeats: 1 / 16 }, // 1/64
  { label: 'Small Room (1/2 Note)', totalBeats: 2, preDelayBeats: 1 / 32 }, // 1/128
  { label: 'Tight Ambience (1/4 Note)', totalBeats: 1, preDelayBeats: 1 / 128 }, // 1/512
]

function cellFromMs(ms: number): DelayCell {
  return {
    ms,
    hz: ms > 0 ? 1000 / ms : 0,
  }
}

export function calculateReverbRows(bpm: number): ReverbRow[] {
  const beatMs = beatMsFromBpm(bpm)
  return REVERB_SIZES.map((size) => {
    const totalMs = beatMs * size.totalBeats
    const preDelayMs = beatMs * size.preDelayBeats
    return {
      label: size.label,
      preDelayMs,
      decayMs: totalMs - preDelayMs,
      totalMs,
    }
  })
}

export function calculateDelayRows(bpm: number): DelayRow[] {
  const beatMs = beatMsFromBpm(bpm)
  return DELAY_NOTES.map((note) => {
    const normalMs = beatMs * note.beats
    return {
      label: note.label,
      subtitle: note.subtitle,
      normal: cellFromMs(normalMs),
      dotted: cellFromMs(normalMs * 1.5),
      triplet: cellFromMs(normalMs * (2 / 3)),
    }
  })
}
