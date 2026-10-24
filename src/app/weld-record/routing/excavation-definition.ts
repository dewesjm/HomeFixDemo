/* The logical Excavation target selects exactly one configured specialized definition. */
import { Job } from '../../data/jobs';
import { conditionsMatch } from './step-conditions';
import { getTemplates } from './stage-templates';
import { RoutingConfigurationError } from './generic-insertion';

export function excavationDefinition(job: Job) {
  const matches = getTemplates()[job.trade].filter(t => t.lifecycle === 'excavation'
    && t.status === 'active' && conditionsMatch(t.includeWhen, job, []));
  if (matches.length !== 1) throw new RoutingConfigurationError(
    `Cannot insert Excavation NDT: expected one applicable active definition, found ${matches.length}. Check Included when in Routing Settings.`);
  return matches[0];
}
