import { NextResponse } from 'next/server';
import { byosCredentialsSchema } from '@/lib/validations/onboarding';
import { createAppServerClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/encryption';

export async function PATCH(request: Request) {
  const supabase = createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (userError || !userRow) {
    return NextResponse.json({ error: 'User record not found' }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = byosCredentialsSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { supabase_url, supabase_service_key } = parsed.data;
  const companyId = userRow.company_id as string;

  const { data: companyRow, error: companyError } = await supabase
    .from('companies')
    .select('mode')
    .eq('id', companyId)
    .single();

  if (companyError || !companyRow) {
    return NextResponse.json({ error: 'Company record not found' }, { status: 404 });
  }

  if (companyRow.mode !== 'byos') {
    return NextResponse.json({ error: 'Company is not in BYOS mode' }, { status: 409 });
  }

  const encryptedUrl = encrypt(supabase_url.trim());
  const encryptedKey = encrypt(supabase_service_key.trim());

  const { error: updateError } = await supabase
    .from('companies')
    .update({
      supabase_url: encryptedUrl,
      supabase_service_key: encryptedKey,
    })
    .eq('id', companyId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
