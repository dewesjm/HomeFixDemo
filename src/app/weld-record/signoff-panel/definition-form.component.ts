/* A step's form drawn from its Signoff Type Definition, while the Layout from Signoff Type Definition
   toggle is on (drawsFromDefinition()): its fields in definition order, on the lines and under the
   headings and boxes the definition sets (layoutSections()). Pre-Fit/Fit's sign-off fields sit among
   them, shown while the step is required, as the built-in Fit form is. The verify grids use it for the
   fields they list besides their grid rows (`except` leaves the rows out). */
import { Component, input } from '@angular/core';
import { LayoutSection, SignoffField, StageField, WorkflowStage, drawnOutsideForm, getActivationForStep, layoutSections } from '../../data/workflow';
import { AffectedItemComponent } from './affected-item.component';
import { DefinitionFieldComponent } from './definition-field.component';
import { SignoffContext } from './signoff-context';

/* what a key on the form draws: a step field, a sign-off field, or Weld Build-Up's Affected Item */
type Cell = { kind: 'stage'; field: StageField } | { kind: 'signoff'; field: SignoffField } | { kind: 'affectedItem' };

@Component({
  selector: 'app-definition-form',
  standalone: true,
  imports: [AffectedItemComponent, DefinitionFieldComponent],
  host: { class: 'block' },
  template: `
    @let st = stage();
    @let cells = cellMap();
    <div class="flex flex-col gap-3">
      @for (sec of sections(cells); track $index) {
        <div class="flex flex-col gap-2" [class.signoff-card]="sec.box">
          @if (sec.title) { <div class="signoff-card-title !mb-0">{{ sec.title }}</div> }
          @for (part of sec.parts; track $index) {
            @if (part.kind === 'heading') {
              <div class="font-semibold text-sm -mb-1">{{ part.text }}</div>
            } @else {
              <!-- fields on a line share its width; a checkbox takes only what it needs, level with the
                   boxes beside it -->
              @let mixed = hasCheckboxAndBox(part.keys, cells);
              <div class="flex flex-wrap items-start gap-x-4 gap-y-2">
                @for (key of part.keys; track key) {
                  @let cell = cells.get(key)!;
                  @if (cell.kind === 'affectedItem') {
                    <app-affected-item class="w-full" [ctx]="ctx()" [stage]="st" />
                  } @else {
                    <app-definition-field [class]="cell.field.type !== 'checkbox' ? 'flex-1 min-w-40' : mixed ? 'flex-none flex items-center min-h-10 mt-6' : 'flex-none'"
                                          [ctx]="ctx()" [stage]="st" [field]="cell.field" [signoff]="cell.kind === 'signoff'" />
                  }
                }
              </div>
            }
          }
        </div>
      }
    </div>
  `
})
export class DefinitionFormComponent {
  ctx = input.required<SignoffContext>();
  stage = input.required<WorkflowStage>();
  /* keys another part of the step's form draws */
  except = input<(key: string) => boolean>(() => false);

  /* every key the form draws right now; a key not in it is hidden by its rules or drawn elsewhere */
  cellMap(): Map<string, Cell> {
    const st = this.stage();
    const cells = new Map<string, Cell>();
    for (const field of this.ctx().visibleFields(st)) cells.set(field.key, { kind: 'stage', field });
    if (st.required) for (const field of this.ctx().visibleSignoffFields(st)) cells.set(field.key, { kind: 'signoff', field });
    if (getActivationForStep(st).fields.some(a => a.key === 'affectedItem')) cells.set('affectedItem', { kind: 'affectedItem' });
    for (const key of [...cells.keys()]) if (drawnOutsideForm(st, key) || this.except()(key)) cells.delete(key);
    return cells;
  }

  hasCheckboxAndBox(keys: string[], cells: Map<string, Cell>): boolean {
    const types = keys.map(k => { const c = cells.get(k)!; return c.kind === 'affectedItem' ? '' : c.field.type; });
    return types.includes('checkbox') && types.some(t => t && t !== 'checkbox');
  }

  sections(cells: Map<string, Cell>): LayoutSection[] {
    return layoutSections(getActivationForStep(this.stage()).fields, key => cells.has(key));
  }
}
