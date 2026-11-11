import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';

import { ProcedureFormComponent } from './procedure-form.component';
import { procedures, getProcedure } from '../../../../data/procedures';
import { STORAGE } from '../../../../data/storage-keys';
import { ToastService } from '../../../../shared/toast.service';
import { procedureSections, addSection, addField, SEEDED_SECTION_IDS } from '../../procedure-sections';
import { keepProcedureStores, testProcedure, fakeRouter, fakeRoute } from '../../testing/procedure-test-state';

describe('Procedure form', () => {
  keepProcedureStores();
  let router: jasmine.SpyObj<Router>;
  let toast: ToastService;

  const open = (id?: string) => {
    router = fakeRouter();
    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: router }, { provide: ActivatedRoute, useValue: fakeRoute(id) }],
    });
    toast = TestBed.inject(ToastService);
    const form = TestBed.runInInjectionContext(() => new ProcedureFormComponent());
    form.ngOnInit();
    return form;
  };

  const lastToast = () => toast.messages().at(-1)!;
  const saved = (id: string) => (JSON.parse(localStorage.getItem(STORAGE.procedures)!) as { id: string }[]).find(p => p.id === id);

  beforeEach(() => procedures.set([
    testProcedure('PF-1', { gwp: 'GWP-A', wtn: '01.1-1', extraFields: { baseMetal1Type: '02-CS', baseMetal2Type: '02-CS', phMin: '100' } }),
    testProcedure('PF-ACTIVE', { status: 'active', gwp: 'GWP-B', wtn: '02.2-1', wpsRev: '3' }),
  ]));

  describe('new procedure', () => {
    it('starts with every section ticked and an entry for every field', () => {
      const form = open();
      expect(form.isEdit()).toBeFalse();
      expect(form.form.sectionIds).toEqual(procedureSections().map(s => s.id));
      expect(form.form.extraFields['fillerMetalTypes']).toEqual([]);
      expect(form.form.extraFields['override']).toEqual({ phMin: '', phMax: '', ipMin: '', ipMax: '', note: '' });
    });

    it('creates the procedure, keeping only filled-in values, and returns to the list', () => {
      const form = open();
      Object.assign(form.form, { id: 'PF-NEW', title: 'New', gwp: 'GWP-NEW', wtn: '09.9-1' });
      form.form.extraFields['phMin'] = ' nc ';
      form.togglePick('fillerMetalTypes', 'mil-70s-3');
      form.save();

      const created = getProcedure('PF-NEW')!;
      expect(created.extraFields).toEqual({ phMin: 'NC', fillerMetalTypes: ['mil-70s-3'] });
      expect(saved('PF-NEW')).toBeDefined();
      expect(lastToast().summary).toBe('Created');
      expect(router.navigate).toHaveBeenCalledWith(['/weld-engineering/admin']);
    });

    it('blocks a missing ID, missing GWP/WTN, a duplicate ID or a GWP/WTN pair already used', () => {
      const form = open();
      form.save();
      expect(lastToast().detail).toBe('Procedure ID is required');

      form.form.id = 'PF-1';
      form.save();
      expect(lastToast().detail).toBe('GWP and WTN are required');

      Object.assign(form.form, { gwp: 'GWP-Z', wtn: '01.1-1' });
      form.save();
      expect(lastToast().summary).toBe('Duplicate ID');

      Object.assign(form.form, { id: 'PF-OTHER', gwp: 'GWP-A', wtn: '01.1-1' });
      form.save();
      expect(lastToast().summary).toBe('Duplicate GWP/WTN');

      expect(procedures().length).toBe(2);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('blocks a base metal pair that differs from another WPS under the same GWP', () => {
      const form = open();
      Object.assign(form.form, { id: 'PF-MIX', gwp: 'GWP-A', wtn: '01.1-2' });
      form.form.extraFields['baseMetal1Type'] = '04-AS';
      form.form.extraFields['baseMetal2Type'] = '04-AS';
      form.save();
      expect(lastToast().summary).toBe('Base metal mismatch');
      expect(getProcedure('PF-MIX')).toBeUndefined();
    });

    it('requires required fields only in ticked sections, and checks limits are numbers or NC', () => {
      addSection('Cleaning');
      const cleaning = procedureSections().at(-1)!;
      addField(cleaning.id, { label: 'Solvent', type: 'text', required: true, options: [] });
      const form = open();
      Object.assign(form.form, { id: 'PF-REQ', gwp: 'GWP-REQ', wtn: '05.5-1' });

      form.save();
      expect(lastToast().detail).toBe('Solvent is required.');

      form.toggleSection(cleaning.id);
      form.form.extraFields['phMin'] = 'warm';
      form.save();
      expect(lastToast().detail).toBe('PH Min must be a number or NC.');

      form.form.extraFields['phMin'] = '150';
      form.save();
      expect(getProcedure('PF-REQ')!.sectionIds).not.toContain(cleaning.id);
    });
  });

  describe('editing', () => {
    it('goes back to the list for an unknown WPS', () => {
      open('NOPE');
      expect(router.navigate).toHaveBeenCalledWith(['/weld-engineering/admin']);
    });

    it('edits a copy: nothing changes until Save, and Cancel leaves the procedure as it was', () => {
      const form = open('PF-1');
      expect(form.isEdit()).toBeTrue();
      form.form.title = 'Changed';
      form.addListItem('rules', '  Keep it clean  ');
      form.toggleSection('sec-base-metal');
      expect(getProcedure('PF-1')!.title).toBe('Test procedure');
      expect(getProcedure('PF-1')!.rules).toEqual([]);
      expect(getProcedure('PF-1')!.sectionIds).toEqual([...SEEDED_SECTION_IDS]);

      form.cancel();
      expect(router.navigate).toHaveBeenCalledWith(['/weld-engineering/admin']);
      expect(getProcedure('PF-1')!.title).toBe('Test procedure');
    });

    it('saves an edit; unticking a section hides its values but keeps them', () => {
      const form = open('PF-1');
      form.form.title = 'Changed';
      form.addListItem('rules', 'Rule A');
      form.addListItem('rules', '   ');
      form.addListItem('conditions', 'Cond A');
      form.removeListItem('conditions', 0);
      form.toggleSection('sec-preheat-interpass');
      form.save();

      const p = getProcedure('PF-1')!;
      expect(p.title).toBe('Changed');
      expect(p.rules).toEqual(['Rule A']);
      expect(p.conditions).toEqual([]);
      expect(p.sectionIds).not.toContain('sec-preheat-interpass');
      expect(p.extraFields['phMin']).toBe('100');
      expect(p.revisionHistory).toEqual([]);
      expect(lastToast().summary).toBe('Updated');
    });

    it('needs a revision note to change an Active procedure, and records it in the revision history', () => {
      const form = open('PF-ACTIVE');
      form.form.title = 'Changed';
      form.save();
      expect(lastToast().summary).toBe('Revision note required');
      expect(getProcedure('PF-ACTIVE')!.title).toBe('Test procedure');

      form.revisionNote = '  Raised preheat  ';
      form.save();
      const p = getProcedure('PF-ACTIVE')!;
      expect(p.title).toBe('Changed');
      expect(p.revisionHistory.length).toBe(1);
      expect(p.revisionHistory[0]).toEqual(jasmine.objectContaining({ wpsRev: '3', note: 'Raised preheat', by: 'User' }));
    });
  });
});
