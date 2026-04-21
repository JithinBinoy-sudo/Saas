import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BYOS_DDL } from '@/lib/schema/byos-ddl';
import { isPortlioExecSqlMissingError, rpcPortlioExecSqlWithRetries } from '@/lib/schema/portlioExecSqlRpc';
import { runByosDeployViaPostgres } from '@/lib/schema/runByosDeployViaPostgres';
import { byosDeployRequestSchema } from '@/lib/validations/onboarding';
import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/encryption';

const RATE_LIMIT_PER_DAY = 3;

const DEFAULT_SYSTEM_PROMPT =
  'You are a portfolio analyst. Write concise monthly briefings that summarize revenue, occupancy, and notable trends across a short-term-rental portfolio. Be specific, use numbers, and avoid filler.';

const DEFAULT_USER_PROMPT_TEMPLATE =
  'Revenue month: {{revenue_month}}\nProperties: {{properties_data}}\nMonth totals: {{portfolio_totals}}\nChannel mix: {{channel_mix}}\n\nWrite a 5-8 sentence portfolio briefing for the month.';

type DeployResult = {
  object: string;
  status: 'created' | 'failed';
  error?: string;
};

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

  const parsed = byosDeployRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { supabase_url, supabase_service_key, database_password } = parsed.data;
  const dbPassword =
    typeof database_password === 'string' && database_password.trim().length > 0
      ? database_password.trim()
      : undefined;
  const admin = createAppAdminClient();

  const { data: userRow, error: userError } = await admin
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (userError || !userRow) {
    return NextResponse.json({ error: 'User record not found' }, { status: 404 });
  }

  const companyId = userRow.company_id as string;

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await admin
    .from('pipeline_runs')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'complete')
    .gte('started_at', dayAgo);

  if ((recentCount ?? 0) >= RATE_LIMIT_PER_DAY) {
    return NextResponse.json(
      { error: 'Deploy rate limit reached (max 3 per day).' },
      { status: 429 }
    );
  }

  const { data: runRow, error: runError } = await admin
    .from('pipeline_runs')
    .insert({
      company_id: companyId,
      revenue_month: new Date().toISOString().slice(0, 10),
      status: 'running',
      triggered_by: user.id,
    })
    .select('id')
    .single();

  if (runError || !runRow) {
    return NextResponse.json(
      { error: 'Failed to start deploy run' },
      { status: 500 }
    );
  }

  const runId = runRow.id as string;

  const results: DeployResult[] = [];
  let bootstrapMissing = false;
  let recommendDatabasePassword = false;

  if (dbPassword) {
    const pgResult = await runByosDeployViaPostgres({
      supabaseUrl: supabase_url,
      databasePassword: dbPassword,
      ddl: BYOS_DDL,
    });

    if (pgResult.ok) {
      for (const entry of BYOS_DDL) {
        results.push({ object: entry.name, status: 'created' });
      }
    } else if (pgResult.phase === 'ddl') {
      const failIndex = BYOS_DDL.findIndex((e) => e.name === pgResult.entryName);
      if (failIndex === -1) {
        for (const entry of BYOS_DDL) {
          results.push({ object: entry.name, status: 'failed', error: pgResult.message });
        }
      } else {
        for (let i = 0; i < BYOS_DDL.length; i += 1) {
          const entry = BYOS_DDL[i];
          if (i < failIndex) {
            results.push({ object: entry.name, status: 'created' });
          } else if (i === failIndex) {
            results.push({ object: entry.name, status: 'failed', error: pgResult.message });
          } else {
            results.push({ object: entry.name, status: 'failed', error: 'Skipped after previous failure' });
          }
        }
      }
    } else {
      const msg = pgResult.message;
      for (const entry of BYOS_DDL) {
        results.push({ object: entry.name, status: 'failed', error: msg });
      }
    }
  } else {
    const companyDb = createClient(supabase_url, supabase_service_key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    for (const entry of BYOS_DDL) {
      const { error } = await rpcPortlioExecSqlWithRetries(companyDb, entry.sql);
      if (error) {
        if (isPortlioExecSqlMissingError(error.message)) {
          bootstrapMissing = true;
          recommendDatabasePassword = true;
        }
        results.push({ object: entry.name, status: 'failed', error: error.message });
      } else {
        results.push({ object: entry.name, status: 'created' });
      }
    }
  }

  const allSucceeded = results.every((r) => r.status === 'created');

  await admin
    .from('pipeline_runs')
    .update({
      status: allSucceeded ? 'complete' : 'failed',
      completed_at: new Date().toISOString(),
      error_message: allSucceeded
        ? null
        : results
            .filter((r) => r.status === 'failed')
            .map((r) => `${r.object}: ${r.error}`)
            .join('\n'),
    })
    .eq('id', runId);

  if (allSucceeded) {
    const encryptedUrl = encrypt(supabase_url);
    const encryptedKey = encrypt(supabase_service_key);
    await admin
      .from('companies')
      .update({
        mode: 'byos',
        supabase_url: encryptedUrl,
        supabase_service_key: encryptedKey,
        schema_deployed: true,
        onboarding_wizard_step: 4,
      })
      .eq('id', companyId);

    const { data: existing } = await admin
      .from('prompt_configs')
      .select('id')
      .eq('company_id', companyId)
      .limit(1)
      .maybeSingle();

    if (!existing) {
      await admin.from('prompt_configs').insert({
        company_id: companyId,
        name: 'portfolio_analysis',
        system_prompt: DEFAULT_SYSTEM_PROMPT,
        user_prompt_template: DEFAULT_USER_PROMPT_TEMPLATE,
      });
    }
  }

  return NextResponse.json(
    {
      results,
      bootstrap_missing: bootstrapMissing,
      recommend_database_password: recommendDatabasePassword,
      schema_deployed: allSucceeded,
    },
    { status: 200 }
  );
}
