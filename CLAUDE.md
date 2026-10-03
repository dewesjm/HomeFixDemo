# Project rules

Read ARCHITECTURE.md first, and ROUTING.md for routing rules.

## Keep code organized for a human reader
- One concern per file. A new feature's logic goes in the file or service that owns that concern, not in
  whatever file is already open. If nothing owns it, make a new file.
- Components wire things together; rules (validation, visibility, option lists, routing) live in
  `data/` functions or `weld-record/services/`, where they can be unit tested.
- Keep app files under about 600 lines. A hook (`.claude/hooks/file-size-check.js`) flags any file
  in `src/` over that after each edit; when it fires, split along the file's concerns instead of adding more.
- Comments describe what the code does now. Dates, "used to", and who asked for what go in git
  history and the Change Log (`data/changelog.ts`), not in comments.
- Delete dead code. The exception is a feature deliberately switched off by a flag: keep it working,
  with a comment saying it is switched off and kept so it can be turned back on without a rewrite.
