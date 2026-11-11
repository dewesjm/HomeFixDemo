import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';

import { ProcedureDetailComponent } from './procedure-detail.component';
import { procedures } from '../../../data/procedures';
import { keepProcedureStores, testProcedure, fakeRouter, fakeRoute } from '../testing/procedure-test-state';

describe('Procedure detail', () => {
  keepProcedureStores();
  let router: jasmine.SpyObj<Router>;

  const open = (gwp?: string, wtn?: string) => {
    router = fakeRouter();
    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: router }, { provide: ActivatedRoute, useValue: fakeRoute(gwp, wtn) }],
    });
    return TestBed.runInInjectionContext(() => new ProcedureDetailComponent());
  };

  beforeEach(() => procedures.set([testProcedure('DT-1', { title: 'Detail test' }), testProcedure('DT-2')]));

  it('goes back to Procedure Lookup for an unknown GWP/WTN', async () => {
    const page = open('DT-1', 'NOPE');
    await page.ngOnInit();
    expect(router.navigate).toHaveBeenCalledWith(['/weld-engineering']);
    expect(page.procedure()).toBeNull();
    expect(page.pdfUrl()).toBeNull();
  });

  it('goes back to Procedure Lookup when no GWP/WTN is in the URL', async () => {
    const page = open();
    await page.ngOnInit();
    expect(router.navigate).toHaveBeenCalledWith(['/weld-engineering']);
  });

  it('shows the procedure named in the URL with its generated PDF', async () => {
    const page = open('DT-1', '99.9-1');
    await page.ngOnInit();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(page.procedure()!.gwp).toBe('DT-1');
    expect(page.procedure()!.title).toBe('Detail test');
    expect(page.pdfUrl()).not.toBeNull();
  }, 20000);
});
