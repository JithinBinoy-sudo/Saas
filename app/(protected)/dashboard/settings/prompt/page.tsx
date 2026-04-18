import { redirect } from 'next/navigation';
import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';
import { PromptConfigForm } from '@/components/settings/PromptConfigForm';
import type { PromptConfig } from '@/components/settings/PromptConfigForm';
import { PromptTestPanel } from '@/components/settings/PromptTestPanel';

const DEFAULTS: PromptConfig = {
  system_prompt: `You are a short-term rental portfolio analyst. Given monthly performance data for a vacation rental portfolio, write a concise executive briefing (3–5 paragraphs) that:
1. Summarises portfolio-wide KPIs (revenue, ADR, occupancy) and month-over-month trends.
2. Highlights top-performing and underperforming properties with specific numbers.
3. Identifies actionable insights or risks (seasonality, pricing gaps, channel dependency).
4. Keeps a professional but accessible tone suitable for property managers.`,
  user_prompt_template: `Analyze the following portfolio data for {{revenue_month}}:

{{data}}`,
  model: 'gpt-4o',
  temperature: 0.3,
  max_tokens: 2000,
  updated_at: null,
};

export default async function PromptSettingsPage() {
  const supabase = createAppServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  const { data: userRow } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (!userRow || userRow.role !== 'admin') redirect('/dashboard');

  const admin = createAppAdminClient();

  // Fetch prompt config
  const { data: config } = await admin
    .from('prompt_configs')
    .select('system_prompt, user_prompt_template, model, temperature, max_tokens, updated_at')
    .eq('company_id', userRow.company_id)
    .single();

  const promptConfig: PromptConfig = config ?? DEFAULTS;

  // Fetch available months
  let availableMonths: string[] = [];
  const { data: months } = await admin
    .from('monthly_portfolio_summary')
    .select('revenue_month')
    .eq('company_id', userRow.company_id)
    .order('revenue_month', { ascending: false });
  availableMonths = (months ?? []).map((m: { revenue_month: string }) => m.revenue_month);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Prompt Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Customize the system and user prompts used for portfolio briefing generation.
        </p>
      </div>

      <PromptConfigForm initialConfig={promptConfig} />

      <div className="border-t pt-6">
        <PromptTestPanel
          model={promptConfig.model}
          availableMonths={availableMonths}
        />
      </div>
    </div>
  );
}
