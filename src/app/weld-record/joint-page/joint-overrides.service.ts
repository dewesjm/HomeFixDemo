/* The joint page's overrides for one visit: Foreman Override entries, the engineering override
   reason given on a step, and the deviations a sign-off would accept. Provided by JointPageComponent,
   so this state lives exactly as long as the page. */
import { Injectable, inject, signal } from '@angular/core';
import { Job } from '../../data/jobs';
import { JobWorkflow, StageField, WorkflowStage, DeviationItem, ACTUAL_REQUIREMENT, ENGINEERING_ENTRY_KEYS, displayValue } from '../../data/workflow';
import { ASSIGNED_KEYS } from '../../data/weld-assignment';
import { detectDeviations, isActualOutOfRange, BaseMetals } from '../../data/deviations';
import { testUserQuals } from '../../data/qualifications';
import { conditionQuals } from '../../data/qual-conditions';
import { ConfirmService } from '../../shared/confirm.service';
import { RoutingService } from '../services/routing.service';
import { ForemanOverrideService } from '../services/foreman-override.service';
import { WeldAssignmentService } from '../services/weld-assignment.service';
import { EngineeringOverrideService } from '../services/engineering-override.service';

/* what the page hands over: its joint, live workflow, the state as loaded, and its visible fields */
export interface JointOverridesSource {
  job: Job;
  wf: () => JobWorkflow;
  loaded: { stages: Record<string, WorkflowStage> };
  visibleFields: (stage: WorkflowStage) => StageField[];
}

@Injectable()
export class JointOverridesService {
  private confirm = inject(ConfirmService);
  private wfService = inject(RoutingService);
  private foremanOverrideService = inject(ForemanOverrideService);
  private weldAssignment = inject(WeldAssignmentService);
  private engineeringOverrideService = inject(EngineeringOverrideService);

  private src: JointOverridesSource | null = null;

  init(src: JointOverridesSource) { this.src = src; }

  /* Foreman Override entries typed on each unsigned stage, keyed by stage id. Like any other
     unsigned input they're dropped when leaving the joint; signing records them. */
  reported = signal<Record<string, string[]>>({});

  /* reason given on each unsigned engineeringEntry step this visit, keyed by stage id: asked on the
     first value set (or by the Engineering Override button) and recorded against every value set */
  engineeringReason = signal<Record<string, string>>({});

  /* ── Foreman Override ── */

  /* a Foreman Override lets GWP (and so WTN) and Filler Metal Type/Size be picked from the full lists */
  offListUnlocked(stage: WorkflowStage): boolean {
    return (this.reported()[stage.id] ?? []).length > 0;
  }

  hasReported(): boolean {
    return Object.values(this.reported()).some(r => r.length);
  }

  foremanOverride(stage: WorkflowStage) {
    this.confirm.confirm({
      header: `Foreman Override - ${stage.label}`,
      message: 'Describe the deviation and why it is necessary',
      textInput: { label: 'What is being overridden', placeholder: 'e.g. preheat applied with a different method' },
      acceptLabel: 'Override',
      accept: (text) => {
        const t = (text ?? '').trim();
        if (t) this.reported.update(r => ({ ...r, [stage.id]: [...(r[stage.id] ?? []), t] }));
      },
    });
  }

  removeForemanOverride(stage: WorkflowStage, index: number) {
    this.reported.update(r => ({ ...r, [stage.id]: (r[stage.id] ?? []).filter((_, i) => i !== index) }));
    if (this.offListUnlocked(stage) || !this.src) return;
    /* last override removed: back to the external system's values */
    this.weldAssignment.apply(this.src.job, stage.id);
  }

  /* GWP, WTN and Filler Metal Type/Size come from the external system; only a Foreman Override,
     or the system sending nothing (engineering override), opens them */
  assignedLocked(stage: WorkflowStage, key: string): boolean {
    if (stage.engineeringEntry) return this.engineeringLocked(stage, key);
    return ASSIGNED_KEYS.has(key) && !this.offListUnlocked(stage);
  }

  fieldWarning(stage: WorkflowStage, key: string): string {
    if (isActualOutOfRange(stage, key)) return 'Out of Range';
    if ((key === 'weldProcedure' || key === 'fillerMetalType' || key === 'fillerMetalSize')
        && stage.inputs[key] && this.isOffList(stage, key)) {
      return 'Foreman override';
    }
    return '';
  }

  /* ── Deviations ── */

  private baseMetals(): BaseMetals | undefined {
    const job = this.src?.job;
    return job ? { type1: job.materialType1 ?? '', type2: job.materialType2 ?? '' } : undefined;
  }

  private detect(stage: WorkflowStage, visibleKeys: ReadonlySet<string>): DeviationItem[] {
    return detectDeviations(stage, visibleKeys, testUserQuals(), this.baseMetals(), conditionQuals(this.src?.job));
  }

  private isOffList(stage: WorkflowStage, key: string): boolean {
    const f = stage.fields.find(ff => ff.key === key);
    return !!f && this.detect(stage, new Set([key])).some(d => d.kind === 'off-list' && d.label === f.label);
  }

  private visibleKeys(stage: WorkflowStage): Set<string> {
    return new Set((this.src?.visibleFields(stage) ?? []).map(f => f.key));
  }

