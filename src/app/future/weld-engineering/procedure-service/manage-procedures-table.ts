import type { Procedure } from '../../../data/procedures';
import { TableState, inArray } from '../../../shared/table-state';

export function createManageProceduresTable(): TableState<Procedure> {
  return new TableState<Procedure>(['title', 'wtn', 'gwp'], { status: inArray });
}
