import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']),
});

export async function POST(request: NextRequest) {
  // 1. Auth
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
    return NextResponse.json({ error: 'User record not found' }, { status: 404 });
  }

  // 2. Admin check
  if (userRow.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  // 3. Parse + validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { email, role } = parsed.data;
  const { company_id } = userRow;
  const admin = createAppAdminClient();

  // 4. Check for existing active invite
  const { data: existingInvite } = await admin
    .from('invitations')
    .select('id')
    .eq('company_id', company_id)
    .eq('email', email)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (existingInvite) {
    return NextResponse.json({ error: 'An active invite already exists for this email' }, { status: 409 });
  }

  // 5. Check email not already a member of this company
  const { data: existingMember } = await admin
    .from('users')
    .select('id')
    .eq('company_id', company_id)
    .eq('email', email)
    .maybeSingle();

  if (existingMember) {
    return NextResponse.json({ error: 'User is already a member of this company' }, { status: 409 });
  }

  // 6. Send invite via Supabase Auth
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=invite`,
    data: { company_id, role },
  });

  if (inviteError || !inviteData?.user) {
    return NextResponse.json({ error: inviteError?.message ?? 'Failed to send invite' }, { status: 500 });
  }

  // 7. Insert invitation record
  const { error: insertError } = await admin.from('invitations').insert({
    company_id,
    email,
    role,
    invited_by: user.id,
    invited_user_id: inviteData.user.id,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (insertError) {
    return NextResponse.json({ error: 'Failed to record invitation' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
