import { NextResponse } from 'next/server';
import { signupSchema } from '@/lib/validations/auth';
import { createAppAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ errors: { _root: 'Invalid JSON body' } }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { company_name, email, password } = parsed.data;
  const supabase = createAppAdminClient();

  const { data: authResult, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authResult?.user) {
    const message = authError?.message ?? 'Auth user creation failed';
    if (/already registered|already exists/i.test(message)) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const authUser = authResult.user;

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({ name: company_name, mode: 'hosted' })
    .select('id')
    .single();

  if (companyError || !company) {
    // Roll back the auth user to avoid orphans.
    await supabase.auth.admin.deleteUser(authUser.id);
    return NextResponse.json(
      { error: companyError?.message ?? 'Failed to create company' },
      { status: 500 }
    );
  }

  // New signups are members; first company admin is claimed via /admin/setup.
  const { error: userError } = await supabase.from('users').insert({
    id: authUser.id,
    company_id: company.id,
    role: 'member',
    email,
  });

  if (userError) {
    await supabase.auth.admin.deleteUser(authUser.id);
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  return NextResponse.json({ company_id: company.id }, { status: 201 });
}
