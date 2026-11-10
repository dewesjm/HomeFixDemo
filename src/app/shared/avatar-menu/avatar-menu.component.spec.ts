import { TestBed } from '@angular/core/testing';
import { STORAGE } from '../../data/storage-keys';
import { AvatarMenuComponent } from './avatar-menu.component';

describe('AvatarMenuComponent', () => {
  let savedTheme: string | null;
  beforeEach(() => { savedTheme = localStorage.getItem(STORAGE.theme); });
  afterEach(() => {
    if (savedTheme === null) localStorage.removeItem(STORAGE.theme);
    else localStorage.setItem(STORAGE.theme, savedTheme);
  });

  function create() {
    const fixture = TestBed.createComponent(AvatarMenuComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, button: el.querySelector('button')!, panel: el.querySelector('.absolute')! };
  }

  it('applies the saved theme while the menu is closed', () => {
    localStorage.setItem(STORAGE.theme, 'dark');
    const { panel } = create();
    expect(panel.classList.contains('hidden')).toBeTrue();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-scheme')).toBe('dark');
  });

  it('opens from the button and shows the saved theme selected', () => {
    localStorage.setItem(STORAGE.theme, 'nord');
    const { fixture, el, button, panel } = create();
    button.click();
    fixture.detectChanges();
    expect(panel.classList.contains('hidden')).toBeFalse();
    expect(el.querySelector('select')!.value).toBe('nord');
  });

  it('closes on an outside click or Escape, and stays open for a click inside', () => {
    const { fixture, button, panel } = create();
    const isOpen = () => { fixture.detectChanges(); return !panel.classList.contains('hidden'); };
    button.click();
    panel.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(isOpen()).toBeTrue();
    document.body.click();
    expect(isOpen()).toBeFalse();
    button.click();
    expect(isOpen()).toBeTrue();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(isOpen()).toBeFalse();
  });

  it('saves a picked theme', () => {
    const { el } = create();
    const select = el.querySelector('select')!;
    select.value = 'forest';
    select.dispatchEvent(new Event('change'));
    expect(localStorage.getItem(STORAGE.theme)).toBe('forest');
    expect(document.documentElement.getAttribute('data-theme')).toBe('forest');
  });
});
