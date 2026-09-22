import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideBox } from '@lucide/angular';
import { FabricationField } from '../../data/workflow';

@Component({
  selector: 'app-fabrication',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideBox],
  templateUrl: './fabrication.component.html'
})
export class FabricationComponent {
  trade = input.required<string>();
  fabricationData = input.required<Record<string, string>>();
  fields = input.required<FabricationField[]>();
  fabLocked = input<boolean>(false);
  jobComplete = input<boolean>(false);
  fabErrors = input<Record<string, string>>({});
  fabFieldRequired = input<(f: FabricationField) => boolean>(() => false);

  inputBlur = output<{ key: string; value: string }>();
  selectChange = output<{ key: string; value: string | null }>();
}
