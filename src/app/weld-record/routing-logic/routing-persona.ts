/* Persona selection from ordered Routing Settings rules. */
import { Job } from '../../data/jobs';
import { StageTemplate } from '../model/stage-template';
import { conditionsMatch } from '../conditions-logic/joint-conditions';

/* Sold's persona follows whichever Records Review the joint got */
export const closingPersona = (hasO63Review: boolean) => hasO63Review ? 'O63 Records' : 'O04 Records';

export function routingPersona(template: StageTemplate, job: Job): string {
  return template.personaRules?.find(rule => conditionsMatch([rule.when], job))?.persona ?? template.persona ?? '';
}
