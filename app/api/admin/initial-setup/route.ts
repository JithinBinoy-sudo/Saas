import { NextResponse } from 'next/server';
import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';
import { adminInitialSetupSchema } from '@/lib/validations/admin';

/**
 * First admin for a company: caller must be `member`, company must have zero admins.
 * Sets auth password (unless keepCurrentPassword) and promotes `users.role` to `admin`.
 */
export async function POST(request: Request) {
  const supabase = createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = adminInitialSetupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { password, keepCurrentPassword } = parsed.data;
  const admin = createAppAdminClient();

  const { data: userRow, error: userFetchError } = await admin
    .from('users')
    .select('id, company_id, role')
    .eq('id', user.id)
    .single();

  if (userFetchError || !userRow) {
    return NextResponse.json({ error: 'User record not found' }, { status: 404 });
  }

  if (userRow.role === 'admin') {
    return NextResponse.json({ error: 'Account is already an admin' }, { status: 400 });
  }

  const companyId = userRow.company_id as string;

  const { count: adminCount, error: countError } = await admin
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('role', 'admin');

  if (countError) {
    return NextResponse.json({ error: 'Could not verify workspace admins' }, { status: 500 });
  }

  if ((adminCount ?? 0) > 0) {
    return NextResponse.json(
      { error: 'This workspace already has an administrator. Ask them to grant you access.' },
      { status: 403 }
    );
  }

  if (!keepCurrentPassword) {
    const { error: pwError } = await admin.auth.admin.updateUserById(user.id, {
      password: password as string,
    });
    if (pwError) {
      return NextResponse.json({ error: pwError.message ?? 'Failed to set password' }, { status: 500 });
    }
  }

  const { error: roleError } = await admin.from('users').update({ role: 'admin' }).eq('id', user.id);

  if (roleError) {
    return NextResponse.json(
      {
        error: keepCurrentPassword
          ? 'Admin role could not be assigned. Contact support.'
          : 'Password was updated but admin role could not be assigned. Contact support.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
