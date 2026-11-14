import { getWeldPositions as loadWeldPositions } from '../../data/weld-positions';
import { ALL_QUALS } from '../qualifications-logic/qualifications';

export function getWeldPositions() {
  return { ok: true as const, data: { positions: loadWeldPositions() } };
}

export function getQualifications() {
  return { ok: true as const, data: { qualifications: [...ALL_QUALS] } };
}
