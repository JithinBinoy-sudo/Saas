import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';
import type { PromptConfig } from '@/components/settings/PromptConfigForm';
import { AiPromptSettingsClient } from '@/components/settings/AiPromptSettingsClient';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_USER_TEMPLATE } from '@/lib/pipeline/defaultPrompts';

export const metadata = {
  title: 'Portlio · AI Prompt Settings',
};

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  const { data: userRow } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (!userRow || userRow.role !== 'admin') redirect('/');

  const admin = createAppAdminClient();

  const { data: config } = await admin
    .from('prompt_configs')
    .select(
      'system_prompt, user_prompt_template, model, temperature, max_tokens, updated_at',
    )
    .eq('company_id', userRow.company_id)
    .single();

  const promptConfig: PromptConfig = config ?? DEFAULTS;

  let availableMonths: string[] = [];
  const { data: months } = await admin
    .from('monthly_portfolio_summary')
    .select('revenue_month')
    .eq('company_id', userRow.company_id)
    .order('revenue_month', { ascending: false });
  availableMonths = (months ?? []).map(
    (m: { revenue_month: string }) => m.revenue_month,
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to settings
      </Link>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">AI Prompt Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Customize the system and user prompts used for portfolio briefing generation.
        </p>
      </div>
      <AiPromptSettingsClient
        initialConfig={promptConfig}
        availableMonths={availableMonths}
      />
    </div>
  );
}
