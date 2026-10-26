import type { Job } from './jobs';
import { PROGRESSION_ATTRIBUTE_CODES } from './attribute-codes';

/* Isolated fresh examples keep random multi-attribute combinations out of ordinary demo seeds. */
export function attributeDemoJobs(source: Job): Job[] {
  return PROGRESSION_ATTRIBUTE_CODES.map((attribute, index) => ({
    ...source, id: `AC${String(index + 1).padStart(3, '0')}`, xrefid: `AC${String(index + 1).padStart(3, '0')}`,
    joint: `AC-${String(index + 1).padStart(5, '0')}`, trade: 'Welding',
    nInd: index % 2 ? '1' : '3', _fresh: true,
    attributeCode1: attribute.code, attributeCode2: '', attributeCode3: '', attributeCode4: '',
    attributeLocation: 'Shop', attributeGtaWeld: 'Yes',
    ndtRoot: 'PT', ndtEach: 'PT', ndtFinal: 'MT', rtRoot: '100', rtFinal: '100',
    engineeringNotes: `Attribute example ${attribute.code}: provisional demo interpretation; see ATTRIBUTE-CODES-PLAN.md.`,
  }));
}
