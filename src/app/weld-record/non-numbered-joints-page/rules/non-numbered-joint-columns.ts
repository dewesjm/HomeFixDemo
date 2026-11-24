/* Non-Numbered Joints table: the columns, in order, used for the headings and the Export file. */
import type { NonNumberedJoint } from '../../../data/non-numbered-joints';

/* a table row: the joint with its hulls as one text value, so they sort and filter as text */
export type NonNumberedJointRow = Omit<NonNumberedJoint, 'hulls'> & { hulls: string };

export const toRow = (joint: NonNumberedJoint): NonNumberedJointRow => ({ ...joint, hulls: joint.hulls.join(', ') });

export const NON_NUMBERED_JOINT_COLUMNS: { key: keyof NonNumberedJointRow & string; label: string }[] = [
  { key: 'interimPartNumber', label: 'Interim Part Number' },
  { key: 'order', label: 'Order' },
  { key: 'sequenceNumber', label: 'Sequence Number' },
  { key: 'findNumber1', label: 'Find Number 1' },
  { key: 'findNumber2', label: 'Find Number 2' },
  { key: 'manufacturingDrawingItem', label: 'Manufacturing Drawing Item' },
  { key: 'description', label: 'Description' },
  { key: 'additionalDescription1', label: 'Additional Description 1' },
  { key: 'additionalDescription2', label: 'Additional Description 2' },
  { key: 'weldClass', label: 'Weld Class' },
  { key: 'jointType', label: 'Joint Type' },
  { key: 'nominalSize', label: 'Nominal Size' },
  { key: 'wallThickness', label: 'Wall Thickness' },
  { key: 'mcl1', label: 'MCL 1' },
  { key: 'mcl2', label: 'MCL 2' },
  { key: 'milSpecification', label: 'Mil Specification' },
  { key: 'wireSize', label: 'Wire Size' },
  { key: 'pipeScheduleClass', label: 'Pipe Schedule Class' },
  { key: 'nInd', label: 'N Indicator' },
  { key: 'hulls', label: 'List of Hulls' },
];
