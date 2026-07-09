/* Thin wrapper over DaisyUI's CSS-only tooltip (class="tooltip" + data-tip), replaces pTooltip. */
import { Directive, ElementRef, Input, OnChanges, inject } from '@angular/core';

@Directive({
  selector: '[appTooltip]',
  standalone: true
})
export class TooltipDirective implements OnChanges {
  @Input('appTooltip') text = '';
  @Input() tooltipPosition: 'top' | 'bottom' | 'left' | 'right' = 'top';

  private el = inject(ElementRef<HTMLElement>);

  ngOnChanges() {
    const node = this.el.nativeElement;
    node.classList.add('tooltip', `tooltip-${this.tooltipPosition}`);
    if (this.text) node.setAttribute('data-tip', this.text);
    else node.removeAttribute('data-tip');
  }
}
