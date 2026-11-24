/* The joint type an Admin page for a per-joint-type settings table (Routing Settings, Signoff Types,
   Signoff Type to Routing, Signoff Type Forms) is editing. It comes from the page's URL (?type=structural;
   no type = Pipe), and JointTypeSettingsPageComponent provides it to the page. */
import { InjectionToken } from '@angular/core';
import type { JointType } from '../../../data/jobs';

/* Pipe when no page provides one (a page opened without the host, e.g. in a unit test) */
export const SETTINGS_JOINT_TYPE = new InjectionToken<JointType>('settings joint type', { providedIn: 'root', factory: () => 'pipe' });

/* the joint-type select's choices; Non-Numbered has no settings tables yet, so it's listed but disabled */
export const SETTINGS_JOINT_TYPE_CHOICES: { value: JointType | 'non-numbered'; label: string; disabled: boolean }[] = [
  { value: 'pipe', label: 'Pipe', disabled: false },
  { value: 'structural', label: 'Structural', disabled: false },
  { value: 'non-numbered', label: 'Non-Numbered', disabled: true },
];

/* the URL's ?type value as a joint type; anything else is Pipe */
export function jointTypeFromParam(value: string | null): JointType {
  return value === 'structural' ? 'structural' : 'pipe';
}

/* the ?type value for a joint type: none for Pipe */
export function jointTypeParam(jointType: JointType): string | null {
  return jointType === 'pipe' ? null : jointType;
}
