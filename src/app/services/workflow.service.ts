// State service — holds each job's stages (+ per-step inputs), installed components,
// attachments, sign-off, and the audit-trail history. Every mutation logs a before→after
// history entry, persists to localStorage, and nudges the sync indicator.
import { Injectable, WritableSignal, inject, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { JOBS, Job } from '../data/jobs';
import { SyncService } from './sync.service';
import {
  JobWorkflow, HistoryEntry, InstalledComponent, Attachment, SignOff, StageStatus, StageField,
  WorkType, WORK_TYPE_OPTIONS, currentStepLabel, newWorkflow, stageFieldsFor
} from '../data/workflow';
import { conditionLabel } from '../data/conditions';

const dash = (v: string | null | undefined) => (v && v.length ? `“${v}”` : '—');

const LS_KEY = 'homefix:workflows';

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

  /** The reactive workflow for a job, created from the trade template on first access. */
  workflowFor(job: Job): WritableSignal<JobWorkflow> {
    let sig = this.store.get(job.id);
    if (!sig) {
      sig = signal(this.persisted[job.id] ?? newWorkflow(job));
      this.store.set(job.id, sig);
    }
    return sig;
  }

  /** Snapshot of every workflow we know about (persisted + touched this session). */
  allWorkflows(): JobWorkflow[] {
    const merged = new Map<number, JobWorkflow>();
    for (const [id, wf] of Object.entries(this.persisted)) merged.set(Number(id), wf);
    for (const [id, sig] of this.store) merged.set(id, sig());   // live overrides persisted
    return [...merged.values()];
  }

  // --- Stages -------------------------------------------------------------
  setStage(job: Job, stageId: string, status: StageStatus) {
    this.workflowFor(job).update(wf => {
      const prev = wf.stages.find(s => s.id === stageId);
      const stages = wf.stages.map(s => (s.id === stageId ? { ...s, status } : s));
      const stage = stages.find(s => s.id === stageId)!;
      return this.withHistory(wf, { ...wf, stages }, {
        section: 'Stages',
        who: wf.technician,
        change: `Stage “${stage.label}” status: ${prev?.status ?? '—'} → ${status}`
      });
    });
    this.persist();
    const label = this.workflowFor(job)().stages.find(s => s.id === stageId)?.label ?? 'Stage';
    const severity = status === 'done' ? 'success' : status === 'failed' ? 'warn' : 'info';
    this.notify(severity, 'Stage updated', `${label} → ${status}`);
  }

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

  /** Human-friendly label for a work-type value (e.g. 'build' → 'Build'). */
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

  /** Describe a condition code as "C200 (Cracked / damaged)", or "—" when blank. */
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

  // --- Sign-off -----------------------------------------------------------
  updateSignoff(job: Job, patch: Partial<SignOff>, change: string) {
    this.workflowFor(job).update(wf => {
      const signoff = { ...wf.signoff, ...patch };
      return this.withHistory(wf, { ...wf, signoff }, {
        section: 'Sign-off',
        who: signoff.inspectorName || wf.technician,
        change
      });
    });
    this.persist();
  }

  signOff(job: Job) {
    this.workflowFor(job).update(wf => {
      const signoff: SignOff = { ...wf.signoff, signed: true, date: new Date().toISOString() };
      const result = (signoff.result ?? '').toUpperCase();
      return this.withHistory(wf, { ...wf, signoff }, {
        section: 'Sign-off',
        who: signoff.inspectorName || wf.technician,
        change: `Signed off — ${result} by ${signoff.inspectorName || 'inspector'}`
      });
    });
    this.persist();
    this.notify('success', 'Inspection signed off');
  }

  reopen(job: Job) {
    this.workflowFor(job).update(wf => {
      const signoff: SignOff = { ...wf.signoff, signed: false, date: null };
      return this.withHistory(wf, { ...wf, signoff }, {
        section: 'Sign-off',
        who: signoff.inspectorName || wf.technician,
        change: 'Sign-off re-opened for edits'
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
      // Normalize older / partial saved records so a missing property can't throw
      // (and blank the page) when the template reads it.
      for (const wf of Object.values(parsed)) {
        wf.components ??= [];
        wf.attachments ??= [];
        wf.history ??= [];
        wf.validationNotes ??= '';
        wf.workType ??= null;
        wf.conditionCode ??= '';
        wf.conditionCount ??= 0;
        wf.signoff ??= { inspectorName: '', licenseNo: '', result: null, notes: '', signed: false, date: null };
        wf.stages ??= [];
        const job = JOBS.find(j => j.id === wf.jobId);
        wf.stages.forEach(s => {
          s.inputs ??= {};
          s.fields ??= [];
          // backfill field definitions for stages saved before per-step inputs existed
          if (!s.fields.length && job) s.fields = stageFieldsFor(job.trade, s.id);
        });
      }
      return parsed;
    } catch {
      return {};
    }
  }
}
