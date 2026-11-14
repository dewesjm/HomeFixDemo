import { TestBed } from '@angular/core/testing';

import { ServicesComponent } from './services.component';
import { procedures } from '../../../../data/procedures';
import { keepProcedureStores, testProcedure, TEST_WTN } from '../../testing/procedure-test-state';

describe('Weld Engineering Services page', () => {
  keepProcedureStores();

  async function render() {
    procedures.set([testProcedure('SVC-PAGE', { status: 'active', extraFields: { phMin: '100' } })]);
    const fixture = TestBed.createComponent(ServicesComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('starts on getProcedure with the first Active procedure filled in, and shows its response when run', async () => {
    const fixture = await render();
    const el: HTMLElement = fixture.nativeElement;
    expect((el.querySelector('#param-gwp') as HTMLInputElement).value).toBe('SVC-PAGE');
    expect((el.querySelector('#param-wtn') as HTMLInputElement).value).toBe(TEST_WTN);

    (el.querySelector('button[type=submit]') as HTMLButtonElement).click();
    fixture.detectChanges();
    const blocks = el.querySelectorAll('pre.json-block');
    expect(blocks.length).toBe(2);
    expect(blocks[1].textContent).toContain('"ok": true');
    expect(blocks[1].textContent).toContain('"gwp": "SVC-PAGE"');
  });

  it('marks the write call as changing data', async () => {
    const fixture = await render();
    const options = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('option')).map(o => o.textContent?.trim());
    expect(options).toContain('updateProcedureFields (changes data)');
  });
});
