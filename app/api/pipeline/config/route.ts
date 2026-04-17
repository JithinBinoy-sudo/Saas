import { NextRequest, NextResponse } from 'next/server';
import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';
import { SUPPORTED_MODELS } from '@/lib/pipeline/types';

export async function PATCH(request: NextRequest) {
  const supabase = createAppServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: { model?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { model } = body;
  if (!model || !SUPPORTED_MODELS[model]) {
    return NextResponse.json({ error: 'Unsupported model' }, { status: 400 });
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

  const admin = createAppAdminClient();

  const { error } = await admin
    .from('prompt_configs')
    .upsert(
      {
        company_id: userRow.company_id,
        model,
        name: 'portfolio_analysis',
        system_prompt: 'You are a short-term rental portfolio analyst.',
        user_prompt_template: 'Analyze the following portfolio data for {{revenue_month}}:\n\n{{data}}',
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      },
      { onConflict: 'company_id' }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, model });
}
