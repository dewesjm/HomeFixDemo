import { readdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import ts from 'typescript';

const app = resolve(import.meta.dirname, '../src/app');
const engineering = 'future/weld-engineering/';
const procedureStore = 'data/procedures';
const procedureReads = engineering + 'procedure-service/procedure-usage';
const recordReferences = 'weld-record/reference-data-service/reference-data-service';
const violations = [];

for (const entry of readdirSync(app, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.ts') || entry.name.endsWith('.spec.ts')) continue;
  const file = resolve(entry.parentPath, entry.name);
  const source = relative(app, file).split(sep).join('/');
  const isEngineering = source.startsWith(engineering) || source === procedureStore + '.ts';
  const ast = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest);
  for (const statement of ast.statements) {
    if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue;
    const specifier = statement.moduleSpecifier;
    if (!specifier || !ts.isStringLiteral(specifier) || !specifier.text.startsWith('.')) continue;
    const target = relative(app, resolve(dirname(file), specifier.text)).split(sep).join('/').replace(/\.ts$/, '');
    const isShellRoute = source === 'app.routes.ts';
    if (!isEngineering && !isShellRoute &&
        (target === procedureStore || (target.startsWith(engineering) && target !== procedureReads))) {
      violations.push(`${source} imports ${target}. Use Weld Engineering's procedure reads.`);
    }
    if (isEngineering && (
      (target.startsWith('weld-record/') && target !== recordReferences) ||
      target.startsWith('future/weld-planning/') ||
      ['data/jobs', 'data/weld-planning', 'data/weld-positions', 'data/qualifications'].includes(target)
    )) {
      violations.push(`${source} imports ${target}. Use shared code or a published service.`);
    }
  }
}

if (violations.length) {
  console.error(violations.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Weld Engineering import boundaries passed.');
}
