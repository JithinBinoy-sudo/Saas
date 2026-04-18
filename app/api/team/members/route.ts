import { NextRequest, NextResponse } from 'next/server';
import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest) {
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

  const admin = createAppAdminClient();
  const { company_id } = userRow;

  // 2. Fetch all members of this company
  const { data: members, error: membersError } = await admin
    .from('users')
    .select('id, name, email, role, created_at')
    .eq('company_id', company_id)
    .order('created_at', { ascending: true });

  if (membersError) {
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }

  // 3. Fetch pending invitations (not accepted, not expired)
  const { data: rawInvites, error: invitesError } = await admin
    .from('invitations')
    .select('id, email, role, expires_at, created_at, invited_by')
    .eq('company_id', company_id)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (invitesError) {
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
  }

  // 4. Resolve invited_by names
  const inviterIds = [...new Set((rawInvites ?? []).map((i) => i.invited_by as string))];

  let inviterMap: Record<string, string> = {};
  if (inviterIds.length > 0) {
    const { data: inviters } = await admin
      .from('users')
      .select('id, name')
      .in('id', inviterIds);

    inviterMap = Object.fromEntries((inviters ?? []).map((u) => [u.id, u.name ?? u.id]));
  }

  const pendingInvites = (rawInvites ?? []).map((invite) => ({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    invited_by_name: inviterMap[invite.invited_by] ?? invite.invited_by,
    expires_at: invite.expires_at,
    created_at: invite.created_at,
  }));

  return NextResponse.json({ members: members ?? [], pendingInvites });
}
