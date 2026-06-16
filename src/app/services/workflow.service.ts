/* state for each job's workflow; mutations log history + persist */
import { Injectable, WritableSignal, inject, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { JOBS, Job } from '../data/jobs';
import { SyncService } from './sync.service';
import {
  JobWorkflow, HistoryEntry, InstalledComponent, Attachment, StageField, WorkflowStage,
  WorkType, WORK_TYPE_OPTIONS, currentStepLabel, newWorkflow, stageFieldsFor
} from '../data/workflow';
import { conditionLabel } from '../data/conditions';

const dash = (v: string | null | undefined) => (v && v.length ? `“${v}”` : '—');

/* v2: stage model changed to a 5..15 run, ignore older saved workflows */
const LS_KEY = 'homefix:workflows:v2';

@Injectable({ providedIn: 'root' })
export class WorkflowService {
  private sync = inject(SyncService);
  private messages = inject(MessageService);
  private store = new Map<number, WritableSignal<JobWorkflow>>();
  private persisted: Record<number, JobWorkflow> = this.load();
  private seq = Date.now();

  private notify(severity: 'success' | 'info' | 'warn', summary: string, detail?: string) {
    this.messages.add({ severity, summary, detail, life: 3000 });
  }

  /* reactive workflow for a job, built from trade template */
  workflowFor(job: Job): WritableSignal<JobWorkflow> {
    let sig = this.store.get(job.id);
    if (!sig) {
      sig = signal(this.persisted[job.id] ?? newWorkflow(job));
      this.store.set(job.id, sig);
    }
    return sig;
  }

  /* all known workflows, persisted + live */
  allWorkflows(): JobWorkflow[] {
    const merged = new Map<number, JobWorkflow>();
    for (const [id, wf] of Object.entries(this.persisted)) merged.set(Number(id), wf);
    for (const [id, sig] of this.store) merged.set(id, sig());   // live overrides persisted
    return [...merged.values()];
  }

  // --- Stage inputs -------------------------------------------------------
  setStageInput(job: Job, stageId: string, field: StageField, value: string) {
    this.workflowFor(job).update(wf => {
      const prev = wf.stages.find(s => s.id === stageId)?.inputs[field.key] ?? '';
      const stages = wf.stages.map(s =>
        s.id === stageId ? { ...s, inputs: { ...s.inputs, [field.key]: value } } : s);
      const stage = stages.find(s => s.id === stageId)!;
      const unit = field.unit ? ` ${field.unit}` : '';
      return this.withHistory(wf, { ...wf, stages }, {
        section: 'Stages',
        who: wf.technician,
        change: `Stage “${stage.label}” — ${field.label}: ${dash(prev)} → ${dash(value ? value + unit : value)}`
      });
    });
    this.persist();
  }

  // --- Attachments --------------------------------------------------------
  addAttachment(job: Job, name: string) {
    this.workflowFor(job).update(wf => {
      const att: Attachment = { id: `a${++this.seq}`, name, addedBy: wf.technician, addedAt: new Date().toISOString() };
      return this.withHistory(wf, { ...wf, attachments: [...wf.attachments, att] }, {
        section: 'Attachments',
        who: wf.technician,
        change: `Attachment added: ${name}`
      });
    });
    this.persist();
    this.notify('success', 'Attachment added', name);
  }

  removeAttachment(job: Job, id: string) {
    this.workflowFor(job).update(wf => {
      const att = wf.attachments.find(a => a.id === id);
      return this.withHistory(wf, { ...wf, attachments: wf.attachments.filter(a => a.id !== id) }, {
        section: 'Attachments',
        who: wf.technician,
        change: `Attachment removed: ${att?.name ?? id}`
      });
    });
    this.persist();
    this.notify('info', 'Attachment removed');
  }

  // --- Work Validation (installed components) -----------------------------
  addComponent(job: Job, name: string, partNumber: string, quantity: number) {
    this.workflowFor(job).update(wf => {
      const comp: InstalledComponent = { id: `c${++this.seq}`, name, partNumber, quantity };
      const components = [...wf.components, comp];
      const pn = partNumber ? `, P/N ${partNumber}` : '';
      return this.withHistory(wf, { ...wf, components }, {
        section: 'Work Validation',
        who: wf.technician,
        change: `Added component: ${name} (×${quantity}${pn})`
      });
    });
    this.persist();
    this.notify('success', 'Component added', name);
  }

  removeComponent(job: Job, id: string) {
    this.workflowFor(job).update(wf => {
      const comp = wf.components.find(c => c.id === id);
      const components = wf.components.filter(c => c.id !== id);
      return this.withHistory(wf, { ...wf, components }, {
        section: 'Work Validation',
        who: wf.technician,
        change: `Removed component: ${comp?.name ?? id}`
      });
    });
    this.persist();
    this.notify('info', 'Component removed');
  }

  setValidationNotes(job: Job, notes: string) {
    this.workflowFor(job).update(wf => {
      const prev = wf.validationNotes ?? '';
      return this.withHistory(wf, { ...wf, validationNotes: notes }, {
        section: 'Work Validation',
        who: wf.technician,
        change: `Validation notes: ${dash(prev)} → ${dash(notes)}`
      });
    });
    this.persist();
  }

  /* label for a work-type value */
  private workTypeLabel(v: WorkType | null): string {
    return v ? WORK_TYPE_OPTIONS.find(o => o.value === v)?.label ?? v : '—';
  }

  setWorkType(job: Job, workType: WorkType | null) {
    this.workflowFor(job).update(wf => {
      const prev = wf.workType ?? null;
      return this.withHistory(wf, { ...wf, workType }, {
        section: 'Work Validation',
        who: wf.technician,
        change: `Work type: ${this.workTypeLabel(prev)} → ${this.workTypeLabel(workType)}`
      });
    });
    this.persist();
  }

  /* format a condition code for display */
  private conditionDesc(code: string): string {
    if (!code) return '—';
    const label = conditionLabel(code);
    return label ? `${code} (${label})` : code;
  }

  setConditionCode(job: Job, conditionCode: string) {
    this.workflowFor(job).update(wf => {
      const prev = wf.conditionCode ?? '';
      return this.withHistory(wf, { ...wf, conditionCode }, {
        section: 'Work Validation',
        who: wf.technician,
        change: `Condition code: ${this.conditionDesc(prev)} → ${this.conditionDesc(conditionCode)}`
      });
    });
    this.persist();
  }

  setConditionCount(job: Job, conditionCount: number) {
    this.workflowFor(job).update(wf => {
      const prev = wf.conditionCount ?? 0;
      return this.withHistory(wf, { ...wf, conditionCount }, {
        section: 'Work Validation',
        who: wf.technician,
        change: `Number of conditions: ${prev} → ${conditionCount}`
      });
    });
    this.persist();
  }

  // --- Per-stage sign-off -------------------------------------------------
  /* patch a stage's sign-off fields and log it */
  updateStageSignoff(job: Job, stageId: string, patch: Partial<WorkflowStage>, change: string) {
    this.workflowFor(job).update(wf => {
      const stages = wf.stages.map(s => (s.id === stageId ? { ...s, ...patch } : s));
      const st = stages.find(s => s.id === stageId)!;
      return this.withHistory(wf, { ...wf, stages }, {
        section: 'Sign-off',
        who: st.inspectorName || wf.technician,
        change
      });
    });
    this.persist();
  }

  /* lock a stage's sign-off and advance */
  signStage(job: Job, stageId: string) {
    this.workflowFor(job).update(wf => {
      const stages = wf.stages.map(s =>
        s.id === stageId ? { ...s, signed: true, signedAt: new Date().toISOString() } : s);
      const st = stages.find(s => s.id === stageId)!;
      const decision = (st.result ?? '').toUpperCase();
      return this.withHistory(wf, { ...wf, stages }, {
        section: 'Sign-off',
        who: st.inspectorName || wf.technician,
        change: `Stage “${st.label}” signed — ${decision} by ${st.inspectorName || 'inspector'}`
      });
    });
    this.persist();
    this.notify('success', 'Stage signed off');
  }

  /* re-open a signed stage for edits */
  reopenStage(job: Job, stageId: string) {
    this.workflowFor(job).update(wf => {
      const stages = wf.stages.map(s =>
        s.id === stageId ? { ...s, signed: false, signedAt: null } : s);
      const st = stages.find(s => s.id === stageId)!;
      return this.withHistory(wf, { ...wf, stages }, {
        section: 'Sign-off',
        who: st.inspectorName || wf.technician,
        change: `Stage “${st.label}” sign-off re-opened`
      });
    });
    this.persist();
    this.notify('info', 'Sign-off re-opened');
  }

  // --- internals ----------------------------------------------------------
  private withHistory(prev: JobWorkflow, next: JobWorkflow, e: Omit<HistoryEntry, 'when' | 'step'>): JobWorkflow {
    const entry: HistoryEntry = {
      ...e,
      when: new Date().toISOString(),
      step: currentStepLabel(next.stages)
    };
    return { ...next, history: [...prev.history, entry] };
  }

  private persist() {
    const out: Record<number, JobWorkflow> = {};
    for (const [id, sig] of this.store) out[id] = sig();
    try { localStorage.setItem(LS_KEY, JSON.stringify(out)); } catch { /* ignore */ }
    this.sync.markDirty();   // a local change is now waiting to sync to a backend
  }

  private load(): Record<number, JobWorkflow> {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<number, JobWorkflow>) : {};
      /* backfill old/partial records so reads don't throw */
      for (const wf of Object.values(parsed)) {
        wf.components ??= [];
        wf.attachments ??= [];
        wf.history ??= [];
        wf.validationNotes ??= '';
        wf.workType ??= null;
        wf.conditionCode ??= '';
        wf.conditionCount ??= 0;
        delete (wf as unknown as { signoff?: unknown }).signoff;   // old single sign-off removed
        wf.stages ??= [];
        const job = JOBS.find(j => j.id === wf.jobId);
        wf.stages.forEach(s => {
          s.inputs ??= {};
          s.fields ??= [];
          // backfill field definitions for stages saved before per-step inputs existed
          if (!s.fields.length && job) s.fields = stageFieldsFor(job.trade, s.id);
          // backfill per-stage sign-off fields for stages saved before they existed
          s.inspectorName ??= '';
          s.licenseNo ??= '';
          s.result ??= null;
          s.notes ??= '';
          s.signed ??= false;
          s.signedAt ??= null;
          delete (s as unknown as { status?: unknown }).status;   // old per-stage status removed
        });
      }
      return parsed;
    } catch {
      return {};
    }
  }
}
