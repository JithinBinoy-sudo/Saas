import { NextResponse } from 'next/server';
import { columnMappingSchema, REQUIRED_MAPPING_FIELDS } from '@/lib/validations/onboarding';
import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';

const DEFAULT_SYSTEM_PROMPT =
  'You are a portfolio analyst. Write concise monthly briefings that summarize revenue, occupancy, and notable trends across a short-term-rental portfolio. Be specific, use numbers, and avoid filler.';

const DEFAULT_USER_PROMPT_TEMPLATE =
  'Revenue month: {{revenue_month}}\nProperties: {{properties_data}}\nMonth totals: {{portfolio_totals}}\nChannel mix: {{channel_mix}}\n\nWrite a 5-8 sentence portfolio briefing for the month.';

async function seedPromptConfigIfMissing(companyId: string, adminClient: ReturnType<typeof createAppAdminClient>) {
  const { data: existing } = await adminClient
    .from('prompt_configs')
    .select('id')
    .eq('company_id', companyId)
    .limit(1)
    .maybeSingle();

  if (existing) return;

  await adminClient.from('prompt_configs').insert({
    company_id: companyId,
    name: 'portfolio_analysis',
    system_prompt: DEFAULT_SYSTEM_PROMPT,
    user_prompt_template: DEFAULT_USER_PROMPT_TEMPLATE,
  });
}

export async function POST(request: Request) {
  const supabase = createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = columnMappingSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { mappings, custom_fields, skipped, sample_headers } = parsed.data;

  const adminClient = createAppAdminClient();

  const { data: userRow, error: userError } = await adminClient
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (userError || !userRow) {
    return NextResponse.json({ error: 'User record not found' }, { status: 404 });
  }

  const companyId = userRow.company_id as string;

  const requiredMap: Record<string, string> = {};
  for (const field of REQUIRED_MAPPING_FIELDS) {
    requiredMap[field] = mappings[field];
  }

  const mappingsBlob = {
    required: requiredMap,
    custom_fields,
    skipped,
  };

  const { error: upsertError } = await adminClient
    .from('column_mappings')
    .upsert(
      {
        company_id: companyId,
        mappings: mappingsBlob,
        sample_headers,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'company_id' }
    );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  const { data: companyRow, error: companyFetchError } = await adminClient
    .from('companies')
    .select('mode, schema_deployed, onboarding_wizard_mode')
    .eq('id', companyId)
    .single();

  if (companyFetchError || !companyRow) {
    return NextResponse.json({ error: 'Company record not found' }, { status: 404 });
  }

  let schemaDeployed = Boolean(companyRow.schema_deployed);

  const row = companyRow as {
    mode: string;
    schema_deployed: boolean;
    onboarding_wizard_mode?: string | null;
  };
  const effectiveMode = row.onboarding_wizard_mode ?? row.mode;
  const nextStep = effectiveMode === 'byos' ? 4 : 3;

  if (effectiveMode === 'hosted') {
    const { error: updateError } = await adminClient
      .from('companies')
      .update({ onboarding_wizard_step: nextStep, schema_deployed: true })
      .eq('id', companyId);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    schemaDeployed = true;
    await seedPromptConfigIfMissing(companyId, adminClient);
  } else {
    const { error: updateError } = await adminClient
      .from('companies')
      .update({ onboarding_wizard_step: nextStep })
      .eq('id', companyId);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ schema_deployed: schemaDeployed }, { status: 200 });
}
