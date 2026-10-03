/* The built-in Welding routing, in order. Admin > Routing can reorder, edit and add to these
   (stage-templates.ts keeps those changes). */
import { FILLER_METAL_SIZE_OPTIONS, FILLER_METAL_TYPE_OPTIONS } from '../procedures';
import { SignoffField, StageField, StageTemplate } from './types';
import { WELD_STAGE_FIELDS } from './weld-fields';
import { ndtStage } from './ndt';

const BACKING_RING_OPTIONS = [
  { label: 'Standard', value: 'standard' }, { label: 'Heavy', value: 'heavy' },
  { label: 'Copper', value: 'copper' }, { label: 'Ceramic', value: 'ceramic' },
];

/* Consumable Insert / Backing Ring sign-off fields shared by Pre-Fit and Fit. Insert and filler metal
   share the same choices: "Only Consumable Insert used as filler" copies the Fit stage's insert
   type/size into the filler fields. Visibility is gated by the joint design (joint-page's
   jointDesignRequiresInsert()/jointDesignRequiresBackingRing()), and the MICs are only required when
   either joint member's MCL requires traceability (SignoffPanelComponent.micSignoffRequired()). */
function insertAndBackingRingFields(): SignoffField[] {
  return [
    { key: 'consumableInsertType', label: 'Consumable Insert Type', type: 'select', required: true,
      options: FILLER_METAL_TYPE_OPTIONS },
    { key: 'consumableInsertSize', label: 'Consumable Insert Size', type: 'select', required: true,
      options: FILLER_METAL_SIZE_OPTIONS },
    { key: 'consumableInsertId', label: 'Consumable Insert MIC', type: 'text', required: false },
    { key: 'backingRingType', label: 'Backing Ring Type', type: 'select', required: true,
      options: BACKING_RING_OPTIONS },
    { key: 'backingRingId', label: 'Backing Ring MIC', type: 'text', required: false },
    { key: 'comments', label: 'Comments', type: 'text', required: false, fullWidth: true },
  ];
}

/* the checklist both Records Reviews (O63 and O04) go through */
function recordsReviewFields(): StageField[] {
  return [
    { key: 'verifyDrawing', label: 'Drawing', type: 'checkbox' },
    { key: 'verifyDrawingRev', label: 'Drawing Rev', type: 'checkbox' },
    { key: 'verifyJoint', label: 'Joint Reference', type: 'checkbox' },
    { key: 'verifyJointDesign', label: 'Joint Design', type: 'checkbox' },
    { key: 'verifyWeldType', label: 'Weld Type', type: 'checkbox' },
    { key: 'verifyPipeSize', label: 'Pipe Size', type: 'checkbox' },
    { key: 'verifyWallThickness', label: 'Wall Thickness', type: 'checkbox' },
    { key: 'verifyMaterial1', label: 'Material Type 1', type: 'checkbox' },
    { key: 'verifyMaterial2', label: 'Material Type 2', type: 'checkbox' },
    { key: 'verifyMcl1', label: 'MIC 1', type: 'checkbox' },
    { key: 'verifyMcl2', label: 'MIC 2', type: 'checkbox' },
    { key: 'verifyNdt', label: 'NDT Requirement', type: 'checkbox' },
    { key: 'verifyPwht', label: 'PWHT', type: 'checkbox' },
    { key: 'verifyNInd', label: 'Nuclear Indicator', type: 'checkbox' },
    { key: 'verifyWps', label: 'WPS', type: 'checkbox' },
    { key: 'verifyOrder', label: 'Order', type: 'checkbox' },
    { key: 'verifyWorkPackage', label: 'Work Package', type: 'checkbox' },
    { key: 'comments', label: 'Comments', type: 'text', fullWidth: true },
  ];
}

