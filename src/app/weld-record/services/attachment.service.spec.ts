import { TestBed } from '@angular/core/testing';
import { addTestJob, Job } from '../../data/jobs';
import { AttachmentService } from './attachment.service';
import { WorkflowStore } from './workflow-store.service';

describe('AttachmentService', () => {
  let service: AttachmentService;
  let store: WorkflowStore;
  let job: Job;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AttachmentService);
    store = TestBed.inject(WorkflowStore);
    job = addTestJob('AttachTestTrade');
  });

  afterEach(() => localStorage.clear());

  it('adds an attachment with an id, uploader, and timestamp, and logs it', () => {
    service.addAttachment(job, 'photo.jpg');
    const wf = store.workflowFor(job)();
    expect(wf.attachments.length).toBe(1);
    const att = wf.attachments[0];
    expect(att.name).toBe('photo.jpg');
    expect(att.id).toBeTruthy();
    expect(att.addedBy).toBe(wf.technician);
    expect(att.addedAt).toBeTruthy();

    const entry = wf.history.find(h => h.section === 'Attachments' && h.action === 'Attachment added');
    expect(entry?.to).toBe('photo.jpg');
  });

  it('assigns distinct ids to attachments added back to back', () => {
    service.addAttachment(job, 'a.jpg');
    service.addAttachment(job, 'b.jpg');
    const [a, b] = store.workflowFor(job)().attachments;
    expect(a.id).not.toBe(b.id);
  });

  it('removes an attachment by id and logs it', () => {
    service.addAttachment(job, 'photo.jpg');
    const id = store.workflowFor(job)().attachments[0].id;

    service.removeAttachment(job, id);

    const wf = store.workflowFor(job)();
    expect(wf.attachments.length).toBe(0);
    const entry = wf.history.find(h => h.section === 'Attachments' && h.action === 'Attachment removed');
    expect(entry?.to).toBe('photo.jpg');
  });
});
