/* per-job workflow state: signals, localStorage persistence, migration, and history stamping.
   Domain services (RoutingService, SignoffService, AttachmentService, FabricationDataService) build
   their mutations on top of this — it owns no domain logic of its own. */
import { STORAGE, clearStaleCaches } from '../../data/storage-keys';
import { Injectable, WritableSignal, inject, signal } from '@angular/core';
import { SyncService } from './sync.service';
import { JOBS, Job } from '../../data/jobs';
import { stampWho } from '../../data/people';
import {
  JobWorkflow, HistoryEntry, seededWorkflow, newWorkflow, buildStages, getTemplates, seedFabricationData,
  fabricationSnapshot, currentRoutingLabel
} from '../../data/workflow';

/* v2: stage model changed to a 5..15 run, ignore older saved workflows */
const LS_KEY = STORAGE.workflows;
const APP_VERSION_KEY = STORAGE.appVersion;
// IMPORTANT: Bump this version whenever you change stage definitions, field names,
// or any data model that is persisted in localStorage. The app auto-clears stale
// caches when this version changes.
const CURRENT_VERSION = '2.10.8';

@Injectable({ providedIn: 'root' })
export class WorkflowStore {
  private sync = inject(SyncService);
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
  /* the workflow object each signal started with; a signal whose value differs has been edited */
  private baseline = new Map<string, JobWorkflow>();
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    /* a save may still be pending when the tab is hidden or closed */
    window.addEventListener('pagehide', () => this.flushPersist());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') this.flushPersist(); });
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

  /* apply a mutation to a job's workflow signal and schedule a save */
  update(job: Job, mutator: (wf: JobWorkflow) => JobWorkflow) {
    this.workflowFor(job).update(mutator);
    this.persist();
  }

  /* build the next workflow state with a history entry appended; callers pass the result to update()'s mutator */
  withHistory(prev: JobWorkflow, next: JobWorkflow, e: Omit<HistoryEntry, 'when' | 'routing'>): JobWorkflow {
    const entry: HistoryEntry = {
      ...e,
      ...stampWho(e.who),
      when: new Date().toISOString(),
      /* the routing active when this action happened, not what it moved to afterward
         (e.g. a stage's own "Signed off" entry records that stage, not the next one) */
      routing: currentRoutingLabel(prev.stages),
      /* sign-offs also capture fabrication data as it stood at that moment, not just the stage's own fields */
      fabInputs: e.section === 'Sign-off' ? fabricationSnapshot(next.fabricationData) : e.fabInputs
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
    WorkflowStore.clearStaleCachesIfNeeded();
    try {
      const raw = localStorage.getItem(LS_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, JobWorkflow>) : {};
      /* backfill old/partial records so reads don't throw */
      for (const wf of Object.values(parsed)) {
        wf.attachments ??= [];
        wf.history ??= [];
        wf.fabricationData ??= {};
        wf.stages ??= [];
        const job = JOBS.find(j => j.id === wf.jobId);
        if (job && wf.refitNumber) job.refitNumber = wf.refitNumber;
        if (job && wf.repairNumber) job.repairNumber = wf.repairNumber;

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
