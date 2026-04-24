import type { PipelineInput } from './types';
import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_USER_TEMPLATE,
  PREDICTIVE_SYSTEM_PROMPT,
  PREDICTIVE_USER_TEMPLATE,
} from './defaultPrompts';

function formatData(input: PipelineInput): string {
  const lines: string[] = [];

  lines.push('=== Portfolio Summary ===');
  lines.push(`Month: ${input.revenue_month}`);
  lines.push(`Total Properties: ${input.property_count}`);
  lines.push(`Total Revenue: $${input.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  lines.push(`Average Revenue: $${input.avg_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  lines.push(`Min Revenue: $${input.min_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  lines.push(`Max Revenue: $${input.max_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  lines.push(`Portfolio ADR: $${input.portfolio_adr.toFixed(2)}`);
  lines.push(`Total Occupied Nights: ${input.total_nights}`);
  lines.push('');
  lines.push(`=== Top Properties (${input.properties.length} of ${input.property_count}) ===`);

  for (const p of input.properties) {
    const delta = p.yield_mom_pct !== null
      ? ` (${p.yield_mom_pct >= 0 ? '+' : ''}${(p.yield_mom_pct * 100).toFixed(1)}% MoM)`
      : '';
    lines.push(
      `- ${p.listing_nickname} [${p.listing_id}]: Revenue $${p.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, ` +
      `${p.occupied_nights} nights, ADR $${p.adr.toFixed(2)}${delta}`
    );
  }

  lines.push('');
  lines.push('=== Channel Mix (portfolio) ===');
  if (input.channel_mix.length === 0) {
    lines.push('- No channel mix data available.');
  } else {
    for (const c of input.channel_mix) {
      lines.push(
        `- ${c.channel_label}: $${c.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ` +
          `(${(c.revenue_share * 100).toFixed(1)}%)`
      );
    }
  }

  return lines.join('\n');
}

export function buildPrompt(
  input: PipelineInput,
  systemPrompt?: string,
  userTemplate?: string,
): { system: string; user: string } {
  // Select prompts based on forecastMode
  const isPredictive = input.forecastMode === true;

  const system = isPredictive
    ? PREDICTIVE_SYSTEM_PROMPT
    : (systemPrompt || DEFAULT_SYSTEM_PROMPT);

  const template = isPredictive
    ? PREDICTIVE_USER_TEMPLATE
    : (userTemplate || DEFAULT_USER_TEMPLATE);

  const data = formatData(input);

  const propertiesDataJson = JSON.stringify(input.properties_data);
  const channelMixJson = JSON.stringify(input.channel_mix);
  const riskDataJson = JSON.stringify(input.risk_data ?? []);
  const trendDataJson = JSON.stringify(input.trend_data ?? []);

  const replacements: Record<string, string> = {
    '{{revenue_month}}': input.revenue_month,
    '{{data}}': data,

    '{{ $json.revenue_month }}': input.revenue_month,
    '{{ $json.property_count }}': String(input.property_count),
    '{{ $json.avg_revenue }}': input.avg_revenue.toFixed(2),
    '{{ $json.min_revenue }}': input.min_revenue.toFixed(2),
    '{{ $json.max_revenue }}': input.max_revenue.toFixed(2),

    '{{ JSON.stringify($json.properties_data) }}': propertiesDataJson,
    '{{ JSON.stringify($json.channel_mix) }}': channelMixJson,
    '{{properties_data_json}}': propertiesDataJson,
    '{{channel_mix_json}}': channelMixJson,
    '{{risk_data_json}}': riskDataJson,
    '{{trend_data_json}}': trendDataJson,
  };

  // Forecast-specific replacements
  if (isPredictive && input.forecast) {
    replacements['{{model_used}}'] = input.forecast.model_used;
    replacements['{{predicted_revenue}}'] = input.forecast.predicted_revenue.toFixed(2);
    replacements['{{lower_bound}}'] = input.forecast.lower_bound?.toFixed(2) ?? 'N/A';
    replacements['{{upper_bound}}'] = input.forecast.upper_bound?.toFixed(2) ?? 'N/A';
  }

  let user = template;
  for (const [k, v] of Object.entries(replacements)) {
    user = user.split(k).join(v);
  }

  return { system, user };
}
