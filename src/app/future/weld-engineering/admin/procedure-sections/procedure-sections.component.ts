/* Weld Engineering Admin - Procedure Sections: every procedure section and its fields, numbered by
   list order; add, rename, reorder, move and remove them. Which procedures have a section is ticked
   on each procedure's edit form. Definitions are in weld-engineering/procedure-sections.ts, what
   blocks a removal or move in weld-engineering/procedure-section-usage.ts. */
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideArrowDown, LucideArrowUp, LucideCheck, LucidePencil, LucidePlus, LucideTrash2, LucideX } from '@lucide/angular';

import { ToastService } from '../../../../shared/toast.service';
import { ConfirmService } from '../../../../shared/confirm.service';
import { procedures } from '../../../../data/procedures';
import {
  procedureSections, addSection, addField, sectionNameProblem, fieldDraftProblem, fieldLabelProblem, fieldTypeLabel,
  shiftSection, shiftField, moveField, renameSection, renameField, removeField, removeSection,
  EXTRA_FIELD_TYPE_OPTIONS, type ExtraField, type ExtraFieldType, type ProcedureSection
} from '../../procedure-sections';
import { sectionRemoveBlock, fieldRemoveBlock, fieldMoveBlock, type UsageBlock } from '../../procedure-section-usage';
import { ADMIN_TABLE_SOURCES, sourceLabel, type OptionSourceId } from '../../procedure-option-sources';

interface FieldDraftForm { label: string; type: ExtraFieldType; required: boolean; optionsText: string; source: OptionSourceId | ''; }

@Component({
  selector: 'app-procedure-sections',
  standalone: true,
  imports: [CommonModule, FormsModule, LucidePlus, LucidePencil, LucideTrash2, LucideArrowUp, LucideArrowDown, LucideCheck, LucideX],
  templateUrl: './procedure-sections.component.html'
})
export class ProcedureSectionsComponent {
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

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

  /* a refused removal or move, shown under the section it happened in */
  blocked = signal<(UsageBlock & { sectionId: string; heading: string }) | null>(null);

  /* inline renames: the section id or field key being renamed, and the typed name */
  renamingSection = signal<string | null>(null);
  renamingField = signal<string | null>(null);
  nameDraft = '';

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
    addField(section.id, draft, [...new Set(procedures().flatMap(p => Object.keys(p.extraFields)))]);
    this.toast.add({ severity: 'success', summary: 'Field added', detail: `${section.name}: ${draft.label.trim()}` });
    delete this.drafts[section.id];
  }

  /* ── Rename ── */
  startSectionRename(s: ProcedureSection) {
    this.renamingField.set(null);
    this.renamingSection.set(s.id);
    this.nameDraft = s.name;
  }

  saveSectionRename(s: ProcedureSection) {
    const problem = sectionNameProblem(this.nameDraft, this.sections(), s.id);
    if (problem) {
      this.toast.add({ severity: 'warn', summary: 'Section not renamed', detail: problem });
      return;
    }
    renameSection(s.id, this.nameDraft);
    this.renamingSection.set(null);
  }

  startFieldRename(f: ExtraField) {
    this.renamingSection.set(null);
    this.renamingField.set(f.key);
    this.nameDraft = f.label;
  }

  saveFieldRename(section: ProcedureSection, f: ExtraField) {
    const problem = fieldLabelProblem(this.nameDraft, section, f.key);
    if (problem) {
      this.toast.add({ severity: 'warn', summary: 'Field not renamed', detail: problem });
      return;
    }
    renameField(f.key, this.nameDraft);
    this.renamingField.set(null);
  }

  cancelRename() {
    this.renamingSection.set(null);
    this.renamingField.set(null);
  }

  /* ── Reorder and move ── */
  shiftSection(s: ProcedureSection, delta: number) {
    shiftSection(s.id, delta);
  }

  shiftField(f: ExtraField, delta: number) {
    shiftField(f.key, delta);
  }

  /* other sections a field can move to */
  moveTargets(section: ProcedureSection): ProcedureSection[] {
    return this.sections().filter(s => s.id !== section.id);
  }

  moveField(section: ProcedureSection, f: ExtraField, select: HTMLSelectElement) {
    const targetId = select.value;
    select.value = '';
    if (!targetId) return;
    const block = fieldMoveBlock(f.key, targetId, this.sections(), procedures());
    if (block) {
      this.blocked.set({ ...block, sectionId: section.id, heading: `${f.label} can't be moved.` });
      return;
    }
    moveField(f.key, targetId);
    this.blocked.set(null);
    const target = this.sections().find(s => s.id === targetId);
    this.toast.add({ severity: 'success', summary: 'Field moved', detail: `${f.label} to ${target?.name}` });
  }

  /* ── Remove ── */
  removeSection(s: ProcedureSection) {
    const block = sectionRemoveBlock(s, procedures());
    if (block) {
      this.blocked.set({ ...block, sectionId: s.id, heading: `${s.name} can't be removed.` });
      return;
    }
    this.blocked.set(null);
    this.confirm.confirmDelete(`section ${s.name}`, () => {
      removeSection(s.id);
      this.toast.add({ severity: 'success', summary: 'Section removed', detail: s.name });
    });
  }

  removeField(section: ProcedureSection, f: ExtraField) {
    const block = fieldRemoveBlock(f.key, this.sections(), procedures());
    if (block) {
      this.blocked.set({ ...block, sectionId: section.id, heading: `${f.label} can't be removed.` });
      return;
    }
    this.blocked.set(null);
    this.confirm.confirmDelete(`field ${f.label}`, () => {
      removeField(f.key);
      this.toast.add({ severity: 'success', summary: 'Field removed', detail: `${section.name}: ${f.label}` });
    });
  }
}
