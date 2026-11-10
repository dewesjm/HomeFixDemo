import { TestBed } from '@angular/core/testing';
import { conditionToWork } from './rules/condition-work';
import { FieldConditionEditorComponent } from './field-condition-editor.component';
import { WTN, fillChoiceId } from './rules/definition-edits';

describe('Prepopulated from picker', () => {
  const setup = () => {
    const fixture = TestBed.createComponent(FieldConditionEditorComponent);
    fixture.componentRef.setInput('kind', 'fill');
    fixture.componentRef.setInput('group', conditionToWork(undefined));
    fixture.componentRef.setInput('stepFields', []);
    fixture.componentRef.setInput('fillChoices', [
      { id: fillChoiceId(WTN, 'weldProcess'), stepId: WTN, key: 'weldProcess', label: 'WTN: Weld Process' },
      { id: fillChoiceId('root-weld', 'weldProcess'), stepId: 'root-weld', key: 'weldProcess', label: 'Root Weld: Weld Process' },
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

  it('has no search box beside the droplist', () => {
    const { el } = setup();
    expect(el.querySelector('input')).toBeNull();
  });
});
