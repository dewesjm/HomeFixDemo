/* Persona selection from ordered Routing Settings rules. */
import { Job } from '../../data/jobs';
import { StageTemplate } from '../model/stage-template';
import { conditionsMatch } from '../conditions-logic/joint-conditions';

export function routingPersona(template: StageTemplate, job: Job): string {
  return template.personaRules?.find(rule => conditionsMatch([rule.when], job))?.persona ?? template.persona ?? '';
}
