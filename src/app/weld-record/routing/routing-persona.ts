/* Persona selection from ordered Routing Settings rules. */
import { Job } from '../../data/jobs';
import { StageTemplate } from '../model/workflow-types';
import { conditionsMatch } from '../conditions/joint-conditions';

/* Sold's persona follows whichever Records Review the joint got */
export const closingRole = (hasO63Review: boolean) => hasO63Review ? 'O63 Records' : 'O04 Records';

export function routingRole(template: StageTemplate, job: Job): string {
  return template.roleRules?.find(rule => conditionsMatch([rule.when], job))?.role ?? template.role ?? '';
}
