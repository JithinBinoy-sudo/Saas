import { NextResponse } from 'next/server';
import { openaiKeySchema } from '@/lib/validations/onboarding';
import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/encryption';

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

  const raw =
    payload && typeof payload === 'object' && 'key' in payload
      ? (payload as { key: unknown }).key
      : undefined;

  const parsed = openaiKeySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid OpenAI key' }, { status: 400 });
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

  const encrypted = encrypt(parsed.data);

  const { error: updateError } = await admin
    .from('companies')
    .update({ openai_api_key: encrypted })
    .eq('id', userRow.company_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
