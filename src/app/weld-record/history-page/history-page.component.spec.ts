import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { HistoryPageComponent } from './history-page.component';
import { WorkflowStore } from '../services/workflow-store.service';
import { RoutingService } from '../services/routing.service';
import { JOBS } from '../../data/jobs';
import { STRUCTURAL_JOINTS } from '../../data/structural-joints';

describe('History filter clearing', () => {
  it('clears each search with its button and removes the value from the URL', () => {
    const navigate = jasmine.createSpy('navigate');
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({ job: 'Q924Y', q: 'Signed' })) } },
        { provide: Router, useValue: { navigate } },
        { provide: WorkflowStore, useValue: { everyWorkflow: () => [] } },
        { provide: RoutingService, useValue: {} },
      ],
    });
    const fixture = TestBed.createComponent(HistoryPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.jobQuery()).toBe('Q924Y');
    fixture.nativeElement.querySelector('[aria-label="Clear joint search"]').click();
    fixture.detectChanges();
    expect(component.jobQuery()).toBe('');
    expect(component.table.globalFilter()).toBe('Signed');
    expect(navigate.calls.mostRecent().args[1].queryParams).toEqual({ job: null, person: null, q: 'Signed' });
    fixture.nativeElement.querySelector('[aria-label="Clear history search"]').click();
    fixture.detectChanges();
    expect(component.table.globalFilter()).toBe('');
    expect(navigate.calls.mostRecent().args[1].queryParams).toEqual({ job: null, person: null, q: null });
    expect(fixture.nativeElement.querySelector('[aria-label="Clear joint search"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Clear history search"]')).toBeNull();
  });

  it('names a joint with no XREFID by hull, drawing and joint in the summary, not by its internal key', () => {
    const blank = JOBS.find(j => !j.xrefid)!;
    const named = JOBS.find(j => !!j.xrefid)!;
    const summaryFor = (job: string) => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({ job })) } },
          { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
          { provide: WorkflowStore, useValue: { everyWorkflow: () => [] } },
          { provide: RoutingService, useValue: {} },
        ],
      });
      return TestBed.createComponent(HistoryPageComponent).componentInstance.scopeLabel();
    };
    expect(summaryFor(blank.id)).toBe(`${blank.hull} · ${blank.drawing} · ${blank.joint}`);
    expect(summaryFor(named.id)).toBe(`XREFID ${named.xrefid}`);
  });

  it("a structural joint's History lists only that joint's entries and goes back to Structural", () => {
    localStorage.clear();
    const navigate = jasmine.createSpy('navigate');
    let params = {};
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: { get queryParamMap() { return of(convertToParamMap(params)); } } },
        { provide: Router, useValue: { navigate } },
      ],
    });
    const store = TestBed.inject(WorkflowStore);
    const joint = STRUCTURAL_JOINTS.find(j => store.workflowFor(j)().history.length)!;
    params = { job: joint.id, jointHistory: joint.id };
    const fixture = TestBed.createComponent(HistoryPageComponent);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    const rows = page.table.rows();
    expect(rows.length).toBe(store.workflowFor(joint)().history.filter(e => e.section !== 'Stages' && e.section !== 'Fabrication').length);
    expect(rows.every(r => r.jointType === 'structural' && r.jobId === joint.id)).toBeTrue();
    expect(page.scopeLabel()).toContain(joint.xrefid || joint.joint);
    page.back();
    expect(navigate).toHaveBeenCalledWith(['/structural-welding']);
  });

  it('the History screen lists pipe and structural joints, each named by its Joint Type', () => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})) } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
      ],
    });
    const fixture = TestBed.createComponent(HistoryPageComponent);
    fixture.detectChanges();
    const rows = fixture.componentInstance.table.rows();
    expect(rows.some(r => r.jointType === 'pipe' && r.jointTypeLabel === 'Pipe')).toBeTrue();
    expect(rows.some(r => r.jointType === 'structural' && r.jointTypeLabel === 'Structural')).toBeTrue();
  });
});
