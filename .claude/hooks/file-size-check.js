/* PostToolUse hook: after an Edit/Write to app code, remind Claude when a file has grown past the
   size limit. Organizing code so a person can read it is a project rule (see CLAUDE.md). */
const fs = require('fs');
const path = require('path');

const LIMIT = 600;

let raw = '';
process.stdin.on('data', d => (raw += d));
process.stdin.on('end', () => {
  let file;
  try {
    const input = JSON.parse(raw);
    file = input.tool_input?.file_path ?? input.tool_response?.filePath;
  } catch {
    return;
  }
  if (!file) return;
  const rel = path.relative(process.env.CLAUDE_PROJECT_DIR || process.cwd(), file).split(path.sep).join('/');
  if (!rel.startsWith('src/') || !/\.(ts|html)$/.test(rel) || rel.endsWith('.spec.ts')) return;

  let lines;
  try {
    lines = fs.readFileSync(file, 'utf8').split('\n').length;
  } catch {
    return;
  }
  if (lines <= LIMIT) return;

  const msg = `${rel} is ${lines} lines (limit ${LIMIT}). Project rule: code is organized by concern so a ` +
    `person can read it. Don't keep growing this file: put new logic in the file/service that owns that ` +
    `concern, or split this file along its concerns, and tell the user you did.`;
  process.stdout.write(JSON.stringify({
    systemMessage: `Size check: ${rel} is ${lines} lines (limit ${LIMIT})`,
    hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: msg },
  }));
});
