# Music Source Control Research: Domain-Split JSON

## Why this research

Current workflow is mostly "new file per revision" (`v1`, `v2`, `v3`) and inferred grouping through title similarity.
This works, but it has known issues:

- Duplicate files and metadata drift over time.
- Hard to answer "what changed between versions?" in a structured way.
- Merge conflicts happen at the full-file level instead of domain level.
- Collaboration is difficult when editing the same project in parallel.

The idea behind **domain-split JSON** is: store one project as multiple small JSON documents, each aligned to a concern (arrangement, automation, mix, assets, etc.) so source control can diff and merge them independently.

---

## Current state in this repository (relevant signals)

The codebase already has early versioning/grouping concepts:

- `Track.version` (e.g. `v1.0`, `v2.0`) in `app/types/track.ts`.
- `track_group_name` for grouping versions of the same musical idea.
- Filename metadata parsing in `app/utils/parseFileName.ts` for:
  - BPM extraction
  - Version extraction
  - Artist/title normalization
- Title normalization and fuzzy grouping in `app/utils/trackGroups.ts`.
- Logic preferring newest/highest version in `app/utils/uniqueGroupShuffle.ts`.

So this repo is already modeling music revisions. Domain-split JSON extends this from naming conventions into structured, mergeable project data.

---

## What "domain-split JSON" means (for music projects)

Instead of one monolithic project file, split into stable JSON documents:

```text
project/
  manifest.json
  composition/arrangement.json
  composition/markers.json
  production/instruments.json
  production/midi_regions.json
  mix/channels.json
  mix/sends.json
  automation/volume.json
  automation/filter_cutoff.json
  assets/index.json
  assets/waveforms/*.json
```

### Why this helps

- If one producer edits arrangement and another edits mix, they touch different files.
- Git diffs are smaller and human-reviewable.
- Conflicts are localized.
- Change logs can be generated per domain ("mix changed, composition unchanged").

---

## Proposed schema shape (minimal v0)

### 1) `manifest.json`

Single source of truth with pointers and hashes:

```json
{
  "schemaVersion": "1.0.0",
  "projectId": "a89f4d62-8d0c-4c3d-9e8a-2ea6431f0f9b",
  "title": "Art Dealer",
  "bpm": 150,
  "key": "F#m",
  "domains": {
    "arrangement": "composition/arrangement.json",
    "mixChannels": "mix/channels.json",
    "automationVolume": "automation/volume.json",
    "assets": "assets/index.json"
  },
  "assetPolicy": {
    "audioStorage": "lfs-or-object-storage",
    "hashAlgorithm": "sha256"
  }
}
```

### 2) `composition/arrangement.json`

```json
{
  "timelineTicksPerBeat": 960,
  "sections": [
    { "id": "sec_intro", "name": "Intro", "startBar": 1, "endBar": 9 },
    { "id": "sec_drop1", "name": "Drop 1", "startBar": 33, "endBar": 49 }
  ],
  "clips": [
    {
      "id": "clip_1",
      "trackId": "trk_kick",
      "assetId": "asset_kick_loop_01",
      "startTick": 0,
      "lengthTicks": 30720,
      "gainDb": -2.0
    }
  ]
}
```

### 3) `mix/channels.json`

```json
{
  "channels": [
    {
      "id": "trk_kick",
      "name": "Kick",
      "faderDb": -5.5,
      "pan": 0.0,
      "plugins": [
        {
          "slot": 1,
          "pluginId": "com.example.eq",
          "state": { "lowShelfHz": 120.0, "lowShelfGainDb": -1.5 }
        }
      ]
    }
  ]
}
```

### 4) `automation/volume.json`

```json
{
  "lanes": [
    {
      "target": "trk_kick.faderDb",
      "points": [
        { "tick": 0, "value": -5.5, "curve": "linear" },
        { "tick": 30720, "value": -4.2, "curve": "easeInOut" }
      ]
    }
  ]
}
```

