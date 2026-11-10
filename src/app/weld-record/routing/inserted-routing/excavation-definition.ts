/* The logical Excavation target selects exactly one configured specialized definition. */
import { Job } from '../../../data/jobs';
import { conditionsMatch } from '../../conditions/joint-conditions';
import { getTemplates } from '../routing-settings-rules';
import { RoutingConfigurationError } from './routing-configuration-error';

export function excavationDefinition(job: Job) {
  const matches = getTemplates().filter(t => t.lifecycle === 'excavation'
    && t.status === 'active' && conditionsMatch(t.includeWhen, job, []));
  if (matches.length !== 1) throw new RoutingConfigurationError(
    `Cannot insert Excavation NDT: expected one applicable active definition, found ${matches.length}. Check Included when in Routing Settings.`);
  return matches[0];
}
