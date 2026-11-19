/* What changed between two versions of a group, as History lines for Admin > Groups. before is
   missing for an added group, after for a deleted one. */
import { PERMISSION_CATEGORIES, permissionsIn, type AdminGroup } from '../../data/admin-groups';

export function permissionLabel(key: string): string {
  for (const category of PERMISSION_CATEGORIES) {
    const found = permissionsIn(category).find(permission => permission.key === key);
    if (found) return found.label;
  }
  return key;
}

const added = <T>(from: readonly T[], to: readonly T[]) => to.filter(value => !from.includes(value));

export function groupChanges(before: AdminGroup | undefined, after: AdminGroup | undefined): string[] {
  if (!after) {
    return before ? [
      ...before.personas.map(persona => `Had persona ${persona}`),
      ...before.allowed.map(key => `Had ${permissionLabel(key)}`),
    ] : [];
  }
  const from = before ?? { name: after.name, description: after.description, personas: [], allowed: [] };
  const lines: string[] = [];
  if (before && before.name !== after.name) lines.push(`Name: "${before.name}" → "${after.name}"`);
  if (before && before.description !== after.description) lines.push(`Description: "${before.description}" → "${after.description}"`);
  lines.push(
    ...added(from.personas, after.personas).map(persona => `Added persona ${persona}`),
    ...added(after.personas, from.personas).map(persona => `Removed persona ${persona}`),
    ...added(from.allowed, after.allowed).map(key => `Granted ${permissionLabel(key)}`),
    ...added(after.allowed, from.allowed).map(key => `Removed ${permissionLabel(key)}`),
  );
  return lines;
}
