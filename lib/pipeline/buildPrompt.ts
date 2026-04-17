import type { PipelineInput } from './types';

const DEFAULT_SYSTEM_PROMPT = `You are a short-term rental portfolio analyst. Given monthly performance data for a vacation rental portfolio, write a concise executive briefing (3–5 paragraphs) that:
1. Summarises portfolio-wide KPIs (revenue, ADR, occupancy) and month-over-month trends.
2. Highlights top-performing and underperforming properties with specific numbers.
3. Identifies actionable insights or risks (seasonality, pricing gaps, channel dependency).
4. Keeps a professional but accessible tone suitable for property managers.`;

const DEFAULT_USER_TEMPLATE = `Analyze the following portfolio data for {{revenue_month}}:

{{data}}`;

function formatData(input: PipelineInput): string {
  const lines: string[] = [];

  lines.push('=== Portfolio Summary ===');
  lines.push(`Month: ${input.revenue_month}`);
  lines.push(`Total Properties: ${input.property_count}`);
  lines.push(`Total Revenue: $${input.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  lines.push(`Portfolio ADR: $${input.portfolio_adr.toFixed(2)}`);
  lines.push(`Total Occupied Nights: ${input.total_nights}`);
  lines.push('');
  lines.push(`=== Top Properties (${input.properties.length} of ${input.property_count}) ===`);

  for (const p of input.properties) {
    const delta = p.revenue_delta !== null
      ? ` (${p.revenue_delta >= 0 ? '+' : ''}${(p.revenue_delta * 100).toFixed(1)}% MoM)`
      : '';
    lines.push(
      `- ${p.listing_nickname} [${p.listing_id}]: Revenue $${p.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, ` +
      `${p.occupied_nights} nights, ADR $${p.adr.toFixed(2)}${delta}`
    );
  }

  return lines.join('\n');
}

export function buildPrompt(
  input: PipelineInput,
  systemPrompt?: string,
  userTemplate?: string,
): { system: string; user: string } {
  const system = systemPrompt || DEFAULT_SYSTEM_PROMPT;
  const template = userTemplate || DEFAULT_USER_TEMPLATE;
  const data = formatData(input);

  const user = template
    .replace('{{revenue_month}}', input.revenue_month)
    .replace('{{data}}', data);

  return { system, user };
}
