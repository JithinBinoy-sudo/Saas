import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAppServerClient } from '@/lib/supabase/server';

const bodySchema = z.object({
  step: z.number().int().min(1).max(4),
  mode: z.enum(['hosted', 'byos']).optional(),
});

export async function POST(request: Request) {
  const supabase = createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { step, mode } = parsed.data;

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (userError || !userRow) {
    return NextResponse.json({ error: 'User record not found' }, { status: 404 });
  }

  const companyId = userRow.company_id as string;

  const { data: companyRow, error: companyError } = await supabase
    .from('companies')
    .select('schema_deployed')
    .eq('id', companyId)
    .single();

  if (companyError || !companyRow) {
    return NextResponse.json({ error: 'Company record not found' }, { status: 404 });
  }

  if (companyRow.schema_deployed) {
    return NextResponse.json({ error: 'Onboarding already complete' }, { status: 409 });
  }

  const patch: Record<string, unknown> = { onboarding_wizard_step: step };
  if (mode) patch.onboarding_wizard_mode = mode;

  const { error: updateError } = await supabase.from('companies').update(patch).eq('id', companyId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
