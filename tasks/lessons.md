# Lessons Learned

## 2026-03-28

- When the user says a planning/control-board concept already exists, do not expand that layer.
- Pivot immediately to implementation of the missing core (in this case: immutable song change history and version-control ledger).
- For future music-versioning tasks, prioritize concrete persistence and query paths (tables, triggers, diffs, UI access) over additional conceptual orchestration docs.
