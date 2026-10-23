/* The panel under a field on Admin > Signoff Type Definition while one of its rules is open: the
   condition (an AND/OR group, condition-group-editor), and for Prepopulated from the step and field it
   copies. Changes are emitted; the page writes them to the field (definition-edits.ts). */
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkGroup } from './condition-work';
import { CondKind } from './definition-edits';
import { ConditionGroupEditorComponent, StepFieldChoice } from './condition-group-editor.component';

@Component({
  selector: 'app-field-condition-editor',
  standalone: true,
  imports: [FormsModule, ConditionGroupEditorComponent],
  templateUrl: './field-condition-editor.component.html',
})
export class FieldConditionEditorComponent {
  kind = input.required<CondKind>();
  group = input.required<WorkGroup>();
  stepFields = input.required<StepFieldChoice[]>();
  /* Prepopulated from only: the chosen source and field, and what can be picked */
  fillStepId = input('');
  fillFieldKey = input('');
  fillSteps = input<{ stepId: string; stepLabel: string }[]>([]);
  fillSourceFields = input<{ key: string; label: string }[]>([]);
  groupChange = output<WorkGroup>();
  fillSourceChange = output<{ fillStepId?: string; fillFieldKey?: string }>();
}
