import { NextRequest, NextResponse } from 'next/server';
import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';
import { getDataClient } from '@/lib/getDataClient';
import { SUPPORTED_MODELS } from '@/lib/pipeline/types';
import type { PipelineInput, PropertySummaryRow } from '@/lib/pipeline/types';
import { inferProvider, getApiKeyForProvider } from '@/lib/pipeline/getProvider';
import { computeHash } from '@/lib/pipeline/computeHash';
import { buildPrompt } from '@/lib/pipeline/buildPrompt';
import { createProvider } from '@/lib/pipeline/providers';

const PROPERTY_CAP = 10;

export async function POST(request: NextRequest) {
  // 1. Auth
  const supabase = createAppServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Parse body
  let body: { revenue_month?: string; model?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { revenue_month, model } = body;
  if (!revenue_month || !model) {
    return NextResponse.json({ error: 'revenue_month and model are required' }, { status: 400 });
  }

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

  // 4. Admin check
  if (userRow.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const admin = createAppAdminClient();

  // 5. Fetch company
  const { data: company, error: companyError } = await admin
    .from('companies')
    .select('id, mode, openai_api_key, anthropic_api_key, google_api_key, supabase_url, supabase_service_key')
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

  // 8. Get data client
  const dataClient = getDataClient({
    mode: company.mode,
    supabase_url: company.supabase_url,
    supabase_service_key: company.supabase_service_key,
  });

  const companyId = company.mode === 'hosted' ? company.id : undefined;

  // 9. Fetch monthly summary
  let summaryQuery = dataClient
    .from('monthly_portfolio_summary')
    .select('*')
    .eq('revenue_month', revenue_month);
  if (companyId) summaryQuery = summaryQuery.eq('company_id', companyId);
  const { data: summaryData, error: summaryError } = await summaryQuery.single();

  if (summaryError || !summaryData) {
    return NextResponse.json({ error: 'No data for requested month' }, { status: 404 });
  }

  // 10. Fetch top properties
  let propsQuery = dataClient
    .from('final_reporting_gold')
    .select('listing_id, listing_nickname, revenue, occupied_nights, adr, revenue_delta')
    .eq('revenue_month', revenue_month)
    .order('revenue', { ascending: false })
    .limit(PROPERTY_CAP);
  if (companyId) propsQuery = propsQuery.eq('company_id', companyId);
  const { data: propertyRows } = await propsQuery;

  const properties: PropertySummaryRow[] = (propertyRows ?? []).map((r: Record<string, unknown>) => ({
    listing_id: r.listing_id as string,
    listing_nickname: r.listing_nickname as string,
    revenue: r.revenue as number,
    occupied_nights: r.occupied_nights as number,
    adr: r.adr as number,
    revenue_delta: r.revenue_delta as number | null,
  }));

  // 11. Build pipeline input + hash
  const pipelineInput: PipelineInput = {
    company_id: userRow.company_id,
    revenue_month,
    property_count: summaryData.property_count,
    total_revenue: summaryData.total_revenue,
    portfolio_adr: summaryData.portfolio_adr,
    total_nights: summaryData.total_nights,
    properties,
  };

  const dataHash = computeHash(pipelineInput);

  // 12. Check existing briefing hash → 409 if unchanged
  let briefingQuery = admin
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
