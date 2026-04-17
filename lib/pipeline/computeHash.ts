import { createHash } from 'crypto';
import type { PipelineInput } from './types';

export function computeHash(input: PipelineInput): string {
  const canonical = JSON.stringify(input, Object.keys(input).sort());
  return createHash('sha256').update(canonical).digest('hex');
}
