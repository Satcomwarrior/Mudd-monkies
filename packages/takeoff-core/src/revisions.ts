export type RevisionDecision =
  | 'carry-forward'
  | 'remeasure'
  | 'replace'
  | 'ignore';

export interface RevisionImpact {
  annotationId: string;
  changed: boolean;
  decision?: RevisionDecision;
  reason?: string;
}

export function unresolvedRevisionImpacts(
  impacts: readonly RevisionImpact[],
): RevisionImpact[] {
  return impacts.filter((impact) => impact.changed && !impact.decision);
}

export function canFinalizeRevision(
  impacts: readonly RevisionImpact[],
): boolean {
  return unresolvedRevisionImpacts(impacts).length === 0;
}
