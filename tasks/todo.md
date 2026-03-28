# Music Source Control Research TODO

## Plan

- [x] Document current state in this repo (`version`, `track_group_name`, filename metadata parsing).
- [x] Define a domain-split JSON model for music projects (arrangement, assets, mix, automation, collaborators).
- [x] Propose a Git-friendly change tracking strategy (diffs, merge conflict reduction, history/auditability).
- [x] Map a migration path from `v1/v2` filename versioning to manifest + structured metadata.
- [x] Add a short review section with recommended next implementation steps.
- [x] Incorporate additional inspiration: common base asset + metadata deltas + final merge workflow.
- [x] Add usage walkthrough for branch-switch-commit-merge collaboration.
- [x] Add release control board model (song-level readiness/status tracking).
- [x] Add implementation plan for immutable song revision history in the existing Beatbox model.
- [x] Implement database migration for `sound_revisions` with automatic snapshot+diff logging trigger.
- [x] Backfill initial revision rows for existing `sounds`.
- [x] Validate migration file structure and update review notes.

## Implementation Plan: Song Revision History (DB-backed)

- [x] Add Supabase migration for immutable `sound_revisions` ledger table.
- [x] Add auto-capture trigger on `public.sounds` for insert/update snapshots + diffs.
- [x] Add RLS policies so viewers follow existing sound visibility rules.
- [x] Backfill baseline revision entries for existing sounds.
- [x] Update docs with how to query and use revision history.

## Review

Research completed in `docs/features/MUSIC_SOURCE_CONTROL_DOMAIN_SPLIT_JSON_RESEARCH.md`.

Recommended first implementation slice:

1. Add `manifest.json` and `assets/index.json` generation for new projects.
2. Introduce one editable domain file (`composition/arrangement.json`) with deterministic IDs.
3. Add canonical JSON serializer (stable key ordering + numeric precision) to reduce diff noise.
4. Add a change-summary script that reports domain/entity-level deltas between two commits.

Additional refinement captured from inspiration:

- Emphasize "start from common base media and commit lightweight metadata edits."
- Keep merges at metadata/domain level first; render/export artifacts remain derived outputs.
- Document branch usage sequence clearly: commit on branch A, switch to branch B, commit more changes, merge both.
- Add album-level release board metadata (BPM/key/sections/version + readiness gates) to coordinate final rollout.

Implemented in this iteration:

- Added migration `supabase/migrations/20260328080000_add_sound_revisions.sql`.
- Creates `public.sound_revisions` as an immutable per-song revision ledger.
- Adds trigger `trg_log_sound_revision` on `public.sounds` (INSERT/UPDATE) to auto-log:
  - `revision_number`
  - `changed_fields`
  - `previous_snapshot`
  - `current_snapshot`
  - `metadata_diff` (field-level from/to map)
- Backfills revision `1` for existing songs.
- Added usage docs in `docs/development/SOUND_REVISIONS_LEDGER.md` with example queries for revision history and latest diff.
