import { TestBed } from '@angular/core/testing';
import '../../routing-logic/routing-settings-rules';
import { WhenGroupEditorComponent } from './when-group-editor.component';
import { WhenClause, WhenGroup } from '../../qualifications-logic/qual-when';

describe('Qualifications When editor', () => {
  async function create(group: WhenGroup) {
    const f = TestBed.createComponent(WhenGroupEditorComponent);
    f.componentRef.setInput('group', group);
    let emitted: WhenGroup | undefined;
    f.componentInstance.changed.subscribe(g => emitted = g);
    f.detectChanges(); await f.whenStable(); f.detectChanges();
    return { f, host: f.nativeElement as HTMLElement, emitted: () => emitted };
  }
  const one = (c: WhenClause): WhenGroup => ({ op: 'all', items: [c] });
  const fieldOptions = (host: HTMLElement) => Array.from(host.querySelector<HTMLSelectElement>('[aria-label="Field"]')!.options).map(o => o.textContent);

  it('offers is, is not and contains, with a checkbox per value', async () => {
    const { host, f, emitted } = await create(one({ field: 'ss', op: 'is', values: ['SS'] }));
    expect(Array.from(host.querySelector<HTMLSelectElement>('[aria-label="Comparison"]')!.options).map(o => o.textContent)).toEqual(['is', 'is not', 'contains']);
    expect(host.querySelectorAll('input[type="checkbox"]').length).toBe(3);
    host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')[2].click();
    expect((emitted()!.items[0] as WhenClause).values).toEqual(['SS', 'HI']);
    f.componentInstance.setComparison(0, 'contains');
    expect((emitted()!.items[0] as WhenClause)).toEqual({ field: 'ss', op: 'contains', values: [] });
  });

  it('asks for a value until one is set', async () => {
    const { host } = await create(one({ field: 'ss', op: 'is', values: [] }));
    expect(host.textContent).toContain('Pick at least one value.');
  });

  it('hides fields off the Qualification Check forms unless a saved clause uses one', async () => {
    const offered = fieldOptions((await create(one({ field: 'ss', op: 'is', values: ['Yes'] }))).host);
    expect(offered).toContain('Weld Color');
    expect(offered).not.toContain('Filler Metal MIC');
    expect(offered).not.toContain('Joining Item MIC verified');
    expect(fieldOptions((await create(one({ field: 'step:verifyMic1', op: 'is', values: ['No'] }))).host)).toContain('Joining Item MIC verified');
  });

  it('keeps User to one person with no comparison', async () => {
    const { host } = await create(one({ field: 'user', op: 'is', values: ['SELF'] }));
    expect(host.querySelector('[aria-label="Comparison"]')).toBeNull();
    expect(host.querySelector<HTMLSelectElement>('[aria-label="Value"]')).not.toBeNull();
  });
});
