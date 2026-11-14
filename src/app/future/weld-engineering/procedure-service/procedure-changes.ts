/* What createProcedure() and updateProcedure() accept: the procedure's own properties, never its
   Revision Record or created/updated stamps (the service keeps those). changesProblem() checks each
   sent property has the right kind of value; the values themselves are checked when saving. */
import { PROCEDURE_STATUS_OPTIONS, type Procedure } from '../../../data/procedures';
import type { ProcedureSection } from '../procedure-sections';

export type ProcedureChanges = Partial<Pick<Procedure,
  'gwp' | 'wtn' | 'title' | 'status' | 'revision' | 'effectiveDate' | 'weldProcess' | 'processType' | 'application'
  | 'rules' | 'conditions' | 'extraFields' | 'sectionIds'>>;

const TEXT_KEYS = ['gwp', 'wtn', 'title', 'revision', 'effectiveDate', 'weldProcess', 'processType', 'application'];
const LIST_KEYS = ['rules', 'conditions'];

const isTextList = (v: unknown) => Array.isArray(v) && v.every(x => typeof x === 'string');

/* a message for the first property that can't be taken, '' when all can */
export function changesProblem(changes: object, sections: ProcedureSection[]): string {
  for (const [key, v] of Object.entries(changes as Record<string, unknown>)) {
    if (TEXT_KEYS.includes(key)) {
      if (typeof v !== 'string') return `${key} needs text.`;
    } else if (LIST_KEYS.includes(key)) {
      if (!isTextList(v)) return `${key} needs a list of text.`;
    } else if (key === 'status') {
      if (!PROCEDURE_STATUS_OPTIONS.some(o => o.value === v)) return `status must be one of ${PROCEDURE_STATUS_OPTIONS.map(o => o.value).join(', ')}.`;
    } else if (key === 'sectionIds') {
      if (!isTextList(v)) return 'sectionIds needs a list of section ids.';
      const unknown = (v as string[]).filter(id => !sections.some(s => s.id === id));
      if (unknown.length) return `No section has the id ${unknown.join(', ')}.`;
    } else if (key === 'extraFields') {
      if (typeof v !== 'object' || v === null || Array.isArray(v)) return 'extraFields needs an object of field key: value.';
    } else {
      return `${key} can't be set. Allowed: ${[...TEXT_KEYS, 'status', ...LIST_KEYS, 'sectionIds', 'extraFields'].join(', ')}.`;
    }
  }
  return '';
}
