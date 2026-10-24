import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { WorkHistoryComponent } from './work-history.component';
import { WorkflowStore } from '../services/workflow-store.service';
import { RoutingService } from '../services/routing.service';

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
    const fixture = TestBed.createComponent(WorkHistoryComponent);
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
});
