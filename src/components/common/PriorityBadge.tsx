import { Badge } from '@/components/ui/badge';

export type CandidatePriority = 'P0' | 'P1' | 'P2' | 'P3';

const VARIANT: Record<CandidatePriority, 'destructive' | 'warning' | 'default' | 'secondary'> = {
  P0: 'destructive',
  P1: 'warning',
  P2: 'default',
  P3: 'secondary',
};

/** Display label — the score range is the Round 1 (out of 35) band the rating maps to. */
export const PRIORITY_LABEL: Record<CandidatePriority, string> = {
  P0: 'P0 [31-35]',
  P1: 'P1 [26-30]',
  P2: 'P2 [21-25]',
  P3: 'P3 [< 20]',
};

export const PRIORITIES = Object.keys(PRIORITY_LABEL) as CandidatePriority[];

/** Highlighted recruiter rating, shown wherever Round 1 results are surfaced downstream. */
export function PriorityBadge({ priority, className = '' }: { priority: string | null | undefined; className?: string }) {
  if (!priority || !(priority in VARIANT)) return null;
  const p = priority as CandidatePriority;
  return (
    <Badge variant={VARIANT[p]} title={PRIORITY_LABEL[p]} className={className}>
      {PRIORITY_LABEL[p]}
    </Badge>
  );
}
