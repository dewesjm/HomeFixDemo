/* A step's form, drawn from its Signoff Type Definition: its fields in definition order, on the lines
   and under the headings and boxes the definition sets (layoutSections()), each field at most the
   width the definition gives it. Inspection Results goes where the Layout list places it, while the
   step is required, and so do Pre-Fit/Fit's sign-off fields. The verify-grid rows are drawn together
   as one grid where the first of them is listed. A step with no definition (added in Admin > Routing
   Settings) draws its fields one per line, then Inspection Results. */
import { Component, input } from '@angular/core';
import { DECISION_KEY, FieldActivation, definitionHas, getActivationForStep, hasStepActivation } from '../signoff-definition/step-field-config';
import { LayoutSection, layoutSections } from '../signoff-definition/definition-layout';
import { SignoffField, StageField, WorkflowStage } from '../model/workflow-types';
import { drawnOutsideForm } from '../signoff-definition/signoff-parts';
import { isVerifyRow } from '../signoff-definition/field-catalog';
import { hasDecision } from '../signoff-definition/stage-rules';
import { AffectedItemComponent } from './affected-item.component';
import { DefinitionFieldComponent } from './definition-field.component';
import { SignoffContext } from './signoff-context';
import { SignoffHistoryComponent } from './signoff-history.component';
import { StageDecisionComponent } from './stage-decision.component';
import { VerifyGridComponent } from './verify-grid.component';

/* what a key on the form draws: a step field, a sign-off field, Weld Build-Up's Affected Item,
   Inspection Results, the verify grid's rows, or the joint's Signoff History */
type Cell = { kind: 'stage'; field: StageField } | { kind: 'signoff'; field: SignoffField } | { kind: 'affectedItem' }
  | { kind: 'decision' } | { kind: 'verifyGrid'; rows: StageField[] } | { kind: 'history' };

@Component({
  selector: 'app-definition-form',
  standalone: true,
  imports: [AffectedItemComponent, DefinitionFieldComponent, SignoffHistoryComponent, StageDecisionComponent, VerifyGridComponent],
  host: { class: 'block' },
  template: `
    @let st = stage();
    @let cells = cellMap();
    @let widths = widthMap();
    <div class="flex flex-col gap-3">
      @for (sec of sections(cells); track $index) {
        <div class="flex flex-col gap-2" [class.signoff-card]="sec.box">
          @if (sec.title) { <div class="signoff-card-title !mb-0">{{ sec.title }}</div> }
          @for (part of sec.parts; track $index) {
            @if (part.kind === 'heading') {
              <div class="font-semibold text-sm -mb-1">{{ part.text }}</div>
            } @else {
              <!-- fields on a line share its width, a field with a width up to that much; a checkbox
                   takes only what it needs, level with the boxes beside it -->
              @let mixed = hasCheckboxAndBox(part.keys, cells);
              <div class="flex flex-wrap items-start gap-x-4 gap-y-2">
                @for (key of part.keys; track key) {
                  @let cell = cells.get(key)!;
                  @let width = widths.get(key);
                  @if (cell.kind === 'affectedItem') {
                    <app-affected-item class="w-full" [ctx]="ctx()" [stage]="st" />
                  } @else if (cell.kind === 'decision') {
                    <app-stage-decision class="w-full" [ctx]="ctx()" [stage]="st" />
                  } @else if (cell.kind === 'verifyGrid') {
                    <app-verify-grid class="w-full" [ctx]="ctx()" [stage]="st" [rows]="cell.rows" />
                  } @else if (cell.kind === 'history') {
                    <app-signoff-history class="w-full" [ctx]="ctx()" />
                  } @else if (cell.field.type === 'checkbox') {
                    <app-definition-field [class]="mixed ? 'flex-none flex items-center min-h-10 mt-6' : 'flex-none'"
                                          [ctx]="ctx()" [stage]="st" [field]="cell.field" [signoff]="cell.kind === 'signoff'" />
                  } @else {
                    <app-definition-field class="flex-1" [class.min-w-40]="!width"
                                          [style.max-width.px]="width" [style.min-width.px]="width && minWidth(width)"
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
  /* every key the form draws right now; a key not in it is hidden by its rules or drawn elsewhere */
  cellMap(): Map<string, Cell> {
    const st = this.stage();
    const cells = new Map<string, Cell>();
    const fields = this.ctx().visibleFields(st);
    const rows = fields.filter(f => isVerifyRow(f.key));
    for (const field of fields) {
      if (!isVerifyRow(field.key)) cells.set(field.key, { kind: 'stage', field });
      else if (field === rows[0]) cells.set(field.key, { kind: 'verifyGrid', rows });
    }
    if (st.required) for (const field of this.ctx().visibleSignoffFields(st)) cells.set(field.key, { kind: 'signoff', field });
    if (definitionHas(st, 'affectedItem')) cells.set('affectedItem', { kind: 'affectedItem' });
    if (definitionHas(st, 'signoffHistory')) cells.set('signoffHistory', { kind: 'history' });
    if (st.required && hasDecision(st)) cells.set(DECISION_KEY, { kind: 'decision' });
    for (const key of [...cells.keys()]) if (drawnOutsideForm(key)) cells.delete(key);
    return cells;
  }

  /* the widths the definition gives its fields */
  widthMap(): Map<string, number> {
    return new Map(this.items().flatMap(a => a.width ? [[a.key, a.width] as const] : []));
  }

  /* a field with a width narrows to it, or to 10rem when that's smaller, before the line wraps */
  minWidth(width: number): number {
    return Math.min(width, 160);
  }

  hasCheckboxAndBox(keys: string[], cells: Map<string, Cell>): boolean {
    const types = keys.map(k => { const c = cells.get(k)!; return c.kind === 'stage' || c.kind === 'signoff' ? c.field.type : ''; });
    return types.includes('checkbox') && types.some(t => t && t !== 'checkbox');
  }

  sections(cells: Map<string, Cell>): LayoutSection[] {
    const items = hasStepActivation(this.stage()) ? this.items() : [...cells.keys()].map(key => ({ key }));
    return layoutSections(items, key => cells.has(key));
  }

  private items(): FieldActivation[] {
    return getActivationForStep(this.stage()).fields;
  }
}
