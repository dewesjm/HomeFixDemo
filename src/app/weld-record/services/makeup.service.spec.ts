import { TestBed } from '@angular/core/testing';
import { MakeupService } from './makeup.service';
import { ViewerService } from '../access-logic/viewer.service';
import { makeupGrants, saveMakeupGrants } from '../../data/makeup-grants';
import { makeupDate } from '../makeup-logic/makeup-rules';

/* a date `days` from today, as Makeup stores it */
const inDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return makeupDate(d);
};

describe('MakeupService', () => {
  let svc: MakeupService;
  let viewer: ViewerService;
  const refused = (title: string) => jasmine.objectContaining({ ok: false, title });
  const today = makeupDate();

  beforeEach(() => {
    localStorage.clear();
    saveMakeupGrants([]);
    TestBed.configureTestingModule({});
    svc = TestBed.inject(MakeupService);
    viewer = TestBed.inject(ViewerService);
  });

  afterEach(() => { saveMakeupGrants([]); localStorage.clear(); });

  it('lets a foreman add, change and revoke their own grants', () => {
    viewer.select('foreman');
    const added = svc.addMakeupGrant('E10238', today, today);
    if (!added.ok) throw new Error(added.error);
    const id = added.data.id;
    expect(makeupGrants().find(g => g.id === id)).toEqual(jasmine.objectContaining({ personId: 'E10238', foremanId: 'foreman' }));

    expect(svc.updateMakeupGrant(id, today, inDays(1))).toEqual({ ok: true, data: { id } });
    expect(makeupGrants().find(g => g.id === id)?.endDate).toBe(inDays(1));
    expect(svc.revokeMakeupGrant(id)).toEqual({ ok: true, data: { id } });
    expect(makeupGrants().length).toBe(0);
    expect(svc.revokeMakeupGrant(id)).toEqual(refused('Not found'));
    expect(svc.updateMakeupGrant('no-such-grant', today, today)).toEqual(refused('Not found'));
  });

  it('refuses people who are not fitters or welders, bad dates and end dates more than 60 days out', () => {
    viewer.select('foreman');
    expect(svc.addMakeupGrant('foreman', today, today)).toEqual(refused('Wrong value'));
    expect(svc.addMakeupGrant('E10238', today, inDays(-1))).toEqual(refused('Wrong value'));
    expect(svc.addMakeupGrant('E10238', inDays(-1), today)).toEqual(refused('Wrong value'));
    expect(svc.addMakeupGrant('E10238', today, '2026-02-31')).toEqual(refused('Wrong value'));
    expect(svc.addMakeupGrant('E10238', today, inDays(60)).ok).toBeTrue();
    const tooFar = svc.addMakeupGrant('E10238', today, inDays(61));
    expect(tooFar).toEqual(refused('Wrong value'));
    expect(!tooFar.ok && tooFar.error).toBe("End date can't be more than 60 days out.");
  });

  it('needs Manage Makeup to change grants and Makeup access to list them', () => {
    viewer.select('fitter');
    expect(svc.addMakeupGrant('E10238', today, today)).toEqual(refused('Access denied'));
    viewer.select('view');
    expect(svc.getMakeupGrants()).toEqual(refused('Access denied'));
  });

  it('shows a foreman their own grants and Developer every grant', () => {
    saveMakeupGrants([
      { id: 'mine', personId: 'E10238', foremanId: 'foreman', startDate: today, endDate: today, changedBy: 'Morgan' },
      { id: 'theirs', personId: 'E10238', foremanId: 'other-foreman', startDate: today, endDate: today, changedBy: 'Someone' },
    ]);
    viewer.select('foreman');
    const own = svc.getMakeupGrants();
    expect(own.ok && own.data.map(g => g.id)).toEqual(['mine']);
    viewer.select('developer');
    const all = svc.getMakeupGrants();
    expect(all.ok && all.data.map(g => g.id)).toEqual(['mine', 'theirs']);
  });
});
