/* The panel under a field on Admin > Signoff Type Forms while one of its rules is open: the
   condition (an AND/OR group, condition-group-editor), and for Prepopulated from the one list of
   fields it can copy. Changes are emitted; the page writes them to the field (definition-edits.ts). */
import { Component, computed, input, output } from '@angular/core';
import { WorkGroup } from './condition-work';
import { CondKind, FillChoice, fillChoiceId } from './definition-edits';
import { ConditionGroupEditorComponent, StepFieldChoice } from './condition-group-editor.component';
import { ChoiceSelectComponent } from './choice-select.component';

@Component({
  selector: 'app-field-condition-editor',
  standalone: true,
  imports: [ConditionGroupEditorComponent, ChoiceSelectComponent],
  templateUrl: './field-condition-editor.component.html',
})
export class FieldConditionEditorComponent {
  kind = input.required<CondKind>();
  group = input.required<WorkGroup>();
  stepFields = input.required<StepFieldChoice[]>();
  /* Prepopulated from only: the chosen source and field, and what can be picked */
  fillStepId = input('');
  fillFieldKey = input('');
  fillChoices = input<FillChoice[]>([]);
  groupChange = output<WorkGroup>();
  fillSourceChange = output<{ fillStepId: string; fillFieldKey: string }>();

  selectedChoiceId = computed(() => this.fillStepId() && this.fillFieldKey() ? fillChoiceId(this.fillStepId(), this.fillFieldKey()) : '');

  /* Nothing, or an entry of the list */
  pick(id: string) {
    const choice = this.fillChoices().find(c => c.id === id);
    this.fillSourceChange.emit({ fillStepId: choice?.stepId ?? '', fillFieldKey: choice?.key ?? '' });
  }
}
