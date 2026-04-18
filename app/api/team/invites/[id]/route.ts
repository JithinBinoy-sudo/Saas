import { NextRequest, NextResponse } from 'next/server';
import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const inviteId = params.id;

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

  const admin = createAppAdminClient();

  // 3. Verify invite belongs to the same company and is not yet accepted
  const { data: invite } = await admin
    .from('invitations')
    .select('id')
    .eq('id', inviteId)
    .eq('company_id', userRow.company_id)
    .is('accepted_at', null)
    .single();

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }

  // 4. Delete the invitation row
  const { error: deleteError } = await admin
    .from('invitations')
    .delete()
    .eq('id', inviteId);

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to cancel invite' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
