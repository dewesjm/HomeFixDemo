/* Weld Engineering - which procedures use a section or field, and what that blocks in Admin >
   Procedure Sections. Nothing is removed or hidden while a procedure uses it: a section can't be
   removed while it's ticked on any procedure (or holds a locked field), a field can't be removed
   while any procedure shows a value in it, and a field can't move to a section that a procedure
   with a value in it doesn't have ticked. Each block names the procedures to fix first.
   Values left in an unticked section are hidden, so they don't count as in use. */
import { isBlank, sectionValue } from './procedure-field-values';
import { findField, sectionOfField, type ExtraFields, type ProcedureSection } from './procedure-sections';

export interface UsingProcedure { id: string; wtn: string; sectionIds: string[]; extraFields: ExtraFields; }

/* why the change can't be made, and the procedures to change first ('W-101-1 (WTN 05.5-1)') */
export interface UsageBlock { problem: string; procedures: string[]; }

export function procedureName(p: UsingProcedure): string {
  return `${p.id} (WTN ${p.wtn})`;
}

const names = (list: UsingProcedure[]) => list.map(procedureName).sort((a, b) => a.localeCompare(b));

/* procedures showing a value in this field (its section ticked and the value not blank) */
export function proceduresWithValue(key: string, sections: ProcedureSection[], procs: UsingProcedure[]): UsingProcedure[] {
  return procs.filter(p => !isBlank(sectionValue(p, key, sections)));
}

export function sectionRemoveBlock(section: ProcedureSection, procs: UsingProcedure[]): UsageBlock | null {
  if (section.fields.some(f => f.locked)) {
    return { problem: 'It has locked fields. Move them to another section first.', procedures: [] };
  }
  const using = procs.filter(p => p.sectionIds.includes(section.id));
  if (!using.length) return null;
  return { problem: 'These procedures have it ticked. Untick it on each one first:', procedures: names(using) };
}

export function fieldRemoveBlock(key: string, sections: ProcedureSection[], procs: UsingProcedure[]): UsageBlock | null {
  if (findField(key, sections)?.locked) {
    return { problem: 'Locked fields can\'t be removed.', procedures: [] };
  }
  const using = proceduresWithValue(key, sections, procs);
  if (!using.length) return null;
  return { problem: 'These procedures have a value in it. Clear the value on each one first:', procedures: names(using) };
}

export function fieldMoveBlock(
  key: string, targetId: string, sections: ProcedureSection[], procs: UsingProcedure[]
): UsageBlock | null {
  const target = sections.find(s => s.id === targetId);
  if (!target) return null;
  const field = findField(key, sections);
  if (field && sectionOfField(key, sections)?.id !== targetId
      && target.fields.some(f => f.label.toLowerCase() === field.label.toLowerCase())) {
    return { problem: `${target.name} already has a field with that label. Rename one of them first.`, procedures: [] };
  }
  const hidden = proceduresWithValue(key, sections, procs).filter(p => !p.sectionIds.includes(targetId));
  if (!hidden.length) return null;
  return {
    problem: `These procedures have a value in it but don't have ${target.name} ticked. Tick ${target.name} on each one first:`,
    procedures: names(hidden),
  };
}
