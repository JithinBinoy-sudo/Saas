import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';

const patchSchema = z.object({
  role: z.enum(['admin', 'member']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const targetId = params.id;

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

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { role: newRole } = parsed.data;
  const admin = createAppAdminClient();

  // 4. Verify target user belongs to the same company
  const { data: targetUser } = await admin
    .from('users')
    .select('id, role, company_id')
    .eq('id', targetId)
    .eq('company_id', userRow.company_id)
    .single();

  if (!targetUser) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  // 5. Guard: cannot demote if this user is the last admin
  if (targetUser.role === 'admin' && newRole === 'member') {
    const { count } = await admin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', userRow.company_id)
      .eq('role', 'admin');

    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: 'Cannot demote the last admin' }, { status: 409 });
    }
  }

  // 6. Update role
  const { error: updateError } = await admin
    .from('users')
    .update({ role: newRole })
    .eq('id', targetId);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const targetId = params.id;

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

  // 3. Cannot delete self
  if (targetId === user.id) {
    return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 409 });
  }

  const admin = createAppAdminClient();

  // 4. Verify target user belongs to the same company
  const { data: targetUser } = await admin
    .from('users')
    .select('id')
    .eq('id', targetId)
    .eq('company_id', userRow.company_id)
    .single();

  if (!targetUser) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  // 5. Delete from users table
  const { error: deleteError } = await admin
    .from('users')
    .delete()
    .eq('id', targetId);

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }

  // 6. Revoke Supabase Auth session
  const { error: authDeleteError } = await admin.auth.admin.deleteUser(targetId);
  if (authDeleteError) {
    // Member row already deleted — log but don't fail the response
    console.error('Failed to delete auth user:', authDeleteError.message);
  }

  return NextResponse.json({ success: true });
}
