/* Column lists for each External Loads table. */
import { StageColumn } from './stage-table.component';

const KEY_COLUMNS: StageColumn[] = [
  { field: 'xrefid', label: 'XREFID', filter: 'text', mono: true },
  { field: 'hull', label: 'Hull', filter: 'text' },
  { field: 'drawing', label: 'Drawing', filter: 'text', mono: true },
  { field: 'joint', label: 'Joint', filter: 'text' },
];

const DATA_COLUMNS: StageColumn[] = [
  { field: 'description', label: 'Description', wide: true },
  { field: 'status', label: 'Status', filter: 'select' },
  { field: 'workBy', label: 'Work By', filter: 'select' },
  { field: 'materialType1', label: 'Material Type 1' },
  { field: 'materialType2', label: 'Material Type 2' },
  { field: 'pipeSize', label: 'Pipe Size' },
  { field: 'weldLength', label: 'Weld Length' },
  { field: 'plannedDate', label: 'Planned Date' },
  { field: 'changedDate', label: 'Changed Date' },
];

export const CONVERTED_COLUMNS: StageColumn[] = [
  { field: 'lineNo', label: 'Line' },
  { field: 'errors', label: 'Conversion Errors', filter: 'text', wide: true, textClass: 'text-error' },
  ...KEY_COLUMNS,
  ...DATA_COLUMNS,
];

export const PROCESSED_COLUMNS: StageColumn[] = [
  { field: 'lineNo', label: 'Line' },
  { field: 'outcome', label: 'Outcome', filter: 'select',
    badges: { 'Included': 'badge-success', 'Excluded': 'badge-warning', 'Not converted': 'badge-error' } },
  { field: 'reason', label: 'Reason', filter: 'select' },
  { field: 'detail', label: 'Detail', wide: true },
  ...KEY_COLUMNS,
  ...DATA_COLUMNS,
];

export const WELD_JOINT_COLUMNS: StageColumn[] = [
  { field: 'action', label: 'Merge Action', filter: 'select',
    badges: { 'Added': 'badge-success', 'Updated': 'badge-info', 'Unchanged': 'badge-ghost', 'Removed': 'badge-error', 'Kept': 'badge-warning' } },
  { field: 'detail', label: 'Detail', wide: true },
  { field: 'weldRecordData', label: 'Weld Record Data', filter: 'select' },
  ...KEY_COLUMNS,
  ...DATA_COLUMNS,
];

export const RUN_COLUMNS: StageColumn[] = [
  { field: 'id', label: 'Load' },
  { field: 'status', label: 'Status', filter: 'select',
    badges: { 'Live': 'badge-success', 'Previous': 'badge-info', 'Failed check': 'badge-error', 'Replaced': 'badge-ghost' } },
  { field: 'startedAt', label: 'Started', dateTime: true },
  { field: 'finishedAt', label: 'Finished', dateTime: true },
  { field: 'linesReceived', label: 'Lines' },
  { field: 'checks', label: 'File Checks', wide: true },
  { field: 'dataKept', label: 'Tables Kept' },
  { field: 'note', label: 'Note', wide: true },
];

export const ERROR_COLUMNS: StageColumn[] = [
  { field: 'at', label: 'When', dateTime: true },
  { field: 'loadId', label: 'Load' },
  { field: 'stage', label: 'Stage', filter: 'select' },
  { field: 'type', label: 'Type', filter: 'select' },
  ...KEY_COLUMNS,
  { field: 'lineNo', label: 'Line' },
  { field: 'message', label: 'Message', wide: true },
];
