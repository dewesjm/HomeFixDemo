import { ADMINISTRATORS_GROUP_ID, DEVELOPER_GROUP_ID, FITTING_GROUP_ID, FOREMAN_GROUP_ID, INSPECTOR_GROUP_ID, NQC_INSPECTOR_GROUP_ID, VIEW_GROUP_ID, WELDING_GROUP_ID } from './admin-groups';

export const DEMO_PEOPLE = [
  { id: 'developer', label: 'Developer', groupIds: [DEVELOPER_GROUP_ID] },
  { id: 'administrator', label: 'Alex (Administrator)', groupIds: [ADMINISTRATORS_GROUP_ID] },
  { id: 'view', label: 'Casey (View)', groupIds: [VIEW_GROUP_ID] },
  { id: 'welder', label: 'Jordan (Welder)', groupIds: [WELDING_GROUP_ID] },
  { id: 'fitter', label: 'Bob (Fitter)', groupIds: [FITTING_GROUP_ID] },
  { id: 'foreman', label: 'Morgan (Foreman)', groupIds: [FOREMAN_GROUP_ID] },
  { id: 'inspector', label: 'Taylor (Inspector)', groupIds: [INSPECTOR_GROUP_ID] },
  { id: 'nqc-inspector', label: 'Drew (NQC Inspector)', groupIds: [NQC_INSPECTOR_GROUP_ID] },
  { id: 'o63', label: 'Jamie (O63 Records)', groupIds: ['g7', VIEW_GROUP_ID] },
  { id: 'o04', label: 'Sam (O04 Records)', groupIds: ['g8', VIEW_GROUP_ID] },
  { id: 'engineering', label: 'Cameron (Engineering)', groupIds: ['g9', VIEW_GROUP_ID] },
  { id: 'fitter-welder', label: 'Robin (Fitter and Welder)', groupIds: [FITTING_GROUP_ID, WELDING_GROUP_ID] },
];

export const DEFAULT_DEMO_PERSON = DEMO_PEOPLE[0];
