# Sound Revisions Ledger

This document describes the DB-backed song revision history introduced by:

- `supabase/migrations/20260328080000_add_sound_revisions.sql`
- `supabase/migrations/20260328093000_add_sound_lineage_and_studio_sync_fields.sql`

## What problem this solves

Beatbox already has track grouping and release coordination, but song metadata changes were not stored as an immutable version-control history.

The new ledger records every tracked metadata change on `public.sounds` so teams can answer:

- What changed?
- Who changed it?
- In what order?
- What was the previous value?

It also adds lineage/sync fields so uploads from web now and BBX Studio later follow one version-control contract.

## Data model

`public.sound_revisions`

- `sound_id`: parent track (`public.sounds.id`)
- `user_id`: owner/user associated with the sound row
- `revision_number`: monotonic per `sound_id` (1, 2, 3, ...)
- `change_type`: `create` or `update`
- `changed_fields`: top-level fields changed in this revision
- `previous_snapshot`: full tracked snapshot before update
- `current_snapshot`: full tracked snapshot after update
- `metadata_diff`: `{ field: { from, to } }` map
- `created_at`: revision timestamp

## How revisions are created

Trigger: `trg_log_sound_revision` on `public.sounds` (`AFTER INSERT OR UPDATE`)

- On insert:
  - creates revision `1` with `change_type = 'create'`
- On update:
  - computes changed keys from old/new snapshots
  - skips writes when no tracked metadata changed
  - appends next revision number with per-field `from`/`to` diff

Snapshot fields are built by `public.build_sound_snapshot(...)` and currently include:

- identity/ownership: `id`, `user_id`
- creative metadata: `title`, `artist`, `version`, `track_group_name`, `genre`, `mood`, `bpm`, `key`, `year`
- visibility/workflow: `status_id`, `is_public`, `collection_names`
- storage pointer: `storage_path`
- lineage/sync fields: `parent_sound_id`, `lineage_root_sound_id`, `source_client`, `source_project_ref`, `source_revision_ref`

## Upload lineage behavior (web + Studio-friendly)

On `INSERT` into `public.sounds`, DB trigger `trg_prepare_sound_lineage` now:

- auto-detects older versions by `(user_id, track_group_name)` first, then exact title fallback
- links `parent_sound_id` to the most recent prior version
- sets/normalizes `lineage_root_sound_id` for the whole chain
- normalizes version and auto-suggests next when missing (`v1.0`, `v2.0`, ...)
- normalizes `source_client` (`web`, `studio`, `api`)

This means both web uploads and future BBX Studio sync inserts can rely on the same server-side lineage/versioning behavior.

## Backfill behavior

The migration inserts baseline `revision_number = 1` rows (`change_type = 'create'`) for existing `sounds` that do not yet have history.

## RLS behavior

`sound_revisions` is read-protected with the same visibility shape as `sounds`:

- public sounds are visible
- owner can view
- profile members can view owner tracks

## Query examples

Get full revision history for one sound:

```sql
select
  revision_number,
  change_type,
  changed_fields,
  metadata_diff,
  created_at
from public.sound_revisions
where sound_id = 123
order by revision_number asc;
```

Get latest revision for each sound in a group:

```sql
select distinct on (sr.sound_id)
  sr.sound_id,
  sr.revision_number,
  sr.changed_fields,
  sr.created_at
from public.sound_revisions sr
join public.sounds s on s.id = sr.sound_id
where s.track_group_name = 'art-dealer'
order by sr.sound_id, sr.revision_number desc;
```

Find all revisions where BPM changed:

```sql
select sound_id, revision_number, metadata_diff, created_at
from public.sound_revisions
where metadata_diff ? 'bpm'
order by created_at desc;
```