### 5) `assets/index.json`

```json
{
  "assets": [
    {
      "id": "asset_kick_loop_01",
      "type": "audio",
      "uri": "s3://bucket/audio/kick_loop_01.wav",
      "sha256": "f1e2d3...",
      "sampleRate": 48000,
      "channels": 2,
      "durationSec": 1.28
    }
  ]
}
```

---

## Can this work for "music files" specifically?

Yes, with one key clarification:

- **Large binary audio files** (`.wav`, `.aiff`, stems) should not be raw Git text-tracked at scale.
- Store binaries in **Git LFS** and/or object storage (S3/Supabase), and track references + hashes in JSON.

So the Git-tracked truth becomes:
1) domain JSON files
2) asset pointers/hashes
3) optional lightweight previews/waveform summaries

This gives text diff/merge for project structure while still handling heavy audio safely.

---

## How change tracking becomes better than `v1/v2`

With domain-split JSON, each commit can answer:

- Which domain changed? (arrangement vs mix vs automation)
- Which entities changed? (clip, channel, plugin param, lane point)
- Was it additive/removal/modification?
- Which collaborator touched which domain?

### Practical diff examples

- `composition/arrangement.json` changed only section boundaries -> "arrangement edit".
- `mix/channels.json` changed kick EQ low shelf -> "mix tweak".
- `automation/volume.json` added 3 points -> "automation pass".

This is much clearer than seeing only `song_v3_final_reallyfinal.wav`.

---

## Merge strategy

Use deterministic IDs + stable ordering:

- Entity IDs (`clip_123`, `trk_kick`) must be stable.
- Arrays should be sorted by ID/start time where possible.
- Canonical JSON formatting (fixed key order, fixed numeric precision).

With this, automatic merges improve dramatically because independent edits are less likely to touch the same lines.

When conflicts do occur, they are domain-local and easier to resolve.

---

## Inspiration-aligned workflow: common base + metadata deltas + late merge

Your added inspiration maps to a very practical model:

1. Start from one shared base project state (common base).
2. Each collaborator edits in their own branch/workspace.
3. Track only metadata deltas (JSON domain changes), not full binary re-exports.
4. Merge deltas later into the common base.

For music production this means:

- Keep the heavy audio assets immutable and addressable by hash.
- Record timeline/mix/automation decisions as small JSON edits.
- Merge at the domain/entity level at integration time.

This is conceptually the same pattern described for modern video workflows, and it applies well to music sessions too.

### Delta format options

- **State snapshots in Git**: Commit full domain JSON files; Git computes diffs.
- **Explicit patch objects**: Store operation logs (addClip, moveClip, setFader) and materialize state.

For v1 implementation, state snapshots are simpler and already work well with Git tooling.

### Example of a mergeable metadata delta

```json
{
  "baseCommit": "abc123",
  "domain": "mix/channels.json",
  "changes": [
    { "op": "set", "target": "channels[trk_kick].faderDb", "value": -4.5 },
    { "op": "set", "target": "channels[trk_bass].plugins[1].state.drive", "value": 0.22 }
  ]
}
```

Even if one collaborator edits arrangement while another edits mix, these changes merge cleanly because they live in different domains.

---

## Inspiration-aligned usage flow (branch, commit, merge)

To mirror the workflow pattern you shared, define a simple operator flow:

1. Open the project from a workspace script/tooling entry point.
2. Start from a shared base revision (`main` or release branch).
3. Commit the initial project metadata snapshot (`manifest.json` + domains).
4. Create/switch to a feature branch for a focused change set.
5. Make edits in one or more domains (`composition/*`, `mix/*`, `automation/*`).
6. Commit metadata changes in small, reviewable commits.
7. Switch branch again for other work if needed and repeat.
8. Merge branches back after review; resolve only metadata/domain conflicts.
9. Render/export artifacts after merge (derived outputs, not source-of-truth).

### Merge policy for music projects

