/**
 * Genre options live in Supabase `public.genres` (BMI ∪ ASCAP seed).
 * Use `useGenres()` in UI — do not hardcode producer micro-styles here.
 * Seed source: supabase/migrations/20261122000000_genres.sql
 */

/** Canonical musical keys (filter + Sync inline editor). */
export const TRACK_KEYS = [
  'C Major',
  'C Minor',
  'C# Major',
  'C# Minor',
  'D Major',
  'D Minor',
  'D# Major',
  'D# Minor',
  'E Major',
  'E Minor',
  'F Major',
  'F Minor',
  'F# Major',
  'F# Minor',
  'G Major',
  'G Minor',
  'G# Major',
  'G# Minor',
  'A Major',
  'A Minor',
  'A# Major',
  'A# Minor',
  'B Major',
  'B Minor',
] as const

export type TrackKey = (typeof TRACK_KEYS)[number]
