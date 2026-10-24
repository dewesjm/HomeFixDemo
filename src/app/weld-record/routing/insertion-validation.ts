/* Configuration validation is independent of execution and persistence. */
import { StageTemplate } from '../model/workflow-types';
import { insertionDefinitionId } from './instance-identity';

export function insertionConfigurationErrors(templates: StageTemplate[]): string[] {
  const errors: string[] = [];
  const edges = new Map<string, string[]>();
  for (const t of templates) {
    const rules = [...(t.thenRules ?? []), ...(t.rejectRules ?? [])];
    const destinations = [...rules.map(r => r.to), t.rejectToStage ?? ''];
    for (const to of destinations) {
      if (!to.startsWith('insert:')) continue;
      const target = templates.find(d => d.id === insertionDefinitionId(to));
      if (!target || target.classification !== 'added' || target.lifecycle !== 'ordinary') {
        errors.push(`${t.label}: insertion target is not an ordinary inserted routing.`);
      }
    }
    edges.set(t.id, rules.filter(r => !r.when.length).map(r => insertionDefinitionId(r.to)).filter(Boolean));
    if (insertionDefinitionId(t.rejectToStage ?? '')) edges.get(t.id)!.push(insertionDefinitionId(t.rejectToStage!));
  }
  const visited = new Set<string>();
  const path = new Set<string>();
  function visit(id: string): boolean {
    if (path.has(id)) return true;
    if (visited.has(id)) return false;
    path.add(id);
    if ((edges.get(id) ?? []).some(visit)) return true;
    path.delete(id);
    visited.add(id);
    return false;
  }
  if (templates.some(t => visit(t.id))) errors.push('Unconditional insertion cycle: add conditions or a continuation destination.');
  return [...new Set(errors)];
}
