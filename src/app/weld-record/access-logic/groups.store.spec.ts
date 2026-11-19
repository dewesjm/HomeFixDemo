import { TestBed } from '@angular/core/testing';
import { INSPECTOR_GROUP_ID, signoffPermission } from '../../data/admin-groups';
import { loadGroupHistory } from '../../data/admin-group-history';
import { GroupsStore } from './groups.store';
import { ViewerService } from './viewer.service';

describe('GroupsStore change history', () => {
  let store: GroupsStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(GroupsStore);
    TestBed.inject(ViewerService).select('administrator');
  });

  afterEach(() => localStorage.clear());

  it('starts with the seeded history', () => {
    expect(store.history().length).toBeGreaterThan(0);
  });

  it('records added, changed and deleted groups with who made them', () => {
    const start = store.history().length;
    store.save({ id: 'test', name: 'Testers', description: '', personas: ['Fitting'], allowed: [signoffPermission('fit')] });
    store.save({ ...store.groups().find(g => g.id === 'test')!, name: 'QA', personas: [], allowed: [signoffPermission('vt')] });
    store.remove('test');

    const [added, changed, deleted] = store.history().slice(start);
    expect(added).toEqual(jasmine.objectContaining({ action: 'Added', group: 'Testers', who: 'Alex' }));
    expect(added.changes).toEqual(['Added persona Fitting', 'Granted Sign Fit']);
    expect(changed.changes).toEqual(['Name: "Testers" → "QA"', 'Removed persona Fitting', 'Granted Sign VT', 'Removed Sign Fit']);
    expect(deleted).toEqual(jasmine.objectContaining({ action: 'Deleted', group: 'QA' }));
    expect(deleted.changes).toEqual(['Had Sign VT']);
  });

  it('skips a save that changes nothing and logs a deleted Signoff Type per group', () => {
    const start = store.history().length;
    store.save(store.groups().find(g => g.id === INSPECTOR_GROUP_ID)!);
    expect(store.history().length).toBe(start);

    store.removePermission(signoffPermission('vt'), 'Sign VT');
    const entries = store.history().slice(start);
    expect(entries.map(e => e.group)).toEqual(['Inspector', 'NQC Inspector']);
    expect(entries[0].changes).toEqual(['Removed Sign VT (Signoff Type deleted)']);
  });

  it('records an empty new group and keeps the history after a reload', () => {
    store.save({ id: 'test', name: 'Testers', description: '', personas: [], allowed: [] });
    expect(store.history().at(-1)!.changes).toEqual(['No personas or permissions']);
    expect(loadGroupHistory()).toEqual(store.history());
  });
});
