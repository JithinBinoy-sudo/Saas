import { NextRequest, NextResponse } from 'next/server';
import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';
import { SUPPORTED_MODELS } from '@/lib/pipeline/types';
import type { PipelineInput, PropertySummaryRow } from '@/lib/pipeline/types';
import { inferProvider, getApiKeyForProvider } from '@/lib/pipeline/getProvider';
import { computeHash } from '@/lib/pipeline/computeHash';
import { buildPrompt } from '@/lib/pipeline/buildPrompt';
import { createProvider } from '@/lib/pipeline/providers';

const PROPERTY_CAP = 10;
const PROPERTIES_DATA_CAP = 200;

export async function POST(request: NextRequest) {
  // 1. Auth
  const supabase = createAppServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Parse body
  let body: { revenue_month?: string; model?: string; preview?: boolean; briefing_name?: string; forecastMode?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { revenue_month, model, preview, briefing_name, forecastMode } = body;
  if (!revenue_month || !model) {
    return NextResponse.json({ error: 'revenue_month and model are required' }, { status: 400 });
  }

  // Preview runs (used by "Test Prompt") should not require persistence fields.
  // For non-preview runs, allow omission and fall back to a deterministic name.
  const resolvedBriefingName = preview
    ? null
    : (briefing_name?.trim() || `ARCA Portfolio Performance (${revenue_month})`);

  // 2. Get user row (role + company_id)
  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (userError || !userRow) {
    return NextResponse.json({ error: 'User record not found' }, { status: 404 });
  }

  // 3. Validate model
  if (!SUPPORTED_MODELS[model]) {
    return NextResponse.json({ error: `Unsupported model: ${model}` }, { status: 400 });
  }

  const admin = createAppAdminClient();

  // 5. Fetch company
  const { data: company, error: companyError } = await admin
    .from('companies')
    .select('id, mode, openai_api_key, anthropic_api_key, google_api_key')
    .eq('id', userRow.company_id)
    .single();

  if (companyError || !company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  // 6. Infer provider + check key
  const providerName = inferProvider(model);
  const encryptedKey = getApiKeyForProvider(providerName, company);
  if (!encryptedKey) {
    return NextResponse.json(
      { error: 'API key not configured', provider: providerName },
      { status: 402 }
    );
  }

  const apiKey = decrypt(encryptedKey);

  // 7. Fetch prompt config (or use defaults)
  const { data: promptConfig } = await admin
    .from('prompt_configs')
    .select('system_prompt, user_prompt_template, temperature, max_tokens')
    .eq('company_id', userRow.company_id)
    .single();

  const temperature = promptConfig?.temperature ?? 0.3;
  const maxTokens = promptConfig?.max_tokens ?? 2000;

  const companyId = company.id;

  // 9. Fetch monthly summary
  const { data: summaryData, error: summaryError } = await admin
    .from('monthly_portfolio_summary')
    .select('*')
    .eq('revenue_month', revenue_month)
    .eq('company_id', companyId)
    .single();

  if (summaryError || !summaryData) {
    return NextResponse.json({ error: 'No data for requested month' }, { status: 404 });
  }

  // 10. Fetch top properties
  const { data: allPropertyRows } = await admin
    .from('mom_trends_silver')
    .select('listing_id, listing_nickname, revenue, occupied_nights, adr, prev_revenue')
    .eq('revenue_month', revenue_month)
    .eq('company_id', companyId)
    .order('revenue', { ascending: true });

  const all = (allPropertyRows ?? []).map((r: Record<string, unknown>) => {
    const revenue = Number(r.revenue ?? 0);
    const prev = r.prev_revenue === null || r.prev_revenue === undefined ? null : Number(r.prev_revenue);
    const yieldMomPct = prev && prev !== 0 ? (revenue - prev) / prev : null;
    return {
      listing_id: String(r.listing_id ?? ''),
      listing_nickname: String(r.listing_nickname ?? ''),
      revenue,
      occupied_nights: Number(r.occupied_nights ?? 0),
      adr: Number(r.adr ?? 0),
      prev_revenue: prev,
      yield_mom_pct: yieldMomPct,
    };
  }).filter((p) => p.listing_id);

  const property_count = all.length || summaryData.property_count;
  const totalRevenueAcross = all.reduce((acc, p) => acc + p.revenue, 0);
  const avg_revenue = property_count > 0 ? totalRevenueAcross / property_count : 0;
  const min_revenue = property_count > 0 ? Math.min(...all.map((p) => p.revenue)) : 0;
  const max_revenue = property_count > 0 ? Math.max(...all.map((p) => p.revenue)) : 0;

  const topDesc = [...all].sort((a, b) => b.revenue - a.revenue).slice(0, PROPERTY_CAP);
  const properties: PropertySummaryRow[] = topDesc.map((p) => ({
    listing_id: p.listing_id,
    listing_nickname: p.listing_nickname,
    revenue: p.revenue,
    occupied_nights: p.occupied_nights,
    adr: p.adr,
    yield_mom_pct: p.yield_mom_pct,
  }));

  const properties_data =
    all.length <= PROPERTIES_DATA_CAP
      ? all
      : [
          ...all.slice(0, Math.floor(PROPERTIES_DATA_CAP / 2)),
          ...all.slice(-Math.ceil(PROPERTIES_DATA_CAP / 2)),
        ];

  // 10b. Channel mix for this month (portfolio-wide)
  const { data: channelRows } = await admin
    .from('monthly_channel_mix_silver')
    .select('channel_label, revenue')
    .eq('company_id', companyId)
    .eq('revenue_month', revenue_month);

  type ChannelRow = { channel_label: string | null; revenue: number | null };
  const channelAgg = new Map<string, number>();
  for (const row of (channelRows ?? []) as ChannelRow[]) {
    const label = row.channel_label ?? 'unknown';
    const rev = row.revenue ?? 0;
    channelAgg.set(label, (channelAgg.get(label) ?? 0) + rev);
  }
  const channelTotal = Array.from(channelAgg.values()).reduce((a, b) => a + b, 0);
  const channel_mix = Array.from(channelAgg.entries())
    .map(([channel_label, total_revenue]) => ({
      channel_label,
      total_revenue,
      revenue_share: channelTotal > 0 ? total_revenue / channelTotal : 0,
    }))
    .sort((a, b) => b.total_revenue - a.total_revenue);

  // 11. Optionally fetch forecast + risk data for forecastMode
  let forecastData: { predicted_revenue: number; lower_bound: number | null; upper_bound: number | null; model_used: string } | undefined;
  let riskData: { listing_id: string; listing_nickname: string; risk_score: number; negative_months_in_3m: number; revenue_vs_median_pct: number | null }[] | undefined;
  let trendDataForPrompt: { revenue_month: string; total_revenue: number }[] | undefined;

  if (forecastMode) {
    // Fetch latest forecast
    const { data: fcRows } = await admin
      .from('revenue_forecasts')
      .select('predicted_revenue, lower_bound, upper_bound, model_used')
      .eq('company_id', companyId)
      .order('forecast_month', { ascending: false })
      .limit(50);

    if (fcRows && fcRows.length > 0) {
      const totalPredicted = fcRows.reduce((s: number, r: Record<string, unknown>) => s + Number(r.predicted_revenue ?? 0), 0);
      const totalLower = fcRows.reduce((s: number, r: Record<string, unknown>) => s + Number(r.lower_bound ?? 0), 0);
      const totalUpper = fcRows.reduce((s: number, r: Record<string, unknown>) => s + Number(r.upper_bound ?? 0), 0);
      forecastData = {
        predicted_revenue: totalPredicted,
        lower_bound: totalLower || null,
        upper_bound: totalUpper || null,
        model_used: String(fcRows[0].model_used ?? 'prophet'),
      };
    }

    // Fetch risk scores
    const { data: riskRows } = await admin
      .from('property_risk_score_silver')
      .select('listing_id, listing_nickname, risk_score, negative_months_in_3m, revenue_vs_median_pct')
      .eq('company_id', companyId)
      .eq('revenue_month', revenue_month);

    if (riskRows) {
      riskData = riskRows as typeof riskData;
    }

    // Fetch trend data for context
    const { data: trendRows } = await admin
      .from('monthly_portfolio_summary')
      .select('revenue_month, total_revenue')
      .eq('company_id', companyId)
      .order('revenue_month', { ascending: false })
      .limit(12);

    if (trendRows) {
      trendDataForPrompt = (trendRows as { revenue_month: string; total_revenue: number }[]).reverse();
    }
  }

  // 12. Build pipeline input + hash
  const pipelineInput: PipelineInput = {
    company_id: userRow.company_id,
    revenue_month,
    property_count,
    total_revenue: summaryData.total_revenue,
    avg_revenue,
    min_revenue,
    max_revenue,
    portfolio_adr: summaryData.portfolio_adr,
    total_nights: summaryData.total_nights,
    properties,
    properties_data,
    channel_mix,
    forecastMode: forecastMode || false,
    forecast: forecastData,
    risk_data: riskData,
    trend_data: trendDataForPrompt,
  };

  const dataHash = computeHash(pipelineInput);

  // --- Preview mode: run AI but skip all persistence ---
  if (preview) {
    try {
      const { system, user: userPrompt } = buildPrompt(
        pipelineInput,
        promptConfig?.system_prompt,
        promptConfig?.user_prompt_template
      );

      const provider = createProvider(providerName, apiKey);
      const result = await provider.chat({
        system,
        user: userPrompt,
        model,
        temperature,
        maxTokens,
      });

      return NextResponse.json({
        briefing_text: result.text,
        model,
        prompt_tokens: result.promptTokens,
        completion_tokens: result.completionTokens,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.includes('timeout') || message.includes('TIMEOUT')) {
        return NextResponse.json({ error: 'Provider timeout' }, { status: 504 });
      }
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // 12. Check existing briefing hash → 409 if unchanged
  const briefingQuery = admin
    .from('monthly_portfolio_briefings')
    .select('data_hash')
    .eq('revenue_month', revenue_month)
    .eq('company_id', userRow.company_id);
  const { data: existingBriefing } = await briefingQuery.single();

  if (existingBriefing?.data_hash === dataHash) {
    return NextResponse.json({ upToDate: true }, { status: 409 });
  }

  // 13. Create pipeline run record
  const { data: runRow, error: runError } = await admin
    .from('pipeline_runs')
    .insert({
      company_id: userRow.company_id,
      revenue_month,
      status: 'running',
      model,
      triggered_by: user.id,
    })
    .select('id')
    .single();

  if (runError || !runRow) {
    return NextResponse.json({ error: 'Failed to create pipeline run' }, { status: 500 });
  }

  const runId = runRow.id;

  try {
    // 14. Build prompt
    const { system, user: userPrompt } = buildPrompt(
      pipelineInput,
      promptConfig?.system_prompt,
      promptConfig?.user_prompt_template
    );

    // 15. Call provider
    const provider = createProvider(providerName, apiKey);
    const result = await provider.chat({
      system,
      user: userPrompt,
      model,
      temperature,
      maxTokens,
    });

    // 16. Upsert briefing
    await admin
      .from('monthly_portfolio_briefings')
      .upsert({
        company_id: userRow.company_id,
        revenue_month,
        briefing_name: resolvedBriefingName,
        portfolio_summary: result.text,
        property_count: pipelineInput.property_count,
        data_hash: dataHash,
        model,
        generated_at: new Date().toISOString(),
      }, { onConflict: 'company_id,revenue_month' });

    // 17. Update pipeline run → complete
    await admin
      .from('pipeline_runs')
      .update({ status: 'complete', completed_at: new Date().toISOString() })
      .eq('id', runId);

    // 18. Return success
    return NextResponse.json({
      briefing_text: result.text,
      revenue_month,
      generated_at: new Date().toISOString(),
      data_hash: dataHash,
      model,
      provider: providerName,
    });
  } catch (err) {
    // On error: mark pipeline run as failed
    const message = err instanceof Error ? err.message : 'Unknown error';
    await admin
      .from('pipeline_runs')
      .update({ status: 'failed', error_message: message })
      .eq('id', runId);

    if (message.includes('timeout') || message.includes('TIMEOUT')) {
      return NextResponse.json({ error: 'Provider timeout' }, { status: 504 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
