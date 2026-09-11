/* state for each job's workflow; mutations log history + persist */
import { Injectable, WritableSignal, inject, signal } from '@angular/core';
import { ToastService } from '../shared/toast.service';
import { JOBS, Job } from '../data/jobs';
import { SyncService } from './sync.service';
import {
  JobWorkflow, HistoryEntry, InstalledComponent, Attachment, StageField, WorkflowStage,
  WorkType, WORK_TYPE_OPTIONS, currentStepLabel, seededWorkflow, newWorkflow, stageFieldsFor, signoffFieldsFor,
  buildStages, getTemplates
} from '../data/workflow';
import { conditionLabel } from '../data/conditions';

/* value as shown in the history Old/New columns; em dash when empty */
const show = (v: string | null | undefined) => (v && v.length ? v : '—');

/* v2: stage model changed to a 5..15 run, ignore older saved workflows */
const LS_KEY = 'homefix:workflows:v2';

@Injectable({ providedIn: 'root' })
export class WorkflowService {
  private sync = inject(SyncService);
  private messages = inject(ToastService);
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
      sig = signal(this.persisted[job.id] ?? (job._fresh ? newWorkflow(job) : seededWorkflow(job)));
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

  // --- Cross-stage fabrication data (Welding) -----------------------------
  setFabricationData(job: Job, key: string, value: string) {
    this.workflowFor(job).update(wf => {
      const prev = wf.fabricationData[key] ?? '';
      const fabricationData = { ...wf.fabricationData, [key]: value };
      return this.withHistory(wf, { ...wf, fabricationData }, {
        section: 'Fabrication',
        who: wf.technician,
        action: key,
        from: show(prev),
        to: show(value)
      });
    });
    this.persist();
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
        action: `${stage.label} — ${field.label}`,
        from: show(prev),
        to: show(value ? value + unit : value)
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
        action: 'Attachment added',
        to: name
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
        action: 'Attachment removed',
        to: att?.name ?? id
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
        action: 'Component added',
        to: `${name} (×${quantity}${pn})`
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
        action: 'Component removed',
        to: comp?.name ?? id
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
        action: 'Validation notes',
        from: show(prev),
        to: show(notes)
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
        action: 'Work type',
        from: this.workTypeLabel(prev),
        to: this.workTypeLabel(workType)
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
        action: 'Condition code',
        from: this.conditionDesc(prev),
        to: this.conditionDesc(conditionCode)
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
        action: 'Number of conditions',
        from: String(prev),
        to: String(conditionCount)
      });
    });
    this.persist();
  }

  // --- Per-stage sign-off -------------------------------------------------
  /* patch a stage's sign-off fields and log it */
  updateStageSignoff(job: Job, stageId: string, patch: Partial<WorkflowStage>,
                     meta: { action: string; from?: string; to?: string }) {
    this.workflowFor(job).update(wf => {
      const stages = wf.stages.map(s => (s.id === stageId ? { ...s, ...patch } : s));
      const st = stages.find(s => s.id === stageId)!;
      return this.withHistory(wf, { ...wf, stages }, {
        section: 'Sign-off',
        who: st.signoffInputs['inspectorName'] || wf.technician,
        ...meta
      });
    });
    this.persist();
  }

  /* lock a stage's sign-off and advance (or route back on reject) */
  signStage(job: Job, stageId: string) {
    this.workflowFor(job).update(wf => {
      let stages: WorkflowStage[] = wf.stages.map(s =>
        s.id === stageId ? { ...s, signed: true, signedAt: new Date().toISOString() } : s);
      const st = stages.find(s => s.id === stageId)!;
      const decision = (st.result ?? '').toUpperCase();

      /* Defer Tack logic: when fit stage signs with deferTack='yes', activate deferred-tack and skip regular tack */
      if (stageId === 'fit' && st.signoffInputs['deferTack'] === 'yes') {
        stages = stages.map(s => {
          if (s.id === 'tack') {
            return { ...s, required: false };  // Skip regular tack
          }
          if (s.id === 'deferred-tack') {
            return { ...s, required: true };   // Activate deferred tack
          }
          return s;
        });
      }

      /* repeatable stage + stepType='repeat': insert a fresh copy after this stage */
      if (st.repeatable && st.stepType === 'repeat') {
        const idx = stages.findIndex(s => s.id === stageId);
        const clone: typeof st = {
          ...st,
          id: `${st.id}-r${Date.now()}`,
          signed: false,
          signedAt: null,
          result: null,
          inputs: {},
          signoffInputs: {},
          stepType: 'standard',
          routeTo: '',
        };
        stages = [...stages.slice(0, idx + 1), clone, ...stages.slice(idx + 1)];
      }

      /* on unsat: re-open stages from the reject target up to (not including) this stage */
      if (st.result === 'unsat' && st.rejectToStage) {
        const targetIdx = stages.findIndex(s => s.id === st.rejectToStage);
        const currentIdx = stages.findIndex(s => s.id === stageId);
        if (targetIdx >= 0 && targetIdx < currentIdx) {
          for (let i = targetIdx; i < currentIdx; i++) {
            if (stages[i].signed) {
              stages[i] = { ...stages[i], signed: false, signedAt: null, result: null };
            }
          }
        }
      }

      return this.withHistory(wf, { ...wf, stages }, {
        section: 'Sign-off',
        who: st.signoffInputs['inspectorName'] || wf.technician,
        action: `${st.label} — Signed off`,
        to: decision
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
        who: st.signoffInputs['inspectorName'] || wf.technician,
        action: `${st.label} — Sign-off re-opened`
      });
    });
    this.persist();
    this.notify('info', 'Sign-off re-opened');
  }

  /* admin override: force a job to a given stage index — everything before it is
     marked signed/accepted, the chosen stage and everything after are re-opened,
     so it becomes the current step */
  forceStep(job: Job, targetIndex: number) {
    this.workflowFor(job).update(wf => {
      const when = new Date().toISOString();
      const stages = wf.stages.map((s, i) => {
        if (i < targetIndex) {
          return s.signed ? s : {
            ...s, signed: true, signedAt: when,
            result: s.result ?? 'sat',
            signoffInputs: {
              ...s.signoffInputs,
              inspectorName: s.signoffInputs['inspectorName'] || wf.technician
            }
          };
        }
        return s.signed ? { ...s, signed: false, signedAt: null } : s;
      });
      const target = stages[targetIndex];
      return this.withHistory(wf, { ...wf, stages }, {
        section: 'Stages',
        who: 'Admin',
        action: 'Step forced (admin)',
        to: target?.label ?? `#${targetIndex + 1}`
      });
    });
    this.persist();
    this.notify('success', 'Step updated', `Set to step ${targetIndex + 1}`);
  }

  /* go back one step — re-opens the current stage and the one before it */
  goBackStep(job: Job) {
    this.workflowFor(job).update(wf => {
      const currentIdx = wf.stages.findIndex(s => !s.signed);
      if (currentIdx <= 0) return wf; // already at first step
      const stages = wf.stages.map((s, i) => {
        if (i === currentIdx - 1 || i === currentIdx) {
          return { ...s, signed: false, signedAt: null, result: null };
        }
        return s;
      });
      return this.withHistory(wf, { ...wf, stages }, {
        section: 'Stages',
        who: 'Admin',
        action: 'Step reversed (admin)',
        from: wf.stages[currentIdx]?.label ?? '',
        to: wf.stages[currentIdx - 1]?.label ?? ''
      });
    });
    this.persist();
    this.notify('info', 'Step reversed');
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
        wf.fabricationData ??= {};
        delete (wf as unknown as { signoff?: unknown }).signoff;   // old single sign-off removed
        wf.stages ??= [];
        const job = JOBS.find(j => j.id === wf.jobId);

        /* v4: migrate fabrication stage inputs into fabricationData, then remove the stage */
        const fabStage = wf.stages.find(s => s.id === 'fabrication');
        if (fabStage && Object.keys(wf.fabricationData).length === 0) {
          wf.fabricationData = { ...fabStage.inputs };
        }
        wf.stages = wf.stages.filter(s => s.id !== 'fabrication');

        wf.stages.forEach(s => {
          s.inputs ??= {};
          s.fields ??= [];
          s.signoffFields ??= [];
          s.signoffInputs ??= {};
          s.result ??= null;
          s.rejectToStage ??= '';
          s.signed ??= false;
          s.signedAt ??= null;
          delete (s as unknown as { status?: unknown }).status;
          s.repeatable ??= false;
          s.stepType ??= 'standard';
          s.routeTo ??= '';
          s.swapStageId ??= '';
          s.role ??= '';

          /* auto-backfill: merge current template fields/signoffFields/role
             so future schema changes propagate without hand-written migrations */
          if (job) {
            const templates = getTemplates();
            const tpl = (templates[job.trade] ?? []).find(t => t.id === s.id);
            if (tpl) {
              // rebuild reading fields from template, preserving existing inputs
              if (tpl.fields.length) {
                const inputMap = { ...s.inputs };
                s.fields = tpl.fields.map(f => ({ ...f }));
                // keep only inputs for fields that still exist
                s.inputs = {};
                for (const f of s.fields) {
                  if (f.key in inputMap) s.inputs[f.key] = inputMap[f.key];
                }
              }
              // merge new signoff fields, drop stale ones
              if (tpl.signoffFields?.length) {
                const signoffInputMap = { ...s.signoffInputs };
                s.signoffFields = tpl.signoffFields.map(f => ({ ...f }));
                s.signoffInputs = {};
                for (const f of s.signoffFields) {
                  if (f.key in signoffInputMap) s.signoffInputs[f.key] = signoffInputMap[f.key];
                }
              }
              // backfill role
              if (!s.role) s.role = tpl.role ?? '';
            }
          }
        });
        /* v3 migration: rebuild stages if they have filler IDs or are missing current template stages */
        if (job) {
          const hasFillers = wf.stages.some(s => /^extra-\d+$/.test(s.id) || /^Check \d+$/.test(s.label));
          const currentIds = new Set(buildStages(job).map(s => s.id));
          const missingStages = !wf.stages.every(s => currentIds.has(s.id));
          if (hasFillers || missingStages) {
            const oldStages = wf.stages;
            const newStages = buildStages(job);
            const oldMap = new Map(oldStages.map(s => [s.id, s]));
            wf.stages = newStages.map(ns => {
              const old = oldMap.get(ns.id);
              return old ? {
                ...ns,
                inputs: old.inputs,
                signoffInputs: old.signoffInputs,
                result: old.result,
                signed: old.signed,
                signedAt: old.signedAt,
              } : ns;
            });
          }
        }
      }
      /* persist rebuilt stages so migration only runs once */
      localStorage.setItem(LS_KEY, JSON.stringify(parsed));
      return parsed;
    } catch {
      return {};
    }
  }
}
