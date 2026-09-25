/* People-directory search assist: matches name, PERN or id as you type (searchPeople()). Two
   modes:
   - 'text' (default): a free-text field with suggestions dropped in -- the underlying value stays
     plain free text (e.g. Probationary/Oversight Inspector), not a hard link to a Person record,
     so a name not in the directory can still be typed and saved. Picking a suggestion fills
     "First Last · PERN" and commits immediately; blurring commits whatever's in the box.
   - 'picker': choose an actual Person (Work History's/Makeup's person filters) -- shows a cleared
     search box until one is picked, then a chip (name + title, clearable) in its place. Caller
     owns the selected Person as its own state and passes it back in via `selected`. */
import { Component, computed, effect, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideUser, LucideX } from '@lucide/angular';
import { Person, fullName, searchPeople } from '../data/people';

@Component({
  selector: 'app-person-search-input',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideUser, LucideX],
  templateUrl: './person-search-input.component.html'
})
export class PersonSearchInputComponent {
  mode = input<'text' | 'picker'>('text');
  size = input<'xs' | 'sm' | 'md'>('md');
  disabled = input<boolean>(false);
  hasError = input<boolean>(false);
  placeholder = input<string>('Search: name, PERN or ID');
  /* skip candidates with this title, e.g. 'Foreman' for Makeup -- a Foreman doesn't need to be
     granted makeup as one */
  excludeTitle = input<string | null>(null);
  /* appended to the "no match" line, e.g. "below foreman level" -- blank for a plain "No one matches" */
  emptyHint = input<string>('');

  /* text mode */
  value = input<string>('');
  commit = output<string>();

  /* picker mode */
  selected = input<Person | null>(null);
  select = output<Person>();
  clear = output<void>();

  fullName = fullName;
  inputSizeClass = computed(() => {
    const s = this.size();
    return s === 'xs' ? 'input-xs' : s === 'sm' ? 'input-sm' : '';
  });

  text = signal('');
  query = signal('');
  suggestOpen = signal(false);
  suggestions = computed(() => {
    const q = this.mode() === 'text' ? this.text() : this.query();
    const hits = searchPeople(q);
    const ex = this.excludeTitle();
    return ex ? hits.filter(p => p.title !== ex) : hits;
  });

  constructor() {
    /* keep the text-mode buffer in sync when the stored value changes from outside (stage
       reopened, reloaded, etc.); doesn't fight with typing since setting `text` here doesn't
       itself re-run this effect -- only a change to `value()` does */
    effect(() => { if (this.mode() === 'text') this.text.set(this.value()); });
  }

  onTextInput(v: string) {
    this.text.set(v);
    this.suggestOpen.set(true);
  }

  chooseText(p: Person) {
    const label = `${fullName(p)} · ${p.pern}`;
    this.text.set(label);
    this.suggestOpen.set(false);
    this.commit.emit(label);
  }

  onTextBlur() {
    this.suggestOpen.set(false);
    this.commit.emit(this.text());
  }

  onQueryInput(v: string) {
    this.query.set(v);
    this.suggestOpen.set(true);
  }

  choosePicked(p: Person) {
    this.query.set('');
    this.suggestOpen.set(false);
    this.select.emit(p);
  }

  clearPicked() {
    this.clear.emit();
  }
}
