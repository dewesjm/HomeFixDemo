/* Top bar fit check: adds `nav-compact` to the host when the full-label nav would not fit, so the
   stylesheet can drop labels to icons. Measured against the real items, not a fixed breakpoint,
   because each system's flat bar has a different number of items. */
import { AfterViewInit, Directive, ElementRef, OnDestroy, inject } from '@angular/core';

@Directive({
  selector: '[appCompactNav]',
  standalone: true
})
export class CompactNavDirective implements AfterViewInit, OnDestroy {
  private el: ElementRef<HTMLElement> = inject(ElementRef);
  private resize?: ResizeObserver;
  private mutation?: MutationObserver;
  private frame = 0;

  ngAfterViewInit() {
    const host = this.el.nativeElement;
    /* the bar resizes with the window; its items change when the system or nav mode changes */
    this.resize = new ResizeObserver(() => this.schedule());
    this.resize.observe(host);
    this.mutation = new MutationObserver(() => this.schedule());
    this.mutation.observe(host, { childList: true, subtree: true });
    document.fonts?.ready.then(() => this.schedule());
    this.check();
  }

  ngOnDestroy() {
    this.resize?.disconnect();
    this.mutation?.disconnect();
    cancelAnimationFrame(this.frame);
  }

  private schedule() {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.check());
  }

  /* Lay out with full labels, then go compact if any row sticks out of its container. Both happen
     before the next paint, so the full layout is never shown when it does not fit. */
  private check() {
    const host = this.el.nativeElement;
    host.classList.remove('nav-compact');
    const crowded = Array.from(host.querySelectorAll<HTMLElement>('[data-fit-row]')).some(row => {
      const right = row.getBoundingClientRect().right;
      return Array.from(row.children).some(child => child.getBoundingClientRect().right > right + 0.5);
    });
    host.classList.toggle('nav-compact', crowded);
  }
}
