import { NextResponse } from 'next/server';
import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/encryption';

const VALID_PROVIDERS = ['openai', 'anthropic', 'google'] as const;
type Provider = typeof VALID_PROVIDERS[number];

const KEY_COLUMN: Record<Provider, string> = {
  openai: 'openai_api_key',
  anthropic: 'anthropic_api_key',
  google: 'google_api_key',
};

export async function POST(request: Request) {
  const supabase = createAppServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let payload: { provider?: string; key?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { provider, key } = payload;

  if (!provider || !VALID_PROVIDERS.includes(provider as Provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }

  if (!key || typeof key !== 'string' || key.trim().length === 0) {
    return NextResponse.json({ error: 'API key is required' }, { status: 400 });
  }

  const admin = createAppAdminClient();

  const { data: userRow, error: userError } = await admin
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (userError || !userRow) {
    return NextResponse.json({ error: 'User record not found' }, { status: 404 });
  }

  const encrypted = encrypt(key.trim());
  const column = KEY_COLUMN[provider as Provider];

  const { error: updateError } = await admin
    .from('companies')
    .update({ [column]: encrypted })
    .eq('id', userRow.company_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