  /* detected deviations, for the acceptance screen. Off-list GWP/filler picked under a Foreman
     Override belong to the override instead (no hold), see stageOverrideOffList. */
  stageDeviations(stage: WorkflowStage): DeviationItem[] {
    const items = this.detect(stage, this.visibleKeys(stage));
    return this.offListUnlocked(stage) ? items.filter(d => d.kind !== 'off-list') : items;
  }

  private stageOverrideOffList(stage: WorkflowStage): DeviationItem[] {
    if (!this.offListUnlocked(stage)) return [];
    return this.detect(stage, this.visibleKeys(stage)).filter(d => d.kind === 'off-list');
  }

  /* ── Engineering override ── */

  /* a value saved on an earlier visit is locked until a reason is given again */
  private engineeringLocked(stage: WorkflowStage, key: string): boolean {
    return ENGINEERING_ENTRY_KEYS.has(key) && !this.engineeringReason()[stage.id]
      && !!this.src?.loaded.stages[stage.id]?.inputs[key];
  }

  /* the Engineering Override button: only while something saved is locked */
  engineeringOverrideAvailable(stage: WorkflowStage): boolean {
    return !!stage.engineeringEntry && !this.engineeringReason()[stage.id]
      && stage.fields.some(f => this.engineeringLocked(stage, f.key));
  }

  private askEngineeringReason(stage: WorkflowStage, accepted: () => void, rejected?: () => void) {
    this.confirm.confirm({
      header: `Engineering Override - ${stage.label}`,
      message: 'Give the reason for this engineering override. It is recorded against every value set on this step.',
      textInput: { label: 'Reason' },
      acceptLabel: 'Continue',
      accept: (text) => {
        const t = (text ?? '').trim();
        if (!t) { rejected?.(); return; }
        this.engineeringReason.update(r => ({ ...r, [stage.id]: t }));
        accepted();
      },
      reject: rejected,
    });
  }

  engineeringOverrideClick(stage: WorkflowStage) {
    this.askEngineeringReason(stage, () => {});
  }

  /* an engineering value changed with no reason yet: the value goes in, then the reason is asked;
     cancelling puts the old values back */
  engineeringEdit(stage: WorkflowStage, field: StageField, value: string, apply: () => void) {
    const needsReason = !!stage.engineeringEntry && ENGINEERING_ENTRY_KEYS.has(field.key)
      && !this.engineeringReason()[stage.id] && value !== (stage.inputs[field.key] ?? '');
    if (!needsReason) { apply(); return; }
    const before = { ...stage.inputs };
    apply();
    this.askEngineeringReason(stage, () => {}, () => {
      const src = this.src;
      const cur = src?.wf().stages.find(s => s.id === stage.id);
      if (!src || !cur) return;
      const changes = cur.fields.filter(f => (cur.inputs[f.key] ?? '') !== (before[f.key] ?? ''))
        .map(f => ({ field: f, value: before[f.key] ?? '' }));
      this.wfService.setStageInputs(src.job, stage.id, changes);
    });
  }

  /* the engineering values set this visit (plus an Actual made or unmade NC by a typed requirement) */
  engineeringEdits(stage: WorkflowStage): Record<string, string> {
    const snap = this.src?.loaded.stages[stage.id];
    if (!stage.engineeringEntry || !snap || !this.engineeringReason()[stage.id]) return {};
    const out: Record<string, string> = {};
    for (const f of stage.fields) {
      const v = stage.inputs[f.key] ?? '', was = snap.inputs[f.key] ?? '';
      if (v === was) continue;
      if (ENGINEERING_ENTRY_KEYS.has(f.key)) out[f.key] = v;
      else if (f.key in ACTUAL_REQUIREMENT && (v === 'NC' || was === 'NC')) out[f.key] = v;
    }
    return out;
  }

  /* writes the override to History (and keeps the values when leaving without signing) */
  recordEngineering(stage: WorkflowStage, values: Record<string, string>) {
    const reason = this.engineeringReason()[stage.id];
    if (!this.src || !reason) return;
    const vis = this.src.visibleFields(stage);
    const shown = stage.fields.filter(f => ENGINEERING_ENTRY_KEYS.has(f.key) && f.key in values).map(f => {
      const live = vis.find(v => v.key === f.key) ?? f;
      return { label: f.label, value: displayValue(live, values[f.key]) || '(left blank)' };
    });
    this.engineeringOverrideService.record(this.src.job, stage.id, reason, values, shown);
    this.engineeringReason.update(r => ({ ...r, [stage.id]: '' }));
  }

  /* the steps with an engineering override given this visit and not yet signed, with their values */
  pendingEngineering(stages: WorkflowStage[]): { stage: WorkflowStage; values: Record<string, string> }[] {
    return stages.filter(s => !s.signed && this.engineeringReason()[s.id])
      .map(s => ({ stage: s, values: this.engineeringEdits(s) }));
  }

  /* writes the stage's overrides to History; call right before signing */
  recordOverrides(stage: WorkflowStage) {
    if (!this.src) return;
    this.recordEngineering(stage, this.engineeringEdits(stage));
    this.foremanOverrideService.record(this.src.job, stage.id, this.reported()[stage.id] ?? [], this.stageOverrideOffList(stage));
    this.reported.update(r => ({ ...r, [stage.id]: [] }));
  }
}
