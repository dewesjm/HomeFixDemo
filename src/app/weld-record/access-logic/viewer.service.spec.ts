import { TestBed } from '@angular/core/testing';
import { getSignoffTypes } from '../../data/signoff-types';
import { ViewerService } from './viewer.service';

describe('ViewerService', () => {
  let viewer: ViewerService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    viewer = TestBed.inject(ViewerService);
  });

  afterEach(() => localStorage.clear());

  it('lets Engineering search, release holds and enter engineering values, but not sign', () => {
    viewer.select('engineering');
    expect(viewer.roles()).toEqual(['Engineering', 'View']);
    expect(viewer.canSearch()).toBeTrue();
    expect(viewer.canViewJoint()).toBeTrue();
    expect(viewer.canViewJointHistory()).toBeTrue();
    expect(viewer.canViewHistoryPage()).toBeTrue();
    expect(viewer.canReleaseEngineeringHold()).toBeTrue();
    expect(viewer.canEnterEngineeringValues()).toBeTrue();
    expect(getSignoffTypes('pipe').some(type => viewer.canSignType('pipe', type.value))).toBeFalse();
    expect(viewer.canEditFabrication()).toBeFalse();
    expect(viewer.canUseLegacyWorkflowActions()).toBeFalse();
    expect(viewer.showRestrictedWorkflowActions()).toBeTrue();
    expect(viewer.canAccessAdmin()).toBeFalse();
  });

  it('keeps hold release and engineering values from other reviewed roles', () => {
    for (const id of ['welder', 'foreman', 'inspector', 'view']) {
      viewer.select(id);
      expect(viewer.canReleaseEngineeringHold()).withContext(id).toBeFalse();
      expect(viewer.canEnterEngineeringValues()).withContext(id).toBeFalse();
    }
    viewer.select('developer');
    expect(viewer.canReleaseEngineeringHold()).toBeTrue();
    expect(viewer.canEnterEngineeringValues()).toBeTrue();
  });
});
