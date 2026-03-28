# Music Source Control Research TODO

## Plan

- [x] Document current state in this repo (`version`, `track_group_name`, filename metadata parsing).
- [x] Define a domain-split JSON model for music projects (arrangement, assets, mix, automation, collaborators).
- [x] Propose a Git-friendly change tracking strategy (diffs, merge conflict reduction, history/auditability).
- [x] Map a migration path from `v1/v2` filename versioning to manifest + structured metadata.
- [x] Add a short review section with recommended next implementation steps.
- [x] Incorporate additional inspiration: common base asset + metadata deltas + final merge workflow.

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
