/* Persona selection from ordered Routing Settings rules. */
import { Job } from '../../data/jobs';
import { StageTemplate } from '../model/workflow-types';
import { conditionsMatch } from './step-conditions';

export function routingRole(template: StageTemplate, job: Job): string {
  return template.roleRules?.find(rule => conditionsMatch([rule.when], job))?.role ?? template.role ?? '';
}
