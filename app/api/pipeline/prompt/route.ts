import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';
import { SUPPORTED_MODELS } from '@/lib/pipeline/types';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_USER_TEMPLATE } from '@/lib/pipeline/defaultPrompts';

const DEFAULTS = {
  system_prompt: DEFAULT_SYSTEM_PROMPT,
  user_prompt_template: DEFAULT_USER_TEMPLATE,
  model: 'gpt-4o',
  temperature: 0.3,
  max_tokens: 2000,
  updated_at: null,
};

const modelKeys = Object.keys(SUPPORTED_MODELS) as [string, ...string[]];

const patchSchema = z.object({
  system_prompt: z.string().min(20).max(4000).optional(),
  user_prompt_template: z.string().min(20).max(4000).optional(),
  model: z.enum(modelKeys).optional(),
  temperature: z.number().min(0).max(1).optional(),
  max_tokens: z.number().int().min(100).max(4000).optional(),
}).strict();

export async function GET() {
  const supabase = createAppServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (!userRow) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const admin = createAppAdminClient();
  const { data: config } = await admin
    .from('prompt_configs')
    .select('system_prompt, user_prompt_template, model, temperature, max_tokens, updated_at')
    .eq('company_id', userRow.company_id)
    .single();

  return NextResponse.json(config ?? DEFAULTS);
}

export async function PATCH(request: NextRequest) {
  const supabase = createAppServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (!userRow) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (userRow.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const admin = createAppAdminClient();
  const { error } = await admin
    .from('prompt_configs')
    .upsert(
      {
        company_id: userRow.company_id,
        name: 'portfolio_analysis',
        ...DEFAULTS,
        ...parsed.data,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      },
      { onConflict: 'company_id' },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
