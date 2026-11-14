/* Where a procedure field's choices come from when they aren't typed into the field itself
   (ExtraField.source, procedure-sections.ts). Admin tables can be picked for a new "Pick from another
   admin table" field in Admin > Procedure Sections; the code lists are only used by the seeded locked
   fields, whose values other systems match against those same lists. */
import { getWeldPositions } from '../../weld-record/reference-data-service/reference-data-service';
import { MATERIAL_TYPES } from '../../data/jobs';
import {
  FILLER_METAL_TYPES, FILLER_METAL_TYPE_OPTIONS, FILLER_METAL_SIZE_OPTIONS
} from '../../data/procedures';

export type OptionSourceId = 'weldPositions' | 'materialTypes' | 'fillerMetalTypes' | 'fillerMetalSizes' | 'fillerClassifications';

interface Option { label: string; value: string; }

interface OptionSource {
  label: string;
  /* true for an admin table a new field can pick from */
  adminTable: boolean;
  /* the choices; inactive admin-table rows only when one of them is already picked */
  options(picked: string[]): Option[];
}

const plain = (list: string[]): Option[] => list.map(v => ({ label: v, value: v }));

const SOURCES: Record<OptionSourceId, OptionSource> = {
  weldPositions: {
    label: 'Admin > Weld Positions', adminTable: true,
    options: picked => getWeldPositions().data.positions
      .filter(p => p.active !== false || picked.includes(p.code))
      .map(p => ({ label: `${p.code} - ${p.description}${p.active === false ? ' (inactive)' : ''}`, value: p.code })),
  },
  materialTypes: { label: 'Material Types', adminTable: false, options: () => plain(MATERIAL_TYPES) },
  fillerMetalTypes: { label: 'Filler Metal Types', adminTable: false, options: () => FILLER_METAL_TYPE_OPTIONS },
  fillerMetalSizes: { label: 'Filler Metal Sizes', adminTable: false, options: () => FILLER_METAL_SIZE_OPTIONS },
  fillerClassifications: { label: 'Filler Metal Classifications', adminTable: false, options: () => plain(FILLER_METAL_TYPES) },
};

/* the admin tables a new field can take its choices from */
export const ADMIN_TABLE_SOURCES: { label: string; value: OptionSourceId }[] = (Object.keys(SOURCES) as OptionSourceId[])
  .filter(id => SOURCES[id].adminTable)
  .map(id => ({ label: SOURCES[id].label, value: id }));

export function sourceLabel(id: OptionSourceId): string {
  return SOURCES[id].label;
}

export function sourceOptions(id: OptionSourceId, picked: string[] = []): Option[] {
  return SOURCES[id].options(picked);
}
