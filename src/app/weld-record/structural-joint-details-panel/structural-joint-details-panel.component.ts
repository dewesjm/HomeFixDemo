/* The joint page's read-only Joint details panel for a structural joint: the joint, its three
   materials, its NDT (Pipe's fields plus ET) and its attribute codes. */
import { Component, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideInfo, LucideChevronDown, LucideChevronUp } from '@lucide/angular';
import { Job, N_IND_MEANINGS } from '../../data/jobs';
import { TooltipDirective } from '../../shared/tooltip.directive';
import { attributeCodeLabel } from '../../data/attribute-codes';
import { jointDetailsUt, jointDetailsVt } from '../joint-details-logic/joint-details-values';
import { NDT_LABELS } from '../../data/ndt-labels';

type MaterialKeys = Record<'mcl' | 'type' | 'item' | 'thickness', keyof Job>;

@Component({
  selector: 'app-structural-joint-details-panel',
  standalone: true,
  imports: [CommonModule, LucideInfo, LucideChevronDown, LucideChevronUp, TooltipDirective],
  templateUrl: './structural-joint-details-panel.component.html'
})
export class StructuralJointDetailsPanelComponent {
  job = input.required<Job>();
  currentRouting = input.required<string>();

  showAudit = signal(false);
  labels = NDT_LABELS;

  /* Material 1 and 2 use the joint's Joining Item / Join To fields */
  materials: { label: string; keys: MaterialKeys }[] = [
    { label: 'Material 1', keys: { mcl: 'mcl1', type: 'materialType1', item: 'joiningItem', thickness: 'thickness1' } },
    { label: 'Material 2', keys: { mcl: 'mcl2', type: 'materialType2', item: 'joinToItem', thickness: 'thickness2' } },
    { label: 'Material 3', keys: { mcl: 'mcl3', type: 'materialType3', item: 'item3', thickness: 'thickness3' } },
  ];

  value(key: keyof Job): string {
    return String(this.job()[key] ?? '') || '-';
  }

  nIndTooltip(): string {
    return N_IND_MEANINGS[this.job().nInd] ?? '';
  }

  /* "AB123 Description" when the code is known, otherwise just the bare code */
  attrCodeDisplay(code: string): string {
    if (!code) return '';
    const desc = attributeCodeLabel(code);
    return desc ? `${code} ${desc}` : code;
  }

  ut(): string { return jointDetailsUt(this.job()); }
  vt(): string { return jointDetailsVt(this.job()); }
}
