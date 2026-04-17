'use client';

import { Badge } from '@/components/ui/badge';
import type { PipelineRunStatus } from '@/lib/pipeline/types';

const STATUS_CONFIG: Record<PipelineRunStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending:  { label: 'Pending',  variant: 'outline' },
  running:  { label: 'Running',  variant: 'default' },
  complete: { label: 'Complete', variant: 'secondary' },
  failed:   { label: 'Failed',   variant: 'destructive' },
};

type Props = {
  status: PipelineRunStatus;
};

export function PipelineStatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
