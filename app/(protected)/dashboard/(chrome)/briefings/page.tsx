import { redirect } from 'next/navigation';
import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';
import { AiIntelligenceClient } from '@/components/briefings/AiIntelligenceClient';
import type { AIProviderName } from '@/lib/pipeline/types';

export const metadata = {
  title: 'Portlio — AI Intelligence',
};

export default async function AiIntelligencePage() {
  const supabase = createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  const { data: userRow } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (!userRow) redirect('/auth');

  const admin = createAppAdminClient();

  const [{ data: months }, { data: promptConfig }, { data: company }, { data: briefings }] =
    await Promise.all([
      admin
        .from('monthly_portfolio_summary')
        .select('revenue_month')
        .eq('company_id', userRow.company_id)
        .order('revenue_month', { ascending: false }),
      admin
        .from('prompt_configs')
        .select('model')
        .eq('company_id', userRow.company_id)
        .maybeSingle(),
      admin
        .from('companies')
        .select('openai_api_key, anthropic_api_key, google_api_key')
        .eq('id', userRow.company_id)
        .single(),
      supabase
        .from('monthly_portfolio_briefings')
        .select('revenue_month, portfolio_summary, generated_at, model, briefing_name')
        .eq('company_id', userRow.company_id)
        .order('generated_at', { ascending: false })
        .limit(2),
    ]);

  const availableMonths = (months ?? []).map((m: { revenue_month: string }) => m.revenue_month);

  const configuredProviders: AIProviderName[] = [];
  if (company?.openai_api_key) configuredProviders.push('openai');
  if (company?.anthropic_api_key) configuredProviders.push('anthropic');
  if (company?.google_api_key) configuredProviders.push('google');

  const defaultModel = promptConfig?.model ?? 'gpt-4o';

  return (
    <AiIntelligenceClient
      availableMonths={availableMonths}
      defaultModel={defaultModel}
      recentBriefings={briefings ?? []}
      configuredProviders={configuredProviders}
    />
  );
}
