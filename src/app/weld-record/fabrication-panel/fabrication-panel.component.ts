/* The joint page's Fabrication panel: the cross-stage Welding fields (fabrication-logic/fabrication-fields.ts). */
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideBox } from '@lucide/angular';
import { FabricationField } from '../fabrication-logic/fabrication-fields';

@Component({
  selector: 'app-fabrication-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideBox],
  templateUrl: './fabrication-panel.component.html'
})
export class FabricationPanelComponent {
  fabricationData = input.required<Record<string, string>>();
  fields = input.required<FabricationField[]>();
  fabLocked = input<boolean>(false);
  jobComplete = input<boolean>(false);
  fabErrors = input<Record<string, string>>({});
  fabFieldRequired = input<(f: FabricationField) => boolean>(() => false);

  inputBlur = output<{ key: string; value: string }>();
  selectChange = output<{ key: string; value: string | null }>();

  /* same overlay as the signoff panel's GWP/WTN: the closed select hides its text and shows only the code */
  hasDetails(f: FabricationField) {
    return !!f.options?.some(o => o.detail);
  }
  selectedLabel(f: FabricationField) {
    return f.options?.find(o => o.value === this.fabricationData()[f.key])?.label ?? '';
  }
}
