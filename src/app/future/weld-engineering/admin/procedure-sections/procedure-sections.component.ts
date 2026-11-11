/* Weld Engineering Admin - Procedure Sections: every procedure section and its fields, numbered by
   list order; add sections and fields. Which procedures have a section is ticked on each procedure's
   edit form. Definitions and rules are in weld-engineering/procedure-sections.ts. */
import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePlus } from '@lucide/angular';

import { ToastService } from '../../../../shared/toast.service';
import { procedures } from '../../../../data/procedures';
import {
  procedureSections, addSection, addField, sectionNameProblem, fieldDraftProblem, fieldTypeLabel,
  EXTRA_FIELD_TYPE_OPTIONS, type ExtraField, type ExtraFieldType, type ProcedureSection
} from '../../procedure-sections';
import { ADMIN_TABLE_SOURCES, sourceLabel, type OptionSourceId } from '../../procedure-option-sources';

interface FieldDraftForm { label: string; type: ExtraFieldType; required: boolean; optionsText: string; source: OptionSourceId | ''; }

@Component({
  selector: 'app-procedure-sections',
  standalone: true,
  imports: [CommonModule, FormsModule, LucidePlus],
  templateUrl: './procedure-sections.component.html'
})
export class ProcedureSectionsComponent {
  private toast = inject(ToastService);

  sections = procedureSections;
  typeOptions = EXTRA_FIELD_TYPE_OPTIONS;
  tableSources = ADMIN_TABLE_SOURCES;
  typeLabel = fieldTypeLabel;

  newSectionName = '';
  /* the "add a field" inputs under each section, by section id */
  drafts: Record<string, FieldDraftForm> = {};

  /* first procedure with any section values, for the "How it's stored" example */
  example = computed(() => procedures().find(p => Object.keys(p.extraFields).length) ?? null);

  procedureTotal = computed(() => procedures().length);

  /* how many procedures have this section ticked */
  procedureCount(sectionId: string): number {
    return procedures().filter(p => p.sectionIds.includes(sectionId)).length;
  }

  draftFor(sectionId: string): FieldDraftForm {
    return this.drafts[sectionId] ??= { label: '', type: 'text', required: false, optionsText: '', source: '' };
  }

  /* typed choices, or the table/list the choices come from */
  choicesText(f: ExtraField): string {
    if (f.source) return sourceLabel(f.source);
    return f.options.join(', ') || '-';
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
      source: form.source || undefined,
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
