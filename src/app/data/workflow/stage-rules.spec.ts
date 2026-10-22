import { isRoutingLockedField, isDefinitionLockedField } from './stage-rules';

describe('stage rules', () => {
  it('Release to welding and Defer Tack stay locked for Correct but can come off a definition', () => {
    expect(isRoutingLockedField('fitup-insp', 'releaseToWelding')).toBe(true);
    expect(isDefinitionLockedField('fitup-insp', 'releaseToWelding')).toBe(false);
    expect(isRoutingLockedField('fit', 'deferTack')).toBe(true);
    expect(isDefinitionLockedField('fit', 'deferTack')).toBe(false);
    expect(isDefinitionLockedField('repair', 'repairType')).toBe(true);
  });
});
