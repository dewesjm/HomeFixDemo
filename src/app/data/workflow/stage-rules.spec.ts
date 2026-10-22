import { isRoutingLockedField, isDefinitionLockedField } from './stage-rules';

describe('stage rules', () => {
  it('Release to welding stays locked for Correct but can come off a definition', () => {
    expect(isRoutingLockedField('fitup-insp', 'releaseToWelding')).toBe(true);
    expect(isDefinitionLockedField('fitup-insp', 'releaseToWelding')).toBe(false);
    expect(isDefinitionLockedField('fit', 'deferTack')).toBe(true);
    expect(isDefinitionLockedField('repair', 'repairType')).toBe(true);
  });
});
