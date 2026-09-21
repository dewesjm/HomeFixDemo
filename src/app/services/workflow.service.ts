/* state for each job's workflow; mutations log history + persist */
import { STORAGE, clearStaleCaches } from '../data/storage-keys';
import { Injectable, WritableSignal, inject, signal } from '@angular/core';
import { ToastService } from '../shared/toast.service';
import { JOBS, Job } from '../data/jobs';
import { SyncService } from './sync.service';
import {
  JobWorkflow, HistoryEntry, InstalledComponent, Attachment, StageField, WorkflowStage,
  WorkType, WORK_TYPE_OPTIONS, currentRoutingLabel, seededWorkflow, newWorkflow, buildStages, getTemplates, REPAIR_STAGE, seedFabricationData
} from '../data/workflow';


/* value as shown in the history Old/New columns; em dash when empty */
const show = (v: string | null | undefined) => (v && v.length ? v : '—');

/* v2: stage model changed to a 5..15 run, ignore older saved workflows */
const LS_KEY = STORAGE.workflows;
const APP_VERSION_KEY = STORAGE.appVersion;
// IMPORTANT: Bump this version whenever you change stage definitions, field names,
// or any data model that is persisted in localStorage. The app auto-clears stale
// caches when this version changes.
const CURRENT_VERSION = '1.6.0';

@Injectable({ providedIn: 'root' })
export class WorkflowService {
  private sync = inject(SyncService);
  private messages = inject(ToastService);
  private store = new Map<string, WritableSignal<JobWorkflow>>();

  /* Clear stale caches when the app version changes */
  private static clearStaleCachesIfNeeded() {
    const stored = localStorage.getItem(APP_VERSION_KEY);
    if (stored !== CURRENT_VERSION) {
      clearStaleCaches();
      localStorage.setItem(APP_VERSION_KEY, CURRENT_VERSION);
    }
  }

