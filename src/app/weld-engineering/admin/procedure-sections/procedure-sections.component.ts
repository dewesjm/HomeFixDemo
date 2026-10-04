/* Weld Engineering Admin - Procedure Sections: add sections after the built-in 1-11, and fields to
   them. Definitions and rules are in data/procedure-sections.ts. */
import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePlus } from '@lucide/angular';

import { ToastService } from '../../../shared/toast.service';
import { procedures } from '../../../data/procedures';
import {
  procedureSections, addSection, addField, sectionNameProblem, fieldDraftProblem, sectionNumber,
  BUILT_IN_SECTIONS, EXTRA_FIELD_TYPE_OPTIONS, type ExtraFieldType, type ProcedureSection
} from '../../../data/procedure-sections';

interface FieldDraftForm { label: string; type: ExtraFieldType; required: boolean; optionsText: string; }

@Component({
  selector: 'app-procedure-sections',
  standalone: true,
  imports: [CommonModule, FormsModule, LucidePlus],
  templateUrl: './procedure-sections.component.html'
})
export class ProcedureSectionsComponent {
  private toast = inject(ToastService);

  builtIn = BUILT_IN_SECTIONS;
  sections = procedureSections;
  typeOptions = EXTRA_FIELD_TYPE_OPTIONS;
  sectionNumber = sectionNumber;

  newSectionName = '';
  /* the "add a field" inputs under each added section, by section id */
  drafts: Record<string, FieldDraftForm> = {};

  /* first procedure with any added-section values, for the "How it's stored" example */
  example = computed(() => procedures().find(p => Object.keys(p.extraFields).length) ?? null);

  draftFor(sectionId: string): FieldDraftForm {
    return this.drafts[sectionId] ??= { label: '', type: 'text', required: false, optionsText: '' };
  }

  typeLabel(type: ExtraFieldType): string {
    return this.typeOptions.find(o => o.value === type)?.label ?? type;
  }

  addSection() {
    const problem = sectionNameProblem(this.newSectionName, this.sections());
    if (problem) {
      this.toast.add({ severity: 'warn', summary: 'Section not added', detail: problem });
      return;
    }
    addSection(this.newSectionName);
    this.toast.add({ severity: 'success', summary: 'Section added', detail: this.newSectionName.trim() });
    this.newSectionName = '';
  }

  addField(section: ProcedureSection) {
    const form = this.draftFor(section.id);
    const draft = {
      label: form.label, type: form.type, required: form.required,
      options: form.optionsText.split(',').map(o => o.trim()).filter(Boolean),
    };
    const problem = fieldDraftProblem(draft, section);
    if (problem) {
      this.toast.add({ severity: 'warn', summary: 'Field not added', detail: problem });
      return;
    }
    addField(section.id, draft);
    this.toast.add({ severity: 'success', summary: 'Field added', detail: `${section.name}: ${draft.label.trim()}` });
    delete this.drafts[section.id];
  }
}
