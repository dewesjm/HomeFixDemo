/* The welding steps' form (Tack / Root / Layer / Final / Fit weld build-up): cards laid out by WELD_GROUPS */
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkflowStage, StageField, isReadonlyLimit as readonlyLimit, isFieldLocked, ACTUAL_REQUIREMENT } from '../../data/workflow';
import { qualCheck, testUserQuals, QualCheckResult } from '../../data/qualifications';
import { conditionRequirements } from '../../data/qual-conditions';
import { SignoffContext } from './signoff-context';

/* width applies to every field in the row; widths overrides it for named fields */
interface WeldRow { keys: string[]; width: number | null; widths?: Record<string, number>; spacerBefore?: string }
interface WeldSection {
  title?: string;
  rows: WeldRow[];
  kind?: 'checkbox';
  when?: (st: WorkflowStage, ctx: SignoffContext) => boolean;
}

interface WeldGroup { title?: string; sections: WeldSection[] }

const WELD_GROUPS: WeldGroup[] = [
  { sections: [
    { rows: [{ keys: ['weldProcedure', 'wtn', 'weldProcess'], width: 200, widths: { weldProcedure: 320, wtn: 320 } }] },
    { rows: [{ keys: ['qualificationCheck'], width: 1200 }] },
    { kind: 'checkbox', when: st => st.id === 'root-weld', rows: [{ keys: ['consumableInsertOnly'], width: null }] },
    { rows: [{ keys: ['fillerMetalType', 'fillerMetalSize', 'fillerMetalMic'], width: 160, widths: { fillerMetalMic: 240 } }] },
  ] },
  { title: 'Preheat/Interpass', sections: [
    { title: 'Requirements', rows: [{ keys: ['phMin', 'phMax', 'ipMin', 'ipMax'], width: 150 }] },
    { title: 'Override Requirements', when: (st, ctx) => ctx.hasOverrideFields(st), rows: [
      { keys: ['overridePhMin', 'overridePhMax', 'overrideIpMin', 'overrideIpMax'], width: 150 },
      { keys: ['overrideNote'], width: null },
    ] },
    { title: 'Actuals', rows: [{ keys: ['actualPhMin', 'actualPhMax', 'actualIpMin', 'actualIpMax'], width: 150 }] },
  ] },
  { sections: [
    { when: (_st, ctx) => ctx.job.nInd === '1', rows: [{ keys: ['weldPosition'], width: 200 }] },
  ] },
  { sections: [
    { when: st => st.id === 'root-weld', rows: [{ keys: ['performed5x'], width: 400 }] },
    { rows: [{ keys: ['comments'], width: null }] },
  ] },
];

@Component({
  selector: 'app-weld-stage-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  host: { class: 'block' },
  templateUrl: './weld-stage-form.component.html'
})
export class WeldStageFormComponent {
  ctx = input.required<SignoffContext>();
  stage = input.required<WorkflowStage>();

  weldGroups = WELD_GROUPS;

  /* the conditions the joint and the picked WTN match against the Test User's quals (Admin > Qualifications) */
  qualCheck(): QualCheckResult {
    return qualCheck(testUserQuals(), conditionRequirements(this.ctx().job, this.stage().inputs['wtn']));
  }

  groupVisible(g: WeldGroup): boolean {
    return g.sections.some(sec => this.sectionVisible(sec) && sec.rows.some(r => this.rowFields(r).length > 0));
  }

  sectionVisible(sec: WeldSection): boolean {
    return !sec.when || sec.when(this.stage(), this.ctx());
  }

  rowFields(row: WeldRow): StageField[] {
    const visible = this.ctx().visibleFields(this.stage());
    return row.keys.map(k => visible.find(f => f.key === k)).filter((f): f is StageField => !!f);
  }

  fieldsEditable(): boolean {
    return this.ctx().inputsEditable(this.stage(), this.ctx().selectedRouting());
  }

  isReadonlyLimit(f: StageField): boolean {
    return readonlyLimit(this.stage(), f.key);
  }

  /* also GWP/WTN/filler set by the external system, until a Foreman Override opens them */
  isLocked(f: StageField): boolean {
    return isFieldLocked(this.stage(), f) || this.ctx().assignedLocked(this.stage(), f.key);
  }

  isActual(f: StageField): boolean {
    return f.key in ACTUAL_REQUIREMENT;
  }

  /* strips anything but digits as the user types/pastes (Actual PH/IP only — whole numbers, no
     minus, decimal or scientific notation, unlike a native number input) */
  digitsOnly(input: HTMLInputElement) {
    const clean = input.value.replace(/[^0-9]/g, '');
    if (clean !== input.value) input.value = clean;
  }

  /* A native select shows the chosen option's text when closed, so selects whose options carry
     details (GWP/WTN descriptions) hide that text and overlay just the chosen code instead. */
  hasDetails(f: StageField) {
    return !!f.options?.some(o => o.detail);
  }
  selectedLabel(f: StageField) {
    return f.options?.find(o => o.value === this.stage().inputs[f.key])?.label ?? '';
  }

  onSelect(f: StageField, value: string | null) {
    if (f.key === 'performed5x') this.ctx().on5xChange(this.stage(), value ?? '');
    else this.ctx().stageSelectChange(this.stage(), f, value);
  }
}
