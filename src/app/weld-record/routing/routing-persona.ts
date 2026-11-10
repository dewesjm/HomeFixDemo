/* Persona selection from ordered Routing Settings rules. */
import { Job } from '../../data/jobs';
import { StageTemplate } from '../model/workflow-types';
import { conditionsMatch } from '../conditions/joint-conditions';

export function routingRole(template: StageTemplate, job: Job): string {
  return template.roleRules?.find(rule => conditionsMatch([rule.when], job))?.role ?? template.role ?? '';
}
