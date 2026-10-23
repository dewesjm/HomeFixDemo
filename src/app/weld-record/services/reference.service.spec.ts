import { TestBed } from '@angular/core/testing';
import { addTestJob, Job } from '../../data/jobs';
import { ReferenceService } from './reference.service';
import { WorkflowStore } from './workflow-store.service';

describe('ReferenceService', () => {
  let service: ReferenceService;
  let store: WorkflowStore;
  let job: Job;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReferenceService);
    store = TestBed.inject(WorkflowStore);
    job = addTestJob();
  });

  afterEach(() => localStorage.clear());

  it('adds an reference with an id, uploader, and timestamp, and logs it', () => {
    service.addReference(job, 'photo.jpg');
    const wf = store.workflowFor(job)();
    expect(wf.references.length).toBe(1);
    const att = wf.references[0];
    expect(att.name).toBe('photo.jpg');
    expect(att.id).toBeTruthy();
    expect(att.addedBy).toBe(wf.technician);
    expect(att.addedAt).toBeTruthy();

    const entry = wf.history.find(h => h.section === 'References' && h.action === 'Reference added');
    expect(entry?.to).toBe('photo.jpg');
  });

  it('assigns distinct ids to references added back to back', () => {
    service.addReference(job, 'a.jpg');
    service.addReference(job, 'b.jpg');
    const [a, b] = store.workflowFor(job)().references;
    expect(a.id).not.toBe(b.id);
  });

  it('removes an reference by id and logs it', () => {
    service.addReference(job, 'photo.jpg');
    const id = store.workflowFor(job)().references[0].id;

    service.removeReference(job, id);

    const wf = store.workflowFor(job)();
    expect(wf.references.length).toBe(0);
    const entry = wf.history.find(h => h.section === 'References' && h.action === 'Reference removed');
    expect(entry?.to).toBe('photo.jpg');
  });
});
