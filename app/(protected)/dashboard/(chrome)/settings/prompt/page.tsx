import { redirect } from 'next/navigation';
import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';
import type { PromptConfig } from '@/components/settings/PromptConfigForm';
import { AiPromptSettingsClient } from '@/components/settings/AiPromptSettingsClient';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_USER_TEMPLATE } from '@/lib/pipeline/defaultPrompts';

const DEFAULTS: PromptConfig = {
  system_prompt: DEFAULT_SYSTEM_PROMPT,
  user_prompt_template: DEFAULT_USER_TEMPLATE,
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
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">AI Prompt Settings</h1>
        <p className="mt-2 text-sm text-white/60">
          Customize the system and user prompts used for portfolio briefing generation.
        </p>
      </div>

      <AiPromptSettingsClient initialConfig={promptConfig} availableMonths={availableMonths} />
    </div>
  );
}
