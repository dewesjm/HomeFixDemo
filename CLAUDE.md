# Project rules

Read ARCHITECTURE.md first, and ROUTING.md for routing rules.

## Keep code organized for a human reader
- One concern per file. A new feature's logic goes in the file or service that owns that concern, not in
  whatever file is already open. If nothing owns it, make a new file.
- Components wire things together; rules (validation, visibility, option lists, routing) are plain
  functions in the feature folder of the concern they belong to (e.g. `weld-record/routing/`,
  `weld-record/signoff-definition/`, `weld-record/joint-page/rules/`) or a `weld-record/services/`
  service, where they can be unit tested.
- `data/` holds seed data and stored lookup tables only (records, their model, load/save), never rules.
- Don't build a monolith. Break code up the way a person would to read it: when a file or component
  starts handling several separate things, split it along those lines rather than adding another branch.
- Comments describe what the code does now. Dates, "used to", and who asked for what go in git
  history and the Change Log (`data/changelog.ts`), not in comments.
- Delete dead code. The exception is a feature deliberately switched off by a flag: keep it working,
  with a comment saying it is switched off and kept so it can be turned back on without a rewrite.
