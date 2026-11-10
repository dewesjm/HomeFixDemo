/* deviations accepted at sign-off */
/* one out-of-spec value accepted at sign-off (see weld-record/joint-page/rules/deviations.ts) */
export interface DeviationItem {
  kind: 'out-of-range' | 'qual' | 'off-list' | 'reported';
  label: string;
  entered: string;
  required: string;
}

/* the deviations accepted at one sign-off; an open one holds the joint (DeviationService) */
export interface Deviation {
  id: string;
  stageId: string;
  stageLabel: string;
  items: DeviationItem[];
  reason: string;
  who: string;
  when: string;
  /* open = the joint is on Engineering Hold; dispositioned = Engineering set the routing;
     withdrawn = the sign-off that accepted it was deprogressed */
  status: 'open' | 'dispositioned' | 'withdrawn';
  /* the Engineering Hold step this deviation's sign-off added */
  holdStageId?: string;
  disposition?: { comments: string; routeTo: string; routeToLabel: string; who: string; when: string };
}
