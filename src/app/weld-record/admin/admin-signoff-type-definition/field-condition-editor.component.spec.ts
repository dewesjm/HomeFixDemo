import { TestBed } from '@angular/core/testing';
import { conditionToWork } from './condition-work';
import { FieldConditionEditorComponent } from './field-condition-editor.component';
import { WTN, fillChoiceId } from './definition-edits';

describe('Prepopulated from picker', () => {
  const setup = () => {
    const fixture = TestBed.createComponent(FieldConditionEditorComponent);
    fixture.componentRef.setInput('kind', 'fill');
    fixture.componentRef.setInput('group', conditionToWork(undefined));
    fixture.componentRef.setInput('stepFields', []);
    fixture.componentRef.setInput('fillChoices', [
      { stepId: WTN, key: 'weldProcess', label: 'WTN: Weld Process' },
      { stepId: 'root-weld', key: 'weldProcess', label: 'Root Weld: Weld Process' },
    ]);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const select = () => el.querySelector('select[aria-label="Prepopulated from"]') as HTMLSelectElement;
    const options = () => [...select().options].map(o => o.text.trim());
    return { fixture, el, select, options };
  };

  it('is one list, named by source', () => {
    const { el, options } = setup();
    expect(options()).toEqual(['Nothing', 'WTN: Weld Process', 'Root Weld: Weld Process']);
    expect(el.querySelector('select[aria-label="Field to prepopulate from"]')).toBeNull();
  });

  it('emits the source and field together, and Nothing clears both', () => {
    const { fixture } = setup();
    const emitted: unknown[] = [];
    fixture.componentInstance.fillSourceChange.subscribe(v => emitted.push(v));
    fixture.componentInstance.pick(fillChoiceId('root-weld', 'weldProcess'));
    fixture.componentInstance.pick('');
    expect(emitted).toEqual([{ fillStepId: 'root-weld', fillFieldKey: 'weldProcess' }, { fillStepId: '', fillFieldKey: '' }]);
  });

  it('filters by search, with a clear button once there is text', () => {
    const { fixture, el, options } = setup();
    const clear = () => el.querySelector('[aria-label="Clear Prepopulated from search"]') as HTMLButtonElement | null;
    expect(clear()).toBeNull();
    fixture.componentInstance.fillSearch.set('root');
    fixture.detectChanges();
    expect(options()).toEqual(['Nothing', 'Root Weld: Weld Process']);
    clear()!.click();
    fixture.detectChanges();
    expect(options().length).toBe(3);
    expect(clear()).toBeNull();
  });
});