export const WELDING_STEPS: StageTemplate[] = [
  /* Pre-Fit has no Defer Tack: there's no Tack yet to defer. As signoffFields (not fields) so it
     renders through the same signoff-fit-row layout as Fit. */
  { id: 'pre-fit', label: 'Pre-Fit', required: true, role: 'NQC Inspector', fields: [], signoffFields: insertAndBackingRingFields() },
  { id: 'fit', label: 'Fit', required: true, role: 'Fitting', fields: [], signoffFields: [
    ...insertAndBackingRingFields(),
    { key: 'deferTack', label: 'Defer Tack', type: 'text', required: false },
  ], routingOptions: [
    { label: 'Fit', value: 'fit', default: true },
    { label: 'Weld Build-Up', value: 'weld-buildup' },
  ] },
  { id: 'tack', label: 'Tack', displayName: 'Tack', required: true, role: 'Welding', fields: WELD_STAGE_FIELDS, signoffFields: [], routingOptions: [
    { label: 'Tack', value: 'standard', default: true },
  ] },
  { id: 'fitup-insp', label: 'Fit-Up Insp', required: true, role: 'Foreman|Inspector', fields: [
    { key: 'verifyMic1', label: 'MIC 1 verified', type: 'checkbox' },
    { key: 'verifyMic2', label: 'MIC 2 verified', type: 'checkbox' },
    { key: 'verifyDrawingRev', label: 'Drawing Rev verified', type: 'checkbox' },
    { key: 'verifyActualThickness', label: 'Actual Thickness verified', type: 'checkbox' },
    { key: 'verifyRevisedJointDesign', label: 'Revised Joint Design verified', type: 'checkbox' },
  ],
    signoffFields: [], decisionLabel: 'Inspection Results', rejectToStage: 'fit' },
  { id: 'fitup-release', label: 'Fit-Up Release', displayName: 'Fit-Up Release', required: false, role: 'Foreman', fields: [], signoffFields: [] },
  /* same form as Tack; only its position differs (after Fit-Up Insp) */
  { id: 'deferred-tack', label: 'Deferred Tack', displayName: 'Tack', required: false, role: 'Welding', fields: WELD_STAGE_FIELDS, signoffFields: [], routingOptions: [
    { label: 'Tack', value: 'standard', default: true },
  ] },
  { id: 'root-weld', label: 'Root', required: true, role: 'Welding', fields: [...WELD_STAGE_FIELDS,
      { key: 'consumableInsertOnly', label: 'Only Consumable Insert used as filler', type: 'checkbox' },
    ], signoffFields: [], routingOptions: [
    { label: 'Root', value: 'standard', default: true },
  ] },
  ndtStage('root', 'vt5x'),
  ndtStage('root', 'mtpt'),
  ndtStage('root', 'utrt'),
  { id: 'root-layer', label: 'Layer', required: true, role: 'Welding',
    fields: WELD_STAGE_FIELDS,
    signoffFields: [], routingOptions: [
      { label: 'Interim Layer', value: 'interim', default: true },
      { label: 'Final Layer', value: 'final' },
    ] },
  ndtStage('layer', 'vt5x'),
  ndtStage('layer', 'mtpt'),
  ndtStage('layer', 'utrt'),
  { id: 'final-weld', label: 'Final Weld', required: true, role: 'Welding', fields: WELD_STAGE_FIELDS, signoffFields: [], routingOptions: [
    { label: 'Final Weld', value: 'standard', default: true },
  ] },
  ndtStage('final', 'vt5x'),
  ndtStage('final', 'mtpt'),
  ndtStage('final', 'utrt'),
  /* a joint gets exactly one Records Review: O63 when the job has any SFFF/DSS-AAA/SS data, O04
     otherwise (their Admin > Routing conditions, see buildStages()) */
  { id: 'review-o63', label: 'O63 Records Review', required: true, role: 'O63 Records', fields: recordsReviewFields(),
    signoffFields: [], rejectToStage: 'final-ndt-vt5x', decisionLabel: 'Inspection Results' },
  { id: 'review-o04', label: 'O04 Records Review', required: true, role: 'O04 Records', fields: recordsReviewFields(),
    signoffFields: [], rejectToStage: 'final-ndt-vt5x', decisionLabel: 'Inspection Results' },
  { id: 'sold', label: 'Sold', required: true, role: 'O63 Records', fields: [], signoffFields: [] }
];