  private persisted: Record<string, JobWorkflow> = this.load();
  private seq = Date.now();
  /* the workflow object each signal started with; a signal whose value differs has been edited */
  private baseline = new Map<string, JobWorkflow>();
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    /* a save may still be pending when the tab is hidden or closed */
    window.addEventListener('pagehide', () => this.flushPersist());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') this.flushPersist(); });
  }

  private notify(severity: 'success' | 'info' | 'warn', summary: string, detail?: string) {
    this.messages.add({ severity, summary, detail, life: 3000 });
  }

  /* reactive workflow for a job, built from trade template */
  workflowFor(job: Job): WritableSignal<JobWorkflow> {
    let sig = this.store.get(job.id);
    if (!sig) {
      sig = signal(this.persisted[job.id] ?? (job._fresh ? newWorkflow(job) : seededWorkflow(job)));
      this.store.set(job.id, sig);
      this.baseline.set(job.id, sig());
    }
    return sig;
  }

  /* all known workflows, persisted + live */
  allWorkflows(): JobWorkflow[] {
    const merged = new Map<string, JobWorkflow>();
    for (const [id, wf] of Object.entries(this.persisted)) merged.set(id, wf);
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
    this.setStageInputs(job, stageId, [{ field, value }]);
  }

  /* several field edits on one stage as a single update and a single save; each changed field is logged */
  setStageInputs(job: Job, stageId: string, changes: { field: StageField; value: string }[]) {
    this.workflowFor(job).update(wf =>
      changes.reduce((acc, c) => this.applyStageInput(acc, stageId, c.field, c.value), wf));
    this.persist();
  }

  private applyStageInput(wf: JobWorkflow, stageId: string, field: StageField, value: string): JobWorkflow {
    const prev = wf.stages.find(s => s.id === stageId)?.inputs[field.key] ?? '';
    if (prev === value) return wf;
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
        s.id === stageId ? {
          ...s,
          signed: true,
          signedAt: new Date().toISOString(),
          signoffRecords: [
            ...s.signoffRecords,
            {
              stageLabel: s.label,
              fields: Object.entries({ ...s.inputs, ...s.signoffInputs })
                .filter(([, v]) => v)
                .map(([key, value]) => ({ key, label: key, value })),
              result: s.result,
              who: s.signoffInputs['inspectorName'] || wf.technician,
              when: new Date().toISOString(),
              action: 'signed' as const,
            },
          ],
        } : s);
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

      /* Fit-Up Release logic: when fitup-insp signs WITHOUT releaseToWelding (unchecked), activate fitup-release */
      if (stageId === 'fitup-insp' && st.inputs['releaseToWelding'] !== 'yes') {
        stages = stages.map(s => {
          if (s.id === 'fitup-release') {
            return { ...s, required: true };
          }
          return s;
        });
      }

      /* repeatable stage + routingType='repeat': insert a fresh copy after this stage */
      if (st.repeatable && st.routingType === 'repeat') {
        const idx = stages.findIndex(s => s.id === stageId);
        const clone: typeof st = {
          ...st,
          id: `${st.id}-r${Date.now()}`,
          signed: false,
          signedAt: null,
          result: null,
          inputs: {},
          signoffInputs: {},
          signoffRecords: [],
          routingType: 'standard',
        };
        stages = [...stages.slice(0, idx + 1), clone, ...stages.slice(idx + 1)];
      }

      /* on unsat: re-open stages from the reject target up to (not including) this stage */
      if (st.result === 'unsat' && st.rejectToStage) {
        const targetIdx = stages.findIndex(s => s.id === st.rejectToStage);
        const currentIdx = stages.findIndex(s => s.id === stageId);
        if (targetIdx >= 0 && targetIdx < currentIdx) {
          const now = new Date().toISOString();
          for (let i = targetIdx; i < currentIdx; i++) {
            if (stages[i].signed) {
              const reopenRecord = {
                stageLabel: stages[i].label,
                fields: Object.entries({ ...stages[i].inputs, ...stages[i].signoffInputs })
                  .filter(([, v]) => v)
                  .map(([key, value]) => ({ key, label: key, value })),
                result: stages[i].result,
                who: wf.technician,
                when: now,
                action: 'reopened' as const,
              };
              stages[i] = { ...stages[i], signed: false, signedAt: null, result: null, signoffRecords: [...stages[i].signoffRecords, reopenRecord] };
            }
          }
        }
        /* NDT UNSAT: insert repair stage after this stage if not already present */
        const isNdtStage = stageId.includes('ndt');
        const hasRepairAlready = stages.some(s => s.id === 'repair');
        if (isNdtStage && !hasRepairAlready) {
          const repairStage: WorkflowStage = {
            id: 'repair',
            label: REPAIR_STAGE.label,
            required: true,
            role: REPAIR_STAGE.role ?? '',
            fields: REPAIR_STAGE.fields.map(f => ({ ...f })),
            inputs: { allowableThickness: 'Allowable thickness: 3/16 inch or 20% of material thickness, whichever is less' },
            signoffFields: [],
            signoffInputs: {},
            signoffRecords: [],
            result: null,
            rejectToStage: '',
            repeatable: false,
            routingType: 'standard',
            swapStageId: '',
            inspectionType: '',
            routingOptions: [],
            signed: false,
            signedAt: null,
            decisionLabel: REPAIR_STAGE.decisionLabel,
          };
          /* reopen all stages after the rejected NDT so repair becomes the active stage */
          for (let i = currentIdx + 1; i < stages.length; i++) {
            if (stages[i].signed) {
              stages[i] = { ...stages[i], signed: false, signedAt: null, result: null };
            }
          }
          stages = [...stages.slice(0, currentIdx + 1), repairStage, ...stages.slice(currentIdx + 1)];
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
      const now = new Date().toISOString();
      const stages = wf.stages.map(s => {
        if (s.id !== stageId) return s;
        const who = s.signoffInputs['inspectorName'] || wf.technician;
        return {
          ...s,
          signed: false,
          signedAt: null,
          signoffRecords: [
            ...s.signoffRecords,
            {
              stageLabel: s.label,
              fields: Object.entries({ ...s.inputs, ...s.signoffInputs })
                .filter(([, v]) => v)
                .map(([key, value]) => ({ key, label: key, value })),
              result: s.result,
              who,
              when: now,
              action: 'reopened' as const,
            },
          ],
        };
      });
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

  /* Release a job past the Fit-Up Release stage */
  releaseFitUp(job: Job) {
    this.workflowFor(job).update(wf => {
      const stages = wf.stages.map(s =>
        s.id === 'fitup-release' ? { ...s, signed: true, signedAt: new Date().toISOString() } : s);
      return this.withHistory(wf, { ...wf, stages }, {
        section: 'Release',
        who: wf.technician,
        action: 'Fit-Up Release — Released to Welding'
      });
    });
    this.persist();
    this.notify('success', 'Released to Welding');
  }

  /* admin override: force a job to a given stage index — everything before it is
     marked signed/accepted, the chosen stage and everything after are re-opened,
     so it becomes the current routing */
  forceRouting(job: Job, targetIndex: number) {
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
        return s.signed ? {
          ...s,
          signed: false,
          signedAt: null,
          signoffRecords: [...s.signoffRecords, {
            stageLabel: s.label,
            fields: Object.entries({ ...s.inputs, ...s.signoffInputs })
              .filter(([, v]) => v)
              .map(([key, value]) => ({ key, label: key, value })),
            result: s.result,
            who: 'Admin',
            when,
            action: 'reopened' as const,
          }],
        } : s;
      });
      const target = stages[targetIndex];
      return this.withHistory(wf, { ...wf, stages }, {
        section: 'Stages',
        who: 'Admin',
        action: 'Routing forced (admin)',
        to: target?.label ?? `#${targetIndex + 1}`
      });
    });
    this.persist();
    this.notify('success', 'Routing updated', `Set to routing ${targetIndex + 1}`);
  }

  /* go back one routing — re-opens the most recently signed stage */
  goBackRouting(job: Job, comment?: string) {
    this.workflowFor(job).update(wf => {
      const lastSignedIdx = [...wf.stages].map((s, i) => ({ s, i })).filter(x => x.s.signed).pop()?.i ?? -1;
      if (lastSignedIdx < 0) return wf; // nothing signed
      const now = new Date().toISOString();
      const s = wf.stages[lastSignedIdx];
      const record = {
        stageLabel: s.label,
        fields: [
          ...Object.entries({ ...s.inputs, ...s.signoffInputs })
            .filter(([, v]) => v)
            .map(([key, value]) => ({ key, label: key, value })),
          ...(comment ? [{ key: 'comment', label: 'Comment', value: comment }] : []),
        ],
        result: s.result,
        who: 'Admin',
        when: now,
        action: 'reopened' as const,
      };
      const stages = wf.stages.map((st, i) => i === lastSignedIdx ? {
        ...st,
        signed: false,
        signedAt: null,
        result: null,
        inputs: {},
        signoffInputs: {},
        signoffRecords: [...st.signoffRecords, record],
      } : st);
      return this.withHistory(wf, { ...wf, stages }, {
        section: 'Sign-off',
        who: 'Admin',
        action: `${s.label} — Re-opened${comment ? ': ' + comment : ''}`,
        from: s.label,
        to: ''
      });
    });
    this.persist();
    this.notify('info', 'Routing reversed');
  }

  // --- internals ----------------------------------------------------------
  private withHistory(prev: JobWorkflow, next: JobWorkflow, e: Omit<HistoryEntry, 'when' | 'routing'>): JobWorkflow {
    const entry: HistoryEntry = {
      ...e,
      when: new Date().toISOString(),
      routing: currentRoutingLabel(next.stages)
    };
    return { ...next, history: [...prev.history, entry] };
  }

  /* debounced; writes only edited workflows (saving all of them per field edit made WTN take seconds) */
  private persist() {
    this.sync.markDirty();   // a local change is now waiting to sync to a backend
    if (this.persistTimer === null) this.persistTimer = setTimeout(() => this.flushPersist(), 250);
  }

  private flushPersist() {
    if (this.persistTimer !== null) { clearTimeout(this.persistTimer); this.persistTimer = null; }
    const out: Record<string, JobWorkflow> = { ...this.persisted };
    for (const [id, sig] of this.store) if (sig() !== this.baseline.get(id)) out[id] = sig();
    try { localStorage.setItem(LS_KEY, JSON.stringify(out)); } catch { /* ignore */ }
  }

  private load(): Record<string, JobWorkflow> {
    WorkflowService.clearStaleCachesIfNeeded();
    try {
      const raw = localStorage.getItem(LS_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, JobWorkflow>) : {};
      /* backfill old/partial records so reads don't throw */
      for (const wf of Object.values(parsed)) {
        wf.components ??= [];
        wf.attachments ??= [];
        wf.history ??= [];
        wf.validationNotes ??= '';
        wf.workType ??= null;
        wf.fabricationData ??= {};
        wf.stages ??= [];
        const job = JOBS.find(j => j.id === wf.jobId);

        /* backfill empty fabrication data for Welding jobs */
        if (job?.trade === 'Welding' && Object.keys(wf.fabricationData).length === 0) {
          wf.fabricationData = seedFabricationData(job);
        }

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
          s.routingType ??= 'standard';
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
