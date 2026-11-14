import { TestBed } from '@angular/core/testing';

import { ProcedureSectionsComponent } from './procedure-sections.component';
import { procedures } from '../../../../data/procedures';
import { STORAGE } from '../../../../data/storage-keys';
import { ConfirmService } from '../../../../shared/confirm.service';
import { ToastService } from '../../../../shared/toast.service';
import { procedureSections, findField, sectionOfField } from '../../procedure-sections';
import { keepProcedureStores, testProcedure } from '../../testing/procedure-test-state';

describe('Procedure Sections admin', () => {
  keepProcedureStores();
  let page: ProcedureSectionsComponent;
  let confirm: ConfirmService;
  let toast: ToastService;

  const section = (name: string) => procedureSections().find(s => s.name === name)!;
  const lastToast = () => toast.messages().at(-1)!;
  const savedSections = () => JSON.parse(localStorage.getItem(STORAGE.procedureSections)!) as { name: string }[];

  beforeEach(() => {
    procedures.set([
      testProcedure('PS-1', { wtn: '01.1-1', extraFields: { grooveAngle: '60' } }),
      testProcedure('PS-2', { wtn: '02.2-1', sectionIds: ['sec-base-metal'] }),
    ]);
    TestBed.configureTestingModule({});
    confirm = TestBed.inject(ConfirmService);
    toast = TestBed.inject(ToastService);
    page = TestBed.runInInjectionContext(() => new ProcedureSectionsComponent());
    page.newSectionName = 'Cleaning';
    page.addSection();
  });

  it('adds a section at the end and saves it; a blank or repeated name is refused', () => {
    expect(procedureSections().at(-1)!.name).toBe('Cleaning');
    expect(savedSections().at(-1)!.name).toBe('Cleaning');
    expect(page.newSectionName).toBe('');

    const count = procedureSections().length;
    page.newSectionName = 'cleaning';
    page.addSection();
    expect(lastToast().summary).toBe('Section not added');
    page.newSectionName = '  ';
    page.addSection();
    expect(procedureSections().length).toBe(count);
  });

  it('counts how many procedures have each section ticked', () => {
    expect(page.procedureCount('sec-base-metal')).toBe(2);
    expect(page.procedureCount('sec-joint-design')).toBe(1);
    expect(page.procedureCount(section('Cleaning').id)).toBe(0);
  });

  it('adds a field from the draft and clears the draft; list choices are split on commas', () => {
    const cleaning = section('Cleaning');
    Object.assign(page.draftFor(cleaning.id), { label: 'Method', type: 'list', optionsText: 'Wipe, Brush ,', required: true });
    page.addField(cleaning);
    const f = section('Cleaning').fields[0];
    expect(f).toEqual(jasmine.objectContaining({ key: 'method', label: 'Method', type: 'list', required: true, options: ['Wipe', 'Brush'] }));
    expect(page.choicesText(f)).toBe('Wipe, Brush');
    expect(page.draftFor(cleaning.id).label).toBe('');
  });

  it('refuses a field without a label, and shows where an admin-table field gets its choices', () => {
    const cleaning = section('Cleaning');
    page.addField(cleaning);
    expect(lastToast().summary).toBe('Field not added');
    expect(section('Cleaning').fields).toEqual([]);
    expect(page.choicesText(findField('weldPosition', procedureSections())!)).not.toBe('-');
  });

  it('renames a section or field in place, and Cancel leaves the name as it was', () => {
    const cleaning = section('Cleaning');
    page.startSectionRename(cleaning);
    page.nameDraft = 'Pre-weld Cleaning';
    page.saveSectionRename(cleaning);
    expect(procedureSections().some(s => s.name === 'Pre-weld Cleaning')).toBeTrue();
    expect(page.renamingSection()).toBeNull();

    const gas = section('Gas');
    const field = gas.fields[0];
    page.startFieldRename(field);
    page.nameDraft = 'Shield';
    page.cancelRename();
    expect(findField(field.key, procedureSections())!.label).toBe(field.label);

    page.startFieldRename(field);
    page.nameDraft = gas.fields[1].label;
    page.saveFieldRename(field);
    expect(lastToast().summary).toBe('Field not renamed');
    expect(page.renamingField()).toBe(field.key);
  });

  it('reorders sections and fields', () => {
    const names = () => procedureSections().map(s => s.name);
    page.shiftSection(section('Cleaning'), -1);
    expect(names().slice(-2)).toEqual(['Cleaning', 'Heat Treatment']);

    const gas = section('Gas');
    page.shiftField(gas.fields[0], 1);
    expect(section('Gas').fields.map(f => f.key)).toEqual(['gasFlowRate', 'shieldingGas', 'backingGas']);
  });

  it('removes a section after confirming, but not while procedures have it ticked or it has locked fields', () => {
    page.removeSection(section('Joint Design'));
    expect(page.blocked()!.heading).toBe('Joint Design can\'t be removed.');
    expect(page.blocked()!.procedures).toEqual(['GWP PS-1 / WTN 01.1-1']);

    page.removeSection(section('Base Metal'));
    expect(page.blocked()!.problem).toContain('locked fields');

    page.removeSection(section('Cleaning'));
    expect(page.blocked()).toBeNull();
    expect(section('Cleaning')).toBeDefined();
    confirm.resolve(true);
    expect(section('Cleaning')).toBeUndefined();
  });

  it('removes a field only when no procedure shows a value in it, and never a locked one', () => {
    page.removeField(section('Joint Design'), findField('grooveAngle', procedureSections())!);
    expect(page.blocked()!.procedures).toEqual(['GWP PS-1 / WTN 01.1-1']);

    page.removeField(section('Base Metal'), findField('baseMetal1Type', procedureSections())!);
    expect(page.blocked()!.problem).toBe('Locked fields can\'t be removed.');

    page.removeField(section('Joint Design'), findField('rootOpening', procedureSections())!);
    confirm.resolve(false);
    expect(findField('rootOpening', procedureSections())).toBeDefined();
    page.removeField(section('Joint Design'), findField('rootOpening', procedureSections())!);
    confirm.resolve(true);
    expect(findField('rootOpening', procedureSections())).toBeUndefined();
  });

  it('moves a field to another section, unless that would hide a procedure\'s value', () => {
    const select = document.createElement('select');
    const target = (id: string) => { select.innerHTML = `<option value="${id}"></option>`; select.value = id; return select; };
    const cleaningId = section('Cleaning').id;
    expect(page.moveTargets(section('Gas')).some(s => s.name === 'Gas')).toBeFalse();

    page.moveField(section('Joint Design'), findField('grooveAngle', procedureSections())!, target(cleaningId));
    expect(page.blocked()!.heading).toBe('Groove Angle can\'t be moved.');
    expect(sectionOfField('grooveAngle', procedureSections())!.name).toBe('Joint Design');
    expect(select.value).toBe('');

    page.moveField(section('Base Metal'), findField('baseMetal1Type', procedureSections())!, target(cleaningId));
    expect(page.blocked()).toBeNull();
    expect(sectionOfField('baseMetal1Type', procedureSections())!.name).toBe('Cleaning');
    expect(lastToast().detail).toBe('Base Metal 1 Type to Cleaning');
  });

  it('sets a field\'s width: Auto and Full line at once, pixels once a valid width is typed', () => {
    const gas = () => findField('shieldingGas', procedureSections())!;
    page.setWidthMode(gas(), 'full');
    expect(gas().width).toBe('full');

    page.setWidthMode(gas(), 'px');
    expect(page.widthMode(gas())).toBe('px');
    expect(gas().width).toBe('full');
    page.widthDraft = '30';
    page.saveWidth(gas());
    expect(lastToast().detail).toBe('Width must be at least 60 px.');
    page.widthDraft = '250';
    page.saveWidth(gas());
    expect(gas().width).toBe(250);
    expect(page.sizingField()).toBeNull();
    expect(page.widthText(gas())).toBe('250 px');

    page.startWidthEdit(gas());
    expect(page.widthDraft).toBe('250');
    page.cancelWidth();
    expect(gas().width).toBe(250);

    page.setWidthMode(gas(), 'auto');
    expect(gas().width).toBeUndefined();
    expect(page.widthMode(gas())).toBe('auto');
  });
});
