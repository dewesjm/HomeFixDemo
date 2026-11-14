/* Weld Record's joint fields under the labels the Joint Details panel uses, grouped as Pipe Welding's
   Advanced Search shows them: the joint record's own fields plus currentRouting (the joint's routing now)
   and vt (worked out from the NDT requirement, as Joint Details shows it). kind: how a filter matches
   it (list = pick from the values joints have). Used by Advanced Search and the joint service. */
import type { FieldKind } from '../../shared/filter-engine';
import { NDT_LABELS } from '../../data/ndt-labels';

export interface JointFieldEntry { key: string; label: string; group: string; kind: FieldKind; }

const f = (key: string, label: string, group: string, kind: FieldKind = 'text'): JointFieldEntry => ({ key, label, group, kind });

export const JOINT_FIELD_CATALOG: JointFieldEntry[] = [
  f('xrefid', 'XREFID', 'Job'),
  f('ship', 'Ship', 'Job'),
  f('hull', 'Hull', 'Job'),
  f('drawing', 'Drawing', 'Job'),
  f('drawingRev', 'Drawing Rev', 'Job'),
  f('joint', 'Joint', 'Job'),
  f('currentRouting', 'Routing', 'Job', 'list'),
  f('jointDesign', 'Joint Design', 'Welding', 'list'),
  f('weldType', 'Weld Type', 'Welding', 'list'),
  f('materialType1', 'Material Type 1', 'Welding', 'list'),
  f('materialType2', 'Material Type 2', 'Welding', 'list'),
  f('pipeSize', 'Pipe Size', 'Welding'),
  f('wallThickness', 'Wall Thickness', 'Welding'),
  f('mcl1', 'MCL 1', 'Welding', 'list'),
  f('mcl2', 'MCL 2', 'Welding', 'list'),
  f('joiningItem', 'Joining Item', 'Welding'),
  f('joinToItem', 'Join To Item', 'Welding'),
  f('sequenceNumber', 'Sequence #', 'Welding'),
  f('nInd', 'Nuclear Indicator', 'Welding', 'list'),
  f('engineeringNotes', 'Engineering Notes', 'Welding'),
  f('ndt', 'NDT', 'NDT'),
  f('rtRoot', NDT_LABELS.rtRoot, 'NDT', 'list'),
  f('rtFinal', NDT_LABELS.rtFinal, 'NDT', 'list'),
  f('ndtRoot', NDT_LABELS.ndtRoot, 'NDT', 'list'),
  f('ndtEach', NDT_LABELS.ndtEach, 'NDT', 'list'),
  f('ndtFinal', NDT_LABELS.ndtFinal, 'NDT', 'list'),
  f('ut', NDT_LABELS.ut, 'NDT', 'list'),
  f('vt', NDT_LABELS.vt, 'NDT', 'list'),
  f('pwht', 'PWHT', 'NDT'),
  f('order', 'Order', 'Additional'),
  f('workPackage', 'Work Package', 'Additional'),
  f('workPermit', 'Work Permit', 'Additional'),
  f('waff', 'WAFF', 'Additional'),
  f('serialNumber', 'Serial Number', 'Additional'),
  f('refitNumber', 'Refit #', 'Additional'),
  f('repairNumber', 'Repair #', 'Additional'),
  f('ss', 'SS', 'Additional'),
  f('sfff', 'SFCC', 'Additional'),
  f('dssAaa', 'DSS-SOC', 'Additional'),
  f('er1', 'ER1', 'Additional'),
  f('er2', 'ER2', 'Additional'),
  f('er3', 'ER3', 'Additional'),
  f('er4', 'ER4', 'Additional'),
  f('attributeCode1', 'Attribute Code 1', 'Additional'),
  f('attributeCode2', 'Attribute Code 2', 'Additional'),
  f('attributeCode3', 'Attribute Code 3', 'Additional'),
  f('attributeCode4', 'Attribute Code 4', 'Additional'),
  f('estimatedHours', 'Estimated Hours', 'Additional', 'number'),
];