- Prefer one concern per branch (arrangement branch, mix branch, automation branch).
- Avoid rebasing binary assets frequently; treat assets as immutable pointers when possible.
- If conflicts occur in the same JSON object, prefer semantic resolution:
  - preserve stable IDs
  - preserve chronology (`startTick` ordering)
  - preserve explicit intent (e.g., keep both automation points unless mutually exclusive)
- Require a post-merge validation pass:
  - schema validation
  - asset hash existence check
  - timeline integrity check (no orphan clip references)

This gives the same operational benefits shown in modern editing workflows: multiple contributors can commit independently and merge meaningful timeline/mix changes later.

---

## Inspiration-aligned release orchestration (album control board)

The spreadsheet-style workflow in your latest inspiration points to a second layer above per-song editing:
an **album release control board**.

What it tracks well:

- Song-level metadata (title, BPM, key, duration).
- Section structure checkpoints (verse/chorus/bridge completion).
- Mix iteration status (rough mix, mix, final mix).
- Master and delivery status (mastered, DSP package ready, scheduled release).
- Cross-song consistency checks (loudness target, key transitions, sequence order).

This should be modeled as JSON too (Git-trackable), not only as an external spreadsheet.

### Suggested project addition

```text
release/
  album_board.json
  sequence.json
  delivery_checklist.json
```

### Example `release/album_board.json`

```json
{
  "albumId": "album_bully_2026",
  "title": "Bully",
  "tracks": [
    {
      "trackId": "trk_king",
      "title": "KING",
      "bpm": 98,
      "key": "Dbmin",
      "durationSec": 127,
      "sections": {
        "verse1": "done",
        "chorus1": "done",
        "verse2": "in_progress",
        "chorus2": "planned"
      },
      "mixStatus": "mix_final_candidate",
      "masterStatus": "pending",
      "releaseStatus": "hold",
      "notes": "Waiting on vocal comp pass"
    }
  ],
  "updatedAt": "2026-03-28T00:00:00Z"
}
```

### Why this matters

- Keeps creative production metadata and release operations in the same source-control graph.
- Makes "what is ready to ship?" queryable and auditable.
- Enables branch-based release planning:
  - one branch for sequence/order decisions
  - another for final mix tweaks
  - merge both for release candidate tagging

This mirrors how high-output teams coordinate many tracks simultaneously while still preserving per-track edit history.

---

## Suggested migration path from current repo model

1. **Keep existing fields** (`version`, `track_group_name`) for compatibility.
2. Add a new optional field on track records: `project_manifest_path` (or equivalent).
3. For new uploads/projects, generate a minimal project package:
   - `manifest.json`
   - `assets/index.json`
   - optional starter arrangement/mix docs
4. Keep storing raw audio in current storage path pattern, but record hashes + metadata in `assets/index.json`.
5. Build a "project diff view" using commit comparisons of domain JSON.
6. Add release-level metadata files (`release/album_board.json`, `release/sequence.json`) for multi-track orchestration.
7. Later, deprecate filename-only version semantics as primary source of truth.

---

## Risks and design cautions

- Plugin state portability across DAWs is hard; start with a constrained plugin-state representation.
- JSON schema versioning is mandatory (`schemaVersion`) to avoid migration ambiguity.
- Floating-point churn can create noisy diffs; normalize decimal precision.
- Renames/moves should preserve IDs to keep history traceable.

---

## Recommendation

**Yes, this is feasible and a strong upgrade path** from simple `v1/v2` naming.

Best first implementation slice:

1. Introduce `manifest.json` + `assets/index.json`.
2. Add one editable domain (`composition/arrangement.json`).
3. Add canonical JSON serializer.
4. Add diff summarizer script that emits human-readable change logs.
5. Add branch-based collaboration docs: "start from common base -> commit metadata deltas -> merge at end."
6. Add a minimal `release/album_board.json` schema for album-level readiness tracking.

This delivers immediate value (real change history) without requiring full DAW parity on day one.

