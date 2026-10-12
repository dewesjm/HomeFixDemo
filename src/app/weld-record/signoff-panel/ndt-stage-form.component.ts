/* The NDT steps' form (every NDT step and Excavation NDT). Partial / Portion inspected,
   Probationary inspector / Oversight inspector and Penetrant manufacturer / type each share a line;
   Defect Code is drawn below the decision instead (NdtDefectCodeComponent). */
import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StageField, WorkflowStage } from '../../data/workflow';
import { PersonSearchInputComponent } from '../../shared/person-search-input.component';
import { SignoffContext } from './signoff-context';
import { StageFieldComponent } from './stage-field.component';

/* fields drawn inside another field's line, never on their own */
const PAIRED_KEYS = ['portionInspected', 'probationaryInspector', 'oversightInspector', 'penetrantType'];

@Component({
  selector: 'app-ndt-stage-form',
  standalone: true,
  imports: [FormsModule, PersonSearchInputComponent, StageFieldComponent],
  host: { class: 'block' },
  templateUrl: './ndt-stage-form.component.html'
})
export class NdtStageFormComponent {
  ctx = input.required<SignoffContext>();
  stage = input.required<WorkflowStage>();

  fields(): StageField[] {
    return this.ctx().visibleFields(this.stage());
  }

  field(key: string): StageField | undefined {
    return this.fields().find(f => f.key === key);
  }

  /* the fields that start a line (paired ones are drawn inside their partner's line) */
  lineFields(): StageField[] {
    return this.fields().filter(f => !PAIRED_KEYS.includes(f.key) && f.key !== 'defectCode');
  }

  /* the paired lines are full-width blocks already; a break before them only adds an empty line of gap */
  breakBefore(f: StageField): boolean {
    return (this.ctx().startsGroup(this.stage(), f) || f.showIf?.key === 'inspectionType')
      && f.key !== 'partial' && f.key !== 'hasProbationary' && f.key !== 'penetrantManufacturer';
  }

  editable(): boolean {
    return this.ctx().inputsEditable(this.stage(), this.ctx().selectedRouting());
  }
}
