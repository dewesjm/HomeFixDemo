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

    const fullCall = el.querySelector('pre.json-block')!.textContent!;
    expect(fullCall).toContain('getProcedure({');
    expect(fullCall).toContain('"gwp": "SVC-PAGE"');

    (el.querySelector('button[type=submit]') as HTMLButtonElement).click();
    fixture.detectChanges();
    const blocks = el.querySelectorAll('pre.json-block');
    expect(blocks.length).toBe(3);
    expect(blocks[1].textContent).toBe(fullCall);
    expect(blocks[2].textContent).toContain('"ok": true');
  });

  it('runs getProcedurePdf, shows the base64 cut short and offers the file', async () => {
    const fixture = await render();
    const el: HTMLElement = fixture.nativeElement;
    const select = el.querySelector('select') as HTMLSelectElement;
    select.value = 'getProcedurePdf';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    (el.querySelector('button[type=submit]') as HTMLButtonElement).click();
    await new Promise<void>(resolve => {
      const wait = () => (el.textContent?.includes('Download SVC-PAGE') ? resolve() : (fixture.detectChanges(), setTimeout(wait, 50)));
      wait();
    });
    const blocks = el.querySelectorAll('pre.json-block');
    expect(blocks[2].textContent).toContain('"contentType": "application/pdf"');
    expect(blocks[2].textContent).toContain('characters)');
  }, 20000);

  it('findProcedures starts with condition rows from a field droplist and builds the filter from them', async () => {
    const fixture = await render();
    const el: HTMLElement = fixture.nativeElement;
    const select = el.querySelector('select') as HTMLSelectElement;
    select.value = 'findProcedures';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const firstRow = el.querySelector('#param-filter-0') as HTMLSelectElement;
    expect(firstRow.value).toBe('baseMetal1Type');
    expect(Array.from(firstRow.querySelectorAll('optgroup')).map(g => g.label)).toContain('Header');
    expect(el.querySelector('pre.json-block')!.textContent).toContain('"baseMetal1Type": "02-CS"');
    expect(el.querySelector('#param-fields')).not.toBeNull();
  });

  it('marks the write call as changing data', async () => {
    const fixture = await render();
    const options = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('option')).map(o => o.textContent?.trim());
    expect(options).toContain('updateProcedureFields (Write)');
    expect(options).toContain('getProcedure (Read)');
    expect(options).toContain('importProcedures (Write)');
    expect(options).toContain('removeField (Write)');
  });
});
