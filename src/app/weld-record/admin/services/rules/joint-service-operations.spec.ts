import { importantFirst } from '../../../../shared/service-tester-panel/service-operation';
import {
  jointRecordOperations, jointRoutingOperations, jointServiceOperations, jointSignoffOperations,
} from './joint-service-operations';

describe('Weld Record service operations', () => {
  /* the services are only used when a call runs, so none are needed to list the calls */
  const none = {} as never;
  const example = { hull: 'H', drawing: 'D', joint: 'J' };
  const ops = importantFirst([
    ...jointServiceOperations(none, example, []),
    ...jointSignoffOperations(none, example),
    ...jointRoutingOperations(none, example),
    ...jointRecordOperations(none, example),
  ]);

  it('stars the signoff, the joint searches, Joint Details data and routing, and lists them first', () => {
    const starred = ops.filter(o => o.important).map(o => o.name);
    expect(starred).toEqual(['getJoint', 'findJoints', 'searchJoints', 'getRouting', 'signRouting']);
    expect(ops.slice(0, starred.length).map(o => o.name)).toEqual(starred);
  });
});
