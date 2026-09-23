/* A free-text field with a people-directory search assist dropped in: matches name, PERN or id as
   you type (searchPeople(), same matching rules as Work History's/Makeup's person filters), but
   still commits whatever text is actually in the box on blur -- the underlying field stays plain
   free text (e.g. Probationary/Oversight Inspector), not a hard link to a Person record, so a name
   that isn't in the directory can still be typed and saved. */
import { Component, computed, effect, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Person, fullName, searchPeople } from '../data/people';

@Component({
  selector: 'app-person-search-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './person-search-input.component.html'
})
export class PersonSearchInputComponent {
  value = input<string>('');
  disabled = input<boolean>(false);
  hasError = input<boolean>(false);
  commit = output<string>();

  text = signal('');
  suggestOpen = signal(false);
  suggestions = computed(() => searchPeople(this.text()));

  constructor() {
    /* keep the local buffer in sync when the stored value changes from outside (stage reopened,
       reloaded, etc.); doesn't fight with typing since setting `text` here doesn't itself re-run
       this effect -- only a change to `value()` does */
    effect(() => this.text.set(this.value()));
  }

  onInput(v: string) {
    this.text.set(v);
    this.suggestOpen.set(true);
  }

  choose(p: Person) {
    const label = `${fullName(p)} · ${p.pern}`;
    this.text.set(label);
    this.suggestOpen.set(false);
    this.commit.emit(label);
  }

  onBlur() {
    this.suggestOpen.set(false);
    this.commit.emit(this.text());
  }
}
